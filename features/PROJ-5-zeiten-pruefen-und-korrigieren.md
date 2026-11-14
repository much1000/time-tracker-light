# PROJ-5: Zeiten prüfen und korrigieren

## Status: Planned
**Created:** 2026-11-14
**Last Updated:** 2026-11-14

## Dependencies
- Requires: PROJ-1 (Supabase Infrastructure Setup) — Datenbank und Zugriffsregeln
- Requires: PROJ-2 (Anmeldung) — Seiten geschützt, Daten gehören dem angemeldeten Nutzer
- Requires: PROJ-3 (Kunden- und Projektverwaltung) — Kunden und Projekte, Archiv
- Requires: PROJ-4 (Manuelle Zeiterfassung) — Zeiteinträge, Formular und Prüfregeln werden wiederverwendet
- Requires: PROJ-6 (Timer) — Einträge aus dem Timer (mit Uhrzeiten, auch bis 24:00) lassen sich ebenso korrigieren
- Requires: PROJ-11 (Design-System-Basis) — Navigation, Layout, Theme
- Wird gebraucht von: PROJ-7, PROJ-8, PROJ-9 (korrigierte Zeiten fliessen in Auswertung und Export)

## User Stories
- Als Einzelnutzer möchte ich alle meine Zeiten eines Monats in einer Liste sehen, damit ich prüfen kann, ob alles stimmt.
- Als Einzelnutzer möchte ich einen Eintrag korrigieren (Datum, Projekt, Dauer, Uhrzeiten, verrechenbar, Beschreibung), damit Tippfehler und Fehlstarts des Timers sich beheben lassen, ohne etwas neu zu erfassen.
- Als Einzelnutzer möchte ich einen falschen Eintrag löschen, damit er nicht in Auswertung und Export landet.
- Als Einzelnutzer möchte ich Einträge nach Kunde filtern und diejenigen ohne Beschreibung finden, damit ich vor der Rechnung fehlende Tätigkeitstexte nachtragen kann.
- Als Einzelnutzer möchte ich zu jedem Tag und Monat die Summen sehen (gearbeitet und verrechenbar), damit ich einen schnellen Überblick habe.
- Als Einzelnutzer möchte ich einen Eintrag auch direkt unter «Heute» auf der Startseite korrigieren, damit ich einen Fehler gleich nach dem Stoppen des Timers beheben kann.
- Als Einzelnutzer möchte ich die Seite auf dem Handy bequem bedienen, damit ich unterwegs korrigiere.

## Out of Scope
- **Wochenübersicht und Monatsauswertung pro Kunde und Projekt** (inkl. 15-Minuten-Aufrundung): PROJ-7 und PROJ-8. Die Seite «Zeiten» zeigt nur Tages- und Monatssummen, keine Gruppierung nach Kunde oder Projekt.
- **CSV-Export:** PROJ-9.
- **Mehrfachauswahl, Sammelbearbeiten, Sammellöschen:** nicht im MVP (ein Eintrag nach dem anderen).
- **Rückgängig machen oder Papierkorb:** nicht im MVP; Löschen ist endgültig (mit Rückfrage).
- **Verlauf oder Protokoll von Änderungen:** nicht im MVP.
- **Suche im Beschreibungstext, Filter nach Projekt oder Zeitraum ausser Monat:** nicht im MVP.
- **Löschen oder Bearbeiten von Kunden und Projekten:** PROJ-3 (Archivieren); Kunden und Projekte lassen sich weiterhin nie löschen.
- **Vollständiges Anpassen laufender Timer:** Der laufende Timer wird nicht in dieser Liste bearbeitet (PROJ-6, Startzeit ändern ist dort ausgeschlossen).

## Acceptance Criteria

**Format:** Angenommen [Vorbedingung] / Wenn [Aktion] / Dann [Ergebnis]

### Navigation und Seitenschutz
- [ ] Angenommen der Nutzer ist angemeldet, wenn er die Navigation ansieht, dann gibt es den Eintrag «Zeiten» (Seitenleiste und Tab-Leiste) mit der Adresse `/zeiten`, der beim Besuch von `/zeiten` als aktiv markiert ist; die Reihenfolge ist Start, Zeiten, Kunden, Status.
- [ ] Angenommen der Nutzer ist nicht angemeldet, wenn er `/zeiten` öffnet, dann landet er auf der Anmeldeseite und sieht keine Daten.
- [ ] Angenommen die Seite lädt, dann trägt sie den Titel «Zeiten · Time Tracker Light».

