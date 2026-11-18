# PROJ-9: CSV-Export aller Zeiten

## Status: Planned
**Created:** 2026-11-08
**Last Updated:** 2026-11-18

## Dependencies
- Requires: PROJ-2 (Anmeldung) — Export nur für angemeldete Nutzer
- Requires: PROJ-4 (Manuelle Zeiterfassung) — liefert die Einträge (Datum, Kunde, Projekt, Beschreibung, von–bis oder Dauer, verrechenbar)
- Nutzt: PROJ-5 (Zeiten prüfen und korrigieren) — korrigierte und gelöschte Einträge fliessen sofort in den Export; der Knopf sitzt auf der Zeiten-Seite
- Nutzt: PROJ-8 (Monatsauswertung) — Abgleich der Summen; die Rundung selbst steht **nicht** in der Datei (siehe Product Decisions)

## User Stories
- Als Einzelnutzer möchte ich jederzeit alle meine Zeiten als CSV-Datei herunterladen, damit ich sie in Excel auswerten oder für die Rechnung aufbereiten kann.
- Als Einzelnutzer möchte ich, dass die Datei sich in Excel per Doppelklick korrekt öffnet (Umlaute, Spalten, Zahlen), damit ich nichts importieren oder umstellen muss.
- Als Einzelnutzer möchte ich Dauer und verrechenbare Zeit sowohl in Minuten als auch in Dezimalstunden haben, damit ich in Excel ohne Umrechnung summieren und Rechnungen in Dezimalstunden schreiben kann.
- Als Einzelnutzer möchte ich, dass korrigierte Zeiten sofort im Export stimmen und gelöschte nicht auftauchen, damit ich der Datei vertrauen kann.
- Als Einzelnutzer möchte ich, dass der Export auch bei sehr vielen Einträgen vollständig ist, damit keine Zeilen stillschweigend fehlen.

## Out of Scope
- **Gerundete Werte (15-Minuten-Einheiten) in der Datei:** Die Rundung gilt pro Projekt und Monat, nicht pro Eintrag. Sie bleibt in der Monatsauswertung (PROJ-8). Die Datei ist die minutengenaue Rohdatenbasis.
- **Monatssummen oder Summenzeilen im Export:** Summen bildest du in Excel oder liest sie in PROJ-8 ab. Kein zweites Dateiformat.
- **Zeitraum-, Kunden- oder Projektfilter beim Export:** Der Export enthält immer alle Zeiten; filtern geht in Excel.
- **Knopf in der Monatsauswertung oder Wochenübersicht:** Nur auf der Zeiten-Seite (PROJ-5-Ansicht).
- **Export von Kunden und Projekten als eigene Datei:** Nicht gefordert.
- **Andere Formate (Excel-Datei, PDF, JSON):** PDF ist Non-Goal laut PRD; andere Formate nicht gefordert.
- **Stundensätze, Beträge, Rechnungserstellung:** Non-Goal laut PRD.
- **Automatischer oder geplanter Export, Versand per E-Mail:** Nicht gefordert.
- **Laufender Timer:** Ein noch laufender Timer ist kein Eintrag und kommt nicht in die Datei (wie in PROJ-8).
- **Wählbare Trennzeichen, Kodierung oder Spalten:** Ein festes Format.
- **Import von CSV-Dateien:** Nicht gefordert.

## Dateiformat (Festlegung)
- **Kodierung und Trennzeichen:** UTF-8 mit BOM, Semikolon als Trennzeichen, Zeilenende Windows-üblich, Dezimalkomma bei Stunden.
- **Kopfzeile** in der ersten Zeile, deutsche Spaltennamen.
- **Spalten (in dieser Reihenfolge):** Datum (TT.MM.JJJJ), Kunde, Kundenkürzel, Projekt, Beschreibung, Von, Bis, Dauer (Minuten), Dauer (Stunden), Verrechenbar (Minuten), Verrechenbar (Stunden).
- **Von/Bis** sind leer bei Einträgen, die nur mit Dauer erfasst wurden.
- **Stunden** als Dezimalzahl mit zwei Nachkommastellen (105 Min. → 1,75), nur zur Anzeige; die Minuten-Spalten sind die genauen Werte.
- **Sortierung:** nach Datum aufsteigend, innerhalb eines Tages nach Startzeit (Einträge ohne Uhrzeit danach, in Erfassungsreihenfolge).
- **Dateiname:** `zeiten-JJJJ-MM-TT.csv` (Datum des Exports).

