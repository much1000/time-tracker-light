# PROJ-9: CSV-Export aller Zeiten

## Status: Approved
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
- [x] **Einträge über Mitternacht:** Geklärt bei /architecture: In PROJ-4 nicht möglich (Nachtarbeit = zwei Einträge). Einzige Besonderheit: Der Timer kann einen Eintrag mit Ende «24:00» erzeugen; dieser Wert steht unverändert in der Spalte «Bis».
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
| Datei entsteht im Browser, keine neue Server-Route | Die Anmeldung und alle Daten laufen schon über den Browser und die Datenbank-Zugriffsregeln; ein Server-Weg wäre eine zweite Zugriffsstelle mit eigenem Risiko und ohne Nutzen | 2026-11-18 |
| Keine Datenbank-Änderung | Alle Felder liegen in den Zeiteinträgen; Kunde und Projekt kommen über die bestehende Verknüpfung | 2026-11-18 |
| Seitenweises Laden in 1000er-Blöcken mit eindeutiger Reihenfolge | Datenbank liefert höchstens 1000 Zeilen pro Antwort; ohne eindeutige Sortierung (Datum, Startzeit, Anlegezeit, Kennung) könnten bei Seitenwechsel Zeilen doppelt oder gar nicht erscheinen | 2026-11-18 |
| Gesamtzahl nach dem Laden gegenprüfen, bei Abweichung abbrechen | Wird während des Exports ein Eintrag geändert, stimmt die Datei nicht; lieber Fehlermeldung und neu starten als stillschweigend falsche Datei (PRD-Kriterium 4) | 2026-11-18 |
| Format-Logik als eigene, reine Rechenfunktion (Maskieren, Dezimalkomma, Formelschutz, Datum) | Einzeln testbar mit allen Grenzfällen; getrennt von Oberfläche und Datenbank | 2026-11-18 |
| Stunden = Minuten ÷ 60, auf zwei Nachkommastellen kaufmännisch gerundet; Minutenspalten sind massgebend | Rundungsabweichungen von wenigen Hundertstel in der Stundenspalte sind unvermeidlich; die exakten Minuten bleiben daneben | 2026-11-18 |
| Formelschutz: Apostroph vor Texte, die mit `=`, `+`, `-`, `@`, Tabulator oder Zeilenumbruch beginnen | Verhindert Formel-Einschleusung in Excel; betrifft nur Textspalten, nie Zahlen | 2026-11-18 |
| Keine neuen Pakete | Eine CSV-Datei mit festem Format ist mit Bordmitteln des Browsers einfach und zuverlässiger als eine Fremdbibliothek | 2026-11-18 |

---

## Tech Design (Solution Architect)

### Überblick
Der Export ist eine **reine Auslese der bestehenden Zeiteinträge**. Es entstehen keine neue Tabelle, keine neuen Zugriffsregeln, keine Datenbank-Änderung und keine neue Server-Route. Neu sind: ein Knopf auf der Seite «Zeiten», eine Abfrage «alle Einträge, seitenweise» in der Datenschicht und ein kleiner Baustein, der aus den Einträgen den Dateitext macht. Der Browser baut die Datei und löst den Download aus. **Backend-Aufwand: klein**, nur Datenschicht, kein SQL.

### A) Komponentenstruktur
```
Seite /zeiten (besteht, PROJ-5)
+-- Kopfzeile: Überschrift «Zeiten»
    +-- Knopf «Zeit erfassen» (besteht)
    +-- NEU Knopf «Als CSV exportieren»
         - Ruhezustand: Symbol + Text
         - Läuft: Ladeanzeige, Knopf gesperrt, «wird exportiert», für Screenreader angesagt
         - Fertig: kurze Meldung «n Zeilen exportiert», Download startet
         - Fehler: kurze Fehlermeldung, Knopf wieder frei
         - Keine Zeiten: Meldung «Keine Zeiten vorhanden», keine Datei
```
Es gibt keine neue Seite und keine Auswahl. Auf Handy, Tablet und Laptop ist es derselbe Knopf (mindestens 44 × 44 px); in der Kopfzeile umbricht er bei schmaler Breite unter «Zeit erfassen».