### Liste und Monatsnavigation
- [ ] Angenommen der Nutzer öffnet `/zeiten`, wenn die Seite lädt, dann zeigt sie den aktuellen Monat (nach Zürcher Uhr) mit dem Monatsnamen als Überschrift, Pfeilen für «Vorheriger Monat» und «Nächster Monat» (der nächste Monat ist nach dem aktuellen deaktiviert) und der Monatssumme (gearbeitet und verrechenbar).
- [ ] Angenommen es gibt Einträge im Monat, wenn die Liste angezeigt wird, dann stehen sie nach Tag gruppiert (neuester Tag zuerst) mit Tagesüberschrift (Wochentag und Datum), Tagessumme (gearbeitet und verrechenbar) und den Einträgen des Tages nach Startzeit, Einträge ohne Uhrzeit danach nach Anlegezeit.
- [ ] Angenommen ein Eintrag, wenn er angezeigt wird, dann stehen darin Kürzel und Projekt, die Beschreibung (lange Texte gekürzt mit «Mehr anzeigen»), die Dauer, die verrechenbare Dauer und die Uhrzeiten (falls vorhanden, auch «24:00») sowie die Aktionen «Bearbeiten» und «Löschen».
- [ ] Angenommen ein Eintrag ohne Beschreibung, wenn er angezeigt wird, dann ist er mit dem Hinweis «Keine Beschreibung» markiert (Symbol und Text, nicht nur Farbe).
- [ ] Angenommen der Monat enthält keine Einträge, wenn die Seite lädt, dann sieht der Nutzer einen Leerzustand mit Erklärung und dem Knopf «Zeit erfassen»; bei einem aktiven Filter ohne Treffer sieht er stattdessen «Keine Einträge für diesen Filter» mit «Filter zurücksetzen».
- [ ] Angenommen der Nutzer blättert in einen anderen Monat, wenn die Daten laden, dann sieht er einen Ladezustand; schlägt das Laden fehl, dann erscheint eine Fehlermeldung mit «Erneut versuchen», und der vorige Stand bleibt nicht fälschlich stehen.
- [ ] Angenommen der Nutzer hat einen Monat gewählt, wenn er die Seite neu lädt oder zurückkehrt, dann zeigt die Adresse den Monat (z. B. `/zeiten?monat=2026-10`), sodass der Link wieder denselben Monat öffnet; ein ungültiger oder zukünftiger Monat führt zum aktuellen Monat.

### Filter
- [ ] Angenommen es gibt Kunden mit Einträgen, wenn der Nutzer den Filter «Kunde» öffnet, dann sieht er «Alle Kunden» und alle Kunden (auch archivierte, mit Hinweis «archiviert»), nach Kürzel sortiert.
- [ ] Angenommen der Nutzer wählt einen Kunden, wenn die Liste neu aufgebaut wird, dann zeigt sie nur dessen Einträge, und Tages- und Monatssummen folgen dem Filter.
- [ ] Angenommen der Nutzer schaltet «Nur ohne Beschreibung» ein, wenn die Liste neu aufgebaut wird, dann zeigt sie nur Einträge ohne Beschreibung (auch kombiniert mit dem Kundenfilter), und die Summen folgen dem Filter.
- [ ] Angenommen ein Filter ist aktiv, wenn der Nutzer den Monat wechselt, dann bleibt der Filter erhalten; beim Neuladen der Seite bleibt er über die Adresse erhalten.

