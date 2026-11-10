// Cardmarket-Preise direkt aus Cardmarkets öffentlichen Tagesdateien (Preisliste + Produktkatalog).
// Gebraucht für Sets, die TCGdex noch nicht mit Cardmarket verknüpft hat (z. B. 30 Jahre).
// Die Dateien enthalten keine Kartennummern: Zuordnung über den Namen innerhalb der passenden
// Cardmarket-Erweiterung; gleichnamige Karten werden über die Preisreihenfolge gepaart und
// gegen einen Vergleichspreis (TCGplayer) auf Plausibilität geprüft.

const BASE = process.env.CM_DOWNLOADS ?? "https://downloads.s3.cardmarket.com/productCatalog";
const GAME = 6; // Pokémon

const fold = (t) => String(t ?? "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "")
  .replace(/♀/g, " f").replace(/♂/g, " m").replace(/★/g, " star").replace(/δ/g, " delta").replace(/&/g, " and ")
  .replace(/[-'’.:,!?]/g, " ").replace(/\s+/g, " ").trim();
// "Uxie Lv.55 [Set Up | Psychic Restore]" -> "uxie"; "Darkrai & Cresselia LEGEND (Top)" -> "darkrai and cresselia legend"
const cleanName = (n) => fold(String(n).replace(/\s*\[[^\]]*\]\s*$/, "").replace(/\s*\([^)]*\)/g, " ").replace(/\bLv\.?\s*\d+\b/gi, " ").replace(/\bLV\.?X\b/g, "lvx"));
const round = (v) => (Number.isFinite(v) && v > 0 ? Math.round(v * 100) / 100 : null);

async function get(url) {
  let last;
  for (let i = 0; i < 3; i++) {
    try {
      const r = await fetch(url, { headers: { "user-agent": "pokemon-top30 (GitHub Actions)" }, signal: AbortSignal.timeout(120_000) });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return await r.json();
    } catch (err) {
      last = err;
      await new Promise((res) => setTimeout(res, 2000 * (i + 1)));
    }
  }
  throw new Error(`${url}: ${last?.message}`);
}

let dataP = null;
async function load() {
  dataP ??= Promise.all([get(`${BASE}/priceGuide/price_guide_${GAME}.json`), get(`${BASE}/productList/products_singles_${GAME}.json`)])
    .then(([pg, cat]) => ({
      created: pg.createdAt ?? null,
      price: new Map((pg.priceGuides ?? []).map((x) => [x.idProduct, x])),
      products: cat.products ?? [],
      byId: new Map((cat.products ?? []).map((p) => [p.idProduct, p])),
    }));
  return dataP;
}

function pick(p) {
  if (!p) return null;
  const n = (v) => (typeof v === "number" && v > 0 ? round(v) : null);
  if (n(p.avg30) || n(p.avg7)) return { avg1: n(p.avg1), avg7: n(p.avg7), avg30: n(p.avg30), trend: n(p.trend), low: n(p.low), variant: null };
  if (n(p["avg30-holo"]) || n(p["avg7-holo"])) {
    return { avg1: n(p["avg1-holo"]), avg7: n(p["avg7-holo"]), avg30: n(p["avg30-holo"]), trend: n(p["trend-holo"]), low: n(p["low-holo"]), variant: "Reverse Holo" };
  }
  return null;
}

/**
 * cards:  [{ name (englisch), date (Erscheinungstag JJJJ-MM-TT), ref (Vergleichspreis in €, optional) }]
 *         Karten mehrerer Sets mit gleichem Erscheinungstag gemeinsam übergeben (sie teilen sich oft
 *         eine Cardmarket-Erweiterung, z. B. 30 Jahre und Klassische Sammlung).
 * Rückgabe: Array passend zu cards: { avg1, avg7, avg30, trend, low, variant, idProduct } oder null
 */
export async function cardmarketGuidePrices(cards, log = console.log) {
  const { price, products, created } = await load();
  const day = cards[0]?.date;
  if (!day) return cards.map(() => null);
  const t0 = Date.parse(day) - 60 * 86400000, t1 = Date.parse(day) + 150 * 86400000;
  // Erweiterungen mit Produkten rund um den Erscheinungstag
  const byExp = new Map();
  for (const p of products) {
    const t = Date.parse(String(p.dateAdded ?? "").replace(" ", "T") + "Z");
    if (!(t >= t0 && t <= t1)) continue;
    (byExp.get(p.idExpansion) ?? byExp.set(p.idExpansion, []).get(p.idExpansion)).push(p);
  }
  const wanted = new Set(cards.map((c) => cleanName(c.name)));
  let best = null;
  for (const [exp, list] of byExp) {
    const names = new Set(list.map((p) => cleanName(p.name)));
    let hit = 0;
    for (const w of wanted) if (names.has(w)) hit++;
    const priced = list.filter((p) => pick(price.get(p.idProduct))).length;
    const score = [hit, priced, -exp];
    if (!best || score[0] > best.score[0] || (score[0] === best.score[0] && (score[1] > best.score[1] || (score[1] === best.score[1] && score[2] > best.score[2])))) best = { exp, list, score };
  }
  if (!best || best.score[0] < Math.max(3, wanted.size * 0.6)) {
    log(`  Cardmarket-Preisliste: keine passende Erweiterung (bester Treffer ${best?.score[0] ?? 0} von ${wanted.size} Namen)`);
    return cards.map(() => null);
  }
  // Gruppen gleichen Namens: Karten <-> Produkte
  const prodByName = new Map();
  for (const p of best.list) { const k = cleanName(p.name); (prodByName.get(k) ?? prodByName.set(k, []).get(k)).push(p); }
  const cardIdx = new Map();
  cards.forEach((c, i) => { const k = cleanName(c.name); (cardIdx.get(k) ?? cardIdx.set(k, []).get(k)).push(i); });
  const out = cards.map(() => null);
  let paired = 0, rejected = 0, skipped = 0;
  for (const [k, idx] of cardIdx) {
    const prods = (prodByName.get(k) ?? []).map((p) => ({ p, pr: pick(price.get(p.idProduct)) }));
    if (!prods.length) continue;
    if (prods.length !== idx.length) { skipped += idx.length; continue; }
    // Paaren: nach Vergleichspreis bzw. Cardmarket-Preis sortiert (teuerste zuerst); ohne Vergleichspreis nur bei Einzelkarten
    if (idx.length > 1 && idx.some((i) => !(cards[i].ref > 0))) { skipped += idx.length; continue; }
    const cs = [...idx].sort((a, b) => (cards[b].ref ?? 0) - (cards[a].ref ?? 0));
    const ps = [...prods].sort((a, b) => (b.pr?.avg30 ?? b.pr?.trend ?? 0) - (a.pr?.avg30 ?? a.pr?.trend ?? 0));
    // Liegen gleichnamige Versionen beim Vergleichspreis nah beieinander (unter 25 % Abstand),
    // ist die Reihenfolge nicht sicher: diese Paare als "mehrdeutig" kennzeichnen
    const amb = new Set();
    for (let j = 1; j < cs.length; j++) {
      const a = cards[cs[j - 1]].ref, b = cards[cs[j]].ref;
      // nur ab 5 €: bei Cent-Karten ist eine Vertauschung egal
      if (a > 0 && b > 0 && a / b < 1.25 && a >= 5) { amb.add(cs[j - 1]); amb.add(cs[j]); }
    }
    cs.forEach((ci, j) => {
      const { p, pr } = ps[j];
      if (!pr?.avg30) return;
      const ref = cards[ci].ref;
      // Plausibel: höchstens Faktor 3 zum Vergleichspreis (Karten unter 2 € großzügiger)
      if (ref > 0 && Math.max(ref, pr.avg30) >= 2 && Math.max(ref, pr.avg30) / Math.min(ref, pr.avg30) > 3) { rejected++; return; }
      out[ci] = { ...pr, idProduct: p.idProduct, ...(amb.has(ci) ? { amb: true } : {}) };
      paired++;
    });
  }
  log(`  Cardmarket-Preisliste (${created ?? "?"}): Erweiterung ${best.exp} mit ${best.list.length} Karten, ${paired} von ${cards.length} zugeordnet` +
    `${rejected ? `, ${rejected} unplausibel verworfen` : ""}${skipped ? `, ${skipped} mehrdeutig übersprungen` : ""}`);
  return out;
}

/**
 * Datenfehler reparieren: Mehrere Karten eines Sets zeigen bei TCGdex auf dasselbe Cardmarket-Produkt
 * (z. B. Arbok Expedition Holo Nr. 3 und normale Nr. 35). Im Cardmarket-Katalog liegen die Versionen als
 * eigene Produkte in derselben Erweiterung mit demselben Namen. Gepaart wird nach Vergleichspreis
 * (TCGplayer), sonst nach Seltenheit (Holo/Sonderversion teurer als die normale Karte).
 * groups: [{ idProduct, cards: [{ i, ref, rank }] }]
 * Rückgabe: Map i -> { avg1, avg7, avg30, trend, low, variant, idProduct, amb? }
 */
export async function resolveSharedProducts(groups, log = console.log) {
  const { price, products, byId } = await load();
  const out = new Map();
  let ok = 0, skipped = 0;
  for (const g of groups) {
    const p = byId.get(Number(g.idProduct));
    if (!p) { skipped += g.cards.length; continue; }
    const name = cleanName(p.name);
    const cands = products.filter((x) => x.idExpansion === p.idExpansion && cleanName(x.name) === name)
      .map((x) => ({ x, pr: pick(price.get(x.idProduct)) }));
    if (cands.length !== g.cards.length) { skipped += g.cards.length; continue; }
    const byRef = g.cards.every((c) => c.ref > 0);
    const ranks = new Set(g.cards.map((c) => c.rank));
    if (!byRef && ranks.size !== g.cards.length) { skipped += g.cards.length; continue; }
    const key = (c) => (byRef ? c.ref : c.rank);
    const cs = [...g.cards].sort((a, b) => key(b) - key(a));
    const ps = [...cands].sort((a, b) => (b.pr?.avg30 ?? b.pr?.trend ?? 0) - (a.pr?.avg30 ?? a.pr?.trend ?? 0));
    const amb = new Set();
    if (byRef) for (let j = 1; j < cs.length; j++) {
      const a = cs[j - 1].ref, b = cs[j].ref;
      if (a / b < 1.25 && a >= 5) { amb.add(cs[j - 1].i); amb.add(cs[j].i); }
    }
    cs.forEach((c, j) => {
      const { x, pr } = ps[j];
      if (!pr?.avg30 && !pr?.avg7) return;
      if (c.ref > 0 && pr.avg30 && Math.max(c.ref, pr.avg30) >= 2 && Math.max(c.ref, pr.avg30) / Math.min(c.ref, pr.avg30) > 3) return;
      out.set(c.i, { ...pr, idProduct: x.idProduct, ...(amb.has(c.i) ? { amb: true } : {}) });
      ok++;
    });
  }
  log(`  Cardmarket-Katalog: ${ok} Karten mit geteiltem Produkt neu zugeordnet${skipped ? `, ${skipped} nicht eindeutig` : ""}`);
  return out;
}
