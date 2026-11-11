# Stand und nächste Schritte

Zuletzt aktualisiert: 10.11.2026 (abends)

## Was fertig ist

- **Seite:** https://pimpgyver8511-tech.github.io/pokemon-top30/ (GitHub Pages, täglich ca. 07:17 Uhr neue Preise)
- **Nach Set:** Top 30 pro Set (Haupt- und Spezialsets der letzten 5 Jahre, dazu immer Celebrations / 25 Jahre), sortierbar nach Ø 7 / Ø 30 Tage
- **Alle Sets zusammen:** Gesamtrangliste (`#rangliste`)
- **Schnellsuche** (`#suche`):
  - Name in jeder Sprache + Sprache dahinter, z. B. „Dragonite deutsch“, „Glurak japanisch“
  - Internationale, japanische, koreanische, chinesische Karten und Promos (SVP, SWSH, MEP)
  - Preise: Ø 1 / 7 / 30 Tage, Trend, Ab-Preis, Cardmarket-Link
- **Mithören:** Spracherkennung (Deutsch) mit lautähnlicher Namenserkennung, Smalltalk-Filter, Protokoll „Was gehört wurde“
- **Bild erkennen:** Screenshot hochladen, einfügen oder am PC per Drag & Drop irgendwo auf die Seite ziehen (auch mehrere); Claude erkennt die Karte (eigener API-Schlüssel nötig)
- **Archiv** (`#archiv`): jede erkannte Karte mit Scan-Vorschau, Preis beim Scan und heute, Gesamtwert-Kasten (Ø 30 Tage, heute vs. beim Scan), mehrere Bilder auf einmal, CSV-Export, Suchfeld (wie Schnellsuche: Name in jeder Sprache, Sprache, Nummer, Set; Gesamtwert zeigt dann nur die Treffer); nach einem Scan „Diese ist es“ zum Korrigieren. Gespeichert nur auf dem Gerät (IndexedDB).
- **Bildschirm mitlesen (PC, Chrome/Edge):** Whatnot-Tab oder -Fenster freigeben; „Jetzt erkennen“ (Leertaste) oder automatisch bei neuer Karte (Bildmitte vergleicht >10 % Änderung, 2 s ruhig, höchstens alle 10 s). Gleiche Karte hintereinander nur einmal im Archiv.
- **Meine Sammlung** (`#sammlung`): Karten aus Archiv oder Schnellsuche mit „+ Sammlung“ übernehmen; je Eintrag Anzahl, Kaufpreis pro Stück, Grad (Notiz; Preis bleibt Cardmarket ungegradet). Gesamtwert Ø 30 Tage × Anzahl, Bezahlt, Gewinn/Verlust, Wertverlauf (ein Punkt pro Preistag, gespeichert beim Öffnen), Performance je Karte für Tag / Woche / Monat / Jahr (Ø 30 Tage heute gegen den Preis vor 1/7/30/365 Tagen; Preise je Karte werden täglich beim Öffnen gespeichert, bis der Verlauf reicht wird gegen den Preis beim Hinzufügen gerechnet, Hinweis „seit …“), Kasten „Beste Performer“, beste Karte je Zeitraum mit ★ markiert, sortierbar, Suche, CSV, Sicherung als Datei (Sammlung + Wertverlauf + Archiv) und Einlesen. Nur auf dem Gerät (IndexedDB-Speicher `sammlung`, `wert`, Datenbank-Version 2).
- **Frische Tagespreise auf dem Handy:** Die Seite liest zuerst `data/status.json` (nie zwischengespeichert) und lädt die Kartendaten mit `?v=<Datenstand>`; der Service Worker nimmt bei neuem Stand sofort die neue Datei und räumt die alte weg.
- **Grading** (`#grading`): eigene Suche für gegradete Karten. Karte finden (gleiche Suche wie Schnellsuche), Grad wählen (PSA 10/9, BGS 10, CGC 10), dann Link zu PriceCharting (Preise je Grad, abgeschlossene Auktionen) und zu verkauften eBay-Angeboten. Keine Preise von PriceCharting auf der Seite selbst (Abrufen verbieten deren Nutzungsbedingungen, API kostet Geld).
- **Foto machen:** öffnet direkt die Kamera (auch in der installierten App)
- **Als App installierbar,** Screenshots über das Android-Teilen-Menü direkt an die Seite schicken

