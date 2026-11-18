# PROJ-8: Monatsauswertung

## Status: In Progress
**Created:** 2026-11-17
**Last Updated:** 2026-11-17

## Dependencies
- Requires: PROJ-1 (Supabase Infrastructure Setup) — Datenbank und Zugriffsregeln
- Requires: PROJ-2 (Anmeldung) — Seite geschützt, Daten gehören dem angemeldeten Nutzer
- Requires: PROJ-3 (Kunden- und Projektverwaltung) — Kunden und Projekte, Archiv
- Requires: PROJ-4 (Manuelle Zeiterfassung) — Zeiteinträge und Zeitmodell (Minuten, 24:00, Zürcher Zeit, verrechenbar höchstens gleich gearbeitet)
- Requires: PROJ-5 (Zeiten prüfen und korrigieren) — Korrekturen passieren dort; Link zurück auf «Zeiten» im gleichen Monat
- Requires: PROJ-11 (Design-System-Basis) — Navigation, Layout, Theme
- Verwandt: PROJ-7 (Wochenübersicht) — gleiche Navigationslogik (Pfeile, «Diese …», Adresse mit Zustand), keine Rundung dort
- Wird gebraucht von: PROJ-9 (CSV-Export) — gleiche Rundungsregel, exakt und gerundet

## User Stories
- Als Einzelnutzer möchte ich nach Monatsende pro Kunde sehen, wie viele Stunden ich gearbeitet und wie viele ich verrechnen darf, damit ich die Rechnung in unter 5 Minuten vorbereiten kann.
- Als Einzelnutzer möchte ich die verrechenbare Zeit pro Projekt auf 15 Minuten aufgerundet sehen, damit die Zahl direkt der Abrechnung gegenüber dem Kunden entspricht.
- Als Einzelnutzer möchte ich zu jedem Projekt die Einträge des Monats mit Datum und Tätigkeitstext sehen, damit ich der Rechnung die Leistungen beilegen kann.
- Als Einzelnutzer möchte ich exakte und gerundete Zeit nebeneinander sehen, damit ich die Rundung nachvollziehen und kontrollieren kann.
- Als Einzelnutzer möchte ich zwischen Monaten blättern und erkennen, ob ein Monat noch läuft, damit ich keine unvollständige Summe in eine Rechnung übernehme.
- Als Einzelnutzer möchte ich die Auswertung am Handy lesen, damit ich auch unterwegs nachsehen kann.

## Out of Scope
- **CSV-Export (exakt und gerundet, jederzeit):** PROJ-9. Dieses Feature hat auch keinen «Kopieren»-Knopf; übernommen wird über den Export.
- **Bearbeiten und Löschen von Einträgen in der Auswertung:** nur lesen. Korrigiert wird auf «Zeiten» (PROJ-5) oder «Woche» (PROJ-7). Jeder Eintrag verweist auf «Zeiten» im gleichen Monat.
- **Rundung in Zeiteinträgen oder im Timer:** Einträge bleiben minutengenau (PROJ-4/PROJ-6). Gerundet wird nur in der Auswertung.
- **Rundung der gearbeiteten Zeit:** Gearbeitet bleibt minutengenau.
- **Andere Rundungsregeln oder Einheiten** (5, 6, 30 Minuten, Abrunden, kaufmännisch): fest 15 Minuten aufrunden.
- **Stundensätze, Beträge, Rechnungserstellung:** Non-Goals laut PRD.
- **Andere Zeiträume** (Quartal, Jahr, freier Bereich), Filter, Diagramme: nicht im MVP.
- **Laufender Timer:** Ein Timer, der noch läuft, ist noch kein Eintrag und zählt erst nach dem Stoppen mit.
- **Monat «abschliessen» oder sperren:** Einträge bleiben jederzeit änderbar; die Auswertung rechnet immer live.
- **PDF-Export:** Non-Goal laut PRD.

## Acceptance Criteria

**Format:** Angenommen [Vorbedingung] / Wenn [Aktion] / Dann [Ergebnis]

### Navigation und Seitenschutz
- [ ] Angenommen der Nutzer ist angemeldet, wenn er die Navigation ansieht, dann gibt es den Eintrag «Monat» (Seitenleiste und Tab-Leiste) mit der Adresse `/monat`, der beim Besuch von `/monat` als aktiv markiert ist; die Reihenfolge ist Start, Woche, Monat, Zeiten, Kunden, Status.
- [ ] Angenommen die Tab-Leiste am Handy hat sechs Einträge, wenn sie bei 320 px und 375 px angezeigt wird, dann bleibt jeder Eintrag lesbar und mindestens 44 px hoch und breit, ohne horizontales Scrollen.
- [ ] Angenommen der Nutzer ist nicht angemeldet, wenn er `/monat` öffnet, dann landet er auf der Anmeldeseite und sieht keine Daten.
- [ ] Angenommen die Seite lädt, dann trägt sie den Titel «Monat · Time Tracker Light».