### Bearbeiten
- [ ] Angenommen der Nutzer klickt bei einem Eintrag auf «Bearbeiten», wenn sich das Formular öffnet (Dialog am Laptop, Blatt von unten am Handy), dann sind alle Felder mit den aktuellen Werten vorausgefüllt (Datum, Kunde, Projekt, Modus «Von–bis» bei vorhandenen Uhrzeiten sonst «Nur Dauer», Dauer, Verrechenbar, Beschreibung), und der Fokus liegt im ersten sinnvollen Feld.
- [ ] Angenommen das Formular, wenn der Nutzer speichert, dann gelten dieselben Prüfregeln wie beim Erfassen (PROJ-4): Datum nicht in der Zukunft, Dauer 1 Minute bis 24 Stunden, Ende nach Start am selben Tag, verrechenbar 0 bis zur Dauer, Beschreibung höchstens 1000 Zeichen; Fehler erscheinen am Feld, nichts wird gespeichert.
- [ ] Angenommen ein Eintrag mit Uhrzeiten überschneidet sich mit einem anderen Eintrag desselben Tages, wenn er bearbeitet wird, dann erscheint der Hinweis auf die Überschneidung, Speichern bleibt möglich, und der bearbeitete Eintrag zählt nicht als Überschneidung mit sich selbst.
- [ ] Angenommen ein Eintrag aus dem Timer endet um 24:00, wenn er bearbeitet wird, dann lässt er sich speichern, ohne dass das Ende ungewollt geändert wird (24:00 bleibt, solange es nicht geändert wird).
- [ ] Angenommen der Nutzer ändert Datum, Kunde, Projekt, Dauer, Uhrzeiten, Verrechenbar oder Beschreibung, wenn er speichert, dann gilt die Änderung überall (Liste, «Heute», später Auswertung und Export), das Formular schliesst sich, die Liste und die Summen aktualisieren sich ohne Neuladen (der Eintrag erscheint beim neuen Tag, auch in einem anderen Monat: dann verschwindet er aus der Ansicht), und eine kurze Bestätigung wird angezeigt.
- [ ] Angenommen das Projekt des Eintrags ist inzwischen archiviert, wenn der Nutzer den Eintrag bearbeitet, dann zeigt die Projektauswahl das archivierte Projekt als aktuellen Wert (mit Hinweis «archiviert»), der Eintrag lässt sich mit diesem Projekt weiter speichern, und er lässt sich nur auf ein aktives Projekt verschieben.
- [ ] Angenommen der Nutzer schliesst das Formular mit nicht gespeicherten Änderungen (Abbrechen, Escape, Tippen daneben), wenn er es schliesst, dann gehen die Änderungen verloren, ohne dass etwas gespeichert wird; der Fokus kehrt zum auslösenden Knopf zurück.
- [ ] Angenommen das Formular wird abgesendet, wenn die Anfrage läuft, dann ist der Speichern-Knopf deaktiviert und zeigt «Wird gespeichert …»; bei einem Fehler erscheint eine Meldung, und die Eingaben bleiben erhalten.

### Löschen
- [ ] Angenommen der Nutzer klickt bei einem Eintrag auf «Löschen», wenn die Rückfrage erscheint, dann nennt sie Kunde und Projekt, Datum, Dauer und Beschreibung (gekürzt), warnt, dass das Löschen endgültig ist, und bietet «Abbrechen» und «Löschen» (der Fokus liegt auf «Abbrechen»).
- [ ] Angenommen die Rückfrage, wenn der Nutzer «Löschen» bestätigt, dann ist der Eintrag endgültig gelöscht, verschwindet aus der Liste, die Summen aktualisieren sich, und eine kurze Bestätigung erscheint; bei «Abbrechen» oder Escape bleibt alles unverändert.
- [ ] Angenommen eine laufende Anfrage, wenn der Nutzer auf «Löschen» klickt, dann ist der Knopf deaktiviert (kein doppeltes Absenden); bei einem Fehler erscheint eine Meldung, und der Eintrag bleibt erhalten.
- [ ] Angenommen ein Eintrag wurde schon auf einem anderen Gerät gelöscht, wenn der Nutzer ihn bearbeiten oder löschen will, dann erscheint ein verständlicher Hinweis («Dieser Eintrag existiert nicht mehr»), und die Liste lädt neu.
- [ ] Angenommen die Datenbank, wenn ein Eintrag gelöscht wird, dann kann das nur der Besitzer (nur eigene Zeiteinträge); für Kunden und Projekte gibt es weiterhin kein Löschrecht.

### Startseite «Heute»
- [ ] Angenommen es gibt heute Einträge, wenn die Liste «Heute» auf der Startseite angezeigt wird, dann hat jeder Eintrag «Bearbeiten» und «Löschen» mit demselben Verhalten wie auf der Seite «Zeiten», und unter der Liste steht der Link «Alle Zeiten».
- [ ] Angenommen der Nutzer stoppt einen Timer, wenn der Eintrag unter «Heute» erscheint, dann lässt er sich sofort bearbeiten oder löschen.

### Zeit erfassen auf der Seite «Zeiten»
- [ ] Angenommen der Nutzer ist auf `/zeiten`, wenn er auf «Zeit erfassen» klickt, dann öffnet sich dasselbe Formular wie auf der Startseite (PROJ-4, Datum heute vorbelegt), und der neue Eintrag erscheint nach dem Speichern in der Liste, wenn er zum angezeigten Monat und Filter passt.