## Erkennung und Zuordnung (10.11.2026)

- **Bildvergleich:** Im Modus „Genau“ prüft Claude bei mehreren möglichen Versionen (Nummer nicht lesbar oder nicht eindeutig) das Foto gegen bis zu 6 Kartenbilder (kleine Bilder per URL) und wählt die passende (`snapVisualPick`). Kostet einen zweiten Aufruf, ca. 1 Cent.
- **Lernen:** „Diese ist es“ merkt sich Erkennung (Name, Nummer, Sprache) → Karte im Browser (`localStorage` „snapLearn“, max. 1000); nur wenn eine Nummer gelesen wurde.
- **Set-Kürzel:** Erkennung liest `set_code` (z. B. TWM); Sets tragen `ab` (TCGdex `abbreviation.official`, bei TCGplayer-Sets das Gruppen-Kürzel) im Suchtext.
- **Geteilte Cardmarket-Produkte (alle Sets):** `repairShared` + `resolveSharedProducts`: Versionen derselben Erweiterung und desselben Namens im Cardmarket-Katalog, gepaart nach TCGplayer-Preis, sonst nach Seltenheit (Holo/Sonder > normal). TCGplayer-Gruppe für alte Sets auch über den Namen (±1 Jahr).
- Ergebnis Reparatur (10.11.): ältere Karten mit geteiltem Produkt 1.399 → 327, aktuelle 2 (Giratina V 130 / VSTAR 201: drei freie VSTAR-Produkte im Katalog, nicht eindeutig), 48 Karten mit „unsicher“ wegen naher Preise. Laufzeit des Tageslaufs jetzt ca. 15–18 Minuten.
- **eBay verkauft:** Link je Karte in Suche, Archiv und Sammlung, mit Sprache (z. B. „deutsch“, „japanese“).
- **Fotos bei Cardmarket:** Fotos hängen an Angebotsnummern (marketplace-article-scans.s3.cardmarket.com/<Angebot>/<Angebot>.jpg), Angebote sind nicht frei abrufbar → nicht automatisch erkennbar.

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

## Erledigt am 23.10.2026

- Grading-Reiter mit PriceCharting- und eBay-Links; Reiter umbenannt: Sets, Rangliste, Suche, Grading, Archiv

## Erledigt am 01.11.2026

- Archiv durchsuchbar; Archiv-Zähler im Reiter als kleine Zahl, damit die Reiter am Handy nicht umbrechen

## Erledigt am 05.11.2026