### B) Datenmodell (in Alltagssprache)
**Es werden keine neuen Daten gespeichert.** Der Export liest die Zeiteinträge (PROJ-4) samt Kunde und Projekt und schreibt sie in eine Datei, die nirgends abgelegt wird.

```
Eine Zeile der Datei entspricht einem Eintrag:
- Datum (TT.MM.JJJJ)
- Kunde (Name), Kundenkürzel, Projekt (Name)  -> auch archivierte Kunden/Projekte
- Beschreibung (kann leer sein, kann Zeilenumbrüche und Semikolons enthalten)
- Von, Bis (leer bei Einträgen nur mit Dauer; «24:00» möglich, wenn ein Timer über Mitternacht gelaufen ist)
- Dauer in Minuten (ganze Zahl) und in Stunden (Dezimalkomma, zwei Nachkommastellen)
- Verrechenbar in Minuten und in Stunden

Reihenfolge der Zeilen: Datum aufsteigend, dann Startzeit (ohne Uhrzeit danach),
dann Anlegezeit; bei völliger Gleichheit die Eintragskennung (damit die Reihenfolge nie wackelt).

Datei: Kopfzeile + eine Zeile je Eintrag, Semikolon-getrennt, UTF-8 mit BOM, Windows-Zeilenende.
Name: zeiten-JJJJ-MM-TT.csv (heutiges Datum nach Zürcher Uhr).
Quelle: bestehende Tabelle der Zeiteinträge in Supabase; Zugriffsregeln unverändert
(nur eigene Einträge).
```

### C) Ablauf beim Klick (in Worten)
1. Knopf sperren, Ladezustand zeigen.
2. Einträge **in Blöcken zu je 1000** holen, bis alle da sind. Mit jedem Block wird auch die Gesamtzahl mitgeliefert.
3. Prüfen, dass die Zahl der geholten Zeilen der Gesamtzahl entspricht. Weicht sie ab (z. B. weil auf einem anderen Gerät währenddessen etwas geändert wurde), wird **nichts** heruntergeladen; es erscheint eine Fehlermeldung mit dem Hinweis, es nochmals zu versuchen.
4. Keine Einträge: Meldung «Keine Zeiten vorhanden», keine Datei.
5. Sonst Dateitext bauen, Download auslösen, Bestätigung mit Zeilenzahl zeigen, Knopf freigeben.
Bricht das Laden ab (Netz, abgelaufene Sitzung), gelten die bestehenden Fehlermeldungen der Datenschicht (Sitzung → zurück zur Anmeldung).

### D) Neue Bausteine (ohne Code)
- **Datenschicht:** neue Methode «Einträge in Blöcken holen» in der Schnittstelle der Zeiteinträge, mit Supabase-Umsetzung und Platzhalter für Tests. Jeder Eintrag trägt Kunde, Kürzel, Projekt (mit Archiv-Hinweisen wie bei Woche/Monat). Sie sortiert in der **Datenbank** (nicht im Browser), damit die Blöcke lückenlos aneinanderpassen.
- **Format-Baustein «CSV»** (reine Rechenfunktionen, einzeln getestet): Kopfzeile, Zeile je Eintrag, Maskierung von Semikolon/Anführungszeichen/Zeilenumbrüchen, Formelschutz, Datum, Dezimalkomma, BOM, Dateiname. Grenzfälle: leere Beschreibung, `=SUMME(A1)`, `@x`, `-1`, Beschreibung mit Zeilenumbruch, 0 Minuten, 24:00, 1440 Minuten, Dauer 1 Minute (0,02 h).
- **Export-Ablauf** (kleiner Baustein der Oberfläche, hängt am Knopf): Sperre gegen Doppelklick, Zustände, Meldungen, Download.
- **Wiederverwendung:** Fehlertexte und Fehlerarten der Zeiteinträge, Meldungen (Toast), Knopf, Ladezustand, Zürcher Datumsfunktion, Spaltenwerte der Einträge. Die Rundung auf 15 Minuten wird **nicht** verwendet (Produktentscheidung).

