// Holt die Cardmarket-Preise aller Karten der Haupt- und Spezialsets der
// letzten 5 Jahre über die TCGdex-API und schreibt die Top 30 pro Set
// (sortiert nach 30-Tage-Durchschnitt) nach docs/data/.
import { mkdir, readdir, writeFile } from "node:fs/promises";
import path from "node:path";

const API = process.env.TCGDEX_API ?? "https://api.tcgdex.net/v2";
const SERIES = ["swsh", "sv", "me"]; // Schwert & Schild, Karmesin & Purpur, Mega-Entwicklung
const TOP_N = 30;
const YEARS = 5;
const CONCURRENCY = 6;
const OUT_DIR = path.resolve(import.meta.dirname, "..", "docs", "data");

const cutoff = new Date();
cutoff.setFullYear(cutoff.getFullYear() - YEARS);
const cutoffIso = cutoff.toISOString().slice(0, 10);

async function getJson(url, tries = 4) {
  for (let i = 1; ; i++) {
    try {
      const res = await fetch(url, {
        headers: { "User-Agent": "pokemon-top30 (GitHub Actions)" },
        signal: AbortSignal.timeout(60_000),
      });
      if (res.status === 404) return null;
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (err) {
      if (i >= tries) throw new Error(`${url}: ${err.message}`);
      await new Promise((r) => setTimeout(r, 1000 * 2 ** i));
    }
  }
}

// Deutsch bevorzugt, sonst Englisch (manche Sets/Karten fehlen auf Deutsch).
async function getLocalized(pathPart) {
  const de = await getJson(`${API}/de/${pathPart}`);
  if (de) return { data: de, lang: "de" };
  const en = await getJson(`${API}/en/${pathPart}`);
  return en ? { data: en, lang: "en" } : null;
}

async function mapLimit(items, limit, fn) {
  const out = new Array(items.length);
  let next = 0;
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, async () => {
      while (next < items.length) {
        const i = next++;
        out[i] = await fn(items[i], i);
      }
    }),
  );
  return out;
}

const isNum = (v) => typeof v === "number" && Number.isFinite(v) && v > 0;
const round = (v) => (isNum(v) ? Math.round(v * 100) / 100 : null);

// Normalpreis bevorzugen; nur wenn der fehlt, die Reverse-Holo-Preise ("-holo").
function pickPrice(cm) {
  if (!cm) return null;
  if (isNum(cm.avg30) || isNum(cm.avg7)) {
    return {
      avg1: round(cm.avg1), avg7: round(cm.avg7), avg30: round(cm.avg30),
      trend: round(cm.trend), low: round(cm.low), variant: null,
    };
  }
  if (isNum(cm["avg30-holo"]) || isNum(cm["avg7-holo"])) {
    return {
      avg1: round(cm["avg1-holo"]),
      low: round(cm["low-holo"]),
      avg7: round(cm["avg7-holo"]),
      avg30: round(cm["avg30-holo"]),
      trend: round(cm["trend-holo"]),
      variant: "Reverse Holo",
    };
  }
  return null;
}

function cardmarketUrl(idProduct, name) {
  if (idProduct) return `https://www.cardmarket.com/de/Pokemon/Products?idProduct=${idProduct}`;
  return `https://www.cardmarket.com/de/Pokemon/Products/Search?searchString=${encodeURIComponent(name)}`;
}

// TCGdex hat für Trainer-/Galar-Galerie-Karten oft kein Bild; dann pokemontcg.io.
function imageUrls(tcgdexImage, cardId) {
  if (tcgdexImage) return { thumb: `${tcgdexImage}/low.webp`, large: `${tcgdexImage}/high.webp` };
  const m = /^(swsh\d+(?:\.5)?)(tg|gg)-(.+)$/i.exec(cardId ?? "");
  if (!m) return null;
  const setId = `${m[1].replace(".5", "pt5")}${m[2].toLowerCase()}`;
  const base = `https://images.pokemontcg.io/${setId}/${m[3].toUpperCase()}`;
  return { thumb: `${base}.png`, large: `${base}_hires.png` };
}

function isWantedSet(set) {
  if (!set?.releaseDate || set.releaseDate < cutoffIso) return false;
  if (/p$/i.test(set.id)) return false; // Promo-Sets (swshp, svp, mep …)
  if (/promo|energie|energy/i.test(set.name ?? "")) return false;
  return (set.cardCount?.total ?? set.cards?.length ?? 0) >= 20;
}