### Monatsnavigation
- [ ] Angenommen der Nutzer öffnet `/monat`, wenn die Seite lädt, dann zeigt sie den aktuellen Monat nach Zürcher Uhr mit der Überschrift «November 2026».
- [ ] Angenommen ein Monat ist angezeigt, wenn der Nutzer «Vorheriger Monat» oder «Nächster Monat» wählt, dann wechselt die Ansicht um einen Monat; «Nächster Monat» ist im aktuellen Monat deaktiviert (keine zukünftigen Monate).
- [ ] Angenommen der Nutzer ist in einem anderen Monat, wenn er «Dieser Monat» wählt, dann springt die Ansicht zum aktuellen Monat; im aktuellen Monat ist der Knopf deaktiviert oder als aktuell erkennbar.
- [ ] Angenommen der Nutzer hat einen Monat gewählt, wenn er die Seite neu lädt oder den Link öffnet, dann zeigt die Adresse den Monat (z. B. `/monat?monat=2026-11`) und öffnet wieder denselben Monat; ein ungültiger oder zukünftiger Monat führt zum aktuellen Monat.
- [ ] Angenommen der angezeigte Monat ist der laufende Monat, wenn die Auswertung angezeigt wird, dann steht gut sichtbar «Laufender Monat, noch nicht abgeschlossen» (nicht nur über Farbe); bei vergangenen Monaten steht dieser Hinweis nicht.
- [ ] Angenommen der Monat wechselt, wenn Daten laden, dann sieht der Nutzer einen Ladezustand; schlägt das Laden fehl, dann erscheint eine Fehlermeldung mit «Erneut versuchen», und die Zahlen des vorigen Monats stehen nicht fälschlich unter der neuen Überschrift.

### Auswertung pro Kunde und Projekt
- [ ] Angenommen der Monat hat Einträge, wenn die Auswertung angezeigt wird, dann steht oben eine Gesamtzeile für den Monat (gearbeitet, verrechenbar exakt, verrechenbar gerundet) und darunter je ein Abschnitt pro Kunde mit Einträgen («Kürzel · Kundenname», nach Kürzel sortiert; auch archivierte Kunden, mit Hinweis «archiviert»).
- [ ] Angenommen ein Kundenabschnitt, wenn er angezeigt wird, dann zeigt er die Kundensumme (gearbeitet, verrechenbar exakt, verrechenbar gerundet) und je Projekt mit Einträgen im Monat eine Zeile mit denselben drei Zahlen (nach Projektname sortiert; archivierte Projekte mit Hinweis «archiviert»).
- [ ] Angenommen die Zahlen, wenn sie angezeigt werden, dann sind alle drei beschriftet («Gearbeitet», «Verrechenbar», «Verrechenbar gerundet auf 15 Min.») und stehen im Format h:mm wie überall in der App; «Verrechenbar gerundet» ist als die Zahl für die Rechnung erkennbar.
- [ ] Angenommen die Rundung, wenn die verrechenbaren Minuten eines Projekts im Monat summiert sind, dann wird die Summe auf das nächste Vielfache von 15 Minuten aufgerundet (0 Min. bleiben 0:00; 1 Min. wird 0:15; 15 Min. bleiben 0:15; 16 Min. werden 0:30; 7:50 wird 8:00); die Rundung geschieht pro Projekt, nie pro Eintrag.
- [ ] Angenommen die Kundensumme, wenn sie berechnet wird, dann ist «Verrechenbar gerundet» die Summe der gerundeten Projektwerte dieses Kunden (nicht noch einmal gerundet), und «Gearbeitet» sowie «Verrechenbar» (exakt) sind die minutengenauen Summen; die Gesamtzeile des Monats summiert die Kunden entsprechend.
- [ ] Angenommen ein Projekt mit Einträgen, aber ohne verrechenbare Zeit (z. B. alle Einträge 0:00 verrechenbar), wenn die Auswertung angezeigt wird, dann erscheint das Projekt mit «Verrechenbar» und «Verrechenbar gerundet» 0:00.
- [ ] Angenommen der Monat hat keine Einträge, wenn die Seite lädt, dann sieht der Nutzer einen Leerzustand mit Erklärung und dem Knopf «Zeit erfassen» (öffnet das Formular wie auf der Startseite); die Monatsnavigation bleibt bedienbar.

### Tätigkeitstexte
- [ ] Angenommen ein Projekt mit Einträgen, wenn der Nutzer das Projekt aufklappt, dann sieht er alle Einträge des Monats für dieses Projekt nach Datum sortiert (älteste zuerst, bei gleichem Datum nach Startzeit, dann Erfassungszeit) mit Datum («Mo 9.11.»), Beschreibung, gearbeiteter Zeit und verrechenbarer Zeit; lange Texte sind vollständig lesbar, Zeilenumbrüche bleiben erhalten.
- [ ] Angenommen ein Eintrag ohne Beschreibung, wenn er in der Liste steht, dann trägt er den Hinweis «Keine Beschreibung».
- [ ] Angenommen ein Eintrag mit Uhrzeiten, wenn er in der Liste steht, dann stehen die Uhrzeiten dabei (auch «24:00»); Einträge ohne Uhrzeiten (nur Dauer) zeigen keine.
- [ ] Angenommen die Auswertung wird geladen, dann sind die Projekte zunächst zugeklappt und die Summen auf einen Blick lesbar; es gibt «Alle aufklappen» und «Alle zuklappen».
- [ ] Angenommen der Nutzer klappt Projekte auf und wechselt den Monat, dann sind im neuen Monat alle Projekte wieder zugeklappt.
- [ ] Angenommen eine Eintragszeile, wenn der Nutzer sie ansieht, dann gibt es keine Aktionen «Bearbeiten» oder «Löschen», aber einen Link «In Zeiten ansehen» (öffnet `/zeiten` im gleichen Monat).

### Aktualität
- [ ] Angenommen der Nutzer startet oder stoppt einen Timer oder erfasst eine Zeit (Formular «Zeit erfassen» auf dieser Seite oder Timer-Leiste), wenn dadurch ein Eintrag im angezeigten Monat entsteht, dann aktualisieren sich Summen, Rundung und Listen ohne manuelles Neuladen.
- [ ] Angenommen der Nutzer wechselt zur Seite «Zeiten» (z. B. nach einer Korrektur) und zurück, dann sieht er nach dem Zurückkehren aktuelle Zahlen (keine veralteten Werte).