### E) Technische Entscheidungen (begründet)
- **Im Browser statt auf dem Server:** Anmeldung und Datenzugriff laufen in der ganzen App über den Browser. So gelten automatisch dieselben Zugriffsregeln, es gibt keinen zusätzlichen Zugang zu den Daten und nichts zu betreiben (Vercel Hobby, kostenlos).
- **Blockweise laden statt «alles auf einmal»:** Die Datenbank gibt höchstens 1000 Zeilen pro Antwort heraus (bekannte Grenze aus PROJ-5/PROJ-8). Würde man das ignorieren, fehlten Zeilen ohne jede Meldung.
- **Prüfen statt hoffen:** Die Gesamtzahl wird gegengeprüft. Eine Datei, die nicht stimmt, ist schlimmer als keine Datei.
- **Format von Hand statt Bibliothek:** Das Format ist fest (elf Spalten, ein Trennzeichen); die Regeln (Anführungszeichen verdoppeln, Zeilenumbrüche, Formelschutz) sind klein und gut testbar. Eine Fremdbibliothek brächte nur Gewicht und Abhängigkeit.
- **Formelschutz:** Beschreibungen sind freier Text. Beginnt er mit `=`, `+`, `-` oder `@`, würde Excel ihn als Formel ausführen. Darum wird ein Apostroph vorangestellt. Das ist die gängige Empfehlung und betrifft nur Textspalten.
- **Dezimalstunden nur zur Anzeige:** Gerechnet wird weiter in ganzen Minuten (wie überall in der App). Stunden entstehen erst beim Schreiben der Datei; die Minutenspalten sind die genauen Werte.
- **Download über einen temporären Link im Browser:** Funktioniert in Chrome, Firefox und Safari ohne Zusatz. Auf dem iPhone fragt Safari ggf. nach dem Speicherort.

### F) Abhängigkeiten (Pakete)
Keine neuen Pakete. Verwendet werden vorhandene Bausteine (Knopf, Meldungen/Toast, Symbole).

### G) Reihenfolge der Umsetzung (Hinweis für /backend und /frontend)
1. **/backend:** Blockweise Abfrage in Schnittstelle, Supabase-Umsetzung und Platzhalter; Format-Baustein «CSV» mit Tests; Test mit mehr als 1000 Einträgen und Änderung während des Exports.
2. **/frontend:** Knopf mit Zuständen und Meldungen auf «Zeiten», Download, Oberflächentests.
3. **/qa:** Öffnen in Excel (Schweizer Einstellungen) und einer zweiten Anwendung, über 1000 Einträge, Handy 320 px, Hell/Dunkel, Screenreader-Ansage.

### H) Risiken
- **Safari/iPhone:** Der Download einer erzeugten Datei verhält sich je nach Version leicht anders (Vorschau statt Speichern). In /qa auf echtem Gerät prüfen; Ausweichen ist möglich, ohne die Daten zu ändern.
- **Änderung während des Exports:** Wird durch die Gegenprüfung erkannt und führt zu einer Fehlermeldung, nicht zu einer falschen Datei.
- **Sehr grosse Datenmengen:** Für eine Einzelperson (einige Tausend Einträge pro Jahr) unkritisch; Datei entsteht im Arbeitsspeicher.
- **Sortierung in der Datenbank:** Ohne passenden Index wäre sie bei sehr vielen Zeilen langsamer; bei dieser Grössenordnung kein Problem, wird in /backend mit der echten Datenbank gemessen.

## Implementation Notes (Backend)
**Stand 2026-11-18.** Keine Datenbank-Änderung, keine Server-Route, keine neuen Pakete (wie im Entwurf).