async function loadSets() {
  const ids = [];
  for (const s of SERIES) {
    const serie = await getLocalized(`series/${s}`);
    if (!serie) {
      console.warn(`Serie ${s} nicht gefunden – übersprungen`);
      continue;
    }
    ids.push(...serie.data.sets.map((x) => x.id));
  }
  const sets = await mapLimit(ids, CONCURRENCY, (id) => getLocalized(`sets/${encodeURIComponent(id)}`));
  return sets.filter((s) => s && isWantedSet(s.data)).map((s) => s.data);
}

// Ersatzquelle pokemontcg.io (ebenfalls Cardmarket-Preise) für Sets, die TCGdex
// noch nicht mit Cardmarket verknüpft hat. Liefert Map: Kartennummer -> Preisdaten.
const PTCG = process.env.PTCG_API ?? "https://api.pokemontcg.io/v2";
const normNo = (no) => String(no ?? "").replace(/^0+(?=\w)/, "").toUpperCase();

async function pokemontcgPrices(set) {
  try {
    const en = await getJson(`${API}/en/sets/${encodeURIComponent(set.id)}`);
    const name = en?.name ?? set.name;
    const found = await getJson(`${PTCG}/sets?q=${encodeURIComponent(`name:"${name}"`)}`);
    const candidates = found?.data ?? [];
    const match =
      candidates.find((x) => x.releaseDate?.replaceAll("/", "-") === set.releaseDate) ?? candidates[0];
    if (!match) {
      console.warn(`  pokemontcg.io: kein Set "${name}" gefunden`);
      return null;
    }
    const map = new Map();
    for (let page = 1; page <= 4; page++) {
      const q = encodeURIComponent(`set.id:${match.id}`);
      const res = await getJson(`${PTCG}/cards?q=${q}&page=${page}&pageSize=250&select=id,number,cardmarket,images`);
      for (const c of res?.data ?? []) map.set(normNo(c.number), c);
      if (!res || page * 250 >= (res.totalCount ?? 0)) break;
    }
    const priced = [...map.values()].filter((c) => isNum(c.cardmarket?.prices?.avg30)).length;
    console.log(`  pokemontcg.io: Set ${match.id} "${match.name}", ${map.size} Karten, ${priced} mit Cardmarket-Preis`);
    return map;
  } catch (err) {
    console.warn(`  pokemontcg.io nicht erreichbar: ${err.message}`);
    return null;
  }
}

function pickPtcgPrice(c) {
  const p = c?.cardmarket?.prices;
  if (!p) return null;
  if (isNum(p.avg30) || isNum(p.avg7)) {
    return {
      avg1: round(p.avg1), avg7: round(p.avg7), avg30: round(p.avg30),
      trend: round(p.trendPrice), low: round(p.lowPrice), variant: null,
    };
  }
  if (isNum(p.reverseHoloAvg30)) {
    return {
      avg1: round(p.reverseHoloAvg1), avg7: round(p.reverseHoloAvg7), avg30: round(p.reverseHoloAvg30),
      trend: round(p.reverseHoloTrend), low: round(p.reverseHoloLow), variant: "Reverse Holo",
    };
  }
  return null;
}

async function buildSet(set, fallback = null) {
  const all = [...(set.cards ?? []), ...(set.extraCards ?? [])];
  const cards = await mapLimit(all, CONCURRENCY, async (brief) => {
    const res = await getLocalized(`cards/${encodeURIComponent(brief.id)}`);
    const card = res?.data ?? brief;
    let price = pickPrice(card.pricing?.cardmarket);
    let idProduct = card.pricing?.cardmarket?.idProduct;
    let image = card.image ?? brief.image;
    // Englische Variante: für den englischen Namen (Schnellsuche) und falls
    // Preise/Bild nur in der deutschen Variante fehlen.
    let enName = null;
    if (res?.lang === "de") {
      const en = await getJson(`${API}/en/cards/${encodeURIComponent(brief.id)}`);
      enName = en?.name ?? null;
      price ??= pickPrice(en?.pricing?.cardmarket);
      idProduct ??= en?.pricing?.cardmarket?.idProduct;
      image ??= en?.image;
    }
    let url = cardmarketUrl(idProduct, card.name);
    const alt = fallback?.get(normNo(card.localId));
    if (!price && alt) {
      price = pickPtcgPrice(alt);
      if (alt.cardmarket?.url) url = alt.cardmarket.url;
    }
    let imgs = imageUrls(image, card.id);
    if (!imgs && alt?.images?.small) imgs = { thumb: alt.images.small, large: alt.images.large ?? alt.images.small };
    const hasPrice = Boolean(price && isNum(price.avg30));
    return {
      hasPrice,
      enName: enName && enName !== card.name ? enName : null,
      id: card.id,
      no: card.localId,
      name: card.name,
      rarity: card.rarity ?? null,
      thumb: imgs?.thumb ?? null,
      large: imgs?.large ?? null,
      ...(price ?? {}),
      url,
    };
  });
  const priced = cards.filter((c) => c?.hasPrice);
  const top = priced
    .sort((a, b) => b.avg30 - a.avg30)
    .slice(0, TOP_N)
    .map(({ hasPrice, enName, avg1, low, ...c }) => c);
  console.log(`${set.name} (${set.id}): ${priced.length} Karten mit Preis, Top ${top.length}`);
  return {
    id: set.id,
    name: set.name,
    serie: set.serie?.name ?? null,
    releaseDate: set.releaseDate,
    logo: set.logo ?? null,
    cards: top,
    allCards: cards.filter(Boolean),
    official: set.cardCount?.official ?? null,
  };
}