## Acceptance Criteria

**Format:** Angenommen [Vorbedingung] / Wenn [Aktion] / Dann [Ergebnis]

### Auslösen und Herunterladen
- [ ] Angenommen der Nutzer ist angemeldet und öffnet die Zeiten-Seite, dann sieht er einen Knopf «Als CSV exportieren», auch wenn der angezeigte Monat leer ist.
- [ ] Angenommen der Nutzer klickt auf den Knopf, wenn die Daten geladen sind, dann startet der Download einer Datei `zeiten-JJJJ-MM-TT.csv` mit allen seinen Zeiten, ohne die Seite zu verlassen.
- [ ] Angenommen der Export läuft, wenn der Nutzer wartet, dann zeigt der Knopf einen Ladezustand und ist deaktiviert, sodass kein zweiter Export parallel startet.
- [ ] Angenommen der Export war erfolgreich, wenn der Download startet, dann erscheint eine kurze Bestätigung mit der Anzahl exportierter Zeilen.
- [ ] Angenommen der Nutzer ist nicht angemeldet, wenn er den Export auslösen will, dann wird er zur Anmeldung geführt und es werden keine Daten geliefert.

### Inhalt
- [ ] Angenommen es gibt Einträge in mehreren Monaten und bei mehreren Kunden, wenn der Nutzer exportiert, dann enthält die Datei genau alle Einträge (eine Zeile pro Eintrag), unabhängig vom auf der Zeiten-Seite gewählten Monat.
- [ ] Angenommen die Datei wird erzeugt, dann steht in der ersten Zeile die Kopfzeile mit den festgelegten Spalten in der festgelegten Reihenfolge.
- [ ] Angenommen ein Eintrag hat von–bis, wenn er exportiert wird, dann stehen Von und Bis in der Datei und die Dauer entspricht der Differenz in Minuten.
- [ ] Angenommen ein Eintrag wurde nur mit Dauer erfasst, wenn er exportiert wird, dann sind Von und Bis leer und die Dauer steht in Minuten und Stunden.
- [ ] Angenommen ein Eintrag ist nicht verrechenbar oder nur teilweise verrechenbar, wenn er exportiert wird, dann stimmen die Spalten «Verrechenbar» mit dem erfassten Wert überein (0 bei nicht verrechenbar).
- [ ] Angenommen ein Eintrag dauert 105 Minuten, wenn er exportiert wird, dann stehen 105 in «Dauer (Minuten)» und 1,75 in «Dauer (Stunden)» (Dezimalkomma).
- [ ] Angenommen die Datei wird erzeugt, dann steht keine gerundete Spalte und keine Summenzeile darin; alle Werte sind minutengenau.
- [ ] Angenommen ein Eintrag gehört zu einem archivierten Kunden oder Projekt, wenn der Nutzer exportiert, dann ist der Eintrag in der Datei enthalten, mit dem Namen des archivierten Kunden/Projekts.
- [ ] Angenommen die Einträge werden exportiert, dann sind sie nach Datum aufsteigend und innerhalb eines Tages nach Startzeit sortiert.

### Excel-Verträglichkeit und Sonderzeichen
- [ ] Angenommen die Datei wird in deutsch-/schweizerischem Excel per Doppelklick geöffnet, dann erscheinen Umlaute und Sonderzeichen korrekt, die Daten stehen in getrennten Spalten und Stunden werden als Zahlen (nicht als Text) erkannt.
- [ ] Angenommen eine Beschreibung enthält Semikolon, Anführungszeichen oder Zeilenumbrüche, wenn sie exportiert wird, dann bleibt die Zeile intakt (Feld in Anführungszeichen, Anführungszeichen verdoppelt) und es entstehen keine zusätzlichen Zeilen oder verschobenen Spalten.
- [ ] Angenommen ein Text (Beschreibung, Kunde, Projekt) beginnt mit `=`, `+`, `-` oder `@`, wenn er exportiert wird, dann wird er in Excel als Text angezeigt und nicht als Formel ausgeführt (der Wert wird dafür mit einem vorangestellten Zeichen entschärft).

