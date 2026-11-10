// Einmaliger Test: Set-Kürzel, Cardmarket-Katalog für geteilte Produkte, TCGplayer für alte Sets. Wird danach gelöscht.
import { loadUsdRate, tcgplayerPrices } from "./tcgplayer.mjs";
const get = async (u) => { const r = await fetch(u, { headers: { "user-agent": "pokemon-top30 probe" } }); return r.ok ? r.json() : null; };
// 1) Set-Kürzel bei TCGdex
for (const id of ["sv06", "sv03.5", "me05", "ecard1", "base5", "swsh11", "me06"]) {
  const s = await get(`https://api.tcgdex.net/v2/en/sets/${id}`);
  console.log("abbr", id, JSON.stringify(s?.abbreviation ?? null), "| tcgOnline", s?.tcgOnline ?? null);
}
// 2) Cardmarket-Katalog: Produkte zu geteiltem Produkt (Arbok Expedition 274878, Dunkles Arbok 274055, Giratina 1xxxx)
const cat = await get("https://downloads.s3.cardmarket.com/productCatalog/productList/products_singles_6.json");
const byId = new Map(cat.products.map((p) => [p.idProduct, p]));
for (const pid of [274878, 274055]) {
  const p = byId.get(pid); console.log("cm", pid, JSON.stringify(p));
  if (p) console.log("   same exp+name:", cat.products.filter((x) => x.idExpansion === p.idExpansion && x.name.split(" [")[0] === p.name.split(" [")[0]).map((x) => `${x.idProduct}:${x.name}:${x.dateAdded}`).join(" | "));
}
console.log("cm product keys:", Object.keys(cat.products[0]).join(","));
// 3) TCGplayer-Gruppe für alte Sets per Datum + Name finden?
const fx = await loadUsdRate();
for (const id of ["ecard1", "base5", "swsh11", "dp3", "base1", "neo1", "ex12"]) {
  const s = await get(`https://api.tcgdex.net/v2/en/sets/${id}`);
  if (!s) { console.log("tp", id, "no tcgdex"); continue; }
  const m = await tcgplayerPrices({ id: `x-${id}`, name: s.name, enName: s.name, releaseDate: s.releaseDate }, s.cards.slice(0, 200).map((c) => ({ no: c.localId, name: c.name })), fx).catch((e) => e.message);
  console.log("tp", id, s.name, s.releaseDate, Array.isArray(m) ? `${m.filter(Boolean).length}/${m.length}` : m);
  if (id === "ecard1" && Array.isArray(m)) s.cards.forEach((c, i) => { if (/Arbok/.test(c.name)) console.log("    ", c.localId, c.name, m[i]?.usd, m[i]?.tpName); });
}