### Zahlen und Zeit
- [ ] Angenommen Einträge, die um Mitternacht enden (24:00), wenn der Monat angezeigt wird, dann zählen sie vollständig zum Tag und damit zum Monat, an dem sie beginnen.
- [ ] Angenommen ein Monat mit Sommer-/Winterzeitwechsel (März, Oktober), wenn er angezeigt wird, dann stimmen Monatsgrenzen und Tage (die Grenzen richten sich nach dem Zürcher Kalenderdatum, nicht nach UTC).
- [ ] Angenommen die Summen, wenn sie angezeigt werden, dann stimmen «Gearbeitet» und «Verrechenbar» (exakt) minutengenau mit den Summen der Seite «Zeiten» für denselben Monat und mit der Summe der Wochenübersichten überein (Wochen, die über die Monatsgrenze gehen, ausgenommen).
- [ ] Angenommen die Zahlen, wenn der Nutzer sie von Hand nachrechnet, dann gilt: verrechenbar gerundet ≥ verrechenbar exakt, und der Unterschied ist je Projekt kleiner als 15 Minuten.

### Bedienung, Darstellung, Zugänglichkeit
- [ ] Angenommen jedes Bedienelement (Pfeile, «Dieser Monat», Auf-/Zuklappen, Links), wenn es auf Handy oder Tablet bedient wird, dann ist es mindestens 44 × 44 px gross, und es entsteht kein horizontales Scrollen der Seite (320 px bis 1440 px).
- [ ] Angenommen eine Projektzeile, wenn der Nutzer sie mit der Tastatur bedient, dann lässt sie sich per Enter oder Leertaste auf- und zuklappen, und ihr Zustand («aufgeklappt/zugeklappt») wird vom Screenreader angesagt.
- [ ] Angenommen die Seite, wenn Hell- oder Dunkelmodus aktiv ist, dann erfüllt sie WCAG AA (Kontrast, sichtbarer Fokus, Bedienung mit der Tastatur, Hinweise nicht nur über Farbe), geprüft mit axe in beiden Modi, auch bei aufgeklappten Projekten.
- [ ] Angenommen der Monatsname, wenn er angezeigt wird, dann erscheint er deutsch («November 2026»), ebenso Wochentage und Datum in den Listen.
- [ ] Angenommen die Auswertung am Handy (unter ca. 768 px), wenn sie angezeigt wird, dann stehen die Zahlen eines Projekts untereinander oder in einer Karte, ohne dass Zahlen abgeschnitten werden oder die Seite waagrecht scrollt.

## Edge Cases
- **Monat über die Zeitumstellung (März, Oktober):** Monatsgrenzen sind Kalenderdaten, kein Eintrag rutscht in den Nachbarmonat.
- **Eintrag am letzten oder ersten Tag des Monats (auch 24:00):** zählt zu seinem Datum, nicht zum Folgemonat.
- **Dasselbe Projekt hat Einträge mit und ohne verrechenbare Zeit:** Die exakte verrechenbare Summe zählt nur die verrechenbaren Minuten; gearbeitet zählt alles; gerundet wird die verrechenbare Summe.
- **Viele kurze Einträge (z. B. zehn Einträge zu je 3 Minuten = 30 Minuten):** Die Rundung auf Projektsumme ergibt 0:30, nicht 10 × 0:15 = 2:30. Das ist der Grund für die Rundung pro Projekt.
- **Summe genau auf 15 Minuten (z. B. 1:45):** bleibt unverändert; keine Aufrundung auf die nächste Einheit.
- **Mehrere Projekte eines Kunden, jedes mit 5 Minuten:** je Projekt 0:15 gerundet, Kunde 0:30 gerundet bei 0:10 exakt. Die Kundensumme ist die Summe der gerundeten Projekte, nicht noch einmal gerundet.
- **Archivierter Kunde oder archiviertes Projekt mit Einträgen im Monat:** erscheint normal mit Hinweis «archiviert».
- **Kunden- oder Projektname sehr lang (bis zur Grenze der Namen):** bricht um, keine abgeschnittenen Bedienelemente.
- **Beschreibungstext sehr lang oder mit Sonderzeichen/HTML:** wird vollständig als Text dargestellt, nie als HTML.
- **Sehr viele Einträge im Monat (über 1000):** Die Datenbank liefert höchstens 1000 Zeilen pro Antwort. Es muss ein sichtbarer Hinweis erscheinen, dass die Auswertung unvollständig ist, damit keine falsche Summe in die Rechnung übernommen wird (wie in PROJ-5/PROJ-7, nicht still falsch rechnen).
- **Eintrag wird auf «Zeiten» in einen anderen Monat oder auf ein anderes Projekt verschoben:** Nach dem Zurückkehren stimmen Summen, Rundung und Listen; ein leerer Kunde oder ein leeres Projekt verschwindet.
- **Laden schlägt fehl oder Sitzung abgelaufen:** Fehlermeldung mit «Erneut versuchen» bzw. Weiterleitung zur Anmeldung; keine fremden oder veralteten Zahlen.
- **Zukünftiger Monat per Adresse:** wird auf den aktuellen Monat umgeleitet.
- **Laufender Timer im aktuellen Monat:** wird nicht mitgezählt und nicht extra erwähnt; die Timer-Leiste zeigt ihn ohnehin.

## Technical Requirements (optional)
- **Sicherheit:** Nur angemeldete Nutzer; Daten über dieselben Zugriffsregeln wie PROJ-4/PROJ-5 (nur eigene Einträge). Beschreibungstexte werden immer als Text dargestellt (kein HTML).
- **Performance:** Der Monat lädt mit einer Abfrage; die Auswertung steht in unter ca. 1 Sekunde nach dem Laden der Seite (bei normaler Verbindung). Das Aufklappen eines Projekts ist ohne Wartezeit.
- **Korrektheit:** Die Rundungslogik ist eine einzige, getestete Funktion, die später auch PROJ-9 (CSV) verwendet, damit Bildschirm und Export dieselben Zahlen zeigen.
- **Responsive:** Mobile-first; getestet bei 320, 375, 768 und 1440 px.
- **Browser:** Chrome, Firefox, Safari (aktuelle Versionen).
- **Design:** `docs/design-system.md`; Kontrast WCAG AA; bestehende Bausteine wiederverwenden.

