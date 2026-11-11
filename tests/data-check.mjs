// Prüft die Tagesdaten in docs/data, bevor sie gespeichert und veröffentlicht werden.
//
//   node tests/data-check.mjs            nur prüfen (Exit-Code 1 bei Fehlern)
//   node tests/data-check.mjs --repair   im täglichen Lauf: kaputte Zusatzdateien (asiatische, ältere Karten,
//                                        Sealed) durch die Version von gestern ersetzen; ist eine Kerndatei
//                                        kaputt, mit Fehler abbrechen, damit nichts Falsches online geht.
//
// Vergleich mit gestern: die zuletzt gespeicherte Version (git HEAD). Fällt die Zahl der Karten oder der
// Karten mit Preis um mehr als ein Viertel, gilt die Datei als kaputt (z. B. Datenquelle nur halb erreichbar).
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DATA = path.join(ROOT, "docs", "data");
const repair = process.argv.includes("--repair");
const MAX_DROP = 0.25;

const read = (file) => JSON.parse(fs.readFileSync(path.join(DATA, file), "utf8"));
function previous(file) {
  try {
    return JSON.parse(execFileSync("git", ["show", `HEAD:docs/data/${file}`], { cwd: ROOT, encoding: "utf8", maxBuffer: 64 * 1024 * 1024, stdio: ["ignore", "pipe", "ignore"] }));
  } catch { return null; } // noch nicht gespeichert oder kein git
}
const share = (xs, f) => (xs.length ? xs.filter(f).length / xs.length : 0);

// Suchdaten (all, asia, old, sealed): { sets, cards } mit Karten { i, n, s, ... }
function searchData(d, { minCards, minPriced }) {
  const errs = [];
  if (!Array.isArray(d?.sets) || !Array.isArray(d?.cards)) return ["sets oder cards fehlen"];
  if (d.cards.length < minCards) errs.push(`nur ${d.cards.length} Karten (erwartet mindestens ${minCards})`);
  const priced = share(d.cards, (c) => c.a30 > 0 || c.t > 0);
  if (priced < minPriced) errs.push(`nur ${(priced * 100).toFixed(0)} % mit Preis (erwartet mindestens ${minPriced * 100} %)`);
  const ids = new Set();
  let dup = 0, bad = 0;
  for (const c of d.cards) {
    if (ids.has(c.i)) dup++;
    ids.add(c.i);
    if (!c.i || !c.n || !Number.isInteger(c.s) || c.s < 0 || c.s >= d.sets.length) bad++;
    else if (c.a30 != null && !(c.a30 >= 0 && c.a30 < 1e6)) bad++;
  }
  if (dup) errs.push(`${dup} doppelte Karten-IDs`);
  if (bad) errs.push(`${bad} Karten mit fehlenden oder falschen Feldern`);
  return errs;
}
const countOf = {
  search: (d) => [d.cards?.length ?? 0, (d.cards ?? []).filter((c) => c.a30 > 0 || c.t > 0).length],
  latest: (d) => { const cs = (d.sets ?? []).flatMap((s) => s.cards ?? []); return [cs.length, cs.filter((c) => c.avg30 > 0).length]; },
};

const FILES = [
  { file: "latest.json", core: true, count: countOf.latest, check: (d) => {
    const errs = [];
    if (!Array.isArray(d?.sets) || d.sets.length < 20) return [`nur ${d?.sets?.length ?? 0} Sets`];
    const cs = d.sets.flatMap((s) => s.cards ?? []);
    if (cs.length < 300) errs.push(`nur ${cs.length} Karten in den Top-30-Listen`);
    if (share(cs, (c) => c.avg30 > 0) < 0.8) errs.push("weniger als 80 % der Top-Karten mit Preis");
    if (!(d.fx?.usd > 0.5 && d.fx.usd < 2)) errs.push(`Dollarkurs fehlt oder unplausibel (${d.fx?.usd})`);
    return errs;
  } },
  { file: "all.json", core: true, count: countOf.search, check: (d) => [...searchData(d, { minCards: 3000, minPriced: 0.8 }), ...(d.fx?.usd > 0.5 ? [] : ["Dollarkurs fehlt"])] },
  { file: "species.json", core: true, count: (d) => [d.length, d.length], check: (d) => (Array.isArray(d) && d.length > 1000 && d.every((x) => Array.isArray(x) && x.length === 3) ? [] : ["Pokémon-Namen fehlen oder falsches Format"]) },
  { file: "status.json", core: true, count: null, check: (d) => (d?.updated && !Number.isNaN(Date.parse(d.updated)) ? [] : ["Datenstand fehlt"]) },
  { file: "asia.json", core: false, count: countOf.search, check: (d) => searchData(d, { minCards: 5000, minPriced: 0.5 }) },
  { file: "old.json", core: false, count: countOf.search, check: (d) => searchData(d, { minCards: 10000, minPriced: 0.5 }) },
  { file: "sealed.json", core: false, count: countOf.search, check: (d) => searchData(d, { minCards: 1000, minPriced: 0.8 }) },
];

let failed = false;
for (const f of FILES) {
  let errs = [];
  let d = null;
  try { d = read(f.file); errs = f.check(d); } catch (err) { errs = [`nicht lesbar: ${err.message}`]; }
  // Vergleich mit gestern
  const prev = d && f.count ? previous(f.file) : null;
  if (prev && f.count) {
    const [n, p] = f.count(d), [n0, p0] = f.count(prev);
    if (n0 && n < n0 * (1 - MAX_DROP)) errs.push(`Karten von ${n0} auf ${n} gefallen`);
    if (p0 && p < p0 * (1 - MAX_DROP)) errs.push(`Karten mit Preis von ${p0} auf ${p} gefallen`);
  }
  if (!errs.length) {
    const [n, p] = f.count && d ? f.count(d) : [];
    console.log(`ok      ${f.file}${n != null ? ` (${n} Einträge, ${p} mit Preis)` : ""}`);
    continue;
  }
  if (repair && !f.core && previous(f.file)) {
    execFileSync("git", ["checkout", "HEAD", "--", `docs/data/${f.file}`], { cwd: ROOT });
    console.warn(`ersetzt ${f.file}: ${errs.join("; ")} -> Version von gestern bleibt`);
    if (process.env.GITHUB_ACTIONS) console.log(`::warning title=Daten ${f.file}::${errs.join("; ")} – Version von gestern bleibt online`);
    continue;
  }
  failed = true;
  console.error(`FEHLER  ${f.file}: ${errs.join("; ")}`);
  if (process.env.GITHUB_ACTIONS) console.log(`::error title=Daten ${f.file}::${errs.join("; ")}`);
}
if (failed) {
  console.error(repair ? "Kerndaten fehlerhaft: Es wird nichts gespeichert, online bleibt der Stand von gestern." : "Datenprüfung fehlgeschlagen.");
  process.exit(1);
}