// Schreibt ins Log, warum ein Set keine Preise hat (z. B. ganz neue Sets).
async function explainMissing(set) {
  const cards = [...(set.cards ?? []), ...(set.extraCards ?? [])];
  console.warn(`  Karten laut TCGdex: ${cards.length}, cardCount: ${JSON.stringify(set.cardCount)}`);
  for (const brief of cards.slice(0, 3)) {
    for (const lang of ["de", "en"]) {
      const c = await getJson(`${API}/${lang}/cards/${encodeURIComponent(brief.id)}`);
      console.warn(`  ${lang} ${brief.id} ${c?.name ?? "(fehlt)"}: pricing=${JSON.stringify(c?.pricing ?? null).slice(0, 300)}`);
    }
  }
}

// ---------- Schnellsuche: Pokémon-Namen in allen Sprachen ----------
const SPECIES_CSV =
  process.env.SPECIES_CSV ?? "https://raw.githubusercontent.com/PokeAPI/pokeapi/master/data/v2/csv/pokemon_species_names.csv";
// PokeAPI-Sprach-IDs: 1 ja-Kana, 2 Romaji, 3 ko, 4 zh-Hant, 5 fr, 6 de, 7 es, 8 it, 9 en, 11 ja, 12 zh-Hans
const CARD_LANG_IDS = { de: [6, 9], en: [9], ja: [1, 11, 9], ko: [3, 9], "zh-tw": [4, 12, 9], "zh-cn": [12, 4, 9] };

const foldName = (t) =>
  String(t ?? "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[-'’.:]/g, " ").replace(/\s+/g, " ").trim();

function parseCsvLine(line) {
  const out = [];
  let cur = "", q = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (q) {
      if (ch === '"' && line[i + 1] === '"') { cur += '"'; i++; }
      else if (ch === '"') q = false;
      else cur += ch;
    } else if (ch === '"') q = true;
    else if (ch === ",") { out.push(cur); cur = ""; }
    else cur += ch;
  }
  out.push(cur);
  return out;
}

async function loadSpecies() {
  try {
    const res = await fetch(SPECIES_CSV, { signal: AbortSignal.timeout(60_000) });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const byId = new Map(); // id -> Map(langId -> name)
    for (const line of (await res.text()).split("\n").slice(1)) {
      if (!line.trim()) continue;
      const [id, lang, name] = parseCsvLine(line);
      if (!name) continue;
      if (!byId.has(+id)) byId.set(+id, new Map());
      byId.get(+id).set(+lang, name);
    }
    console.log(`Pokémon-Namen: ${byId.size} Arten`);
    return byId;
  } catch (err) {
    console.warn(`Pokémon-Namensliste nicht geladen: ${err.message}`);
    return null;
  }
}