### Aktualität und Vollständigkeit
- [ ] Angenommen der Nutzer hat einen Eintrag korrigiert oder gelöscht, wenn er danach exportiert, dann enthält die Datei den korrigierten Stand und den gelöschten Eintrag nicht.
- [ ] Angenommen der Nutzer hat mehr als 1000 Einträge, wenn er exportiert, dann enthält die Datei alle Einträge (die 1000-Zeilen-Grenze der Datenbank führt nicht zu fehlenden Zeilen).
- [ ] Angenommen es gibt keine Einträge, wenn der Nutzer exportiert, dann wird entweder eine Datei nur mit Kopfzeile geliefert und eine Meldung «Keine Zeiten vorhanden» gezeigt, oder der Export wird mit dieser Meldung verweigert (Festlegung siehe Open Questions).
- [ ] Angenommen ein Timer läuft, wenn der Nutzer exportiert, dann enthält die Datei den laufenden Timer nicht.

### Fehlerfälle
- [ ] Angenommen die Datenbank ist nicht erreichbar oder das Laden bricht mittendrin ab, wenn der Nutzer exportiert, dann erscheint eine verständliche Fehlermeldung, es wird keine unvollständige Datei heruntergeladen und der Knopf ist wieder bedienbar.
- [ ] Angenommen die Sitzung ist abgelaufen, wenn der Nutzer exportiert, dann wird er zur Anmeldung geführt und nach dem Login ist die Zeiten-Seite wieder erreichbar.

### Bedienung und Darstellung
- [ ] Angenommen der Nutzer ist auf Handy (320 px), Tablet oder Laptop, dann ist der Knopf sichtbar, mindestens 44 × 44 px gross, ohne horizontales Scrollen und per Tastatur bedienbar.
- [ ] Angenommen der helle oder dunkle Modus ist aktiv, dann erfüllt der Knopf mit seinem Zustand den Kontrast nach WCAG AA.
- [ ] Angenommen ein Screenreader-Nutzer löst den Export aus, dann werden Ladezustand und Ergebnis (Erfolg oder Fehler) angesagt.

## Edge Cases
- **Mehr als 1000 Einträge:** Die Datenbank liefert höchstens 1000 Zeilen pro Antwort; ohne seitenweises Laden würden Zeilen stillschweigend fehlen (Hinweis aus PROJ-5/PROJ-8).
- **Keine Einträge:** Leerer Export; Verhalten siehe Open Questions.
- **Sehr lange Beschreibung oder lange Kundennamen:** Werden vollständig exportiert, ohne Kürzung.
- **Formel-Einschleusung:** Beschreibungen wie `=SUMME(A1)` oder `@cmd` dürfen in Excel nie als Formel laufen.
- **Zeilenumbruch in der Beschreibung:** Bleibt innerhalb einer Zelle, darf keine neue Zeile erzeugen.
- **Mitternacht und Sommerzeitumstellung:** Dauer und Von/Bis müssen mit den Zeiten in PROJ-4/5 übereinstimmen (Datum und Uhrzeit in lokaler Zeit des Nutzers, nicht UTC).
- **Eintrag über Mitternacht:** Falls erlaubt, steht das Startdatum in «Datum»; die Dauer bleibt in der Spalte unverändert.
- **Eintrag ohne Beschreibung:** Leere Zelle, keine Platzhaltertexte.
- **Archivierte Kunden/Projekte:** Weiter im Export mit ihrem Namen.
- **Doppelklick auf den Knopf / langsame Verbindung:** Es läuft höchstens ein Export gleichzeitig.
- **Während des Exports wird ein Eintrag geändert:** Die Datei zeigt einen konsistenten Stand zum Zeitpunkt des Ladens; Aktualität bis zum nächsten Export genügt.
- **Dasselbe Datum, mehrere Einträge:** Reihenfolge nach Startzeit, sonst nach Erfassung; Sortierung ist stabil.