### Was gebaut wurde
- **Datenschicht** (`repository.ts`, `supabase-repository.ts`, `in-memory-repository.ts`, `types.ts`): neue Methode `listEntriesPage(offset)`. Sie liefert höchstens `EXPORT_PAGE_SIZE` (1000) Einträge ab Position `offset` plus die Gesamtzahl (`count: exact`), mit Kunde, Kürzel, Projekt und Archiv-Hinweisen. Sortiert wird **in der Datenbank**: Datum, Startzeit (ohne Uhrzeit zuletzt), Anlegezeit, Kennung. Kein Datums-, Kunden- oder Beschreibungsfilter.
- **Blocklader** `export-all.ts`: `loadAllEntries(repository)` holt Block für Block, bis alle da sind. Bricht mit dem neuen Fehler `export-changed` ab, wenn die Gesamtzahl zwischen zwei Blöcken wechselt, ein Block zu früh leer ist, mehr Einträge ankommen als angekündigt oder eine Kennung doppelt vorkommt. Andere Fehler (Sitzung, nicht erreichbar) werden unverändert weitergereicht.
- **Fehlermeldung** `errors.ts`: `export-changed` → «Während des Exports wurden Zeiten geändert. Bitte starte den Export erneut.»
- **CSV-Baustein** `csv.ts` (reine Funktionen): `entriesToCsv(entries)` (BOM, Kopfzeile, Windows-Zeilenende, Semikolon), `entryToCsvRow`, `csvText` (Formelschutz mit Apostroph bei `=`, `+`, `-`, `@`, Tabulator, Zeilenumbruch am Anfang; Maskierung bei Semikolon, Anführungszeichen, Zeilenumbruch), `formatCsvHours` (Minuten ÷ 60, Dezimalkomma, zwei Stellen), `formatCsvDate` (TT.MM.JJJJ), `csvFileName(today)`. Die 15-Minuten-Rundung wird nicht verwendet.

### Tests
- **Vitest 488/488** (vorher 445, neu 43): `csv.test.ts` (Stunden, Datum, Maskierung, Formelschutz, Zeilen, Datei), `export-all.test.ts` (über 1000 Einträge lückenlos, Sortierung, Abbruch bei Änderung/Duplikat/leerem Block, Fehlerweitergabe), `supabase-repository.test.ts` (Sortierung, Bereich, Zähler, Archiv-Hinweise, Fehler). `tsc` und ESLint ohne Befund.

### Offen für /frontend
- Knopf «Als CSV exportieren» auf `/zeiten`: Ablauf `loadAllEntries` → bei null Einträgen Meldung «Keine Zeiten vorhanden» (keine Datei) → `entriesToCsv` → Download als Blob mit `csvFileName(todayInZurich())`, Bestätigung mit Zeilenzahl, Sperre gegen Doppelklick, Fehlermeldung über `describeTimeEntryError`.
- Noch nicht geprüft: die Abfrage gegen die echte Datenbank (Sortierung mit leeren Startzeiten, Bereich über 1000 Zeilen, Zeit bei mehreren Tausend Einträgen) und das Öffnen in Excel; beides in /qa.

## Implementation Notes (Frontend)
**Stand 2026-11-18.** Nur Oberfläche; Datenschicht und CSV-Baustein aus dem Backend-Schritt unverändert.

### Was gebaut wurde
- **Komponente** `src/components/time-entries/csv-export-button.tsx`: Knopf «Als CSV exportieren» (shadcn `Button`, Umriss, Symbol «Download»). Ablauf: `loadAllEntries` → bei null Einträgen Meldung «Keine Zeiten vorhanden.» (keine Datei) → `entriesToCsv` → Download über einen temporären Link auf die erzeugten Daten, Dateiname `zeiten-JJJJ-MM-TT.csv` (Zürcher Datum) → Bestätigung «n Zeilen exportiert.» (bzw. «1 Zeile exportiert.»).
- **Zustände:** Während des Exports ist der Knopf gesperrt (`disabled`, `aria-busy`), zeigt Ladesymbol und «Wird exportiert …»; eine Sperre ausserhalb des Zustands verhindert auch bei sehr schnellem Doppelklick einen zweiten Export. Fehler (nicht erreichbar, Sitzung abgelaufen, Bestand geändert) erscheinen als Meldung mit den bestehenden Texten, es wird nichts heruntergeladen, der Knopf ist danach wieder frei.
- **Meldungen** über die vorhandene Toast-Anzeige (wird von Screenreadern angesagt, wie bei Speichern/Löschen).
- **Einbau** `zeiten-view.tsx`: Der Knopf steht in der Kopfzeile neben «Zeit erfassen» (Umriss, nur «Zeit erfassen» bleibt gelb, wie im Design-System), unabhängig von Monat und Filtern, auch im leeren Monat. Bei schmaler Breite umbrechen die Knöpfe.
- Keine neuen Pakete, keine neuen shadcn-Komponenten.

