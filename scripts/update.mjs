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
      const res = await fetch(url, { headers: { "User-Agent": "pokemon-top30 (GitHub Actions)" } });
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
    return { avg7: round(cm.avg7), avg30: round(cm.avg30), trend: round(cm.trend), variant: null };
  }
  if (isNum(cm["avg30-holo"]) || isNum(cm["avg7-holo"])) {
    return {
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

async function buildSet(set) {
  const all = [...(set.cards ?? []), ...(set.extraCards ?? [])];
  const cards = await mapLimit(all, CONCURRENCY, async (brief) => {
    const res = await getLocalized(`cards/${encodeURIComponent(brief.id)}`);
    const card = res?.data ?? brief;
    let price = pickPrice(card.pricing?.cardmarket);
    let idProduct = card.pricing?.cardmarket?.idProduct;
    let image = card.image ?? brief.image;
    // Preise/Bild fehlen manchmal nur in der deutschen Variante.
    if ((!price || !image) && res?.lang === "de") {
      const en = await getJson(`${API}/en/cards/${encodeURIComponent(brief.id)}`);
      price ??= pickPrice(en?.pricing?.cardmarket);
      idProduct ??= en?.pricing?.cardmarket?.idProduct;
      image ??= en?.image;
    }
    if (!price || !isNum(price.avg30)) return null;
    const imgs = imageUrls(image, card.id);
    return {
      id: card.id,
      no: card.localId,
      name: card.name,
      rarity: card.rarity ?? null,
      thumb: imgs?.thumb ?? null,
      large: imgs?.large ?? null,
      ...price,
      url: cardmarketUrl(idProduct, card.name),
    };
  });
  const top = cards
    .filter(Boolean)
    .sort((a, b) => b.avg30 - a.avg30)
    .slice(0, TOP_N);
  console.log(`${set.name} (${set.id}): ${cards.filter(Boolean).length} Karten mit Preis, Top ${top.length}`);
  return {
    id: set.id,
    name: set.name,
    serie: set.serie?.name ?? null,
    releaseDate: set.releaseDate,
    logo: set.logo ?? null,
    cards: top,
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
  for (const set of mainSets) {
    const built = await buildSet(set);
    if (built.cards.length) result.push(built);
    else {
      console.warn(`${set.name} (${set.id}): noch keine Preise – ausgelassen`);
      await explainMissing(set);
    }
  }
  const totalCards = result.reduce((n, s) => n + s.cards.length, 0);
  if (totalCards === 0) throw new Error("Keine Preise gefunden – API-Antwort prüfen");

  const now = new Date();
  const today = now.toISOString().slice(0, 10);
  await mkdir(path.join(OUT_DIR, "history"), { recursive: true });
  await writeFile(
    path.join(OUT_DIR, "latest.json"),
    JSON.stringify({ updated: now.toISOString(), source: "TCGdex / Cardmarket", sets: result }),
  );

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