- TCGplayer-Ersatzpreise (in € umgerechnet) für Sets ohne Cardmarket-Preise
- Preis-Hinweise: „⚠ unsicher“, wenn zwei Karten eines Sets dasselbe Cardmarket-Produkt haben (Datenfehler bei TCGdex, z. B. Arbok Expedition Nr. 3/35; ca. 1.400 ältere Karten, 2 aktuelle), „⚠ schwankt“, wenn Ø 7 und Ø 30 Tage um Faktor ≥ 1,6 abweichen (ab 5 €). Erkennung im Browser.
- Sammlung: Zustand (MT–PO; Cardmarket-Link mit `minCondition`, laut Cardmarket nicht offiziell dokumentiert) und „Eigener Wert“ (zählt statt Ø 30 für Wert, Ranking, Gewinn; Performance bleibt Marktpreis). Unsichere Preise zählen erst mit eigenem Wert.
- **CSV-Import in die Sammlung (seit 06.11.):** Dex-Export (UTF-16, Semikolon; Zeilen mit Quantity > 0) und die eigene CSV der App. Zuordnung über Set-Kennung (sv03.5 = sv35 = sv3pt5, jpn_/scn_-Präfix, tg/gg zum Hauptset) + Nummer, sonst Set-Name (auch englisch) + Nummer, sonst Suche ("unsicher"); eigene CSV zuerst über den Cardmarket-Link. Dex: nur Typ "collection" zählt als Besitz, Listen (Typ "standard…") werden als Ordner an der Karte vermerkt, nicht doppelt gezählt (je Karte+Variante ein Eintrag, srcKey dex2|Id|Variante). Erneuter Import aktualisiert und entfernt doppelte Listen-Einträge des ersten Imports. Dex-Preis wird nicht übernommen (Marktwert, kein Kaufpreis). Test mit echtem Export: 6.840 sicher, 20 unsicher, 83 nicht gefunden von 6.943.
- Sammlung: Variante (Reverse Holo mit eigenem Cardmarket-Preis r30/r7 aus den Tagesdaten), Ordner und Notiz; Liste zeigt 60 Karten, Rest über "Weitere anzeigen".
- Sammlung: Einkaufspreis 0 = „gezogen“ (ganzer Wert ist Gewinn, eigene Zeile im Wertkasten; Prozent nur für gekaufte Karten)
- Sammlung: Ranking „Wertvollste Karten“ (Top 10, alle aufklappbar, Ø 30 Tage pro Stück) und Sortierung „Wert“

- Sammlung: Performance Tag/Woche/Monat/Jahr, „Beste Performer“, ★-Markierung, Sortierung
- „Meine Sammlung“ mit Kaufpreis, Anzahl, Grad, Gewinn/Verlust, Wertverlauf und Sicherung; Reiter am Handy in zwei Reihen (3 × 2)

## Erledigt am 11.11.2026

- **„Bieten bis“** in der Schnellsuche: Höchstgebot = (Preis × (1 − Marge) − Versand) / (1 + Gebühren), auf 50 Cent abgerundet. Einstellbar unter der Suchzeile (Grundlage Ø 30 / Ø 7 / Trend / Ab-Preis, Marge, Versand, Gebühren; Standard Ø 30, 20 %), gespeichert in localStorage `bidSet`. Bei unsicheren Preisen mit ⚠.
- **Sealed-Produkte** (`docs/data/sealed.json`, aus Cardmarkets `products_nonsingles_6.json` + Preisliste): Displays, Booster, Top-Trainer-Boxen, Kollektionen, Tins, Themendecks, Blister, Münzen … Zuordnung zum Set über den englischen Set-Namen im Produktnamen (längster Treffer), sonst Gruppe „Sealed-Produkte“. Cardmarket liefert für Sealed nur Trend, Durchschnitt und Ab-Preis; „Ø 30“ ist hier der Trend. In der Schnellsuche nur, wenn ein Produktwort in der Suche steht (display, box, booster, etb, ttb, tin, kollektion, sealed …), damit „Glurak“ weiter Karten zeigt. Sammlung und Archiv nehmen Sealed mit (Wert = Trend).
- **Mehrere Karten auf einem Foto:** Die Bilderkennung liefert bis zu 20 Karten (Leserichtung, `kind` card/sealed). Bei mehr als einer Karte erscheint eine Liste mit Häkchen, Preis je Karte und Gesamtwert; „Ausgewählte in die Sammlung“ / „Ausgewählte ins Archiv“. Gilt für Fotos und Screenshots, nicht für „Bildschirm mitlesen“.

## Tempo (11.11.2026)