## Open Questions
- [ ] Sollen die gerundeten Stunden **zusätzlich als Dezimalzahl** gezeigt werden (z. B. 1:45 = 1,75 h), weil Rechnungen oft in Dezimalstunden lauten? Vorschlag: im MVP nur h:mm wie überall in der App; Dezimal im Export (PROJ-9) prüfen.
- [ ] Soll ein **laufender Timer** im aktuellen Monat als Hinweis erwähnt werden («Ein Timer läuft, wird nach dem Stoppen eingerechnet»)? Vorschlag: nein, die Timer-Leiste zeigt ihn.
- [ ] Soll die Reihenfolge der Kunden nach **Kürzel** (stabil, wie in PROJ-7) oder nach Stunden absteigend sein? Vorschlag: Kürzel.
- [ ] Reicht der Rundungs-Hinweis als Beschriftung, oder soll ein kurzer Erklärungstext «Pro Projekt aufgerundet auf 15 Minuten» sichtbar auf der Seite stehen? Vorschlag: kurzer Text unter der Gesamtzeile.

## Decision Log

### Product Decisions
| Decision | Rationale | Date |
|----------|-----------|------|
| Aufrundung auf 15 Minuten pro Projekt, nicht pro Eintrag und nicht pro Kunde | Rundung pro Eintrag verteuert viele kurze Einträge unfair; die Rechnung hat eine Zeile pro Projekt, so passt die Zahl zur Zeile | 2026-11-17 |
| Kundensumme gerundet = Summe der gerundeten Projekte | Zeilen addieren sich sichtbar zur Summe, keine zweite Rundung, keine zwei verschiedenen Kundenwerte | 2026-11-17 |
| Gearbeitet exakt; verrechenbar exakt und gerundet nebeneinander | Gerundete Zahl für die Rechnung, exakte zur Kontrolle; gearbeitet muss nicht gerundet werden | 2026-11-17 |
| Einträge pro Projekt aufklappbar, nach Datum sortiert | Summen bleiben auf einen Blick lesbar; Tätigkeitstexte (PRD) sind dennoch zur Hand für die Rechnung | 2026-11-17 |
| Nur lesen, Verweis auf «Zeiten» zum Korrigieren | Summen und Rundung ändern sich sonst live im offenen Fenster; Korrektur gibt es schon in PROJ-5/PROJ-7 | 2026-11-17 |
| Eigener Navigationseintrag «Monat», sechs Tabs am Handy | Täglicher bis monatlicher Einstieg mit einem Tipp; Tab-Leiste wird schmaler, 44-px-Ziele bleiben Pflicht und werden bei 320 px geprüft | 2026-11-17 |
| Navigation wie die Woche (Pfeile, «Dieser Monat», `?monat=2026-11`, keine Zukunft) | Gleiche Bedienung, Link und Zurück-Knopf funktionieren | 2026-11-17 |
| Hinweis «Laufender Monat, noch nicht abgeschlossen» | Verhindert, dass eine unvollständige Summe in eine Rechnung übernommen wird | 2026-11-17 |
| Kein «Kopieren»-Knopf | Übernahme in die Rechnung läuft über den CSV-Export (PROJ-9); ein zweiter Ausgabeweg wäre ein zweites Format | 2026-11-17 |
| Einträge zählen zu ihrem Datum, auch bei Ende 24:00 | Entspricht dem Zeitmodell (ein Eintrag gehört zu einem Tag) | 2026-11-17 |

### Technical Decisions
<!-- Added by /architecture -->
| Decision | Rationale | Date |
|----------|-----------|------|
| Keine Datenbank-Änderung, keine neue Tabelle, kein Server-Code | Reine Ansicht auf vorhandene Einträge; bestehende Zugriffsregeln (nur eigene Daten) genügen | 2026-11-17 |
| Rundung als eigene reine Funktion in der Datenschicht, in ganzen Minuten, nach der Summe pro Projekt | Eine einzige Regel, einzeln testbar; PROJ-9 (CSV) verwendet dieselbe Funktion, damit Bildschirm und Export nie auseinanderlaufen; keine Dezimalstunden, also keine Rundungsfehler | 2026-11-17 |
| Zusammenfassung (Kunde → Projekt → Einträge) im Browser aus den Einträgen des Monats | Eine Abfrage, keine Doppelrechnung; Summen von Auswertung, «Zeiten» und «Woche» stammen aus denselben Einträgen | 2026-11-17 |
| Neue Abfrage «Einträge eines Monats für die Auswertung» statt Änderung der Monatsabfrage von «Zeiten» | Auswertung braucht Archiv-Hinweise und aufsteigende Reihenfolge; «Zeiten» bleibt unverändert und ungefährdet; gleicher innerer Baustein wie `listWeek` (Zähler für «mehr als 1000») | 2026-11-17 |
| Auf-/Zuklappen mit shadcn/ui «Collapsible», Zustand nur im Bildschirm, nicht in der Adresse | Bereits installiert, tastaturbedienbar, Zustand für Screenreader; keine neue Abhängigkeit; Monatswechsel setzt alle Projekte zurück | 2026-11-17 |
| Monatslogik (`month.ts`) und Navigation wiederverwenden; gemeinsame «Zeitraum-Leiste» prüfen | Kennung, Beschriftung, vor/zurück und Zukunftsprüfung gibt es schon; vermeidet ein drittes Navigationsbauteil | 2026-11-17 |
| Navigation: sechster Eintrag, Tab-Leiste mit engeren Abständen; Test «höchstens fünf» wird «höchstens sechs» | Produktentscheidung (sechs Tabs); 44-px-Ziele bleiben Pflicht und werden bei 320 px geprüft | 2026-11-17 |
| «Laufender Monat» aus dem Kalender (Zürcher Uhr) erkannt, mit Text und Symbol | Verhindert unvollständige Summen in Rechnungen; unabhängig von der Datenlage | 2026-11-17 |
| Keine neuen Pakete | Vorhandene shadcn/ui-Bausteine und Ganzzahlrechnung genügen | 2026-11-17 |

