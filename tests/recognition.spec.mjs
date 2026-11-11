// Bilderkennung mit nachgebauten Claude-Antworten: Einzelkarte, Grading, Binderseite mit Nachlesen,
// Sealed, Kostenübersicht. Es geht keine Anfrage an Anthropic.
import { test } from "@playwright/test";
import { centerColor, expect, makeImage, mockClaude, openApp, rec, uploadImage, waitAllData, watchErrors } from "./helpers.mjs";

const KEY = "sk-ant-test-nur-fuer-tests";

test("Rechenhilfen: Ausschnitt, Note, Kosten", async ({ page }) => {
  const errors = watchErrors(page);
  await openApp(page, "#suche");
  await waitAllData(page);
  const r = await page.evaluate(() => {
    const img = { bmp: {}, w: 3000, h: 2000, sw: 1600, sh: 1067 };
    return {
      box: snapBoxPx(img, { x: 100, y: 100, w: 200, h: 400 }, 0),
      // Angabe in Pixeln des hochgeladenen Bildes (erkennbar an Werten über 1000) statt in Promille
      boxPx: snapBoxPx(img, { x: 1120, y: 107, w: 320, h: 427 }, 0),
      none: snapBoxPx(img, { x: 0, y: 0, w: 0, h: 0 }),
      tooThin: snapBoxPx(img, { x: 0, y: 0, w: 900, h: 50 }),
      grades: ["PSA GEM MT 10", "bgs 9,5", "CGC Pristine 10", "", "Mint"].map((g) => snapGrade({ grade: g })),
      opus: snapUsageUsd({ model: "claude-opus-5-5", usage: { input_tokens: 1_000_000, output_tokens: 100_000 } }),
      haiku: snapUsageUsd({ model: "claude-haiku-5-5", usage: { input_tokens: 2000, output_tokens: 400 } }),
      fallback: snapUsageUsd({ model: "claude-opus-4-8", usage: { input_tokens: 10, output_tokens: 10, iterations: [
        { type: "message", model: "claude-opus-5-5", input_tokens: 1_000_000, output_tokens: 0 },
        { type: "fallback_message", model: "claude-opus-4-8", input_tokens: 1_000_000, output_tokens: 0 }] } }),
      unknown: snapUsageUsd({ model: "claude-neu-9", usage: { input_tokens: 1_000_000, output_tokens: 0 } }),
    };
  });
  expect(r.box).toMatchObject({ x: 300, y: 200, w: 600, h: 800 });
  expect(r.boxPx).toMatchObject({ x: 2100, w: 600 });
  expect(Math.abs(r.boxPx.y - 200)).toBeLessThan(3);
  expect(Math.abs(r.boxPx.h - 800)).toBeLessThan(3);
  expect(r.none).toBeNull();
  expect(r.tooThin).toBeNull();
  expect(r.grades).toEqual(["PSA 10", "BGS 9.5", "CGC 10", "", ""]);
  expect(r.opus).toBeCloseTo(4 + 2, 6);          // 1 Mio. Eingabe × 4 $ + 100.000 Ausgabe × 20 $/Mio.
  expect(r.haiku).toBeCloseTo(0.0004, 8);        // 2000 × 0,10 $ + 400 × 0,50 $ pro Mio.
  expect(r.fallback).toBeCloseTo(4 + 5, 6);      // beide Versuche zählen, jeweils zum eigenen Preis
  expect(r.unknown).toBeCloseTo(8, 6);           // unbekanntes Modell: lieber zu hoch
  expect(errors).toEqual([]);
});

