// Gemeinsame Helfer für die Browser-Tests
import fs from "node:fs";
import { expect } from "@playwright/test";

// Fehler im Browser mitschreiben; am Testende muss die Liste leer sein
export function watchErrors(page) {
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  return errors;
}

// Seite öffnen. Optional mit API-Schlüssel (nur zum Test, geht nie an Anthropic: die Antworten sind nachgebaut).
export async function openApp(page, hash = "", { key = null, mode = "fast" } = {}) {
  if (key) await page.addInitScript(([k, m]) => { localStorage.setItem("snapKey", k); localStorage.setItem("snapMode", m); }, [key, mode]);
  // Das Claude-SDK kommt sonst von jsDelivr; lokal ohne Netz kann ein eigenes Bündel einspringen
  if (process.env.SDK_BUNDLE) {
    await page.route(/cdn\.jsdelivr\.net\/npm\/@anthropic-ai\/sdk/, (r) => r.fulfill({ contentType: "text/javascript", body: fs.readFileSync(process.env.SDK_BUNDLE) }));
  }
  await page.goto("/" + hash);
}

// Warten, bis alle Kartendaten geladen sind (inkl. asiatischer, älterer und Sealed)
export async function waitAllData(page) {
  await page.waitForFunction(() => typeof quickData !== "undefined" && quickData && asiaState !== "loading" && oldState !== "loading"
    && quickData.cards.some((c) => c.x === "sealed"), null, { timeout: 90_000 });
}

// Nachgebaute Claude-API. respond(request) liefert { out, usage?, model?, stop_reason? }.
export async function mockClaude(page, respond) {
  const calls = [];
  await page.route("https://api.anthropic.com/**", async (route) => {
    const req = route.request();
    if (req.method() === "OPTIONS") return route.fulfill({ status: 204, headers: { "access-control-allow-origin": "*", "access-control-allow-headers": "*" } });
    const body = JSON.parse(req.postData());
    const content = body.messages[0].content;
    const text = content.filter((c) => c.type === "text").map((c) => c.text).join(" ");
    const images = content.filter((c) => c.type === "image");
    const call = { body, text, images, zoom: /vergrößerter Ausschnitt/.test(text), pick: images.length > 1 };
    calls.push(call);
    const r = await respond(call);
    await route.fulfill({
      status: 200,
      headers: { "access-control-allow-origin": "*", "content-type": "application/json" },
      body: JSON.stringify({ id: `msg_${calls.length}`, type: "message", role: "assistant", model: r.model ?? body.model, stop_reason: r.stop_reason ?? "end_turn",
        content: [{ type: "text", text: JSON.stringify(r.out) }], usage: r.usage ?? { input_tokens: 1000, output_tokens: 200 } }),
    });
  });
  return calls;
}

// Ein erkannter Karteneintrag wie aus dem Antwortformat der App
export const rec = (over) => ({ kind: "card", pokemon_en: "", pokemon_de: "", card_name: "", number: "", set_hint: "", set_code: "", language: "de",
  variant: "unknown", year: "", confidence: "high", grade: "", box: { x: 0, y: 0, w: 0, h: 0 }, ...over });

// Testbild als JPEG: grauer Hintergrund mit farbigen Rechtecken [farbe, x, y, w, h]
export async function makeImage(page, w, h, rects) {
  const bytes = await page.evaluate(async ({ w, h, rects }) => {
    const c = document.createElement("canvas"); c.width = w; c.height = h;
    const x = c.getContext("2d"); x.fillStyle = "#888"; x.fillRect(0, 0, w, h);
    for (const [color, rx, ry, rw, rh] of rects) { x.fillStyle = color; x.fillRect(rx, ry, rw, rh); }
    const blob = await new Promise((res) => c.toBlob(res, "image/jpeg", 0.95));
    return [...new Uint8Array(await blob.arrayBuffer())];
  }, { w, h, rects });
  return Buffer.from(bytes);
}
export const uploadImage = (page, buffer) => page.setInputFiles("#snap-file", { name: "bild.jpg", mimeType: "image/jpeg", buffer });

// Farbe in der Mitte eines Bildes (data-URL oder base64-JPEG)
export async function centerColor(page, src) {
  return page.evaluate(async (src) => {
    const im = new Image(); im.src = src.startsWith("data:") ? src : "data:image/jpeg;base64," + src; await im.decode();
    const c = document.createElement("canvas"); c.width = im.width; c.height = im.height;
    const x = c.getContext("2d"); x.drawImage(im, 0, 0);
    const [r, g, b] = x.getImageData(Math.floor(im.width / 2), Math.floor(im.height / 2), 1, 1).data;
    return r > 180 && g < 90 && b < 90 ? "rot" : r < 90 && g > 120 && b < 90 ? "grün" : r < 90 && g < 90 && b > 180 ? "blau" : r > 180 && g > 180 && b < 90 ? "gelb" : "grau";
  }, src);
}

export { expect };
