// Sammlung und Archiv: Werte, Seiten, Suche, Entfernen, Tempo
import { test } from "@playwright/test";
import { expect, openApp, waitAllData, watchErrors } from "./helpers.mjs";

// Sammlung mit n Karten und 30 Tagen Wertverlauf füllen (direkt in der Datenbank des Browsers)
async function fillCollection(page, n) {
  await page.evaluate(async (n) => {
    const cards = quickData.cards.filter((c) => c.a30 && !c.x && !c._dup && !c._jp && !c.am).filter((_, i) => i % 37 === 0).slice(0, n);
    const db = await archDb();
    await new Promise((res, rej) => {
      const tx = db.transaction(["sammlung", "wert"], "readwrite");
      let id = 1700000000000;
      cards.forEach((c, k) => tx.objectStore("sammlung").put({ id: id++, at: "2026-10-01T10:00:00.000Z", card: archCardInfo(c), qty: 1 + (k % 3), buy: k % 4 ? 1 : 0, grade: "", thumb: null, archId: null, rec: null }));
      for (let d = 1; d <= 30; d++) {
        const p = {}; for (const c of cards) p[c.i] = c.a30 * (1 + d / 200);
        tx.objectStore("wert").put({ d: `2026-10-${String(d).padStart(2, "0")}`, v: d, paid: 1, n, p });
      }
      tx.oncomplete = res; tx.onerror = rej;
    });
  }, n);
}

test("Sammlung: Gesamtwert, Seiten, Suche und Entfernen", async ({ page }) => {
  const errors = watchErrors(page);
  await openApp(page, "#suche");
  await waitAllData(page);
  await fillCollection(page, 150);
  await page.click("#view-collection");
  await expect(page.locator(".col-item").first()).toBeVisible();
  // Gesamtwert = Summe aus Wert × Anzahl, so wie die App ihn rechnet
  const total = await page.evaluate(async () => fmtPrice((await colAll()).reduce((s, e) => s + (colVal(e) ?? 0) * (e.qty || 1), 0)));
  await expect(page.locator("#collection")).toContainText(total);
  // 40 Karten pro Seite
  await expect(page.locator(".col-item")).toHaveCount(40);
  await page.click("#col-more");
  await expect(page.locator(".col-item")).toHaveCount(80);
  // Tempo: Neuzeichnen mit 150 Karten und 30 Tagen Verlauf
  const ms = await page.evaluate(async () => { const t = performance.now(); await renderCollection(); return performance.now() - t; });
  expect(ms).toBeLessThan(2000);
  // Suche in der Sammlung
  const name = await page.evaluate(async () => (await colAll())[0].card.n);
  await page.fill("#col-search", name);
  await expect(page.locator(".col-item").first()).toContainText(name);
  // Entfernen mit Rückfrage
  const before = await page.evaluate(async () => (await colAll()).length);
  await page.fill("#col-search", "");
  await page.locator(".col-item").first().locator("[data-col-ask]").click();
  await page.locator(".col-item").first().locator("[data-col-del]").click();
  await expect.poll(() => page.evaluate(async () => (await colAll()).length)).toBe(before - 1);
  expect(errors).toEqual([]);
});

test("Archiv wird seitenweise gezeigt", async ({ page }) => {
  const errors = watchErrors(page);
  await openApp(page, "#suche");
  await waitAllData(page);
  await page.evaluate(async () => {
    const c = document.createElement("canvas"); c.width = 60; c.height = 84; c.getContext("2d").fillRect(0, 0, 60, 84);
    const thumb = c.toDataURL("image/jpeg", 0.6);
    const cards = quickData.cards.filter((x) => x.a30).slice(0, 100);
    let id = 1700000000000;
    for (const x of cards) await archPut({ id: id++, at: new Date().toISOString(), photoAt: null, thumb, rec: { card_name: x.n }, query: x.n, exact: true, card: archCardInfo(x) });
  });
  await page.click("#view-archive");
  await expect(page.locator("#arch-list .arch-item")).toHaveCount(40);
  await expect(page.locator("#arch-meta")).toHaveText("100 gescannte Karten");
  await page.click("#arch-more");
  await expect(page.locator("#arch-list .arch-item")).toHaveCount(80);
  expect(errors).toEqual([]);
});