test("Einzelkarte, gegradet: Ergebnis, Grading-Links, Kosten", async ({ page }) => {
  const errors = watchErrors(page);
  const calls = await mockClaude(page, () => ({
    out: { cards: [rec({ pokemon_en: "Charizard", pokemon_de: "Glurak", card_name: "Glurak ex", number: "199/165", set_hint: "151", variant: "illustration", grade: "PSA GEM MT 10", box: { x: 20, y: 20, w: 960, h: 960 } })] },
    usage: { input_tokens: 2000, output_tokens: 400 },
  }));
  await openApp(page, "#suche", { key: KEY, mode: "fast" });
  await waitAllData(page);
  await uploadImage(page, await makeImage(page, 1200, 1680, [["#e00000", 30, 30, 1140, 1620]]));
  await expect(page.locator("#snap-result")).toContainText("Glurak ex");
  await expect(page.locator("#snap-result .col-grade")).toHaveText("PSA 10");
  await expect(page.locator('#snap-result .snap-graded a[href*="pricecharting.com"]')).toHaveCount(1);
  await expect(page.locator("#quick-results .qcard").first()).toContainText("Glurak");
  // Genau eine Anfrage (Karte füllt das Bild, Nummer sicher gelesen: kein Nachlesen)
  expect(calls.length).toBe(1);
  expect(calls[0].body.model).toBe("claude-haiku-5-5");
  // Kosten: 2000 × 0,10 $ + 400 × 0,50 $ pro Mio. = 0,0004 $
  await expect(page.locator("#snap-result .snap-cost-run")).toContainText("Cent");
  const cost = await page.evaluate(() => snapCostAll()[monthKey()]);
  expect(cost.img).toBe(1);
  expect(cost.calls).toBe(1);
  expect(cost.usd).toBeCloseTo(0.0004, 8);
  await page.click("#snap-settings-btn");
  await expect(page.locator("#snap-cost")).toContainText("1 Bild, 1 Anfrage");
  expect(errors).toEqual([]);
});

test("Binderseite: Ausschnitte, Nachlesen, Auswahl, Übernahme", async ({ page }) => {
  const errors = watchErrors(page);
  // Vier Karten auf 3000 × 2000 Pixeln; Lage in Promille
  const cells = { rot: [100, 60, 700, 900], grün: [1100, 60, 700, 900], blau: [2100, 60, 700, 900], gelb: [100, 1040, 700, 900] };
  const pm = ([x, y, w, h]) => ({ x: Math.round(x / 3), y: Math.round(y / 2), w: Math.round(w / 3), h: Math.round(h / 2) });
  const calls = await mockClaude(page, async (call) => {
    if (!call.zoom) return { out: { cards: [
      rec({ pokemon_en: "Charizard", pokemon_de: "Glurak", card_name: "Glurak ex", number: "199/165", set_hint: "151", variant: "illustration", box: pm(cells.rot) }),
      rec({ pokemon_en: "Timburr", pokemon_de: "Praktibalk", card_name: "Praktibalk", confidence: "medium", box: pm(cells.grün) }),
      rec({ pokemon_en: "Pikachu", pokemon_de: "Pikachu", card_name: "Pikachu", confidence: "low", box: pm(cells.blau) }),
      rec({ pokemon_en: "Snorlax", pokemon_de: "Relaxo", card_name: "Relaxo", number: "051", set_hint: "SVP Promo", grade: "PSA 10", box: pm(cells.gelb) }),
    ] } };
    // Nachlesen: Praktibalk ist jetzt lesbar; beim Pikachu-Ausschnitt kommt ein anderes Pokémon (wird verworfen)
    const color = await centerColor(page, call.images[0].source.data);
    return color === "grün"
      ? { out: { cards: [rec({ pokemon_en: "Timburr", pokemon_de: "Praktibalk", card_name: "Praktibalk", number: "183/167", set_code: "TWM" })] } }
      : { out: { cards: [rec({ pokemon_en: "Raichu", pokemon_de: "Raichu", card_name: "Raichu", number: "27/100" })] } };
  });
  await openApp(page, "#suche", { key: KEY, mode: "exact" });
  await waitAllData(page);
  const colors = { rot: "#e00000", grün: "#00a000", blau: "#0000e0", gelb: "#e8e000" };
  await uploadImage(page, await makeImage(page, 3000, 2000, Object.entries(cells).map(([k, r]) => [colors[k], ...r])));
  await expect(page.locator(".snap-multi li")).toHaveCount(4);
  // Erste Anfrage mit "Genau", Nachlesen der zwei unsicheren Karten mit "Schnell" und Ausschnitt in passender Farbe
  expect(calls[0].body.model).toBe("claude-opus-5-5");
  const zooms = calls.filter((c) => c.zoom);
  expect(zooms.length).toBe(2);
  expect(zooms.every((c) => c.body.model === "claude-haiku-5-5")).toBe(true);
  expect((await Promise.all(zooms.map((c) => centerColor(page, c.images[0].source.data)))).sort()).toEqual(["blau", "grün"]);
  // Zeilen: Ausschnitt je Karte, nur sichere vorausgewählt
  const rows = page.locator(".snap-multi li");
  await expect(rows.nth(0)).toContainText("Glurak");
  await expect(rows.nth(1)).toContainText("Nr. 183");
  await expect(rows.nth(1)).toContainText("nachgelesen");
  await expect(rows.nth(2)).toContainText("unsicher");
  await expect(rows.nth(3)).toContainText("PSA 10");
  expect(await rows.locator("input[type=checkbox]").evaluateAll((xs) => xs.map((x) => x.checked))).toEqual([true, true, false, true]);
  const thumbs = await rows.locator("img.snap-multi-img").evaluateAll((xs) => xs.map((x) => x.src));
  expect(await Promise.all(thumbs.map((t) => centerColor(page, t)))).toEqual(["rot", "grün", "blau", "gelb"]);
  // Übernehmen: drei Karten, jede mit eigenem Foto, Relaxo mit Note
  await page.click('[data-multi="col"]');
  await expect(page.locator(".snap-multi-msg")).toContainText("3 Karten");
  const col = await page.evaluate(async () => (await colAll()).map((e) => ({ n: e.card.n, grade: e.grade, thumb: e.thumb })));
  expect(col.map((e) => e.n).sort()).toEqual(["Glurak-ex", "Praktibalk", "Relaxo"]);
  expect(col.find((e) => e.n === "Relaxo").grade).toBe("PSA 10");
  expect((await Promise.all(col.map((e) => centerColor(page, e.thumb)))).sort()).toEqual(["gelb", "grün", "rot"]);
  // Kosten: ein Bild, drei Anfragen
  const cost = await page.evaluate(() => snapCostAll()[monthKey()]);
  expect(cost).toMatchObject({ img: 1, calls: 3 });
  expect(errors).toEqual([]);
});

