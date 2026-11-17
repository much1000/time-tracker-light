# PROJ-8: Monatsauswertung

## Status: Planned
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

---
<!-- Sections below are added by subsequent skills -->

## Tech Design (Solution Architect)
_To be added by /architecture_

## QA Test Results
_To be added by /qa_

## Deployment
_To be added by /deploy_