---
<!-- Sections below are added by subsequent skills -->

## Tech Design (Solution Architect)

### Überblick
Die Monatsauswertung ist, wie die Wochenübersicht, eine **reine Ansicht auf bestehende Zeiteinträge**. Es entstehen keine neue Tabelle, keine neuen Zugriffsregeln und keine Datenbank-Änderung. Neu sind die Seite `/monat`, die **Rundungsregel** (eine einzige, getestete Rechenfunktion) und eine kleine Erweiterung der Monatsabfrage um die Archiv-Hinweise. Der Navigationsbaustein (Pfeile, «Dieser Monat», Adresse mit Zustand), die Monatslogik, die Summenanzeige, die Eintragsdarstellung und die Lade-/Fehlerzustände gibt es schon und werden wiederverwendet. **Backend-Aufwand: klein**, nur in der Datenschicht, kein SQL.

### A) Komponentenstruktur
```
Seite /monat (geschützt, Titel «Monat · Time Tracker Light»)
+-- Kopfzeile: Überschrift «Monat» + Knopf «Zeit erfassen» (Formular wie auf «Zeiten»)
+-- Monatsleiste
|   +-- Pfeil «Vorheriger Monat»
|   +-- Überschrift «November 2026» (kündigt Wechsel an)
|   +-- Pfeil «Nächster Monat» (im aktuellen Monat gesperrt)
|   +-- Knopf «Dieser Monat»
+-- Hinweis «Laufender Monat, noch nicht abgeschlossen» (nur im aktuellen Monat, mit Symbol und Text)
+-- Hinweis «Zahlen unvollständig» (nur bei mehr als 1000 Einträgen)
+-- Zustände: Laden (Platzhalter) / Fehler mit «Erneut versuchen» / Leerzustand mit «Zeit erfassen»
+-- Gesamtzeile des Monats: Gearbeitet · Verrechenbar · Verrechenbar gerundet auf 15 Min.
|   +-- kurzer Erklärungstext «Pro Projekt aufgerundet auf 15 Minuten»
+-- «Alle aufklappen» / «Alle zuklappen»
+-- Kundenabschnitte (einer je Kunde mit Einträgen, nach Kürzel; «archiviert»-Hinweis)
    +-- Kopf: «Kürzel · Kundenname» + Kundensumme (3 Zahlen)
    +-- Projektzeilen (je Projekt mit Einträgen, nach Name; «archiviert»-Hinweis)
        +-- Auf-/Zuklapp-Knopf mit Projektname + 3 Zahlen (Handy: Zahlen untereinander)
        +-- aufgeklappt: Eintragsliste nach Datum
            +-- je Eintrag: Datum, Beschreibung («Keine Beschreibung»), Uhrzeiten (falls vorhanden),
                gearbeitet, verrechenbar
            +-- Link «In Zeiten ansehen» (öffnet «Zeiten» im gleichen Monat)
```
Auf Laptop und Handy ist es **dieselbe Struktur**; nur die Anordnung der drei Zahlen ändert sich (nebeneinander bzw. untereinander). Es gibt kein Raster und keine zwei Darstellungen, deshalb auch keine doppelten Inhalte für Screenreader.

### B) Datenmodell (in Alltagssprache)
**Es werden keine neuen Daten gespeichert.** Die Auswertung liest die vorhandenen Zeiteinträge (PROJ-4) eines Monats und rechnet daraus:

```
Ein Monat hat:
- Kennung («2026-11»), Überschrift «November 2026», Kennzeichen «laufender Monat»
- Gesamtsummen: gearbeitet, verrechenbar (exakt), verrechenbar gerundet
- Kunden mit Einträgen (Kürzel, Name, Hinweis «archiviert»), je Kunde:
    - Kundensumme: gearbeitet, verrechenbar exakt, verrechenbar gerundet
      (gerundet = Summe der gerundeten Projekte des Kunden)
    - Projekte mit Einträgen (Name, Hinweis «archiviert»), je Projekt:
        - gearbeitet (Minuten), verrechenbar exakt (Minuten)
        - verrechenbar gerundet = verrechenbare Minuten, aufgerundet auf ein Vielfaches von 15
        - die Einträge des Projekts im Monat, älteste zuerst

Ein Eintrag (bekannt aus PROJ-4) hat: Datum, Projekt, Dauer, verrechenbare Dauer,
optionale Uhrzeiten, optionale Beschreibung, Archiv-Hinweise (Kunde/Projekt archiviert).

Gespeichert in: Supabase (bestehende Tabelle der Zeiteinträge, bestehende Zugriffsregeln:
nur eigene Einträge). Die Zusammenfassung und die Rundung entstehen nur im Browser aus den Einträgen
und werden nirgends gespeichert.
```

