// Export im Collectr-Format (für CardPal & Co.) und Import von Collectr-Dateien
import fs from "node:fs";
import { test } from "@playwright/test";
import { expect, openApp, waitAllData, watchErrors } from "./helpers.mjs";

// Spalten eines echten Collectr-Inventar-Exports (Stand 2026)
const COLLECTR_HEAD = "Portfolio Name,Category,Set,Product Name,Card Number,Rarity,Variance,Grade,Card Condition,Average Cost Paid,Quantity,Market Price (As of 2026-10-25),Price Override,Watchlist,Date Added,Notes";

// Ein paar Karten in die Sammlung legen
async function addCards(page, list) {
  await page.evaluate(async (list) => {
    let id = 1700000000000;
    for (const [i, extra] of list) {
      const c = quickData.cards.find((x) => x.i === i);
      await colPut({ id: id++, at: "2026-10-01T10:00:00.000Z", card: archCardInfo(c), qty: 1, buy: null, grade: "", thumb: null, archId: null, rec: null, ...extra });
    }
  }, list);
}

test("Export im Collectr-Format und wieder einlesen", async ({ page }, info) => {
  const errors = watchErrors(page);
  await openApp(page, "#suche");
  await waitAllData(page);
  const jp = await page.evaluate(() => quickData.cards.find((c) => c.L === "ja" && c.a30 > 1 && /idProduct=/.test(c.u ?? ""))?.i);
  await addCards(page, [
    ["sv03.5-199", { qty: 2, buy: 250, grade: "PSA 10", folder: "Binder 1", note: "vom Flohmarkt, \"super\"" }],
    ["sv03.5-025", { variant: "Reverse Holo", cond: "EX", buy: 0 }],
    ["sv08.5-161", { own: 900, lang: "de" }],
    [jp, {}],
  ]);
  await page.click("#view-collection");
  await expect(page.locator(".col-item").first()).toBeVisible();
  const [dl] = await Promise.all([page.waitForEvent("download"), page.click("#col-collectr")]);
  expect(dl.suggestedFilename()).toMatch(/collectr-format.*\.csv$/);
  const file = info.outputPath("export.csv");
  await dl.saveAs(file);
  const text = fs.readFileSync(file, "utf8");
  const lines = text.trim().split("\n");
  // Kopfzeile genau wie bei Collectr (nur das Datum im Marktpreis unterscheidet sich)
  expect(lines[0].replace(/\(As of \d{4}-\d{2}-\d{2}\)/, "(As of X)")).toBe(COLLECTR_HEAD.replace(/\(As of [^)]+\)/, "(As of X)"));
  expect(lines.length).toBe(5);
  const rows = await page.evaluate((t) => csvParse(t), text);
  const glurak = rows.find((r) => r["Product Name"] === "Charizard ex");
  expect(glurak).toMatchObject({ "Portfolio Name": "Binder 1", Category: "Pokemon", Set: "151", "Card Number": "199/165", Rarity: "Special Illustration Rare",
    Variance: "Holofoil", Grade: "PSA 10", "Card Condition": "Near Mint", "Average Cost Paid": "250", Quantity: "2", Watchlist: "false", "Date Added": "2026-10-01" });
  expect(glurak.Notes).toContain('vom Flohmarkt, "super"');
  expect(glurak.Notes).toContain("idProduct=");
  const pika = rows.find((r) => r["Product Name"] === "Pikachu");
  expect(pika).toMatchObject({ "Card Number": "025/165", Rarity: "Common", Variance: "Reverse Holofoil", "Card Condition": "Lightly Played", Grade: "Ungraded" });
  expect(rows.find((r) => r["Product Name"] === "Umbreon ex")).toMatchObject({ Set: "Prismatic Evolutions", "Price Override": "900" });
  expect(rows.find((r) => / \(JP\)$/.test(r.Set))).toBeTruthy();

  // Wieder einlesen: alle sicher erkannt, über den Cardmarket-Link in den Notizen
  await page.evaluate(async () => { for (const e of await colAll()) await colDel(e.id); });
  await page.setInputFiles("#imp-file", { name: "export.csv", mimeType: "text/csv", buffer: Buffer.from(text) });
  await expect(page.locator("#col-import")).toContainText("Collectr-Format");
  const res = await page.evaluate(() => colImport.results.map((x) => ({ i: x.c?.i, how: x.how, variant: x.r.variant, grade: x.r.grade, buy: x.r.buy, own: x.r.own, cond: x.r.cond, folder: x.r.folder, note: x.r.note, cardLang: x.r.cardLang })));
  expect(res.map((x) => x.how)).toEqual(["sicher", "sicher", "sicher", "sicher"]);
  expect(res.map((x) => x.i).sort()).toEqual(["sv03.5-025", "sv03.5-199", "sv08.5-161", jp].sort());
  expect(res.find((x) => x.i === "sv03.5-199")).toMatchObject({ grade: "PSA 10", buy: 250, folder: "Binder 1", note: 'vom Flohmarkt, "super"' });
  expect(res.find((x) => x.i === "sv03.5-025")).toMatchObject({ variant: "Reverse Holo", cond: "EX" });
  expect(res.find((x) => x.i === "sv08.5-161")).toMatchObject({ own: 900, cardLang: "de" });
  await page.click("#imp-go");
  await expect.poll(() => page.evaluate(async () => (await colAll()).length)).toBe(4);
  expect(errors).toEqual([]);
});

test("Collectr-Datei einlesen: Set-Namen, Zusätze, andere Spiele", async ({ page }) => {
  const errors = watchErrors(page);
  await openApp(page, "#sammlung");
  await waitAllData(page);
  const csv = [COLLECTR_HEAD,
    "Pokemon singles,Pokemon,SV: Scarlet & Violet 151,Charizard ex - 199/165,199/165,Special Illustration Rare,Holofoil,PSA 9,Near Mint,120.5,1,300,0,false,2026-07-21,",
    "Pokemon singles,Pokemon,Prismatic Evolutions,Umbreon ex,161/131,Special Illustration Rare,Holofoil,Ungraded,Lightly Played,0,2,1000,0,false,2026-07-21,",
    "Pokemon singles,Pokemon,151,Pikachu (Reverse Holo),025/165,Common,Normal,Ungraded,Near Mint,0,3,1,0,false,2026-07-21,",
    "Riftbound singles,Riftbound,Origins,\"Sett, Brawler\",001/100,Rare,Foil,Ungraded,Near Mint,0,1,1,0,false,2026-07-21,",
  ].join("\n");
  // Datei direkt übergeben (Pfade mit Umlauten kommen im Browser nicht an)
  await page.setInputFiles("#imp-file", { name: "collectr.csv", mimeType: "text/csv", buffer: Buffer.from(csv) });
  await expect(page.locator("#col-import")).toContainText("Collectr-Format");
  const res = await page.evaluate(() => colImport.results.map((x) => ({ i: x.c?.i, how: x.how, qty: x.r.qty, variant: x.r.variant, grade: x.r.grade, buy: x.r.buy, cond: x.r.cond })));
  expect(res).toHaveLength(3); // Riftbound wird ausgelassen
  expect(res[0]).toMatchObject({ i: "sv03.5-199", how: "sicher", grade: "PSA 9", buy: 120.5 });
  expect(res[1]).toMatchObject({ i: "sv08.5-161", how: "sicher", qty: 2, buy: null, cond: "EX" }); // 0 = kein Kaufpreis
  expect(res[2]).toMatchObject({ i: "sv03.5-025", how: "sicher", qty: 3, variant: "Reverse Holo" });
  expect(errors).toEqual([]);
});
