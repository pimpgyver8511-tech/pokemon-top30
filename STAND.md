# Stand und nächste Schritte

Zuletzt aktualisiert: 21.10.2026

## Was fertig ist

- **Seite:** https://pimpgyver8511-tech.github.io/pokemon-top30/ (GitHub Pages, täglich ca. 07:17 Uhr neue Preise)
- **Nach Set:** Top 30 pro Set (Haupt- und Spezialsets der letzten 5 Jahre), sortierbar nach Ø 7 / Ø 30 Tage
- **Alle Sets zusammen:** Gesamtrangliste (`#rangliste`)
- **Schnellsuche** (`#suche`):
  - Name in jeder Sprache + Sprache dahinter, z. B. „Dragonite deutsch“, „Glurak japanisch“
  - Internationale, japanische, koreanische, chinesische Karten und Promos (SVP, SWSH, MEP)
  - Preise: Ø 1 / 7 / 30 Tage, Trend, Ab-Preis, Cardmarket-Link
- **Mithören:** Spracherkennung (Deutsch) mit lautähnlicher Namenserkennung, Smalltalk-Filter, Protokoll „Was gehört wurde“
- **Bild erkennen:** Screenshot hochladen, einfügen oder per Drag & Drop; Claude erkennt die Karte (eigener API-Schlüssel nötig)
- **Als App installierbar,** Screenshots über das Android-Teilen-Menü direkt an die Seite schicken

## Offen (morgen am Rechner)

1. Auf console.anthropic.com Konto anlegen, Guthaben kaufen (z. B. 5 $), Ausgabenlimit setzen
2. API-Schlüssel erstellen (beginnt mit `sk-ant-`)
3. Auf der Seite: Schnellsuche → Einstellungen → Schlüssel einfügen → Genau oder Schnell → Speichern
4. Erste echte Erkennung testen (z. B. mit dem Relaxo-SVP-051-Screenshot). Der echte Aufruf an Claude ist noch ungetestet, nur die Kette auf der Seite ist geprüft.
5. Optional: Seite in Chrome als App installieren und das Teilen-Menü ausprobieren
6. Rückmeldung zum Mithören-Modus: Was steht unter „Was gehört wurde“, wenn ein Name nicht erkannt wird?

## Bekannte Grenzen

- Cardmarket-Preise gelten für alle europäischen Sprachen zusammen (Deutsch = Englisch)
- Bei koreanischen und chinesischen Karten ist unklar, ob der Preis nur für diese Sprachversion gilt
- Wenige koreanische Karten in der Datenquelle; viele asiatische Karten ohne Bild
- „30 Jahre“-Sets: noch keine Cardmarket-Preise bei den Datenquellen, erscheinen automatisch
- Ältere Karten (vor ca. 2021) sind nicht in der Datenbank. Die Bilderkennung warnt dann und verlinkt die Cardmarket-Suche.
- Idee für später: ältere Sets (z. B. ab 2002) mit in die Schnellsuche aufnehmen