### C) Technische Entscheidungen (begründet)
- **Keine neue Datenbank-Struktur, kein neuer Server-Code.** Wie bei «Zeiten» und «Woche» spricht die Seite über die vorhandene Datenschicht mit Supabase; die vorhandenen Zugriffsregeln schützen die Daten. Das hält das Projekt kostenlos und einfach.
- **Die Rundung ist eine reine Rechenfunktion, nicht Teil der Daten.** Einträge bleiben minutengenau (Produktentscheidung). Die Funktion «Minuten auf 15 aufrunden» und die Zusammenfassung stehen in der Datenschicht, getrennt von der Oberfläche, und werden einzeln getestet (Grenzfälle 0, 1, 14, 15, 16, 450, 1440 Minuten; viele kurze Einträge). So rechnen später der **CSV-Export (PROJ-9) und der Bildschirm mit demselben Code** und können nicht auseinanderlaufen (PRD-Erfolgskriterium 3 und 4).
- **Rundung nach der Summe, in Ganzzahlen.** Es wird zuerst pro Projekt in ganzen Minuten summiert und danach gerundet. Es gibt kein Rechnen mit Dezimalstunden, damit keine Rundungsfehler durch Kommazahlen entstehen. Die Kundensumme addiert die gerundeten Projektwerte; es wird nie ein zweites Mal gerundet.
- **Eine Abfrage für den Monat, bestehende Monatsabfrage erweitern.** Die Monatsabfrage von «Zeiten» liefert die Einträge des Monats bereits, aber ohne die Archiv-Hinweise und mit neuesten Tagen zuerst. Die Auswertung braucht Archiv-Hinweise und aufsteigende Reihenfolge. Statt eine zweite, fast gleiche Abfrage zu bauen, bekommt die Datenschicht eine zusätzliche Methode «Einträge eines Monats für die Auswertung», die denselben inneren Baustein (Zeitraum, Zähler für «mehr als 1000») wie die Wochenabfrage nutzt. Sie ist so klein wie `listWeek` aus PROJ-7.
- **Auf- und Zuklappen mit dem vorhandenen shadcn/ui-Baustein «Collapsible» bzw. «Accordion».** Beide sind installiert. Das Auf-/Zuklappen wird von Tastatur und Screenreader unterstützt (Zustand «aufgeklappt/zugeklappt»). «Alle aufklappen» setzt den Zustand der Projekte gemeinsam; beim Monatswechsel sind wieder alle zugeklappt. Der Zustand ist reiner Bildschirmzustand, wird nicht in die Adresse geschrieben.
- **Monatslogik und Navigation wiederverwenden.** `month.ts` kennt schon Kennung, aktueller Monat, vor/zurück, Beschriftung «November 2026» und Zukunftsprüfung. Die Wochenleiste aus PROJ-7 und die Monatsnavigation aus «Zeiten» sind sich ähnlich; es wird geprüft, ob daraus ein gemeinsamer Baustein «Zeitraum-Leiste» entsteht, statt sie ein drittes Mal zu bauen (Aufgabe für /frontend).
- **Adresse als Zustand (`/monat?monat=2026-11`):** wie auf «Zeiten»; Link teilbar, Zurück-Knopf und Neuladen behalten den Monat; ungültiger oder zukünftiger Monat führt zum aktuellen.
- **«Laufender Monat» wird aus dem Kalender erkannt**, nicht aus der Datenlage: Monat = aktueller Monat nach Zürcher Uhr. Der Hinweis hat Text und Symbol, nicht nur Farbe.
- **Aktualisierung bei Änderungen an anderer Stelle:** wie «Heute», «Zeiten» und «Woche» reagiert die Seite auf den vorhandenen «Einträge geändert»-Zähler des Timers (Timer stoppen, «Zeit erfassen» auf dieser Seite); beim Zurückkehren auf die Seite wird frisch geladen.
- **Navigation: ein Eintrag mehr in der zentralen Liste** (Start, Woche, **Monat**, Zeiten, Kunden, Status). Seitenleiste und Tab-Leiste lesen dieselbe Liste. Die Tab-Leiste war für höchstens fünf Einträge gebaut und hat dann bei 320 px nur noch rund 53 px pro Eintrag. Die seitlichen Abstände der Einträge müssen dafür kleiner werden, damit Beschriftungen wie «Kunden» und «Zeiten» nicht abgeschnitten werden (Vorgabe: mindestens 44 px breit und hoch). Der bestehende Test «höchstens fünf Einträge» wird auf sechs angepasst.
- **Bewusst nicht gebaut:** Kopieren, Dezimalstunden (offen), Bearbeiten/Löschen, Filter, laufender Timer in der Summe, andere Zeiträume.

### D) Neue Datenschicht-Bausteine (ohne Code)
- **Rundungsregel** (neue Datei neben der Wochenzusammenfassung) mit Tests: aufrunden auf 15 Minuten, Grenzfälle (0, 1, 14, 15, 16, 450, 1440), Kommazahlen kommen nicht vor.
- **Monatszusammenfassung** (reine Funktion): Einträge → Kunden mit Projekten, je Projekt Einträge nach Datum, gearbeitet, verrechenbar exakt und gerundet; Kundensumme und Monatssumme als Summe der gerundeten Projekte. Tests: mehrere Projekte pro Kunde, zehn Einträge zu 3 Minuten, Summe genau auf 15, Projekt ohne verrechenbare Zeit, archivierte Kunden/Projekte, leerer Monat, 24:00, «gerundet ≥ exakt, Unterschied < 15 Min. pro Projekt».
- **Neue Methode «Einträge eines Monats für die Auswertung»** in der Schnittstelle der Zeiteinträge: Implementierung für Supabase und für die Tests im Speicher; liefert die Archiv-Hinweise mit und den Hinweis «abgeschnitten» bei mehr als 1000 Einträgen. Die bestehende Monatsabfrage der Seite «Zeiten» bleibt unverändert.
- **Gemeinsame Anzeige-Bausteine:** Die Summenzeile («gearbeitet · verrechenbar») und die Eintragszeile gibt es schon; die Auswertung zeigt zusätzlich «verrechenbar gerundet» und eine Eintragszeile ohne Aktionen (nur lesen, mit Link zu «Zeiten»).

