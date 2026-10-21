# Stand und nächste Schritte

Zuletzt aktualisiert: 21.10.2026 (nachts)

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

## Datenumfang (Stand Lauf vom 21.10.2026)

- Schnellsuche gesamt: ca. 41.500 Karten (aktuell 6.100 + Promos, asiatisch 12.800, ältere 22.000 aus 237 Sets, ab 1996)
- Ladezeit in Handy-Simulation: Suche nach ca. 4,5 s bereit, ältere Karten nach ca. 15 s im Hintergrund
- Eine Suche dauert 15–40 ms
- Täglicher Lauf auf GitHub: ca. 5 Minuten

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
- Ältere Karten (international seit 1999, japanisch seit 1996) sind in der Schnellsuche (docs/data/old.json, wird im Hintergrund nachgeladen). Die Top-30-Ansichten bleiben bei 5 Jahren.
- Findet die Bilderkennung genau die Version nicht, erscheint ein Hinweis mit Link zur Cardmarket-Suche.
- 1. Edition / Shadowless werden bei Cardmarket-Durchschnittspreisen nicht getrennt ausgewiesen.
