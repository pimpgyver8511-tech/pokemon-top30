# Stand und nächste Schritte

Zuletzt aktualisiert: 22.10.2026 (abends)

## Was fertig ist

- **Seite:** https://pimpgyver8511-tech.github.io/pokemon-top30/ (GitHub Pages, täglich ca. 07:17 Uhr neue Preise)
- **Nach Set:** Top 30 pro Set (Haupt- und Spezialsets der letzten 5 Jahre, dazu immer Celebrations / 25 Jahre), sortierbar nach Ø 7 / Ø 30 Tage
- **Alle Sets zusammen:** Gesamtrangliste (`#rangliste`)
- **Schnellsuche** (`#suche`):
  - Name in jeder Sprache + Sprache dahinter, z. B. „Dragonite deutsch“, „Glurak japanisch“
  - Internationale, japanische, koreanische, chinesische Karten und Promos (SVP, SWSH, MEP)
  - Preise: Ø 1 / 7 / 30 Tage, Trend, Ab-Preis, Cardmarket-Link
- **Mithören:** Spracherkennung (Deutsch) mit lautähnlicher Namenserkennung, Smalltalk-Filter, Protokoll „Was gehört wurde“
- **Bild erkennen:** Screenshot hochladen, einfügen oder per Drag & Drop; Claude erkennt die Karte (eigener API-Schlüssel nötig)
- **Archiv** (`#archiv`): jede erkannte Karte mit Scan-Vorschau, Preis beim Scan und heute, Gesamtwert-Kasten (Ø 30 Tage, heute vs. beim Scan), mehrere Bilder auf einmal, CSV-Export; nach einem Scan „Diese ist es“ zum Korrigieren. Gespeichert nur auf dem Gerät (IndexedDB).
- **Foto machen:** öffnet direkt die Kamera (auch in der installierten App)
- **Als App installierbar,** Screenshots über das Android-Teilen-Menü direkt an die Seite schicken

## Datenumfang (Stand Lauf vom 21.10.2026)

- Schnellsuche gesamt: ca. 41.500 Karten (aktuell 6.100 + Promos, asiatisch 12.800, ältere 22.000 aus 237 Sets, ab 1996)
- Ladezeit in Handy-Simulation: Suche nach ca. 4,5 s bereit, ältere Karten nach ca. 15 s im Hintergrund
- Eine Suche dauert 15–40 ms
- Täglicher Lauf auf GitHub: ca. 10–15 Minuten (Preise aller Karten); Seitenänderungen gehen über einen eigenen Ablauf in ca. 1 Minute online
- Warnungen des letzten Laufs: docs/data/status.json

## Erledigt am 22.10.2026

- API-Schlüssel angelegt und auf der Seite hinterlegt, Bilderkennung funktioniert laut Rückmeldung
- Erste echte Messung: Genau 6,5 s, Schnell 2,5 s; Kosten ca. 2 Cent für beide Versuche zusammen
- Tempo-Optimierung: kleineres Bild (1280 px), „Schnell“ ohne Denkphase, SDK/Verbindung vorab, kein Warten auf alte Karten, Kartendaten im Handy-Zwischenspeicher
- Nach der Optimierung gemessen: Schnell 2,2 s, Genau 4,4 s, Erkennung korrekt
- Ausgabenlimit in der Anthropic Console auf 5 $ gesetzt
- Erster automatischer Tageslauf erfolgreich (gestartet 12:12 Uhr statt 07:17 Uhr: GitHub verschiebt geplante Läufe bei hoher Last)

## Offen

1. Optional: Seite in Chrome als App installieren und das Teilen-Menü ausprobieren
2. Rückmeldung zum Mithören-Modus: Was steht unter „Was gehört wurde“, wenn ein Name nicht erkannt wird?
3. Ab ca. 28.10. erscheint in den Set-Tabellen die Spalte „vs. Vorwoche“ (braucht 7 Tage Verlauf)

## Bekannte Grenzen

- Cardmarket-Preise gelten für alle europäischen Sprachen zusammen (Deutsch = Englisch)
- Bei koreanischen und chinesischen Karten ist unklar, ob der Preis nur für diese Sprachversion gilt
- Wenige koreanische Karten in der Datenquelle; viele asiatische Karten ohne Bild
- Celebrations Classic Collection (cel25c): weder TCGdex noch pokemontcg.io haben Cardmarket-Preise. Ist fest eingeplant und erscheint automatisch, sobald es Preise gibt. Option TCGplayer-US-Preise ($) bewusst zurückgestellt (Entscheidung 22.10.: erst mal warten)
- „30 Jahre“-Sets: noch keine Cardmarket-Preise bei den Datenquellen, erscheinen automatisch
- Ältere Karten (international seit 1999, japanisch seit 1996) sind in der Schnellsuche (docs/data/old.json, wird im Hintergrund nachgeladen). Die Top-30-Ansichten bleiben bei 5 Jahren.
- Findet die Bilderkennung genau die Version nicht, erscheint ein Hinweis mit Link zur Cardmarket-Suche.
- Teilen-Menü und Mithören funktionieren in Chrome (Android), nicht in Firefox; „Bild erkennen“ per Galerie geht in beiden
- Archiv liegt nur im Browser-Speicher des Handys: Beim Löschen der Browserdaten ist es weg, deshalb ab und zu als CSV exportieren
- 1. Edition / Shadowless werden bei Cardmarket-Durchschnittspreisen nicht getrennt ausgewiesen.
