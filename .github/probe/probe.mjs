// Einmaliger Test der TCGplayer-Zuordnung gegen echte Daten. Wird danach wieder gelöscht.
import { loadUsdRate, tcgplayerPrices } from "./tcgplayer.mjs";
const fx = await loadUsdRate();
console.log("FX", fx);
const get = async (u) => { const r = await fetch(u); if (!r.ok) throw new Error(`${u} ${r.status}`); return r.json(); };
for (const id of ["30th", "30th-c"]) {
  const en = await get(`https://api.tcgdex.net/v2/en/sets/${id}`);
  console.log(`== ${id}: ${en.name} ${en.releaseDate} cards ${en.cards.length}`);
  const map = await tcgplayerPrices({ id, name: en.name, enName: en.name, releaseDate: en.releaseDate }, en.cards.map((c) => ({ no: c.localId, name: c.name })), fx);
  const rows = en.cards.map((c, i) => [c.localId, c.name, map?.[i]]).filter((x) => x[2]);
  for (const [no, n, p] of rows.filter((r) => /legend|palkia|nidoran/i.test(r[1]))) console.log(`   SPECIAL ${no} ${n} -> ${p.tpName}: ${p.avg30} €`);
  rows.sort((a, b) => b[2].avg30 - a[2].avg30);
  for (const [no, n, p] of rows.slice(0, 8)) console.log(`   ${no} ${n}: ${p.usd} $ -> ${p.avg30} € ${p.variant ?? ""} ${p.tpUrl}`);
  for (const [no, n, p] of rows.slice(-3)) console.log(`   ${no} ${n}: ${p.usd} $ -> ${p.avg30} €`);
}
// Generische Gruppensuche (ohne feste Zuordnung) prüfen
const en = await get("https://api.tcgdex.net/v2/en/sets/30th");
const m2 = await tcgplayerPrices({ id: "x30th", name: en.name, enName: en.name, releaseDate: en.releaseDate }, en.cards.slice(0, 5).map((c) => ({ no: c.localId, name: c.name })), fx);
console.log("generic match size", m2?.filter(Boolean).length);
try {
  const r = await get("https://api.pokemontcg.io/v2/cards?q=set.id:cel25c&select=id,name,number&pageSize=50");
  console.log("cel25c ids:", r.data.map((c) => c.id).join(","));
  const map = await tcgplayerPrices({ id: "cel25c", name: "Celebrations: Classic Collection", releaseDate: "2021-10-08" }, r.data.map((c) => ({ no: c.number, name: c.name })), fx);
  r.data.forEach((c, i) => console.log(`   cel25c ${c.number} ${c.name} -> ${map[i]?.tpName ?? "-"}: ${map[i]?.avg30 ?? "-"} €`));
} catch (e) { console.log("cel25c", e.message); }