// Liefert eine Funktion, die zu einem Kartennamen die enthaltenen Pokémon-Arten findet.
function makeSpeciesTagger(species) {
  if (!species) return () => [];
  const byLang = new Map(); // langId -> [[foldedName, id]]
  for (const [id, names] of species) {
    for (const [lang, name] of names) {
      const f = foldName(name);
      if (f.length < 2) continue;
      if (!byLang.has(lang)) byLang.set(lang, []);
      byLang.get(lang).push([f, id]);
    }
  }
  for (const list of byLang.values()) list.sort((a, b) => b[0].length - a[0].length); // längste zuerst
  const isWord = (ch) => ch !== undefined && /[\p{L}\p{N}]/u.test(ch);
  const latin = (t) => /^[\x00-\u024f\s]+$/.test(t);
  return (cardName, cardLang) => {
    let rest = foldName(cardName);
    const found = new Set();
    for (const lang of CARD_LANG_IDS[cardLang] ?? [9]) {
      for (const [name, id] of byLang.get(lang) ?? []) {
        let at = rest.indexOf(name);
        while (at !== -1) {
          const needsBoundary = latin(name);
          if (!needsBoundary || (!isWord(rest[at - 1]) && !isWord(rest[at + name.length]))) {
            found.add(id);
            rest = rest.slice(0, at) + " ".repeat(name.length) + rest.slice(at + name.length);
            break;
          }
          at = rest.indexOf(name, at + 1);
        }
      }
    }
    return [...found];
  };
}

function speciesIndex(species) {
  if (!species) return [];
  const out = [];
  for (const [id, names] of species) {
    const aliases = [...new Set([...names.values()].map(foldName).filter(Boolean))];
    const label = { de: names.get(6), en: names.get(9), ja: names.get(11) ?? names.get(1), ko: names.get(3), zh: names.get(4) ?? names.get(12) };
    out.push([id, aliases, label]);
  }
  return out;
}

// ---------- Schnellsuche: japanische, koreanische und chinesische Karten ----------
const ASIA_LANGS = ["ja", "ko", "zh-tw", "zh-cn"];

async function buildAsia(lang, setOffset, tag) {
  const sets = [];
  const cards = [];
  try {
    const list = (await getJson(`${API}/${lang}/sets`)) ?? [];
    const details = await mapLimit(list, CONCURRENCY, (s) => getJson(`${API}/${lang}/sets/${encodeURIComponent(s.id)}`));
    const wanted = details.filter((d) => d?.releaseDate && d.releaseDate >= cutoffIso && d.cards?.length);
    for (const set of wanted) {
      const si = setOffset + sets.length;
      sets.push({ id: `${lang}:${set.id}`, name: set.name, off: set.cardCount?.official ?? null, date: set.releaseDate, L: lang });
      const rows = await mapLimit(set.cards, 8, async (brief) => {
        const card = (await getJson(`${API}/${lang}/cards/${encodeURIComponent(brief.id)}`)) ?? brief;
        const price = pickPrice(card.pricing?.cardmarket);
        const row = { i: `${lang}:${card.id}`, n: card.name, no: card.localId, s: si, L: lang };
        const p = tag(card.name, lang);
        if (p.length) row.p = p;
        if (card.rarity) row.r = card.rarity;
        if (price && isNum(price.avg30)) Object.assign(row, { a1: price.avg1, a7: price.avg7, a30: price.avg30, t: price.trend, lo: price.low });
        if (price?.variant) row.v = price.variant;
        const img = card.image ?? brief.image;
        if (img) { row.img = `${img}/low.webp`; row.big = `${img}/high.webp`; }
        row.u = cardmarketUrl(card.pricing?.cardmarket?.idProduct, card.name);
        for (const k of Object.keys(row)) if (row[k] == null) delete row[k];
        return row;
      });
      cards.push(...rows.filter(Boolean));
    }
    console.log(`Asiatisch ${lang}: ${sets.length} Sets, ${cards.length} Karten, ${cards.filter((c) => c.a30).length} mit Preis`);
  } catch (err) {
    console.warn(`Asiatisch ${lang} übersprungen: ${err.message}`);
  }
  return { sets, cards };
}