- **Ursache der Hänger:** `archCurrent` baute den Karten-Index (46.000 Karten) bei jedem Aufruf neu, weil er die Indexgröße mit der Kartenzahl verglich und `old.json` 58 doppelte IDs hatte (japanisches Set BW8a doppelt bei TCGdex). Sammlung mit 20 Karten: 3,2 s → 14 ms; mit 400 Karten lief sie gar nicht mehr durch. Jetzt Zähler `archIdxN`; der Lauf entfernt doppelte IDs.
- Startseite: nur die ersten 2 Sets sofort, die übrigen beim Heranscrollen (`lazySets`, `fillSet`, `lazyWatch`; Platzhalter in gemessener Höhe, Höhenausgleich oberhalb des Bildschirms). 18.300 → 1.600 Elemente, 1.019 → 70 Bilder; längster Hänger beim Start (5-fach gedrosselt) 1.170 → 250 ms. Kartenbilder in Tabellen mit fester Höhe.
- Schnellsuche: Felder je Karte einmal beim Laden vorbereitet (`_no`, `_pn`, `_r`, `_pid`, Set-Wörter `_w`), `fold` mit schnellem Weg für ASCII und Zwischenspeicher; nachgeladene Dateien werden in Häppchen von 3.000 Karten vorbereitet (`scheduler.yield`).
- Sammlung: Wertverlauf im Speicher (`valCache`), Tages-Snapshot nur bei Änderung, `colPerf` ohne Zwischenlisten, 40 statt 60 Karten pro Seite. Archiv: 40 pro Seite mit „Weitere anzeigen“.
- Vergleichstest alt/neu: 40 Suchen, Sammlungswerte und Performance identisch.

## Offen

1. Optional: Seite in Chrome als App installieren und das Teilen-Menü ausprobieren
2. Rückmeldung zum Mithören-Modus: Was steht unter „Was gehört wurde“, wenn ein Name nicht erkannt wird?
3. Ab ca. 28.10. erscheint in den Set-Tabellen die Spalte „vs. Vorwoche“ (braucht 7 Tage Verlauf)

## Bekannte Grenzen