## Technical Requirements (optional)
- **Sicherheit:** Nur angemeldete Nutzer; es werden nur eigene Zeiten geliefert (Zeilenschutz der Datenbank gilt unverändert). Keine Daten in Adresszeile oder Protokollen.
- **Korrektheit:** Minuten- und Stundenwerte kommen aus den vorhandenen Einträgen; Stunden werden nur zur Anzeige aus Minuten berechnet (Minuten ÷ 60).
- **Leistung:** Export von ca. 2000 Einträgen in wenigen Sekunden; Ladezustand sichtbar.
- **Browser:** Aktuelle Versionen von Chrome, Firefox, Safari, auch auf dem Handy.
- **Barrierefreiheit:** WCAG AA, Tastatur und Screenreader (wie übrige Seiten).

## Open Questions
- [ ] **Leerer Export:** Soll bei null Einträgen eine Datei nur mit Kopfzeile heruntergeladen werden, oder nur die Meldung «Keine Zeiten vorhanden» erscheinen? Vorschlag: keine Datei, nur Meldung (nichts zu exportieren).
- [ ] **Einträge über Mitternacht:** Sind solche Einträge in PROJ-4 überhaupt erlaubt? Falls ja, Datum = Startdatum (bei /architecture prüfen).
- [ ] **Datumsformat:** TT.MM.JJJJ (Excel erkennt es als Datum) statt JJJJ-MM-TT. Vorschlag wie in der Spec festgelegt; auf Wunsch änderbar.
- [ ] **Entschärfung von Formelzeichen:** Vorangestelltes Zeichen sichtbar (z. B. Apostroph) in Excel; akzeptabel oder störend? Vorschlag: akzeptieren, nur bei betroffenen Texten.

## Decision Log

### Product Decisions
| Decision | Rationale | Date |
|----------|-----------|------|
| Eine Zeile pro Zeiteintrag, keine Summen | Die Datei ist die vollständige, prüfbare Rohdatenbasis; Summen und Rundung zeigt PROJ-8 | 2026-11-18 |
| Keine gerundeten Werte in der Datei | Rundung gilt pro Projekt und Monat nach der Summe (PROJ-8); eine gerundete Spalte pro Eintrag wäre falsch und widerspräche dem Bildschirm | 2026-11-18 |
| Minuten und Dezimalstunden nebeneinander | Minuten sind exakt, Stunden bequem für Excel und Rechnungen; schliesst die offene Frage zu Dezimalstunden aus PROJ-8 | 2026-11-18 |
| Semikolon, UTF-8 mit BOM, Dezimalkomma | Öffnet sich in deutsch-/schweizerischem Excel per Doppelklick korrekt, ohne Import-Assistent | 2026-11-18 |
| Immer alle Zeiten, ohne Filter | Entspricht dem PRD («aller Zeiten, jederzeit»); weniger Bedienung und Fälle; Filtern geht in Excel | 2026-11-18 |
| Ein Knopf, nur auf der Zeiten-Seite | Ein Einstiegspunkt reicht für den MVP; die Zeiten-Seite ist der Ort für Prüfen und Korrigieren | 2026-11-18 |
| Laufender Timer nicht enthalten | Konsistent mit PROJ-8; ein Timer wird erst beim Stoppen zum Eintrag | 2026-11-18 |
| Archivierte Kunden/Projekte bleiben im Export | Sonst fehlen Zeiten, die für die Rechnung nötig sind | 2026-11-18 |
| Formelzeichen am Textanfang werden entschärft | Schutz vor Formel-Einschleusung in Excel; Beschreibungen sind freier Text | 2026-11-18 |
| Unvollständige Datei wird nie geliefert | Fehlende Zeilen ohne Hinweis würden Auswertung und Rechnung verfälschen (PRD-Kriterium 4) | 2026-11-18 |

### Technical Decisions
<!-- Added by /architecture -->
| Decision | Rationale | Date |
|----------|-----------|------|

---

## Tech Design (Solution Architect)
_To be added by /architecture_

## QA Test Results
_To be added by /qa_

## Deployment
_To be added by /deploy_
