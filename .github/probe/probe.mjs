// Einmaliger Test: TCGplayer-Daten (tcgcsv.com) und EZB-Kurs erreichbar? Wird danach wieder gelöscht.
const get = async (u, type = "json") => { const r = await fetch(u, { headers: { "user-agent": "pokemon-top30-probe" } }); if (!r.ok) throw new Error(`${u}: HTTP ${r.status}`); return type === "json" ? r.json() : r.text(); };
try {
  const ecb = await get("https://www.ecb.europa.eu/stats/eurofxref/eurofxref-daily.xml", "text");
  console.log("ECB:", /time='([^']+)'/.exec(ecb)?.[1], /currency='USD' rate='([^']+)'/.exec(ecb)?.[1]);
} catch (e) { console.log("ECB FAIL", e.message); }
for (const cat of [3, 85]) {
  try {
    const g = await get(`https://tcgcsv.com/tcgplayer/${cat}/groups`);
    const groups = g.results ?? g;
    console.log(`cat ${cat}: ${groups.length} groups; newest:`, groups.sort((a, b) => (b.publishedOn ?? "").localeCompare(a.publishedOn ?? "")).slice(0, 12).map((x) => `${x.groupId}|${x.name}|${x.abbreviation}|${x.publishedOn?.slice(0, 10)}`).join(" ;; "));
    const hits = groups.filter((x) => /30th|30 th|anniversary|celebration|classic|ascended|mega/i.test(x.name));
    console.log(`cat ${cat} hits:`, hits.map((x) => `${x.groupId}|${x.name}|${x.publishedOn?.slice(0, 10)}`).join(" ;; "));
    for (const h of hits.filter((x) => /30th|anniversary|classic collection/i.test(x.name)).slice(0, 4)) {
      const prods = (await get(`https://tcgcsv.com/tcgplayer/${cat}/${h.groupId}/products`)).results;
      const prices = (await get(`https://tcgcsv.com/tcgplayer/${cat}/${h.groupId}/prices`)).results;
      const withP = prices.filter((p) => p.marketPrice || p.midPrice);
      console.log(`  ${h.name}: products ${prods.length}, price rows ${prices.length}, with price ${withP.length}`);
      const byId = new Map(prods.map((p) => [p.productId, p]));
      for (const p of withP.sort((a, b) => (b.marketPrice ?? 0) - (a.marketPrice ?? 0)).slice(0, 6)) {
        const pr = byId.get(p.productId);
        console.log(`    ${pr?.name} | ${JSON.stringify(pr?.extendedData?.filter((d) => ["Number", "Rarity"].includes(d.name)).map((d) => d.value))} | ${p.subTypeName} | market ${p.marketPrice} low ${p.lowPrice} mid ${p.midPrice}`);
      }
      console.log("    sample product keys:", Object.keys(prods[0] ?? {}).join(","));
    }
  } catch (e) { console.log(`cat ${cat} FAIL`, e.message); }
}
