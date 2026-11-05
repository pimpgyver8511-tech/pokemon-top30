// Einmaliger Test der Cardmarket-Zuordnung gegen echte Daten. Wird danach gelöscht.
import { cardmarketGuidePrices } from "./cmguide.mjs";
import { loadUsdRate, tcgplayerPrices } from "./tcgplayer.mjs";
const get = async (u) => (await fetch(u, { headers: { "user-agent": "pokemon-top30 probe" } })).json();
const fx = await loadUsdRate();
const cards = [];
for (const id of ["30th", "30th-c"]) {
  const en = await get(`https://api.tcgdex.net/v2/en/sets/${id}`);
  const tp = await tcgplayerPrices({ id, name: en.name, enName: en.name, releaseDate: en.releaseDate }, en.cards.map((c) => ({ no: c.localId, name: c.name })), fx);
  en.cards.forEach((c, i) => cards.push({ set: id, no: c.localId, name: c.name, date: en.releaseDate, ref: tp?.[i]?.avg30 ?? null }));
  for (const x of tp?.extra ?? []) cards.push({ set: id, no: x.no, name: x.name, date: en.releaseDate, ref: x.avg30 });
}
const res = await cardmarketGuidePrices(cards);
const rows = cards.map((c, i) => ({ ...c, cm: res[i] }));
const ok = rows.filter((r) => r.cm);
console.log("matched", ok.length, "of", rows.length);
for (const r of ok.sort((a, b) => b.cm.avg30 - a.cm.avg30).slice(0, 15)) console.log(`  ${r.set} ${r.no} ${r.name}: CM ${r.cm.avg30} € (7T ${r.cm.avg7}, ab ${r.cm.low}) | TP ${r.ref} € | id ${r.cm.idProduct}`);
for (const r of rows.filter((r) => /Uxie|Jigglypuff|Pikachu|Mew/.test(r.name))) console.log(`  CHECK ${r.set} ${r.no} ${r.name}: CM ${r.cm?.avg30 ?? "-"} | TP ${r.ref} | id ${r.cm?.idProduct ?? "-"}`);
console.log("unmatched:", rows.filter((r) => !r.cm).map((r) => `${r.set} ${r.no} ${r.name}`).join(" | "));
// Erweiterungen rund um den Termin
const cat = await get("https://downloads.s3.cardmarket.com/productCatalog/productList/products_singles_6.json");
const near = cat.products.filter((p) => p.dateAdded >= "2026-08-01" && p.dateAdded <= "2026-10-31");
const m = new Map(); for (const p of near) m.set(p.idExpansion, (m.get(p.idExpansion) ?? 0) + 1);
console.log("expansions", [...m].sort((a, b) => b[1] - a[1]).slice(0, 12).map(([e, n]) => `${e}:${n}`).join(" "));