### Tests
- **Vitest 497/497** (vorher 488, neu 9): `csv-export-ui.test.tsx` (8: Ruhezustand, Download mit Dateiname und Inhalt, «1 Zeile», keine Zeiten ohne Datei, Sperre/Doppelklick, nicht erreichbar, Sitzung abgelaufen, Änderung während des Exports) und 1 Test in `zeiten-ui.test.tsx` (Knopf im leeren Monat). `tsc` ohne Befund, ESLint nur die alte Warnung in `use-toast.ts`, `npm run build` erfolgreich.

### Bekannte Grenzen / für /qa
- Noch nicht im echten Browser geprüft: Download in Chrome/Firefox/Safari (besonders iPhone-Safari), Öffnen in Excel (Umlaute, Spalten, Zahlen), Layout bei 320/375/768/1440 px (Kopfzeile mit zwei Knöpfen), Kontrast Hell/Dunkel, Abfrage gegen die echte Datenbank mit über 1000 Einträgen. Playwright-Tests für PROJ-9 stehen aus.

## QA Test Results

**Getestet:** 2026-11-18 · **App:** Produktionsbuild lokal (`next start`, Port 3100) gegen die echte Supabase-Datenbank mit dem Testkonto · **Tester:** QA Engineer (AI)
**Browser:** Chrome (Desktop). Firefox, Safari/iPhone und Excel selbst wurden **nicht** getestet (siehe Grenzen).

### Zusammenfassung
- **Akzeptanzkriterien:** 26 geprüft: 23 bestanden, 1 Abweichung (BUG-2, niedrig), 2 nur teilweise prüfbar (echtes Excel, echter Screenreader).
- **Bugs:** 2 (0 kritisch, 0 hoch, 1 mittel, 1 niedrig). Nach dem Nachtest: BUG-1 behoben, BUG-2 (niedrig) offen.
- **Sicherheit:** keine Befunde.
- **Produktionsreif:** JA (nach dem Nachtest vom 2026-11-18, siehe unten): keine kritischen oder hohen Fehler, BUG-1 behoben, BUG-2 (niedrig) wartet auf eine Entscheidung. Status **Approved**. Vorbehalt: Die gesamte Browser-Suite konnte im Nachtest wegen eines übrig gebliebenen Test-Timers nicht sauber durchlaufen (siehe «Nachtest»).

### Automatisierte Tests
- **Vitest:** 497 von 497 (davon 52 neu für PROJ-9: `csv.test.ts`, `export-all.test.ts`, `supabase-repository.test.ts`, `csv-export-ui.test.tsx`, `zeiten-ui.test.tsx`).
- **Playwright** `tests/PROJ-9-csv-export-qa.spec.ts`: 42 Tests grün (41 Prüfungen und BUG-1 als bekannter Fehler mit `test.fail` markiert). Die Datei läuft in einem eigenen Projekt `export` allein nach allen anderen Tests, weil der Export alle Zeiten des Kontos liest und einen Bestand verlangt, der sich währenddessen nicht ändert (`playwright.config.ts`).
- **Gesamtsuite (Chromium, 2 Arbeiter):** 316 bestanden; 1 Fehler im Timer-Layout-Test «375 px mit laufendem Timer» (PROJ-6). Er hat mit PROJ-9 nichts zu tun (Startseite, andere Datei) und war im Einzellauf grün, ist also unter Last unstabil. PROJ-2-Abmelden (3 Tests) grün.
- Testdaten: Kunden «T-X…» mit Einträgen im Jahr 2011, darunter 1050 Einträge in einem Monat; am Ende aufgeräumt.

### Akzeptanzkriterien

