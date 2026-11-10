// Einmaliger Test: Giratina in Verlorener Ursprung im Cardmarket-Katalog. Wird danach gelöscht.
const get = async (u) => (await fetch(u, { headers: { "user-agent": "pokemon-top30 probe" } })).json();
const cat = await get("https://downloads.s3.cardmarket.com/productCatalog/productList/products_singles_6.json");
const pg = await get("https://downloads.s3.cardmarket.com/productCatalog/priceGuide/price_guide_6.json");
const price = new Map(pg.priceGuides.map((x) => [x.idProduct, x.avg30]));
const by = new Map(cat.products.map((p) => [p.idProduct, p]));
for (const id of [670816, 674143, 674192]) console.log(id, JSON.stringify(by.get(id)), price.get(id));
const exps = new Set([670816, 674143, 674192].map((id) => by.get(id)?.idExpansion));
for (const p of cat.products.filter((p) => /^Giratina/.test(p.name) && exps.has(p.idExpansion))) console.log("  ", p.idProduct, p.idExpansion, p.name, p.dateAdded, price.get(p.idProduct));
