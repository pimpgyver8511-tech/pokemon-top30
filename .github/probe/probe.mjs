// Einmaliger Test: Delta Reign (ME06) bei TCGdex, TCGplayer und Cardmarket. Wird danach gelöscht.
import { loadUsdRate, tcgplayerCards } from "./tcgplayer.mjs";
import { cardmarketGuidePrices } from "./cmguide.mjs";
const get = async (u) => { const r = await fetch(u, { headers: { "user-agent": "pokemon-top30 probe" } }); return r.ok ? r.json() : `HTTP ${r.status}`; };
for (const l of ["de", "en"]) { const s = await get(`https://api.tcgdex.net/v2/${l}/sets/me06`); console.log("tcgdex", l, typeof s === "string" ? s : `${s.name} ${s.releaseDate} ${s.cards?.length}`); }
const ser = await get("https://api.tcgdex.net/v2/de/series/me"); console.log("serie me:", typeof ser === "string" ? ser : ser.sets.map((x) => `${x.id}:${x.name}`).join(", "));
const groups = (await get("https://tcgcsv.com/tcgplayer/3/groups")).results;
const g = groups.filter((x) => /delta reign|ME06/i.test(x.name)); console.log("tp groups", JSON.stringify(g));
const fx = await loadUsdRate();
const cards = await tcgplayerCards({ id: "me06", name: "Delta Reign", enName: "Delta Reign", releaseDate: g[0]?.publishedOn?.slice(0, 10) }, fx);
console.log("tp cards", cards?.length, "priced", cards?.filter((c) => c.avg30).length);
const top = [...(cards ?? [])].filter((c) => c.avg30).sort((a, b) => b.avg30 - a.avg30).slice(0, 12);
for (const c of top) console.log(`  ${c.no} ${c.name} | ${c.rarity} | ${c.usd} $ -> ${c.avg30} € | img ${c.img ? "ja" : "nein"}`);
console.log("numbers sample:", (cards ?? []).slice(0, 10).map((c) => c.no).join(","));
const res = await cardmarketGuidePrices((cards ?? []).map((c) => ({ name: c.name, date: g[0]?.publishedOn?.slice(0, 10), ref: c.avg30 })));
const ok = res.filter(Boolean).length; console.log("cardmarket matched", ok);
const cm = (cards ?? []).map((c, i) => [c, res[i]]).filter(([, p]) => p).sort((a, b) => b[1].avg30 - a[1].avg30).slice(0, 10);
for (const [c, p] of cm) console.log(`  CM ${c.no} ${c.name}: ${p.avg30} € (7T ${p.avg7}, ab ${p.low}) | TP ${c.avg30} €`);
const cat = await get("https://downloads.s3.cardmarket.com/productCatalog/productList/products_singles_6.json");
const near = cat.products.filter((p) => p.dateAdded >= "2026-10-01");
const m = new Map(); for (const p of near) m.set(p.idExpansion, (m.get(p.idExpansion) ?? 0) + 1);
console.log("cm expansions since 10/2026", [...m].sort((a, b) => b[1] - a[1]).slice(0, 10).map(([e, n]) => `${e}:${n}`).join(" "));