**Auslösen und Herunterladen**
- [x] Knopf auf /zeiten sichtbar, auch im leeren Monat und mit Filter; nicht auf Start, Woche, Monat, Kunden
- [x] Klick startet `zeiten-JJJJ-MM-TT.csv` (Zürcher Datum) ohne Seitenwechsel; Zeilenzahl = Einträge in der Datenbank
- [x] Ladezustand: Knopf gesperrt, «Wird exportiert …», `aria-busy`; Doppelklick startet nur einen Export (höchstens zwei Abfragen)
- [x] Bestätigung «n Zeilen exportiert.»
- [x] Ohne Anmeldung: Weiterleitung zur Anmeldung, kein Knopf, keine Daten

**Inhalt**
- [x] Alle Zeiten, unabhängig von Monat und Filtern (Kundenfilter und «Nur ohne Beschreibung» ändern nichts)
- [x] Kopfzeile, elf Spalten, Reihenfolge
- [x] Von–bis, Dauer, Stunden (105 → 1,75; 1 → 0,02; 5 → 0,08), Verrechenbar (0 bei nicht verrechenbar)
- [x] Nur-Dauer-Einträge: Von/Bis leer; ohne Beschreibung leere Zelle
- [x] Keine gerundete Spalte, keine Summenzeile
- [x] Archivierter Kunde und archiviertes Projekt bleiben enthalten
- [x] Sortierung Datum aufsteigend, am Tag nach Startzeit, ohne Uhrzeit danach (ganze Datei)

**Excel-Verträglichkeit und Sonderzeichen**
- [x] Semikolon, UTF-8 mit BOM, Windows-Zeilenende, Dezimalkomma, Datum TT.MM.JJJJ, Umlaute und Sonderzeichen unverändert (Dateiinhalt geprüft)
- [ ] Teilweise: «öffnet sich in Excel per Doppelklick» ist über die Dateianalyse belegt, aber **nicht** in echtem Excel geprüft
- [x] Beschreibung mit Semikolon, Anführungszeichen, Zeilenumbruch bleibt eine Zelle (jede Zeile hat elf Spalten)
- [x] Formelschutz: `=…`, `@…`, `+…`, `-…` und Projektname mit `=` bekommen einen Apostroph; Formelzeichen in der Mitte nicht

**Aktualität und Vollständigkeit**
- [x] Korrigierter Eintrag im neuen Stand, gelöschter nicht mehr
- [x] 1050 Einträge in einem Monat (Gesamtbestand 1254): alle Zeilen, keine doppelt, Reihenfolge stimmt
- [x] Keine Zeiten: Meldung «Keine Zeiten vorhanden.», keine Datei (mit abgefangener Antwort getestet, da das Testkonto Daten enthält)
- [x] Laufender Timer nicht enthalten (ein Timer ist kein Eintrag; durch den Aufbau der Abfrage und Vitest abgedeckt)

**Fehlerfälle**
- [x] Nicht erreichbar: Meldung, keine Datei, Knopf wieder frei, nächster Versuch klappt. Bestand ändert sich zwischen den Blöcken: Meldung «Während des Exports wurden Zeiten geändert», keine Datei
- [ ] Abweichung (BUG-2): Abgelaufene Sitzung zeigt «Deine Anmeldung ist abgelaufen. Bitte melde dich neu an.», führt aber nicht selbst zur Anmeldung

**Bedienung und Darstellung**
- [x] 320, 375, 768, 1440 px: sichtbar, mindestens 44 px, kein waagrechtes Scrollen, kein Überlappen mit «Zeit erfassen»
- [x] axe (WCAG 2.1 AA) hell und dunkel auf /zeiten, auch nach dem Export (inkl. Meldung)
- [ ] Teilweise: Das Ergebnis steht in einer Live-Region (Meldung), der Knopf trägt `aria-busy`; mit einem echten Screenreader nicht geprüft. Per Tastatur (Enter) auslösbar, aber der **Fokus geht danach verloren (BUG-1)**

### Randfälle
- [x] Über 1000 Einträge, keine Einträge, sehr lange Beschreibung (300 Zeichen), Formel-Einschleusung, Zeilenumbruch, HTML/SQL-Zeichen als Text, Eintrag ohne Beschreibung, archivierte Ziele, Doppelklick/langsame Verbindung, Änderung während des Exports, Bis «24:00» unverändert, mehrere Einträge am selben Tag
- [x] Zwei Exporte hintereinander liefern denselben Inhalt
- Sommerzeit-Grenzen: nicht eigens getestet; Datum und Uhrzeit sind reine Textwerte aus der Datenbank, der Export rechnet keine Zeitzonen um.

