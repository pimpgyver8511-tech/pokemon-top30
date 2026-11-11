// Schnellsuche: Daten, Treffer, Sprachen, Sealed, "Bieten bis", Tempo
import { test } from "@playwright/test";
import { expect, openApp, waitAllData, watchErrors } from "./helpers.mjs";

test.describe.configure({ mode: "serial" });
let page, errors;
test.beforeAll(async ({ browser }) => {
  page = await browser.newPage({ viewport: { width: 400, height: 900 }, serviceWorkers: "block" });
  errors = watchErrors(page);
  await openApp(page, "#suche");
  await waitAllData(page);
});
test.afterAll(async () => { await page.close(); });

test("alle Kartendaten geladen, keine doppelten Karten", async () => {
  const s = await page.evaluate(() => ({
    cards: quickData.cards.length, unique: new Set(quickData.cards.map((c) => c.i)).size, sets: quickData.sets.length,
    sealed: quickData.cards.filter((c) => c.x === "sealed").length, asia: quickData.cards.filter((c) => c.L).length,
    badSet: quickData.cards.filter((c) => !quickData.sets[c.s]).length,
  }));
  expect(s.cards).toBeGreaterThan(40000);
  expect(s.unique).toBe(s.cards);
  expect(s.sealed).toBeGreaterThan(1000);
  expect(s.asia).toBeGreaterThan(5000);
  expect(s.badSet).toBe(0);
});

test("Name und Nummer finden genau die Karte", async () => {
  const r = await page.evaluate(() => ["Glurak 199", "Glurak ex 199/165", "Charizard 199"].map((q) => quickSearch(q).list[0]?.i));
  expect(r).toEqual(["sv03.5-199", "sv03.5-199", "sv03.5-199"]);
});

test("Sprache in der Suche filtert die Karten", async () => {
  const r = await page.evaluate(() => {
    const ja = quickSearch("Glurak japanisch").list, de = quickSearch("Glurak deutsch").list;
    return { ja: ja.length, jaOk: ja.every((c) => c.L === "ja"), de: de.length, deOk: de.every((c) => !c.L) };
  });
  expect(r.ja).toBeGreaterThan(0);
  expect(r.jaOk).toBe(true);
  expect(r.de).toBeGreaterThan(0);
  expect(r.deOk).toBe(true);
});

test("Sealed-Produkte nur, wenn danach gesucht wird", async () => {
  const r = await page.evaluate(() => ({
    plain: quickSearch("Glurak").list.some((c) => c.x === "sealed"),
    display: quickSearch("151 display").list.filter((c) => c.x === "sealed").length,
    first: quickSearch("151 display").list[0]?.x,
  }));
  expect(r.plain).toBe(false);
  expect(r.display).toBeGreaterThan(0);
  expect(r.first).toBe("sealed");
});

test("Eingabe zeigt Karten mit Preis und „Bieten bis“", async () => {
  await page.fill("#quick-input", "Glurak 199");
  const card = page.locator("#quick-results .qcard").first();
  await expect(card).toContainText("Glurak");
  await expect(card.locator(".qprice.bid")).toBeVisible();
  // Rechnung prüfen: Standard Ø 30 Tage minus 20 %, auf 50 Cent abgerundet
  const expected = await page.evaluate(() => { const c = quickSearch("Glurak 199").list[0]; return fmtPrice(Math.floor(c.a30 * 0.8 * 2) / 2); });
  await expect(card.locator(".qprice.bid b")).toHaveText(expected);
  // Einstellung ändern: 30 % Marge und 1,50 € Versand
  await page.click("#bid-set summary");
  await page.fill("#bid-margin", "30"); await page.locator("#bid-margin").dispatchEvent("change");
  await page.fill("#bid-ship", "1,50"); await page.locator("#bid-ship").dispatchEvent("change");
  const expected2 = await page.evaluate(() => { const c = quickSearch("Glurak 199").list[0]; return fmtPrice(Math.floor((c.a30 * 0.7 - 1.5) * 2) / 2); });
  await expect(page.locator("#quick-results .qcard").first().locator(".qprice.bid b")).toHaveText(expected2);
  await expect(page.locator("#bid-sum")).toContainText("30 % Marge");
});

test("Suche und Nachschlagen bleiben schnell", async () => {
  const ms = await page.evaluate(() => {
    const t0 = performance.now();
    for (const q of ["Glurak", "pika", "25", "151 display", "Mew ex japanisch"]) quickSearch(q);
    const search = performance.now() - t0;
    // Früher wurde hier bei jedem Aufruf der ganze Karten-Index neu gebaut
    const t1 = performance.now();
    for (let i = 0; i < 3000; i++) archCurrent(quickData.cards[(i * 7919) % quickData.cards.length]);
    return { search, lookup: performance.now() - t1 };
  });
  expect(ms.search).toBeLessThan(2500);
  expect(ms.lookup).toBeLessThan(300);
});

test("keine Fehler im Browser", async () => { expect(errors).toEqual([]); });