test("Sealed-Produkt wird als Produkt gesucht", async ({ page }) => {
  const errors = watchErrors(page);
  await mockClaude(page, () => ({ out: { cards: [rec({ kind: "sealed", card_name: "Prismatic Evolutions Elite Trainer Box", set_hint: "Prismatic Evolutions" })] } }));
  await openApp(page, "#suche", { key: KEY });
  await waitAllData(page);
  await uploadImage(page, await makeImage(page, 1000, 800, [["#00a000", 100, 100, 800, 600]]));
  await expect(page.locator("#quick-results .qcard").first().locator(".lang-badge")).toHaveText("SEALED");
  await expect(page.locator("#quick-results .qcard").first()).toContainText(/Prismatic Evolutions/);
  expect(errors).toEqual([]);
});

test("Fehler der API werden verständlich gemeldet", async ({ page }) => {
  const errors = watchErrors(page);
  await page.route("https://api.anthropic.com/**", (r) => r.request().method() === "OPTIONS"
    ? r.fulfill({ status: 204, headers: { "access-control-allow-origin": "*", "access-control-allow-headers": "*" } })
    : r.fulfill({ status: 401, headers: { "access-control-allow-origin": "*", "content-type": "application/json" }, body: JSON.stringify({ type: "error", error: { type: "authentication_error", message: "invalid x-api-key" } }) }));
  await openApp(page, "#suche", { key: KEY });
  await waitAllData(page);
  await uploadImage(page, await makeImage(page, 600, 800, [["#e00000", 50, 50, 500, 700]]));
  await expect(page.locator("#snap-result .snap-err")).toContainText("API-Schlüssel wird nicht akzeptiert");
  expect(errors).toEqual([]);
});
