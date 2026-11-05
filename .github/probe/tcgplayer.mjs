// Ersatzpreise von TCGplayer (USA) für Sets, zu denen es noch keine Cardmarket-Preise gibt.
// Quelle: tcgcsv.com (tägliche Kopie der TCGplayer-Preise), umgerechnet in Euro
// zum Referenzkurs der Europäischen Zentralbank.

const TCGCSV = process.env.TCGCSV ?? "https://tcgcsv.com/tcgplayer";
const ECB = process.env.ECB_URL ?? "https://www.ecb.europa.eu/stats/eurofxref/eurofxref-daily.xml";
const CATEGORY = 3; // Pokémon (englisch)

// Feste Zuordnung TCGdex-/pokemontcg-Set -> TCGplayer-Gruppe; sonst Suche nach Name und Datum
const GROUP_OVERRIDE = { "30th": 24722, "30th-c": 24837, cel25c: 2931 };

const fold = (t) => String(t ?? "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "")
  .replace(/♀/g, " f").replace(/♂/g, " m").replace(/★/g, " star").replace(/δ/g, " delta").replace(/&/g, " and ")
  .replace(/_+/g, "_").replace(/[-'’.:,!?]/g, " ").replace(/\s+/g, " ").trim();
const normNo = (no) => String(no ?? "").replace(/^0+(?=\w)/, "").toUpperCase();
const round = (v) => (Number.isFinite(v) && v > 0 ? Math.round(v * 100) / 100 : null);

async function get(url, type = "json") {
  let last;
  for (let i = 0; i < 3; i++) {
    try {
      const r = await fetch(url, { headers: { "user-agent": "pokemon-top30 (GitHub Actions)" } });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return type === "json" ? await r.json() : await r.text();
    } catch (err) {
      last = err;
      await new Promise((res) => setTimeout(res, 1500 * (i + 1)));
    }
  }
  throw new Error(`${url}: ${last?.message}`);
}

// Dollar je Euro laut EZB (Referenzkurs des letzten Bankarbeitstags)
export async function loadUsdRate() {
  const xml = await get(ECB, "text");
  const rate = Number(/currency=['"]USD['"]\s+rate=['"]([\d.]+)['"]/.exec(xml)?.[1]);
  const date = /time=['"](\d{4}-\d{2}-\d{2})['"]/.exec(xml)?.[1] ?? null;
  if (!(rate > 0.5 && rate < 2)) throw new Error(`EZB-Kurs unplausibel: ${rate}`);
  return { usd: rate, date };
}

let groupsCache = null;
async function groups() {
  groupsCache ??= get(`${TCGCSV}/${CATEGORY}/groups`).then((g) => g.results ?? g);
  return groupsCache;
}

const tokens = (t) => new Set(fold(t).split(" ").filter(Boolean));
function nameScore(a, b) {
  const A = tokens(a), B = tokens(b);
  let both = 0;
  for (const t of A) if (B.has(t)) both++;
  return both / Math.max(A.size, B.size, 1);
}

async function findGroup(set) {
  if (GROUP_OVERRIDE[set.id]) return (await groups()).find((g) => g.groupId === GROUP_OVERRIDE[set.id]) ?? null;
  const day = String(set.releaseDate ?? "").slice(0, 10);
  let best = null;
  for (const g of await groups()) {
    if (String(g.publishedOn ?? "").slice(0, 10) !== day) continue;
    const s = nameScore(String(g.name).replace(/^[^:]{1,8}:\s*/, ""), set.enName ?? set.name);
    if (s >= 0.6 && (!best || s > best[0])) best = [s, g];
  }
  return best?.[1] ?? null;
}

// Kartenname ohne Nummer/Zusatz: "Lugia - 142/103" -> "lugia", "Gengar (Prime)" -> "gengar"
const cleanName = (n) => fold(String(n).replace(/\s+-\s+[^-]*$/, "").replace(/\s*\([^)]*\)/g, " "));
const sameName = (a, b) => {
  const A = cleanName(a).split(" "), B = cleanName(b).split(" ");
  const [small, big] = A.length <= B.length ? [A, B] : [B, A];
  return small.length > 0 && small.every((t) => big.includes(t));
};

// Preiszeile wählen: normale Version vor Holo, Reverse Holo nur wenn es nichts anderes gibt
const SUBTYPE_ORDER = ["Normal", "Holofoil", "1st Edition Holofoil", "1st Edition Normal", "Unlimited Holofoil", "Unlimited", "Reverse Holofoil"];

/**
 * Liefert für die Karten eines Sets TCGplayer-Preise in Euro.
 * set:   { id, name, enName, releaseDate }
 * cards: [{ no, name }]  (name möglichst englisch)
 * Rückgabe: Array passend zu cards (je Karte { avg30, trend, low, variant, src, usd, tpUrl } oder null), oder null
 */
export async function tcgplayerPrices(set, cards, fx) {
  const group = await findGroup(set);
  if (!group) { console.warn(`  TCGplayer: keine passende Gruppe für ${set.name} (${set.releaseDate})`); return null; }
  const [prods, prices] = await Promise.all([
    get(`${TCGCSV}/${CATEGORY}/${group.groupId}/products`).then((r) => r.results ?? []),
    get(`${TCGCSV}/${CATEGORY}/${group.groupId}/prices`).then((r) => r.results ?? []),
  ]);
  const rows = new Map();
  for (const p of prices) {
    if (!(p.marketPrice > 0 || p.lowPrice > 0)) continue;
    (rows.get(p.productId) ?? rows.set(p.productId, []).get(p.productId)).push(p);
  }
  const singles = prods
    .map((p) => ({ p, num: p.extendedData?.find((d) => d.name === "Number")?.value }))
    .filter((x) => x.num && rows.has(x.p.productId));
  const byNo = new Map(), byName = new Map();
  for (const x of singles) {
    const no = normNo(String(x.num).split("/")[0]);
    (byNo.get(no) ?? byNo.set(no, []).get(no)).push(x);
    const nm = cleanName(x.p.name);
    (byName.get(nm) ?? byName.set(nm, []).get(nm)).push(x);
  }
  // 1. Nummer + Name, sonst eindeutiger Name
  const res = cards.map(() => null);
  const used = new Set();
  cards.forEach((c, i) => {
    let hit = (byNo.get(normNo(c.no)) ?? []).filter((x) => sameName(x.p.name, c.name));
    if (hit.length !== 1) {
      const named = byName.get(cleanName(c.name)) ?? [];
      hit = named.length === 1 ? named : [];
    }
    if (hit.length === 1 && !used.has(hit[0].p.productId)) { res[i] = hit[0]; used.add(hit[0].p.productId); }
  });
  // 2. Gleichnamige Karten (z. B. zweiteilige LEGEND-Karten): in Nummernfolge paaren
  const left = () => cards.map((c, i) => [c, i]).filter(([, i]) => !res[i]);
  const sameNamed = new Map();
  for (const [c, i] of left()) { const k = cleanName(c.name); (sameNamed.get(k) ?? sameNamed.set(k, []).get(k)).push(i); }
  const numOf = (v) => parseInt(String(v).replace(/\D+/g, ""), 10) || 0;
  for (const [k, idx] of sameNamed) {
    const tp = (byName.get(k) ?? []).filter((x) => !used.has(x.p.productId));
    if (idx.length < 2 || tp.length !== idx.length) continue;
    idx.sort((a, b) => numOf(cards[a].no) - numOf(cards[b].no));
    tp.sort((a, b) => numOf(a.num) - numOf(b.num));
    idx.forEach((i, j) => { res[i] = tp[j]; used.add(tp[j].p.productId); });
  }
  // 3. Rest: Name steckt in genau einem noch freien TCGplayer-Namen (z. B. "Palkia" -> "Palkia G LV.X")
  for (const [c, i] of left()) {
    const want = cleanName(c.name).split(" ");
    const cand = singles.filter((x) => !used.has(x.p.productId) && want.every((t) => cleanName(x.p.name).split(" ").includes(t)));
    if (cand.length === 1) { res[i] = cand[0]; used.add(cand[0].p.productId); }
  }
  const unmatched = [];
  const out = res.map((x, i) => {
    if (!x) { unmatched.push(`${cards[i].no} ${cards[i].name}`); return null; }
    const r = rows.get(x.p.productId).sort((a, b) => {
      const ia = SUBTYPE_ORDER.indexOf(a.subTypeName), ib = SUBTYPE_ORDER.indexOf(b.subTypeName);
      return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib);
    })[0];
    const usd = r.marketPrice > 0 ? r.marketPrice : r.lowPrice;
    return {
      avg30: round(usd / fx.usd), trend: round(usd / fx.usd), low: round(r.lowPrice / fx.usd),
      avg1: null, avg7: null, variant: r.subTypeName === "Reverse Holofoil" ? "Reverse Holo" : null,
      src: "tcgplayer", usd: round(usd), tpUrl: x.p.url ?? null, tpName: x.p.name,
    };
  });
  const matched = out.filter(Boolean).length;
  console.log(`  TCGplayer: Gruppe ${group.groupId} "${group.name}", ${singles.length} Karten mit Preis, ${matched} von ${cards.length} zugeordnet`);
  if (unmatched.length) console.warn(`  TCGplayer ${set.id}: ${unmatched.length} Karten ohne Zuordnung, z. B. ${unmatched.slice(0, 8).join(" | ")}`);
  return out;
}