- Cardmarket-Preise gelten für alle europäischen Sprachen zusammen (Deutsch = Englisch)
- **Sprachen und Preise (geprüft 10.11.):** Cardmarkets Durchschnitt gilt je Produkt für alle Sprachen zusammen (westlich: DE/EN/FR/IT/ES; asiatisch: JP/KR/CN). Die öffentliche Preisliste hat keine Aufteilung nach Sprache; getrennte Angebote zeigt nur Cardmarket selbst. Deshalb: Cardmarket-Links mit Sprachfilter (`&language=`: en 1, fr 2, de 3, es 4, it 5, zh-cn 6, ja 7, ko 10, zh-tw 11; ob der Filter im Kurzlink greift, ist nicht bestätigt), in der Sammlung Feld „Sprache“ je Karte, eigener Wert für den echten Preis.
- Alle koreanischen und chinesischen Karten (239 / 3.931 / 742 mit Preis) haben bei TCGdex das Cardmarket-Produkt der japanischen Karte: Hinweis „⚠ JP-Preis“ (`_jp`, im Browser erkannt), zählen in der Sammlung erst mit eigenem Wert.
- Wenige koreanische Karten in der Datenquelle; viele asiatische Karten ohne Bild
- **Ersatzpreise TCGplayer (seit 05.11.):** Hat ein Set gar keine Cardmarket-Preise (z. B. „30 Jahre“, „30 Jahre: Klassische Sammlung“, Celebrations Classic Collection), nimmt der Lauf TCGplayer-Marktpreise (USA) von tcgcsv.com und rechnet sie zum EZB-Referenzkurs (letzter Bankarbeitstag) in Euro um (`scripts/tcgplayer.mjs`). Auf der Seite mit „US“ markiert, Ø 7 Tage leer, Link zu TCGplayer. Sobald Cardmarket Preise hat, werden automatisch diese genommen. Zuordnung über Nummer + Name; Test am 05.11.: 158/158 und 30/30 Karten. Fällt pokemontcg.io für cel25c aus, wird das Set direkt aus TCGplayer gebaut.
- Ältere Sets ganz ohne Cardmarket-Preis bei TCGdex (14 Sets, z. B. Glitzer-Tresor/Shiny Vault aus Hidden Fates, Gym Heroes, Gym Challenge, Wizards-/Nintendo-Promos, XY-Trainer-Kits): seit 05.11. Ersatz über pokemontcg.io (Cardmarket, erst Set-Kennung, dann Name), danach TCGplayer.
- Reprints mit Originalnummer (Klassische Sammlung): gedruckte Nummer aus TCGplayer als `pn` in den Suchdaten, Suche und Bilderkennung finden die Karte über beide Nummern. Englische Set-Namen (`ne`) in den Suchdaten, damit englische Set-Hinweise der Bilderkennung passen. Bilderkennung probiert zuerst Nummer + Set-Wort.
- Archiv: „Andere Karte?“ öffnet die Suche; dort mit „Diese ist es“ den Scan einer anderen Karte zuordnen.
- **Cardmarket-Preisliste (seit 05.11.):** Für Sets mit TCGplayer-Ersatzpreisen holt der Lauf echte Cardmarket-Preise aus Cardmarkets öffentlichen Tagesdateien (downloads.s3.cardmarket.com, Preisliste + Produktkatalog, `scripts/cmguide.mjs`). Ohne Kartennummern: Zuordnung über den Namen in der passenden Erweiterung (gleicher Zeitraum, meiste Namenstreffer), gleichnamige Karten über die Preisreihenfolge, Prüfung gegen den TCGplayer-Preis (höchstens Faktor 3). Test 05.11.: 185 von 191 Karten der 30-Jahre-Sets (Erweiterung 6601), Rest bleibt TCGplayer.
- **Neue Sets ohne TCGdex (seit 07.11.):** Haupt-Erweiterungen bei TCGplayer der letzten 150 Tage (Name "ME06: …"), die TCGdex noch nicht kennt, baut der Lauf direkt aus TCGplayer (Karten, Bilder, Seltenheit, US-Preis) mit Kennungen wie bei TCGdex (me06-141); danach Cardmarket-Preise aus der Preisliste. Deutsche Namen in NEW_SET_DE (Delta Reign = Delta Herrschaft). Sobald TCGdex das Set hat, wird automatisch TCGdex genommen. Test 07.11.: 141 Karten, 84 mit Cardmarket-Preis.
- **Neue Sets bei TCGdex (seit 08.11.):** In den ersten 120 Tagen prüft der Lauf, ob TCGdex mehrere Karten demselben Cardmarket-Produkt zuordnet oder Preise fehlen (Delta Herrschaft am 08.11.: 62 Karten teilten sich 28 Produkte, 38 ohne Preis). Diese Karten bekommen den Preis aus der Cardmarket-Preisliste (Name + Preisreihenfolge, gegen TCGplayer geprüft), sonst TCGplayer (`repairNewSet`; Link dann zur Cardmarket-Suche). Fehlen bei TCGdex die Bilder, kommen sie von TCGplayer (200 px / 1000 px). Gleichnamige Versionen mit Vergleichspreisen unter 25 % Abstand (ab 5 €) werden als `am` = „⚠ unsicher“ markiert, weil die Reihenfolge nicht sicher ist (z. B. Mega-Rayquaza-ex 138/141).
- US-Preise sind US-Marktpreise: In Europa kann der Preis deutlich abweichen.
- Ältere Karten (international seit 1999, japanisch seit 1996) sind in der Schnellsuche (docs/data/old.json, wird im Hintergrund nachgeladen). Die Top-30-Ansichten bleiben bei 5 Jahren.
- Findet die Bilderkennung genau die Version nicht, erscheint ein Hinweis mit Link zur Cardmarket-Suche.
- Teilen-Menü und Mithören funktionieren in Chrome (Android), nicht in Firefox; „Bild erkennen“ per Galerie geht in beiden
- Archiv liegt nur im Browser-Speicher des Handys: Beim Löschen der Browserdaten ist es weg, deshalb ab und zu als CSV exportieren
- 1. Edition / Shadowless werden bei Cardmarket-Durchschnittspreisen nicht getrennt ausgewiesen.