### E) Abhängigkeiten (Pakete)
**Keine neuen Pakete.** Verwendet werden die vorhandenen shadcn/ui-Bausteine «Collapsible» (Auf-/Zuklappen), «Card», «Button», «Badge», «Alert», «Skeleton» und die vorhandenen Symbole (lucide-react). Eine Datums- oder Rechenbibliothek ist nicht nötig (Ganzzahlen, Kalenderdaten).

### F) Reihenfolge der Umsetzung (Hinweis für /backend und /frontend)
1. **/backend (klein):** Rundungsregel, Monatszusammenfassung, neue Abfrage «Einträge eines Monats für die Auswertung» (Supabase und im Speicher) samt Tests. Keine Datenbank-Änderung.
2. **/frontend:** Navigation «Monat» inkl. engerer Tab-Leiste (6 Einträge bei 320 px prüfen), Seite `/monat`, Monatsleiste, Gesamtzeile, Kundenabschnitte, aufklappbare Projekte mit Eintragsliste, Zustände, Barrierefreiheit, Tests.
3. **/qa:** Kriterien, Randfälle (Rundung an Grenzen, über 1000 Einträge, Monate mit Zeitumstellung, Monatsgrenzen), Layout 320–1440 px (besonders die Tab-Leiste), axe, Regression von «Zeiten», «Woche» und «Start».

### G) Risiken
- **Tab-Leiste mit sechs Einträgen bei 320 px:** Beschriftungen und Mindestgrösse 44 px sind knapp. Wird früh im Browser bei 320 und 375 px geprüft; wenn es nicht reicht, kehren wir zur Frage «Status aus der Leiste nehmen» zurück (Entscheidung beim Nutzer).
- **Rundungsregel und Export müssen identisch bleiben:** Darum eine gemeinsame Funktion; PROJ-9 darf nicht neu rechnen.
- **Falsche Summe in der Rechnung durch Unvollständigkeit:** Hinweise «Laufender Monat» und «Zahlen unvollständig» müssen auffallen (Text, nicht nur Farbe) und werden getestet.
- **Doppelte Rundungsansicht verwirrt:** Drei Zahlen pro Zeile am Handy können unübersichtlich werden. Beschriftung und Anordnung (untereinander) werden bei 320/375 px geprüft; die gerundete Zahl ist als die für die Rechnung erkennbar.

## Implementation Notes (Backend)
**Umgesetzt am 2026-11-17. Keine Datenbank-Änderung, keine neue Tabelle, kein Server-Code (wie im Entwurf).** Alles liegt in der Datenschicht `src/lib/time-entries/`:

- **Rundungsregel** `rounding.ts` (+ `rounding.test.ts`): `roundUpToBillingUnit(minuten)` rundet auf das nächste Vielfache von 15 Minuten nach oben (0 → 0, 1 → 15, 15 → 15, 16 → 30); negative, unendliche und ungültige Werte ergeben 0. Konstante `BILLING_UNIT_MINUTES = 15`. Einzige Stelle der Regel; PROJ-9 (CSV) verwendet dieselbe Funktion.
- **Monatszusammenfassung** `month-summary.ts` (+ `month-summary.test.ts`, 12 Tests): `buildMonthSummary(month, entries)` liefert Kunden (nach Kürzel) mit Projekten (nach Name) und je Projekt die Einträge (älteste zuerst, am selben Tag nach Startzeit, dann nach Anlegezeit). Jede Ebene hat `worked`, `billable` (exakt) und `billableRounded`. Gerundet wird nur die Projektsumme, nach dem Summieren aller Einträge; Kunden- und Monatssumme addieren die gerundeten Projektwerte (kein zweites Runden). Einträge ausserhalb des Monats werden ignoriert. Archiv-Hinweise kommen aus den Einträgen (`customerArchived`, `projectArchived`).
- **Neue Abfrage `listMonthReport(month)`** in der Schnittstelle (`repository.ts`), in `supabase-repository.ts` und im Test-Double `in-memory-repository.ts`. Liefert den ganzen Monat aufsteigend mit Archiv-Hinweisen und dem Kennzeichen `truncated` bei mehr als 1000 Einträgen (Typ `MonthEntries`). Sie nutzt dieselbe private Abfrage und dieselben Spalten wie `listWeek`; im Test-Double teilen sich beide eine private Methode. `listMonth` («Zeiten») bleibt unverändert, ein Test prüft das ausdrücklich (neueste Tage zuerst, keine Archiv-Hinweise).
- **Tests:** Vitest 424 von 424 grün (vorher 393, neu 31: Rundung 16, Monatszusammenfassung 12, Repositories 3). `tsc` ohne Fehler, Lint nur die alte Warnung in `use-toast.ts`.
- **Datenbank:** Die Supabase-Abfrage ist dieselbe wie die der Wochenübersicht (gleiche Spalten inkl. `archived` von Projekt und Kunde), nur mit Monatsgrenzen; sie wurde für PROJ-7 gegen die echte Datenbank geprüft. Für den Monat wurde sie nicht noch einmal gegen die echte Datenbank laufen gelassen; das übernimmt /qa.

### Abweichungen vom Entwurf
- Keine.

