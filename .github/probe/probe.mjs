// Einmaliger Test: Sealed-Produkte im Cardmarket-Katalog. Wird danach gelöscht.
const get = async (u) => (await fetch(u, { headers: { "user-agent": "pokemon-top30 probe" } })).json();
const base = "https://downloads.s3.cardmarket.com/productCatalog";
const ns = (await get(`${base}/productList/products_nonsingles_6.json`)).products;
const pg = await get(`${base}/priceGuide/price_guide_6.json`);
const price = new Map(pg.priceGuides.map((x) => [x.idProduct, x]));
console.log("nonsingles", ns.length, "keys", Object.keys(ns[0]).join(","));
const cats = new Map(); for (const p of ns) cats.set(p.categoryName, (cats.get(p.categoryName) ?? 0) + 1);
console.log("categories", JSON.stringify([...cats].sort((a, b) => b[1] - a[1])));
const priced = ns.filter((p) => price.get(p.idProduct)?.avg30 || price.get(p.idProduct)?.trend || price.get(p.idProduct)?.low);
console.log("priced", priced.length, "with avg30", ns.filter((p) => price.get(p.idProduct)?.avg30).length);
for (const re of [/Shining Fates/i, /Prismatic Evolutions/i, /151/, /Delta Reign/i, /Glänzendes|Destined Rivals/i]) {
  console.log("==", re, ns.filter((p) => re.test(p.name)).slice(0, 8).map((p) => `${p.idProduct}|${p.name}|${p.categoryName}|exp ${p.idExpansion}|${p.dateAdded}|avg30 ${price.get(p.idProduct)?.avg30}|low ${price.get(p.idProduct)?.low}`).join("\n   "));
}
// Gemischte Sprachen? Gibt es "German"/"Japanese" im Namen?
console.log("japanese in name", ns.filter((p) => /japan/i.test(p.name)).length, "german", ns.filter((p) => /german|deutsch/i.test(p.name)).length);
console.log("sample price row", JSON.stringify(price.get(priced[0]?.idProduct)));