async function main() {
  const sets = await loadSets();
  if (sets.length === 0) throw new Error("Keine Sets gefunden – API-Antwort prüfen");
  // Trainer-Galerie (…tg) und Galar-Galerie (…gg) gehören auf Cardmarket zum Hauptset.
  const byId = new Map(sets.map((s) => [s.id, s]));
  const mainSets = [];
  for (const s of sets) {
    const parent = /(tg|gg)$/.test(s.id) ? byId.get(s.id.slice(0, -2)) : null;
    if (parent) (parent.extraCards ??= []).push(...(s.cards ?? []));
    else mainSets.push(s);
  }
  mainSets.sort((a, b) => b.releaseDate.localeCompare(a.releaseDate));
  console.log(`${mainSets.length} Sets seit ${cutoffIso}`);

  const result = [];
  const allSets = [];
  for (const set of mainSets) {
    let built = await buildSet(set);
    if (!built.cards.length) {
      console.warn(`${set.name} (${set.id}): keine Preise bei TCGdex – versuche pokemontcg.io`);
      const fallback = await pokemontcgPrices(set);
      if (fallback?.size) built = await buildSet(set, fallback);
    }
    allSets.push(built);
    if (built.cards.length) result.push(built);
    else {
      // Set trotzdem anzeigen, mit Hinweis "Preise folgen"
      console.warn(`${set.name} (${set.id}): noch keine Preise – wird mit Hinweis angezeigt`);
      await explainMissing(set);
      allSets[allSets.length - 1] = { ...built, pending: true };
      result.push({ ...built, pending: true, cardTotal: (set.cards?.length ?? 0) + (set.extraCards?.length ?? 0) });
    }
  }
  const totalCards = result.reduce((n, s) => n + s.cards.length, 0);
  if (totalCards === 0) throw new Error("Keine Preise gefunden – API-Antwort prüfen");

  const now = new Date();
  const today = now.toISOString().slice(0, 10);
  await mkdir(path.join(OUT_DIR, "history"), { recursive: true });
  await writeFile(
    path.join(OUT_DIR, "latest.json"),
    JSON.stringify({
      updated: now.toISOString(),
      source: "TCGdex / Cardmarket",
      sets: result.map(({ allCards, official, ...s }) => s),
    }),
  );

  // Schnellsuche: alle Karten (auch ohne Preis) in kompakter Form.
  const species = await loadSpecies();
  const tag = makeSpeciesTagger(species);
  const searchSets = allSets.map((s) => ({ id: s.id, name: s.name, off: s.official, date: s.releaseDate }));
  const searchCards = [];
  allSets.forEach((s, si) => {
    for (const c of s.allCards) {
      const row = { i: c.id, n: c.name, no: c.no, s: si };
      if (c.enName) row.e = c.enName;
      const p = [...new Set([...tag(c.name, "de"), ...(c.enName ? tag(c.enName, "en") : [])])];
      if (p.length) row.p = p;
      if (c.rarity) row.r = c.rarity;
      if (c.hasPrice) Object.assign(row, { a1: c.avg1, a7: c.avg7, a30: c.avg30, t: c.trend, lo: c.low });
      if (c.variant) row.v = c.variant;
      if (c.thumb) row.img = c.thumb;
      if (c.large && c.large !== c.thumb) row.big = c.large;
      row.u = c.url;
      for (const k of Object.keys(row)) if (row[k] == null) delete row[k];
      searchCards.push(row);
    }
  });
  await writeFile(
    path.join(OUT_DIR, "all.json"),
    JSON.stringify({ updated: now.toISOString(), sets: searchSets, cards: searchCards }),
  );
  console.log(`Schnellsuche: ${searchCards.length} Karten, davon ${searchCards.filter((c) => c.a30).length} mit Preis`);
  console.log(`  davon mit erkanntem Pokémon: ${searchCards.filter((c) => c.p).length}`);
  await writeFile(path.join(OUT_DIR, "species.json"), JSON.stringify(speciesIndex(species)));

  const asia = { updated: now.toISOString(), sets: [], cards: [] };
  for (const lang of ASIA_LANGS) {
    const part = await buildAsia(lang, asia.sets.length, tag);
    asia.sets.push(...part.sets);
    asia.cards.push(...part.cards);
  }
  await writeFile(path.join(OUT_DIR, "asia.json"), JSON.stringify(asia));
  console.log(`Asiatische Karten gesamt: ${asia.cards.length}, mit Pokémon erkannt: ${asia.cards.filter((c) => c.p).length}`);

  // Kompakter Tages-Snapshot für Trends: { kartenId: [avg7, avg30] }
  const snapshot = {};
  for (const s of result) for (const c of s.cards) snapshot[c.id] = [c.avg7, c.avg30];
  await writeFile(path.join(OUT_DIR, "history", `${today}.json`), JSON.stringify(snapshot));
  const dates = (await readdir(path.join(OUT_DIR, "history")))
    .filter((f) => /^\d{4}-\d{2}-\d{2}\.json$/.test(f))
    .map((f) => f.slice(0, 10))
    .sort();
  await writeFile(path.join(OUT_DIR, "history", "index.json"), JSON.stringify(dates));
  console.log(`Fertig: ${result.length} Sets, ${totalCards} Karten, ${dates.length} Tage Verlauf`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