### Bugs

#### BUG-1: Nach dem Export per Tastatur ist der Fokus weg (behoben, siehe «Bugfixes nach QA»)
- **Schweregrad:** Mittel (Zugänglichkeit)
- **Schritte:** 1. /zeiten öffnen. 2. Mit Tab auf «Als CSV exportieren». 3. Enter drücken. 4. Nach dem Download prüfen, wo der Fokus steht.
- **Erwartet:** Der Fokus bleibt auf dem Knopf (WCAG 2.4.3, Fokusreihenfolge).
- **Tatsächlich:** Der Knopf ist während des Exports `disabled`; gesperrte Knöpfe verlieren den Fokus. Danach steht der Fokus auf `BODY` ganz oben («Zum Inhalt springen»). Wer per Tastatur oder Screenreader arbeitet, muss sich neu durchtabben.
- **Korrekturhinweis (für /frontend):** Den Knopf während des Exports nicht mit `disabled` sperren, sondern `aria-disabled` setzen und Klicks ignorieren (die Doppelklick-Sperre besteht schon). Danach die Markierung `test.fail()` im Test «BUG-1» entfernen.
- **Priorität:** Vor dem Deployment beheben. **Behoben** (Frontend, 2026-11-18) und im Nachtest bestätigt.

#### BUG-2: Abgelaufene Sitzung führt nicht zur Anmeldung
- **Schweregrad:** Niedrig
- **Schritte:** Beim Export antwortet die Datenbank mit «JWT expired» (Sitzung abgelaufen).
- **Erwartet (Spec):** «dann wird er zur Anmeldung geführt».
- **Tatsächlich:** Es erscheint nur die Meldung «Bitte melde dich neu an»; der Nutzer bleibt auf der Seite, bis er neu lädt oder navigiert. Das entspricht dem Verhalten der übrigen Aktionen der App (z. B. Speichern).
- **Hinweis:** Entweder die Spec anpassen («Meldung statt Weiterleitung», konsistent zur App) oder eine Weiterleitung einbauen. Empfehlung: Spec anpassen.
- **Priorität:** Kann nach dem Deployment entschieden werden.

### Beobachtungen (keine Bugs)
- **Verbindungsfehler dauert bis zu etwa 7 Sekunden:** Der Datenbank-Client wiederholt fehlgeschlagene Abfragen einige Male, bevor die Meldung kommt. Der Knopf zeigt in der Zeit «Wird exportiert …».
- **Meldung beim Einblenden:** Während der Animation ist die Schrift halbtransparent; axe meldete dann einmal Kontrast (unstabil). Nach der Animation sauber. Das betrifft die gemeinsame Meldungs-Komponente, nicht PROJ-9; der Test wartet jetzt auf die volle Deckkraft.
- **Gesamtbestand:** Das Testkonto enthält über 1200 Einträge aus anderen Tests; der Export lief damit in wenigen Sekunden (zwei Blöcke).

### Sicherheit (Red Team)
- [x] Ohne Anmeldung: /zeiten leitet auf /login, kein Knopf; mit der Anon-Rolle liefert die Datenbank keine Zeiten (Zugriffsregeln).
- [x] Der Export spricht nur mit der eigenen Datenbank, keine Dritten, keine Inhalte in der Adresse.
- [x] Die Datei enthält keine Schlüssel, Tokens oder Passwörter.
- [x] Formel-Einschleusung (`=HYPERLINK`, `@SUMME`, `+1+1`, `-2+3`, Projektname `=Formel Projekt`) entschärft; HTML (`<img onerror>`) und SQL-Zeichen bleiben Text in der Datei.
- [x] Keine Ratenbegrenzung nötig: nur lesend, nur eigene Daten, Doppelklick-Sperre; wiederholte Exporte sind harmlos.
- Nicht geprüft: Verhalten mit einem zweiten Nutzer (Einzelnutzer-App; die Zugriffsregeln der Tabelle bleiben unverändert).