### Bedienung, Darstellung, Zugänglichkeit
- [ ] Angenommen die Seite «Zeiten», wenn sie bei 320, 375, 768 und 1440 px Breite angesehen wird, dann läuft nichts über, es gibt kein horizontales Scrollen, und alle bedienbaren Elemente sind mindestens 44 px hoch.
- [ ] Angenommen sehr lange Kunden-, Projektnamen oder Beschreibungen ohne Leerzeichen, wenn sie in Liste, Formular oder Rückfrage angezeigt werden, dann brechen sie um oder werden sauber gekürzt, nichts läuft über.
- [ ] Angenommen die Seiten, wenn sie mit Tastatur und Screenreader genutzt werden, dann sind Dialoge fokusgefangen und per Escape schliessbar, der Fokus kehrt danach zum auslösenden Knopf zurück (nach dem Löschen eines Eintrags zum nächsten sinnvollen Element), Aktionen eines Eintrags sind eindeutig benannt («Eintrag von 13.11., MUS · Allgemein, 1:30 bearbeiten»), Zustandswechsel (gespeichert, gelöscht, Fehler) werden angesagt, und Beschriftungen sind immer sichtbar.
- [ ] Angenommen Hell- und Dunkelmodus, wenn die Seiten angesehen werden, dann erfüllen alle Farbpaare WCAG AA (Design-System aus PROJ-11).

### Datenschutz und Sicherheit
- [ ] Angenommen ein Zeiteintrag gehört einem Nutzer, wenn ein anderer angemeldeter Nutzer (oder ein Aufruf nur mit dem öffentlichen Schlüssel) Einträge lesen, ändern oder löschen will, dann ist das auf Datenbankebene verwehrt (nur eigene Daten).
- [ ] Angenommen ein Eintrag soll direkt in der Datenbank mit ungültigen Werten geändert werden (Dauer 0 oder über 24 Std, verrechenbar über gearbeitet, Ende vor Start, Datum in der Zukunft, Beschreibung über 1000 Zeichen), dann lehnt die Datenbank die Änderung ab (Regeln aus PROJ-4 gelten auch beim Ändern).
- [ ] Angenommen ein Eintrag soll direkt in der Datenbank auf ein archiviertes, fremdes oder unbekanntes Projekt verschoben werden, dann lehnt die Datenbank das ab; der Besitzer lässt sich nicht ändern.
- [ ] Angenommen manipulierte Eingaben (HTML, Skripte, SQL-Zeichen) in der Beschreibung, wenn sie gespeichert und angezeigt werden, dann werden sie als reiner Text behandelt.
- [ ] Angenommen ein Eintrag wird gelöscht, wenn er schon in einer späteren Auswertung oder einem Export eingeflossen ist, dann gibt es keine Rückwirkung auf Kunden und Projekte (nur der Eintrag verschwindet); das Löschen betrifft nie mehr als den einen Eintrag.

## Edge Cases
- **Doppelklick auf «Speichern» oder «Löschen»:** Es wird nur einmal gespeichert bzw. gelöscht.
- **Zwei Geräte bearbeiten denselben Eintrag:** Die letzte Speicherung gilt (Einzelnutzer, bewusst einfach); das andere Gerät sieht den neuen Stand beim nächsten Laden.
- **Eintrag wird auf einem Gerät gelöscht, während das andere ihn im Formular offen hat:** Beim Speichern erscheint «Dieser Eintrag existiert nicht mehr», die Eingaben bleiben im Formular, die Liste lädt neu.
- **Eintrag wird in einen anderen Monat verschoben:** Er verschwindet aus der angezeigten Liste; die Bestätigung nennt das neue Datum («Gespeichert am 05.10.2026»).
- **Archiviertes Projekt oder Kunde:** Der Eintrag bleibt vollständig sichtbar, bearbeitbar (ausser Verschieben auf ein anderes archiviertes Ziel) und löschbar.
- **Sehr viele Einträge in einem Monat (mehrere Hundert):** Die Seite bleibt bedienbar; es gibt eine Obergrenze pro Anfrage, bei Überschreiten erscheint ein deutlicher Hinweis «Es werden nicht alle Einträge angezeigt, bitte Filter nutzen».
- **Sommer-/Winterzeit und Mitternacht:** Einträge zeigen ihr Datum und ihre Uhrzeiten wie gespeichert; die Monatsgrenze richtet sich nach dem Eintragsdatum (nicht nach der Uhrzeit).
- **Beschreibung mit HTML, Emojis, Zeilenumbrüchen:** wird als Text angezeigt, Zeilenumbrüche bleiben sichtbar.
- **Sitzung abgelaufen, während das Formular offen ist:** Beim Speichern erscheint ein Hinweis, die Eingabe bleibt erhalten, und der Nutzer wird zur Anmeldung geleitet.
- **Supabase nicht erreichbar:** Fehlermeldung mit «Erneut versuchen», keine leere Seite; beim Speichern oder Löschen bleibt der Zustand unverändert.
- **Löschen des letzten Eintrags eines Tages:** Die Tagesgruppe verschwindet.
- **Eintrag ohne Uhrzeit wird auf «Von–bis» umgestellt oder umgekehrt:** Beim Wechsel zu «Nur Dauer» werden die Uhrzeiten nicht mehr gespeichert (wie PROJ-4).

