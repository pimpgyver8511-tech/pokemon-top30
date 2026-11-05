// Einmaliger Test: Cardmarket-Preisliste und Produktkatalog (öffentliche Downloads). Wird danach gelöscht.
const get = async (u) => { const r = await fetch(u, { headers: { "user-agent": "pokemon-top30 (GitHub Actions)" } }); console.log(u, r.status, r.headers.get("content-length")); if (!r.ok) return null; return r.json(); };
const base = "https://downloads.s3.cardmarket.com/productCatalog";
const pg = await get(`${base}/priceGuide/price_guide_6.json`);
const cat = await get(`${base}/productList/products_singles_6.json`);
if (pg) { console.log("pg keys", Object.keys(pg), "createdAt", pg.createdAt); const list = pg.priceGuides ?? []; console.log("pg entries", list.length, JSON.stringify(list[0])); }
if (cat) {
  console.log("cat keys", Object.keys(cat)); const list = cat.products ?? [];
  console.log("products", list.length, JSON.stringify(list[0]));
  const hits = list.filter((p) => /Uxie Lv\.55|Erika's Jigglypuff|Mew ex|Guzzlord-GX/.test(p.name));
  const byExp = new Map();
  for (const p of hits) byExp.set(p.idExpansion, [...(byExp.get(p.idExpansion) ?? []), `${p.idProduct}:${p.name}:${p.dateAdded ?? ""}`]);
  for (const [e, v] of byExp) console.log(" exp", e, v.slice(0, 6).join(" | "));
  const newest = [...list].sort((a, b) => String(b.dateAdded).localeCompare(String(a.dateAdded))).slice(0, 15);
  console.log("newest", newest.map((p) => `${p.idProduct}:${p.idExpansion}:${p.name}:${p.dateAdded}`).join(" | "));
  if (pg) {
    const price = new Map((pg.priceGuides ?? []).map((x) => [x.idProduct, x]));
    for (const p of list.filter((p) => /Uxie Lv\.55/.test(p.name))) console.log(" uxie", p.idProduct, p.idExpansion, JSON.stringify(price.get(p.idProduct)));
  }
}
// Weitere bekannte Dateien
await get(`${base}/productList/products_nonsingles_6.json`).then((x) => x && console.log("nonsingles", x.products?.length)).catch(() => {});
