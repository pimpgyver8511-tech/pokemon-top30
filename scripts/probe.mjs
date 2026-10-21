// Einmaliger Test: Welche asiatischen Karten und Preise liefert TCGdex?
const API = "https://api.tcgdex.net/v2";
const get = async (u) => { try { const r = await fetch(u); return r.ok ? r.json() : `HTTP ${r.status}`; } catch (e) { return `ERR ${e.message}`; } };
for (const lang of ["ja", "ko", "zh-tw", "zh-cn", "th", "id"]) {
  const sets = await get(`${API}/${lang}/sets`);
  if (!Array.isArray(sets)) { console.log(lang, "sets:", sets); continue; }
  console.log(`\n== ${lang}: ${sets.length} Sets, letzte: ${sets.slice(-6).map((s) => s.id + " " + s.name).join(" | ")}`);
  let priced = 0, checked = 0;
  for (const s of sets.slice(-4)) {
    const full = await get(`${API}/${lang}/sets/${encodeURIComponent(s.id)}`);
    console.log(`  Set ${s.id} ${full?.name} release=${full?.releaseDate} serie=${full?.serie?.id} cards=${full?.cards?.length}`);
    for (const c of (full?.cards ?? []).slice(-3)) {
      const card = await get(`${API}/${lang}/cards/${encodeURIComponent(c.id)}`);
      checked++;
      if (card?.pricing?.cardmarket) priced++;
      console.log(`    ${c.id} ${card?.name} img=${card?.image ?? "-"} pricing=${JSON.stringify(card?.pricing ?? null).slice(0, 220)}`);
    }
  }
  console.log(`  -> ${priced}/${checked} Karten mit Cardmarket-Preis`);
}
const csv = await fetch("https://raw.githubusercontent.com/PokeAPI/pokeapi/master/data/v2/csv/pokemon_species_names.csv").then((r) => r.text()).catch((e) => "ERR " + e.message);
console.log("\nPokeAPI species names:", csv.length, "Zeichen");
console.log(csv.split("\n").filter((l) => l.startsWith("149,")).join("\n"));
