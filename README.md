# Pokémon Top 30

Die 30 teuersten Karten jedes Pokémon-Haupt- und Spezialsets der letzten fünf Jahre,
sortiert nach dem 30-Tage-Durchschnittspreis auf Cardmarket.

- **Seite:** wird über GitHub Pages aus `docs/` veröffentlicht.
- **Daten:** `scripts/update.mjs` holt die Preise täglich über die kostenlose
  [TCGdex-API](https://tcgdex.dev) (die dort hinterlegten Cardmarket-Preise: Ø 7 Tage, Ø 30 Tage).
- **Verlauf:** Jeder Tag wird als `docs/data/history/JJJJ-MM-TT.json` gespeichert.
  Daraus berechnet die Seite die Spalte „vs. Vorwoche“.
- **Zeitplan:** `.github/workflows/update.yml` läuft täglich um ca. 07:17 Uhr
  (deutsche Zeit) und kann unter *Actions → Preise aktualisieren → Run workflow*
  von Hand gestartet werden.

Hinweis: Die Preise gelten für alle Sprachversionen zusammen und nicht nach Zustand gefiltert.