### Nicht getestet / Grenzen
- Firefox, Safari/iPhone (der Download einer erzeugten Datei kann dort abweichen), echte Geräte.
- Öffnen in echtem Excel (Schweizer Einstellungen) und in einer zweiten Anwendung.
- Echter Screenreader; Lighthouse; Sentry.
- Gemessene Zeit nur bei rund 1250 Zeilen; sehr grosse Mengen (mehrere Zehntausend) nicht.

### Regression
- Vitest 497/497; Playwright-Gesamtsuite 316 grün (inkl. PROJ-1 bis 8 und 11) mit einem unstabilen Timer-Layout-Test (siehe oben); Seiten Zeiten, Woche und Monat (PROJ-5/7/8) unverändert grün.

### Nachtest (2026-11-18, nach der Korrektur von BUG-1)
- **BUG-1 bestätigt behoben:** Der Test «BUG-1 (behoben)» (Fokus bleibt nach dem Export auf dem Knopf, per Tastatur) läuft ohne `test.fail` grün; das Playwright-Projekt `export` lief nach der Korrektur 42 von 42 grün (inkl. axe hell/dunkel, Layout 320 bis 1440 px, Doppelklick mit `aria-disabled`).
- **Vitest:** 497 von 497.
- **BUG-2 (niedrig)** unverändert offen; keine neuen Bugs gefunden.
- **Gesamtsuite im Nachtest nicht sauber durchgelaufen (kein Fehler von PROJ-9):** Im Testkonto lief ein Timer weiter, den ein Timer-Test (PROJ-6) übrig gelassen hatte (Kunde «Timer DB BYHRP», gestartet 2026-11-18 16:23 UTC). Solange ein Timer läuft, steht er in der Timer-Leiste und im Seitentitel («1:40 · T-TDBYHRP · …»). Dadurch schlugen 6 ältere Tests fehl (Seitentitel in PROJ-3, 5, 8; Texte «Allgemein» und «Beschreibung» in PROJ-3, 4 doppelt vorhanden); 209 Tests liefen deshalb nicht (Folge der Projektabhängigkeiten). 166 Tests liefen grün. Das Löschen des Test-Timers in der Datenbank wurde nicht freigegeben und deshalb nicht ausgeführt.
- **Offen:** Timer im Testkonto beenden (in der App «Verwerfen» oder «Stopp»), danach die gesamte Browser-Suite erneut laufen lassen. Der vorherige vollständige Lauf (vor der Korrektur, 316 grün) war bis auf den unstabilen Timer-Layout-Test sauber; seither wurde nur der Export-Knopf geändert.

## Bugfixes nach QA (Frontend)
**Stand 2026-11-18.**

- **BUG-1 (mittel) behoben:** Der Knopf «Als CSV exportieren» wird während des Exports nicht mehr mit `disabled` gesperrt, sondern mit `aria-disabled` (gedimmt, Cursor «nicht erlaubt»). Dadurch bleibt der Fokus nach dem Export auf dem Knopf. Klicks während des Exports ignoriert weiterhin die Sperre in der Komponente (kein zweiter Export). Geändert: `csv-export-button.tsx`.
- **BUG-2 (niedrig) offen:** Abgelaufene Sitzung zeigt die Meldung, leitet aber nicht weiter. Empfehlung: Spec anpassen (Meldung statt Weiterleitung, wie in der übrigen App); Entscheidung steht aus.
- **Tests:** Vitest 497/497 (Test «sperrt den Knopf» prüft jetzt `aria-disabled` statt `disabled`, plus Zustand danach). Playwright `export`-Projekt 42/42: der Test «BUG-1 (behoben)» läuft ohne `test.fail` grün, ebenso der Doppelklick-Test mit `aria-disabled`. `tsc` ohne Befund, ESLint nur die alte Warnung in `use-toast.ts`, `npm run build` erfolgreich.
- **Nicht erneut gelaufen:** die gesamte Browser-Suite (nur das Projekt `export`); Firefox/Safari weiter ungetestet.

## Deployment
_To be added by /deploy_