### Offen für /frontend
- Navigation «Monat» (`src/lib/navigation.ts`, sechster Eintrag; Test «höchstens fünf» auf sechs ändern), engere Tab-Leiste (`bottom-tab-bar.tsx`, 320 px prüfen), Seite `/monat`, Monatsleiste, Gesamtzeile, Kundenabschnitte, aufklappbare Projekte («Collapsible»), Hinweise «Laufender Monat» und «Zahlen unvollständig», Ladezustände.
- Bausteine, die schon da sind: `resolveMonth`, `shiftMonth`, `isCurrentMonth`, `formatMonthLabel` (`month.ts`), `buildMonthSummary`, `roundUpToBillingUnit`, `listMonthReport`.
- Prüfen, ob Woche und Monat eine gemeinsame «Zeitraum-Leiste» bekommen.

## Implementation Notes (Frontend)
**Umgesetzt am 2026-11-18.** Nur Oberfläche; Rechenlogik und Abfrage stammen aus dem Backend-Schritt. Keine neuen Pakete, kein neuer shadcn/ui-Baustein (verwendet: Collapsible, Card, Button, Badge, Alert, Skeleton).

- **Navigation:** `src/lib/navigation.ts` hat den sechsten Eintrag «Monat» (`/monat`, Symbol «CalendarCheck») zwischen «Woche» und «Zeiten». Die Tab-Leiste (`bottom-tab-bar.tsx`) hat engere seitliche Abstände (`px-0.5` statt `px-2`) und `min-w-0` an den Einträgen, damit sechs Einträge bei 320 px (rund 53 px je Eintrag) lesbar bleiben. Test «höchstens fünf» ist jetzt «höchstens sechs» (`navigation.test.ts`); die Browser-Tests von PROJ-5 und PROJ-7, die die Navigationsliste prüfen, erwarten jetzt sechs Einträge.
- **Seite** `src/app/(app)/monat/page.tsx` (Titel «Monat», Suspense-Grenze wie bei «Woche»).
- **`month-view.tsx`:** Kopfzeile mit «Zeit erfassen», Monatsleiste (Pfeile «Vorheriger Monat»/«Nächster Monat», «Dieser Monat», Überschrift «November 2026» mit `aria-live`), Hinweis «Laufender Monat, noch nicht abgeschlossen» (Symbol und Text, nur im aktuellen Monat), Hinweis «Zahlen unvollständig» bei mehr als 1000 Einträgen, Ladezustand, Fehler mit «Erneut versuchen», Leerzustand, Gesamtzeile mit Erklärung «Pro Projekt aufgerundet auf 15 Minuten.», «Alle aufklappen»/«Alle zuklappen» und die Kundenabschnitte. Der Monat steht in der Adresse (`?monat=2026-11`), ungültig oder zukünftig führt zum aktuellen Monat. Die Seite lädt bei «Einträge geändert» des Timers neu (wie «Woche»). Daten eines anderen Monats zählen als «lädt noch».
- **`month-customer-section.tsx`:** Ein Abschnitt je Kunde (Kürzel · Name, «archiviert»), darin je Projekt eine aufklappbare Zeile (shadcn/ui Collapsible; Knopf in einer Überschrift der Ebene 4, `aria-expanded`/`aria-controls` von Radix, Pfeil dreht sich). Zugeklappte Projekte haben keine Einträge im DOM. Die Zahlen des Projekts stehen immer sichtbar unter dem Knopf.
- **`month-parts.tsx`:** `MonthNumbers` (Gearbeitet, Verrechenbar, «Verrechenbar gerundet auf 15 Min.» als Definitionsliste mit Beschriftung «Summe …»; am Handy untereinander, ab 640 px nebeneinander; die gerundete Zahl ist fett), `ArchivedBadge`, `MonthEntryRow` (Datum «Mo 9.11.», Uhrzeiten, Dauer und verrechenbar, Beschreibung vollständig mit Zeilenumbrüchen oder «Keine Beschreibung», Link «In Zeiten ansehen» auf `/zeiten` bzw. `/zeiten?monat=…`, keine Aktionen «Bearbeiten»/«Löschen»).
- **Aufklapp-Zustand:** nur im Bildschirm (nicht in der Adresse), gilt für den Monat, in dem aufgeklappt wurde; beim Monatswechsel sind alle Projekte wieder zugeklappt.
- **Tests:** Vitest 444 von 444 grün (vorher 424, neu 20: `month-ui.test.tsx` 19, `month-timer-refresh.test.tsx` 1). `tsc` ohne Fehler, Lint nur die alte Warnung in `use-toast.ts`, `npm run build` ok.
- **Regression im Browser (Chrome, Produktionsbuild):** Die bestehende Suite (PROJ-1 bis PROJ-7) läuft mit der sechsten Navigationsposition und der engeren Tab-Leiste durch: 297 von 297 grün, darunter die 320-px-Tests der Tab-Leiste und die axe-Prüfungen. Ein erster Lauf hatte einen einzelnen Fehler im Start-Formular (PROJ-4: Pfeiltaste im Umschalter «Nur Dauer»/«Von–bis»); beim Wiederholen auf dem committeten Stand und mit den neuen Änderungen bestand der Test, im nächsten vollständigen Lauf ebenfalls. Vermutlich ein zeitabhängiger Testfehler (Fokus/Tastatur), nicht durch dieses Feature verursacht; wird in /qa beobachtet.
- **Bekannte Grenzen / für /qa:** Die Browser-Tests (Playwright) für die neue Seite, die Prüfung mit axe in Hell/Dunkel, das Layout bei 320/375/768/1440 px (besonders die Tab-Leiste mit sechs Einträgen und die drei Zahlen am Handy) sowie die Prüfung der Abfrage gegen die echte Datenbank stehen noch aus. Die zwei offenen Fragen aus der Spec zu Dezimalstunden und Kundenreihenfolge bleiben wie vorgeschlagen (nur h:mm, nach Kürzel).

## QA Test Results
_To be added by /qa_

## Deployment
_To be added by /deploy_