## Technical Requirements (optional)
- **Sicherheit:** Authentifizierung erforderlich (PROJ-2). Zugriff nur auf eigene Einträge, abgesichert in der Datenbank. Löschrecht nur für eigene Zeiteinträge (Änderung der Zugriffsregeln: braucht die ausdrückliche Freigabe des Nutzers, siehe Projektregeln).
- **Datenintegrität:** Die Regeln aus PROJ-4 gelten beim Ändern wie beim Anlegen. Löschen entfernt genau einen Eintrag.
- **Performance:** Monatsliste in unter 1 Sekunde sichtbar (bei bis zu 500 Einträgen im Monat); Wechsel des Monats ohne spürbare Verzögerung.
- **Browser:** Chrome, Firefox, Safari, Handy und Desktop (responsive, mobile-first, 44 px Ziele).
- **Design:** `docs/design-system.md`, WCAG AA, shadcn/ui vor eigenen Komponenten.

## Open Questions
- [ ] **Eintrag mit Ende 24:00 im Formular:** Das Zeitfeld kennt 24:00 nicht (Browser-Zeitfeld). Wie 24:00 beim Bearbeiten angezeigt und unverändert bewahrt wird (z. B. Textfeld oder Hinweis «Ende 24:00»), klärt `/architecture`.
- [ ] **Obergrenze der Einträge pro Monat:** Die genaue Grenze (z. B. 1000) und die Art des Hinweises klärt `/architecture`.
- [ ] **Filter in der Adresse:** Welche Parameter (Monat, Kunde, «ohne Beschreibung») die Adresse trägt, klärt `/architecture`.

## Decision Log

### Product Decisions
| Decision | Rationale | Date |
|----------|-----------|------|
| Eigene Seite «Zeiten» (`/zeiten`), standardmässig der aktuelle Monat, mit Monatsnavigation; Einträge neueste zuerst, nach Tag gruppiert mit Tages- und Monatssumme | Überblick vor der Rechnung ohne die Startseite zu überladen; kollidiert nicht mit Wochenübersicht (PROJ-7) und Monatsauswertung pro Kunde (PROJ-8) | 2026-11-14 |
| Bearbeiten aller Felder mit demselben Formular wie beim Erfassen (Datum, Ziel, Dauer oder Von–bis, Verrechenbar, Beschreibung) | Ein falsches Projekt oder Datum (häufige Tippfehler) lässt sich so ohne Löschen beheben; ein Formular, dieselben Prüfregeln | 2026-11-14 |
| Löschen endgültig, mit Rückfrage; Löschrecht in der Datenbank nur für eigene Zeiteinträge | Einfach und eindeutig: Gelöschtes taucht nirgends in Auswertung und Export auf; Kunden und Projekte bleiben unlöschbar (Spec PROJ-3) | 2026-11-14 |
| Filter: Kunde (auch archivierte) und «Nur ohne Beschreibung»; Summen folgen dem Filter | Fehlende Tätigkeitstexte vor der Rechnung nachtragen (Vision: Monatsauswertung mit Beschreibungstexten); Rest übernimmt PROJ-8 | 2026-11-14 |
| «Bearbeiten» und «Löschen» auch unter «Heute» auf der Startseite, dazu Link «Alle Zeiten» | Fehler gleich nach dem Stoppen des Timers beheben ohne Seitenwechsel | 2026-11-14 |
| «Zeit erfassen» auch auf der Seite «Zeiten» (Nacherfassung) | Nacherfassen mit dem Blick auf die Liste; derselbe Dialog wie auf der Startseite | 2026-11-14 |
| Einträge auf archivierten Projekten bleiben bearbeitbar und löschbar, verschieben nur auf aktive Projekte | Konsistent mit PROJ-3 und PROJ-4: Alte Zeiten bleiben korrigierbar, neue Buchungen nur auf aktive Ziele | 2026-11-14 |
| Bei gleichzeitiger Änderung auf zwei Geräten gilt die letzte Speicherung | Einzelnutzer, keine Konfliktbehandlung nötig | 2026-11-14 |
| Der Monat und die Filter stehen in der Adresse | Link, Zurück-Taste und Neuladen führen zurück zur selben Ansicht | 2026-11-14 |

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
