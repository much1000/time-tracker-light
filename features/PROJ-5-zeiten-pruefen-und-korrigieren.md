# PROJ-5: Zeiten prüfen und korrigieren

## Status: Deployed
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
- [x] **Eintrag mit Ende 24:00 im Formular (entschieden in `/architecture`: Schalter «Bis Mitternacht (24:00)» neben dem Feld «Bis»):** Das Zeitfeld kennt 24:00 nicht (Browser-Zeitfeld). Wie 24:00 beim Bearbeiten angezeigt und unverändert bewahrt wird (z. B. Textfeld oder Hinweis «Ende 24:00»), klärt `/architecture`.
- [x] **Obergrenze der Einträge pro Monat (entschieden in `/architecture`: 1000, mit Hinweis und unvollständigen Summen):** Die genaue Grenze (z. B. 1000) und die Art des Hinweises klärt `/architecture`.
- [x] **Filter in der Adresse (entschieden in `/architecture`: Seitenparameter für Monat, Kunde und «ohne Beschreibung»):** Welche Parameter (Monat, Kunde, «ohne Beschreibung») die Adresse trägt, klärt `/architecture`.

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
| Keine neuen Daten, nur ein neues Recht: Löschen eigener Zeiteinträge (Row Level Security und `DELETE` nur für angemeldete Nutzer) | Das Ändern ist schon mit allen Regeln möglich (PROJ-4); das Löschen ist die einzige nötige Änderung der Zugriffsregeln und braucht die Freigabe des Nutzers | 2026-11-14 |
| Zuerst `/backend` (kleine Datenbank-Änderung), dann `/frontend` ohne Platzhalter | Die Änderung ist klein; echte Daten lassen sich sofort korrigieren und Testdaten in der App löschen | 2026-11-14 |
| Bearbeiten über dasselbe Formular wie Erfassen (zusätzlicher Modus), gleiche Prüfregeln | Ein Formular, eine Absicherung; die Datenbank prüft beim Ändern dieselben Regeln | 2026-11-14 |
| Der Anlegezeitpunkt bleibt beim Bearbeiten unverändert | Die Vorbelegung «zuletzt benutztes Ziel» (PROJ-4) richtet sich nach dem Anlegen, nicht nach dem Korrigieren | 2026-11-14 |
| Ende 24:00 über einen Schalter «Bis Mitternacht (24:00)» neben dem Feld «Bis» (im Formular zum Erfassen und Bearbeiten) | Das Browser-Zeitfeld kennt 24:00 nicht; der Schalter lässt das gewohnte Zeitfeld (Handy-Wähler) bestehen und bewahrt Einträge aus dem Timer unverändert; löst die offene Frage der Spec | 2026-11-14 |
| Der Monat richtet sich nach dem Datum des Eintrags (Zürcher Uhr), nicht nach der Uhrzeit | Einträge gehören zu genau einem Tag (kein Eintrag über Mitternacht) | 2026-11-14 |
| Monat, Kunde und «ohne Beschreibung» stehen in der Adresse (Seitenparameter) | Zurück-Taste, Neuladen und Links führen zur selben Ansicht; löst die offene Frage der Spec | 2026-11-14 |
| Kunden- und Beschreibungsfilter werden in der Datenbankabfrage angewendet | Obergrenze und Summen passen zum Filter; keine Filterung auf abgeschnittenen Daten | 2026-11-14 |
| Obergrenze 1000 Einträge pro Monatsabfrage; bei Überschreiten Hinweis und Kennzeichnung der Summen als unvollständig | Schutz der Oberfläche und der kostenlosen Datenbank; realistisch liegen Monate weit darunter; löst die offene Frage der Spec | 2026-11-14 |
| Tages- und Monatssummen entstehen in der Oberfläche aus den geladenen Einträgen, nicht in der Datenbank | Folgen automatisch jedem Filter; bei den erwarteten Mengen schnell genug; Auswertung pro Kunde und Projekt ist PROJ-7 und PROJ-8 | 2026-11-14 |
| Eintragszeile, Formular und Rückfrage aus PROJ-3, PROJ-4 werden um Aktionen und einen Modus erweitert statt kopiert | Weniger Doppelcode; «Heute» auf der Startseite und die Seite «Zeiten» zeigen dasselbe Verhalten | 2026-11-14 |
| Ein Eintrag auf einem archivierten Projekt ist im Bearbeiten-Formular als aktueller Wert wählbar (mit Hinweis «archiviert»), Verschieben nur auf aktive Projekte | Entspricht der Datenbankregel (Projekt unverändert: erlaubt, Wechsel nur auf aktive Ziele) | 2026-11-14 |
| Direkt über Supabase ohne eigene API-Routen, Browser lädt und schreibt | Wie PROJ-3, PROJ-4 und PROJ-6: die Datenbank schützt die Daten | 2026-11-14 |

---
<!-- Sections below are added by subsequent skills -->

## Tech Design (Solution Architect)

### Backend nötig?
Ja, aber klein. Die Tabelle der Zeiteinträge besteht schon (PROJ-4), und die Datenbank erlaubt das **Ändern** eigener Einträge samt aller Prüfregeln bereits. Neu ist nur das **Löschrecht** für eigene Zeiteinträge (eine Änderung der Zugriffsregeln: braucht die ausdrückliche Freigabe des Nutzers). Alles andere ist Oberfläche und Datenschicht: Monatsliste mit Filtern, Ändern, Löschen. Eigene Schnittstellen (API-Routen) sind nicht nötig; die Seiten sprechen direkt mit Supabase wie bisher.

**Bau-Reihenfolge:** zuerst `/backend` (die kleine Datenbank-Änderung samt Prüfung), dann `/frontend` direkt gegen die echte Datenschicht (keine Platzhalter-Phase). Danach lassen sich auch Testeinträge in der App löschen.

### A) Seitenstruktur
```
App-Bereich (geschützt, mit Navigation)
+-- Navigation: neuer Eintrag «Zeiten» (Reihenfolge: Start, Zeiten, Kunden, Status)
+-- /zeiten  (neue Seite)
|   +-- Kopf: Titel «Zeiten», Knopf «Zeit erfassen»
|   +-- Monatsleiste: «Vorheriger Monat», Monatsname und Jahr, «Nächster Monat» (nach dem aktuellen deaktiviert)
|   +-- Filter: Kunde (Alle Kunden, auch archivierte), Schalter «Nur ohne Beschreibung», «Filter zurücksetzen»
|   +-- Monatssumme: gearbeitet, verrechenbar (folgt dem Filter)
|   +-- Tagesgruppen (neueste zuerst)
|   |   +-- Tageskopf: Wochentag, Datum, Tagessumme
|   |   +-- Einträge: Kürzel · Projekt, Beschreibung (oder «Keine Beschreibung»), Dauer, verrechenbar,
|   |       Uhrzeiten, Aktionen «Bearbeiten» und «Löschen»
|   +-- Hinweis bei zu vielen Einträgen, Leerzustand, Filter ohne Treffer, Lade- und Fehlerzustand
+-- Startseite «/»: Abschnitt «Heute» bekommt «Bearbeiten» und «Löschen» je Eintrag und den Link «Alle Zeiten»
+-- Formular «Zeit bearbeiten» (Dialog am Laptop, Blatt am Handy): dasselbe Formular wie «Zeit erfassen», vorausgefüllt
+-- Rückfrage «Eintrag löschen?» (zeigt Kunde, Projekt, Datum, Dauer, Beschreibung; Fokus auf «Abbrechen»)
```

### B) Bausteine
- **Vorhandene shadcn-Bausteine:** Card, Button, Select (Kunde), Switch (Schalter «Nur ohne Beschreibung» und «Bis Mitternacht»), Alert Dialog (Rückfrage), Badge (Markierung «Keine Beschreibung», «archiviert»), Alert, Skeleton, Sonner. Nichts Neues zu installieren.
- **Wiederverwendet:** `ResponsiveDialog` und das Zeiterfassungs-Formular aus PROJ-4 (bekommt einen Bearbeiten-Modus), die Eintragszeile aus PROJ-4 (bekommt die Aktionen), Rückfrage-Dialog aus PROJ-3, Lade- und Fehlerzustände, Formate und Prüfregeln für Dauer und Uhrzeiten, Hook zum Laden.
- **Neue eigene Zusammensetzungen:** Seite «Zeiten» mit Monatsleiste, Filterleiste, Tagesgruppe, Lösch-Rückfrage, Monats-Hilfsfunktionen (Monat lesen und anzeigen, Vor- und Zurückblättern, nicht in der Zukunft).
- **Formular im Bearbeiten-Modus:** Alle Felder sind mit den Werten des Eintrags vorbelegt. «Von–bis» ist gewählt, wenn der Eintrag Uhrzeiten hat, sonst «Nur Dauer». Die verrechenbare Dauer folgt nicht mehr automatisch (sie ist ein bewusster Wert). Der Überschneidungs-Hinweis ignoriert den Eintrag selbst. Hat ein Eintrag ein archiviertes Projekt, steht es als aktueller Wert mit Hinweis «archiviert» in der Auswahl, weitere Ziele sind nur aktive.
- **Ende 24:00:** Neben dem Feld «Bis» steht ein Schalter «Bis Mitternacht (24:00)». Eingeschaltet gilt 24:00 als Ende und das Zeitfeld ist deaktiviert. Das löst die offene Frage der Spec (das Browser-Zeitfeld kennt kein 24:00) und macht Einträge bis Mitternacht auch beim Erfassen von Hand möglich.
- **Beschriftungen der Aktionen** nennen den Eintrag («Eintrag von 13.11., MUS · Allgemein, 1:30 bearbeiten»), damit Screenreader sie unterscheiden.
- **Navigation:** Der Eintrag «Zeiten» kommt in die zentrale Liste der Navigationspunkte; Seitenleiste und Tab-Leiste übernehmen ihn (vier Einträge, auch bei 320 px nutzbar).

### C) Datenmodell (in Alltagssprache)
Die **Daten bleiben unverändert**: Ein Zeiteintrag hat weiterhin Besitzer, Projekt, Datum, Dauer, verrechenbare Dauer, optionale Start- und Endzeit, optionale Beschreibung, Angelegt- und Geändert-Zeitpunkt (PROJ-4, Endzeit darf 24:00 sein, PROJ-6).

Neu ist nur ein **Recht**: Der angemeldete Nutzer darf seine eigenen Zeiteinträge **löschen**. Für Kunden, Projekte und laufende Timer ändert sich nichts.

Der **Anlegezeitpunkt bleibt beim Bearbeiten erhalten** (damit bleibt auch die Vorbelegung «zuletzt benutztes Ziel» stabil). Zusammenfassungen (Tages- und Monatssummen) entstehen in der Oberfläche aus den geladenen Einträgen und werden nirgends gespeichert.

### D) Regeln in der Datenbank (das Sicherheitsnetz)
- **Löschen nur eigener Zeiteinträge:** neue Regel (Row Level Security) und das Recht `DELETE` auf die Tabelle der Zeiteinträge, nur für angemeldete Nutzer. Löschen betrifft genau die angeforderten Zeilen des Besitzers; `anon` hat nichts.
- **Ändern:** gilt wie bisher mit allen Regeln aus PROJ-4: Besitzer fest, Dauer 1 bis 1440, verrechenbar 0 bis zur Dauer, Uhrzeiten nur zusammen und minutengenau, Ende nach Start, Beschreibung höchstens 1000 Zeichen, Datum bei Änderung nicht in der Zukunft, Verschieben nur auf aktive Projekte des Besitzers.
- **Kein Löschen von Kunden und Projekten:** unverändert. Ein Projekt mit Zeiteinträgen lässt sich weiterhin nie löschen (auch nicht, wenn alle seine Einträge gelöscht wurden: Löschen von Projekten gibt es gar nicht).

### E) Ablauf in Worten
1. **Seite öffnen:** Aus der Adresse werden Monat, Kunde und «ohne Beschreibung» gelesen (ungültig oder in der Zukunft: aktueller Monat). Die Seite lädt die Einträge des Monats (nach Datum des Eintrags, nicht nach Uhrzeit) mit Kürzel, Kunde und Projekt, optional gefiltert, neueste zuerst, höchstens 1000. Sie bildet Tages- und Monatssummen und gruppiert nach Tag. Werden mehr als 1000 gefunden, erscheint der Hinweis «Es werden nicht alle Einträge angezeigt, bitte Filter nutzen» und die Summen sind als unvollständig gekennzeichnet.
2. **Filter und Monat wechseln:** Änderungen schreiben sich in die Adresse (Zurück-Taste, Neuladen und Links funktionieren) und laden die Liste neu.
3. **Bearbeiten:** «Bearbeiten» öffnet das Formular im Bearbeiten-Modus, das Speichern schickt die Änderung für diesen einen Eintrag. Danach schliesst es sich, die Liste lädt neu (der Eintrag erscheint beim neuen Tag oder verschwindet bei einem anderen Monat, die Bestätigung nennt dann das neue Datum).
4. **Löschen:** «Löschen» zeigt die Rückfrage, die Bestätigung entfernt genau diesen Eintrag. Danach lädt die Liste neu, und der Fokus geht zum nächsten sinnvollen Element.
5. **Startseite:** Die Liste «Heute» nutzt dieselben Aktionen; nach Speichern oder Löschen lädt sie neu, und die Karte des Timers bleibt unberührt.
6. **Fehler:** Eintrag nicht mehr vorhanden (auf einem anderen Gerät gelöscht), Ziel archiviert, Netzwerk, abgelaufene Sitzung und Dienstfehler werden in verständliche Meldungen übersetzt; bei jedem Fehler bleiben die Eingaben im Formular erhalten, und der Zustand ist unverändert.

### F) Tech-Entscheidungen (für Nicht-Techniker begründet)
- **Löschrecht nur auf Zeiteinträge, endgültig:** Einfach und ehrlich, und die Auswertungen (PROJ-7 bis PROJ-9) sehen nie halb gelöschte Daten. Kunden und Projekte bleiben unlöschbar (Archiv).
- **Bearbeiten über dasselbe Formular:** Ein Formular, dieselben Prüfregeln und dieselbe Datenbank-Absicherung für Erfassen und Korrigieren. Das Formular bekommt nur einen zusätzlichen Modus.
- **Summen in der Oberfläche statt in der Datenbank:** Bei bis zu ein paar hundert Einträgen pro Monat ist das schnell genug und folgt automatisch jedem Filter. Wird die Liste abgeschnitten, sagt die Seite das ausdrücklich.
- **Monat, Kunde und Filter in der Adresse:** Zurück-Taste, Neuladen und Links führen zur selben Ansicht; kein versteckter Zustand.
- **Filter in der Datenbankabfrage:** Kunde und «ohne Beschreibung» filtert die Datenbank, nicht die Oberfläche, sodass die Obergrenze und die Summen zum Filter passen.
- **Schalter «Bis Mitternacht»:** Statt das Browser-Zeitfeld zu ersetzen (am Handy der gewohnte Wähler) bekommt 24:00 einen eigenen Schalter.
- **Anlegezeitpunkt bleibt beim Ändern:** Die Vorbelegung «zuletzt benutztes Ziel» (PROJ-4) richtet sich nach dem Anlegen, nicht nach dem Korrigieren.
- **Browser lädt, Browser schreibt:** wie bei PROJ-3, PROJ-4 und PROJ-6 (Datenschicht mit Schnittstelle). Der Schutz liegt in der Datenbank.
- **Zuerst Datenbank, dann Oberfläche:** Die Datenbank-Änderung ist klein, und ohne Platzhalter lassen sich gleich echte Daten korrigieren und (Testdaten) löschen.

### G) Abhängigkeiten (Pakete)
Keine neuen. Vorhanden und genutzt: `react-hook-form`, `zod` (Formular), `@supabase/ssr`, `@supabase/supabase-js` (Zugriff), `sonner` (Meldungen), `lucide-react` (Symbole).

### H) Risiken und Hinweise für Bau und QA
- **Änderung der Zugriffsregeln:** Das Löschrecht braucht die ausdrückliche Freigabe des Nutzers (Projektregel), danach Prüfung per SQL und REST: nur eigene Einträge löschbar, fremde und `anon` nicht, Kunden und Projekte weiterhin nicht, Massenlöschen ohne Filter (Anfrage ohne Bedingung) wirkt nur auf eigene Zeilen. Die Oberfläche löscht immer genau einen Eintrag über seine Kennung.
- **Einträge verschieben:** Datum und Projekt ändern sich gleichzeitig; Eintrag verschwindet aus dem Monat. Fokus und Bestätigung testen.
- **Gleichzeitige Änderung und Löschen auf zwei Geräten:** Der Speichern-Versuch auf einen gelöschten Eintrag muss «existiert nicht mehr» melden (nicht still ins Leere laufen).
- **Archivierte Projekte:** Bearbeiten ohne Verschieben muss funktionieren (Trigger lässt es zu), Verschieben auf ein archiviertes Projekt nicht.
- **Zeit-Logik:** Monatsgrenzen nach der Zürcher Uhr (der Monat richtet sich nach dem Eintragsdatum), Wechsel Oktober und Dezember, Sommerzeit-Monate, Schaltjahr (Februar 29).
- **Viele Einträge:** Die Obergrenze (1000) braucht einen Test mit abgeschnittener Liste; das Seeden grosser Mengen läuft per SQL (Schritt vom Nutzer) oder über die Funktionen; in der Oberfläche genügt ein Test mit gemockter Antwort.
- **Testdaten:** Mit PROJ-5 lassen sich Testeinträge in der App löschen; die Tests können damit hinter sich aufräumen (Löschen über die Oberfläche statt SQL-Skript).
- **Änderung am Formular von PROJ-4:** Das Erfassen darf sich nicht verschlechtern; alle PROJ-4-Tests laufen weiter (Regression).
- **Mobile:** Aktionen pro Eintrag, Filterleiste und Monatsleiste bei 320 px, 44-px-Ziele, Rückfrage als Blatt.

## Implementation Notes (Backend)
**Stand:** 2026-11-15. Das Löschrecht ist auf Supabase angewendet, die Datenschicht für Monatsliste, Ändern und Löschen steht und ist gegen die echte Datenbank getestet. Die Oberfläche (`/frontend`) folgt.

### Datenbank
- **Migration** `supabase/migrations/20261115000000_time_entries_delete.sql`, am 2026-11-15 mit Freigabe des Nutzers über Supabase angewendet: Policy `time_entries_delete_own` (nur `authenticated`, nur eigene Zeilen) und Recht `DELETE` auf `time_entries`. Sonst ändert sich nichts.
- **Per Abfrage der Systemkataloge bestätigt:** `authenticated` hat `SELECT`, `INSERT`, `UPDATE`, `DELETE` auf `time_entries`; Policies für alle vier Aktionen; auf **keiner anderen Tabelle** (Kunden, Projekte, Timer) gibt es `DELETE` für `anon` oder `authenticated`; `anon` hat nichts.
- Das Ändern besteht seit PROJ-4 mit allen Regeln (Besitzer fest, Dauer, verrechenbar, Uhrzeiten, Beschreibung, Datum nicht in der Zukunft bei Änderung, Wechsel nur auf aktive Projekte).

### Code
- `src/lib/time-entries/month.ts`: Monats-Hilfen (lesen, aktueller Monat nach Zürcher Uhr, ungültig oder Zukunft wird zum aktuellen Monat, vor- und zurückblättern über Jahresgrenzen, Datumsbereich, Anzeige «November 2026»).
- `repository.ts` / `supabase-repository.ts`: neue Methoden `listMonth(filter)` (Monat nach Datum des Eintrags, Kundenfilter über innere Verknüpfung, «ohne Beschreibung», neueste Tage zuerst, innerhalb eines Tages nach Startzeit, höchstens 1000, «truncated» bei mehr), `updateEntry(id, input)` (alle Felder, Anlegezeitpunkt bleibt), `deleteEntry(id)` (genau eine Zeile über die Kennung). Neue Fehlerart `entry-not-found` («Dieser Eintrag existiert nicht mehr»). Typen `EntryFilter`, `MonthEntries`, `MONTH_ENTRY_LIMIT`.
- `in-memory-repository.ts` (Test-Double) kennt dieselben Methoden und Regeln.
- Keine API-Routen, keine neuen Pakete.

### Tests
- **Vitest:** 310 von 310 grün (neu: `month.test.ts` mit 28 Tests; Monatsliste, Ändern, Löschen in `supabase-repository.test.ts` und `time-entries.test.ts`). `tsc` sauber, Lint ohne Fehler.
- **E2E gegen die echte Datenbank** (`tests/PROJ-5-zeiten-datenbank.spec.ts`, 9 Tests, mit der echten Datenschicht und der Sitzung des Testkontos), alle grün: Monatsliste (nur der Monat, Reihenfolge, Uhrzeit vor ohne, 24:00 bleibt «24:00», Nachbarmonate leer), Kundenfilter, «ohne Beschreibung», beides kombiniert, Ändern aller Felder (Anlegezeitpunkt bleibt, Eintrag wechselt den Monat), Regeln beim Ändern (Zukunft, verrechenbar über Dauer, Dauer 0, Ende vor Start, Beschreibung zu lang oder mit Rand, unbekanntes Projekt, unbekannter Eintrag), archiviertes Projekt (Bearbeiten ohne Verschieben ok, Verschieben abgelehnt), Löschen (genau ein Eintrag, zweites Mal «nicht vorhanden»), Sicherheit (Kunden, Projekte und Timer nicht löschbar, `anon` nicht, eigener Eintrag über die Kennung löschbar). Die Tests räumen ihre Einträge selbst auf (Löschen ist jetzt möglich) und archivieren den Testkunden.
- **Skript für fremde Nutzer** `supabase/tests/PROJ-5-delete-rules.sql` (zweites echtes Konto, `anon`, in einer zurückgerollten Transaktion): Ausführen durch Claude Code wurde von der Berechtigungsprüfung abgelehnt (nicht umgangen), muss vom Nutzer im SQL-Editor ausgeführt werden (siehe «Offen»).

### Offen
- **Skript im SQL-Editor ausführen und Ergebnis prüfen:** `supabase/tests/PROJ-5-delete-rules.sql` (alles markieren, Run; es endet bewusst mit «RESULT …» und rollt alles zurück). Es prüft: zweiter Nutzer sieht, löscht und ändert nichts (auch ein Löschen ohne Bedingung trifft 0 Zeilen), Besitzer unverändert, Verschieben und Datumsregeln beim Ändern, Bearbeiten auf archiviertem Projekt, Löschen genau einer Zeile (zweites Mal 0), Eintrag bis 24:00 löschbar, Kunden, Projekte und Timer nicht löschbar, `anon` ohne Zugriff. Zeilen mit «(bad)» wären Fehler.
- **Regression:** Gesamtlauf aller E2E-Tests (die Datenschicht von PROJ-4 wurde erweitert, nicht verändert).
- ~~**Frontend (`/frontend PROJ-5`)**~~ erledigt, siehe «Implementation Notes (Frontend)».

## Implementation Notes (Frontend)
**Stand:** 2026-11-15. Die Oberfläche steht gegen die echte Datenschicht (keine Platzhalter). Status bleibt **In Progress**, bis `/qa` durch ist.

### Neu
- **Seite `/zeiten`** (`src/app/(app)/zeiten/page.tsx`, `src/components/time-entries/zeiten-view.tsx`): Monatsleiste («Vorheriger Monat», «Nächster Monat» nach dem aktuellen deaktiviert), Filter (Kunde inkl. archivierte mit «(archiviert)», Schalter «Nur ohne Beschreibung», «Filter zurücksetzen»), Monatssumme, Tagesgruppen (neueste zuerst, Tagessumme), Leerzustand, «Keine Einträge für diesen Filter», Lade- und Fehlerzustand, Hinweis bei mehr als 1000 Einträgen (Summen als unvollständig benannt). Monat, Kunde und «ohne Beschreibung» stehen in der Adresse (`?monat=2026-10&kunde=…&ohne-beschreibung=1`, `useSearchParams` hinter `Suspense`); ungültiger oder zukünftiger Monat führt zum aktuellen, ein ungültiger Kunde wird ignoriert. Daten eines anderen Monats oder Filters bleiben nie stehen (Ansichtsschlüssel, «lädt» statt alter Daten). Ein vom Timer gestoppter Eintrag lädt die Liste neu (`entriesVersion`).
- **Navigation:** «Zeiten» (`/zeiten`, Symbol Kalender) zwischen Start und Kunden, Seitenleiste und Tab-Leiste übernehmen es (4 Einträge).
- **Eintragszeile** (`entry-row.tsx`): Aktionen «Bearbeiten» und «Löschen» mit eindeutigen Namen («Eintrag von 13.11., MUS · Allgemein, 1:30 bearbeiten»), Markierung «Keine Beschreibung» mit Symbol und Text.
- **`use-entry-actions.tsx`:** gemeinsame Logik für «Heute» und «Zeiten» (Bearbeiten-Dialog, Lösch-Rückfrage, Meldungen «Änderung gespeichert.», «Gespeichert am 05.10.2026.», «Eintrag gelöscht.», Fehler), Fokus nach dem Entfernen eines Eintrags zum nächsten (sonst vorherigen) Eintrag, sonst zur Überschrift.
- **Lösch-Rückfrage:** `ConfirmArchiveDialog` um `destructive` (roter Knopf) und `onCloseFocus` erweitert; nennt Kunde, Projekt, Datum, Dauer und Beschreibung (gekürzt), warnt vor dem endgültigen Löschen, Fokus auf «Abbrechen», Knopf während der Anfrage deaktiviert. Ein schon gelöschter Eintrag meldet «Dieser Eintrag existiert nicht mehr» und lädt neu.
- **Formular im Bearbeiten-Modus** (`time-entry-form-dialog.tsx`, `form-values.ts`): alle Felder vorbelegt, «Von–bis» bei vorhandenen Uhrzeiten, «Verrechenbar» folgt nicht automatisch, Überschneidungs-Hinweis ignoriert den eigenen Eintrag, archiviertes Projekt oder Kunde als aktueller Wert mit «(archiviert)», Speichern über `updateEntry`, bei «nicht mehr vorhanden» bleiben die Eingaben stehen und die Liste lädt neu. Der Fokus liegt bei einem Eintrag ohne Beschreibung im Feld Beschreibung.
- **Schalter «Bis Mitternacht (24:00)»** (auch beim Erfassen): setzt das Ende auf 24:00, das Feld «Bis» ist dann deaktiviert; Einträge aus dem Timer bis 24:00 bleiben beim Bearbeiten unverändert (`endMidnight` in `validation.ts`, `rangeEnd`). Für heute ist 24:00 wie jede spätere Endzeit nicht erlaubt.
- **Startseite «Heute»:** «Bearbeiten» und «Löschen» je Eintrag, Link «Alle Zeiten» unter der Liste.
- `ResponsiveDialog`: optionales `onCloseFocus` (eigene Fokus-Rückgabe). `src/test/setup.ts`: `ResizeObserver` für Radix Switch in jsdom.

### Tests
- **Vitest:** 332 von 332 grün (neu: `form-values.test.ts`, `zeiten-ui.test.tsx` mit 14 Tests für Monat, Adresse, Filter, Leer-, Fehler- und Abschneide-Zustand, Bearbeiten inkl. 24:00 und «nicht mehr vorhanden», Löschen inkl. Abbrechen, Fehler und «nicht mehr vorhanden»; angepasst: Navigation und «Heute»). `tsc` sauber, Lint ohne Fehler, `next build` erfolgreich.
- **Regression im Browser (Chrome, Produktionsbuild):** PROJ-11 (Navigation und Layout), PROJ-4 (Erfassen, Layout, Barrierefreiheit, Sicherheit), PROJ-3 (Kunden) und die Datenbank-Tests von PROJ-3 und PROJ-5 grün (111 Tests; ein PROJ-11-Test fiel einmal durch einen Absturz beim Browserstart aus und lief bei der Wiederholung grün). Der Gesamtlauf inklusive Timer-Tests steht noch aus (`/qa`).
- **Angepasst:** Der alte PROJ-4-Sicherheitstest erwartete, dass Löschen auf Zeiteinträgen verboten ist; seit PROJ-5 darf der Besitzer genau seinen eigenen Eintrag löschen (der Test prüft das jetzt so).
- **44-px-Ziel:** Der Schalter (shadcn Switch) war nur 24 px hoch und fiel im Layout-Test bei 320 px auf. `src/components/ui/switch.tsx` hat jetzt eine 44 px hohe Trefferfläche (transparenter Rand, der sichtbare Schalter bleibt gleich gross).
- **E2E gegen die neue Oberfläche:** noch nicht geschrieben, folgt mit `/qa` (Layout bei 320 bis 1440 px, Tastatur, Kontrast, Fokus nach dem Löschen).

### Abweichungen und Hinweise
- Keine Abweichung von der Spec. Das Skript `supabase/tests/PROJ-5-delete-rules.sql` (fremder Nutzer, `anon`) ist weiterhin vom Nutzer im SQL-Editor auszuführen (siehe «Offen» oben).

## QA Test Results
**Getestet:** 2026-11-15, Chrome (installierter Chrome, Produktionsbuild), Breiten 320, 375, 768 und 1440 px, Hell- und Dunkelmodus. **Firefox und Safari nicht getestet** (Playwright-Browser lassen sich auf diesem Rechner nicht installieren).
**Ergebnis: 2 Fehler (Medium), keine kritischen oder hohen. Status bleibt «In Review», bis über die Behebung entschieden ist.**

### Zusammenfassung der Akzeptanzkriterien (39)
| Bereich | Kriterien | Ergebnis |
|---|---|---|
| Navigation und Seitenschutz | 3 | 3 bestanden |
| Liste und Monatsnavigation | 7 | 7 bestanden |
| Filter | 4 | 4 bestanden |
| Bearbeiten | 8 | 7 bestanden, **1 teilweise nicht** (Fokus nach dem Schliessen, BUG-2) |
| Löschen | 5 | 4 bestanden, 1 teilweise offen (Rechte für fremde Nutzer: SQL-Skript des Nutzers) |
| Startseite «Heute» | 2 | 2 bestanden |
| «Zeit erfassen» auf «Zeiten» | 1 | 1 bestanden |
| Bedienung, Darstellung, Zugänglichkeit | 4 | 3 bestanden, **1 teilweise nicht** (Fokus-Rückgabe, BUG-2) |
| Datenschutz und Sicherheit | 5 | 3 bestanden, 2 teilweise offen (fremder Nutzer, fremdes Projekt: SQL-Skript des Nutzers) |
| **Gesamt** | **39** | **34 bestanden, 2 mit Fehler (BUG-2), 3 teilweise offen (SQL-Skript)** |

Edge Case «Sehr viele Einträge (über 1000)»: **nicht bestanden** (BUG-1). Alle übrigen Edge Cases der Spec geprüft und bestanden (Doppelklick, auf einem anderen Gerät gelöscht beim Bearbeiten und beim Löschen, Verschieben in einen anderen Monat, archiviertes Projekt und Kunde, Löschen des letzten Eintrags eines Tages, HTML und SQL-Zeichen als Text, abgelaufene Sitzung, Datenbank nicht erreichbar, Wechsel «Nur Dauer» und «Von–bis»). «Zwei Geräte bearbeiten denselben Eintrag» ist bewusst «letzte Speicherung gilt» und nicht eigens getestet.

### Automatische Tests
- **Vitest:** 332 von 332 grün, `tsc` sauber, Lint ohne Fehler (eine alte Warnung in `use-toast.ts`).
- **Neue E2E-Datei** `tests/PROJ-5-zeiten-qa.spec.ts`: 39 Tests, alle grün (davon 2 als bekannte Fehler markiert, siehe BUG-1 und BUG-2: sie erwarten das richtige Verhalten und laufen als erwarteter Fehler, bis die Fehler behoben sind; dann werden sie rot und die Markierung `test.fail` muss entfernt werden). Die Tests legen eigene Kunden «T-ZA/ZB/ZC…» und Einträge an (feste Monate in der Vergangenheit) und räumen selbst auf: Einträge werden gelöscht, die Kunden archiviert.
  - Abgedeckt: Navigation (Seitenleiste, Tab-Leiste bei 320 px), Seitenschutz, Monat und Adresse (ungültig, Zukunft, Zurück-Taste, Neuladen), Gruppierung, Summen, Inhalte, Filter (einzeln, kombiniert, bleibt beim Blättern und Neuladen, zurücksetzen), Leer-, Fehler- und Ladezustand, Bearbeiten (Vorbelegung, Fokus, Prüfregeln am Feld, Überschneidung ohne den eigenen Eintrag, 24:00 bleibt, Verschieben in anderen Monat, archiviertes Projekt und Kunde, gleichzeitig gelöscht, Sitzung abgelaufen, Doppelklick, Tastatur), Löschen (Rückfrage, Fokus auf «Abbrechen», Escape, genau ein Eintrag, einmalig, Fehler, gleichzeitig gelöscht, Fokus beim Nachbarn), «Heute», «Zeit erfassen» und «Bis Mitternacht» auf «Zeiten», Layout bei vier Breiten (kein Überlauf, 44 px, auch Formular und Rückfrage, sehr lange Namen), Zugänglichkeit (axe, WCAG AA, hell und dunkel: Liste, Formular, Formular mit Fehler, Rückfrage, Leerzustand), Sicherheit.
- **Regression (Chrome, Produktionsbuild):** Haupttests 203 grün; ein Test aus PROJ-4 (Archivieren eines Kunden mit sehr langem Namen bei 320 px) fiel unter Last einmal aus und lief allein 20 von 20 grün (Flake, nicht PROJ-5); Timer 38 grün, Abmelden 3 grün. Angepasst wurde der PROJ-4-Sicherheitstest (Löschen ist seit PROJ-5 für den Besitzer erlaubt).
- **Sichtprüfung:** Screenshots bei 375 und 1440 px (Liste, Formular, Rückfrage) geprüft: sauber, nichts läuft über. Mit `PW_SHOTS=1` entstehen die Bilder in `test-results/shots`.

### Sicherheits-Audit (Red Team)
- **Anmeldung:** `/zeiten` ohne Sitzung führt zur Anmeldung, keine Daten sichtbar. Bestanden.
- **Zugriff:** Nur mit dem öffentlichen Schlüssel sind Lesen, Ändern und Löschen verwehrt (401/403). Bestanden. Löschen auf Kunden, Projekten und Timern ist verwehrt (Datenbank-Tests PROJ-5). **Fremder angemeldeter Nutzer: noch offen** (Skript `supabase/tests/PROJ-5-delete-rules.sql`, siehe «Offen»).
- **Eingaben:** HTML, Skripte und SQL-Zeichen in der Beschreibung erscheinen in Liste, Formular und Rückfrage als Text, kein Skript läuft, kein Bild wird geladen. Eine ungültige Kunden-Kennung in der Adresse wird ignoriert (kein Fehler, keine Anfrage mit dem Text). Bestanden.
- **Geheimnisse und Konsole:** keine Schlüssel in der ausgelieferten Seite, keine Konsolenfehler. Bestanden.
- **Löschen:** Die Oberfläche löscht immer genau einen Eintrag über seine Kennung; die Datenbank erlaubt es nur dem Besitzer. Kein Massenlöschen aus der Oberfläche möglich.
- **Rate Limiting:** keine eigenen Schnittstellen, es gelten die Grenzen von Supabase. Nicht gesondert getestet.

### Fehler
**BUG-1 (Medium): Bei mehr als 1000 Einträgen in einem Monat fehlt der Hinweis, die Summen sind still unvollständig.**
- *Schritte:* Mehr als 1000 Einträge in einem Monat anlegen, `/zeiten` für diesen Monat öffnen. (Reproduziert mit 1001 Einträgen: Datenbank enthält 1001, die Abfrage mit `limit(1001)` liefert 1000, `range(0, 1000)` ebenfalls 1000.)
- *Erwartet:* Hinweis «Es werden nicht alle Einträge angezeigt, bitte Filter nutzen», Summen als unvollständig benannt. *Ist:* kein Hinweis, Summen zählen nur 1000.
- *Ursache:* Supabase (PostgREST) begrenzt jede Antwort auf 1000 Zeilen. Die Datenschicht fragt 1001 an, um «mehr als 1000» zu erkennen, bekommt aber nie mehr als 1000 und setzt «truncated» nie. Die Vitest-Tests mit nachgebautem Client sahen das nicht.
- *Auswirkung:* Gering für diese Seite (über 1000 Einträge pro Monat sind für eine Einzelperson unrealistisch), aber **wichtig für PROJ-8 und PROJ-9**: Der CSV-Export «aller Zeiten» wird schnell über 1000 Zeilen haben und muss seitenweise laden (mehrere Abfragen), sonst fehlen Zeilen ohne Fehlermeldung.
- *Lösungsrichtung (für `/backend`):* höchstens 1000 anfragen und die Gesamtzahl über den Zähler der Datenbank (`count: exact`) lesen, oder 999 als Obergrenze anfragen und über 1000 erkennen. Test: `tests/PROJ-5-zeiten-qa.spec.ts` («Edge: mehr als 1000 Einträge»).
- **BEHOBEN (2026-11-14):** `listMonth` in `supabase-repository.ts` fragt jetzt höchstens 1000 Zeilen an und liest die Gesamtzahl über `count: 'exact'`; «truncated» ist gesetzt, wenn die Gesamtzahl grösser ist als die gelieferten Zeilen. Vitest angepasst (Zähler im nachgebauten Client). Der E2E-Test mit 1001 echten Einträgen läuft ohne `test.fail` grün.

**BUG-2 (Medium): Nach dem Schliessen von «Zeit bearbeiten» oder «Eintrag löschen?» ohne Änderung kehrt der Fokus nicht zum auslösenden Knopf zurück.**
- *Schritte:* Mit Tab zu «Bearbeiten» (oder «Löschen») eines Eintrags gehen, mit Enter öffnen, mit Escape oder «Abbrechen» schliessen.
- *Erwartet (Spec):* Fokus liegt wieder auf dem Knopf. *Ist:* Der Fokus fällt auf die Seite zurück, Tastatur- und Screenreader-Nutzer müssen von vorn beginnen.
- *Ursache:* `useRestoreFocus` merkt sich den Auslöser nur beim Wechsel von «zu» auf «offen». Die Dialoge in `use-entry-actions.tsx` werden schon geöffnet eingehängt, der Wechsel findet nie statt. Betrifft nur Bearbeiten und Löschen (das Erfassen-Formular ist immer eingehängt und funktioniert).
- *Lösungsrichtung (für `/frontend`):* Auslöser beim Öffnen selbst merken (`document.activeElement` in `onEdit`/`onDelete`) und beim Schliessen dorthin zurückgeben, oder die Dialoge immer eingehängt lassen. Test: «AC: Fokus kehrt nach Abbrechen, Escape und Speichern … zurück» (derzeit als erwarteter Fehler markiert). Der Fokus nach dem Löschen und nach dem Verschieben (Nachbar, sonst Überschrift) funktioniert.
- **BEHOBEN (2026-11-14):** `use-entry-actions.tsx` merkt sich beim Öffnen (`onEdit`/`onDelete`) das fokussierte Element und gibt den Fokus beim Schliessen ohne Entfernen dorthin zurück (sofern es noch in der Seite ist); Nachbar-Logik nach Löschen/Verschieben unverändert. E2E-Test ohne `test.fail` grün.

### Beobachtungen (kein Fehler)
- **Künstlicher Doppelklick:** Zwei programmatische Klicks im selben Takt (gleiche Millisekunde) senden «Speichern» und «Löschen» zweimal; ein echter Doppelklick nicht (getestet, genau eine Anfrage, der Knopf ist sofort deaktiviert). Mit Maus, Tastatur und Touch nicht erreichbar, keine Massnahme nötig.
- **Rückfrage am Handy:** Der rote Knopf «Löschen» steht über «Abbrechen» (Standardanordnung des Dialogs). Der Fokus liegt auf «Abbrechen», das Löschen braucht einen bewussten Klick; ein Hinweis für die Sichtprüfung, kein Fehler.
- **Browser:** Firefox und Safari ungetestet.

### Offen
- **SQL-Skript ausgeführt (2026-11-16, `supabase/tests/PROJ-5-delete-rules.sql`): bestanden.** Alle Zeilen ok, kein «(bad)»: fremder Nutzer kann gezielt nichts löschen (0 Zeilen) und nichts ändern, Einträge des Besitzers bleiben unverändert (3 von 3), Besitzerwechsel wirkungslos, Zukunftsdatum und verrechenbar > Dauer abgelehnt, Bearbeiten auf archiviertem Projekt ok, Verschieben auf archiviertes Projekt abgelehnt, Löschen genau eine Zeile (zweites Mal 0), 24:00-Eintrag löschbar, Löschen von Projekten, Kunden und Timern sowie anonymer Zugriff verweigert. Hinweis: Die Zeilen «u2 sieht Eintraege=55» und «u2 delete ohne Bedingung rows=55» weichen von der Erwartung 0 ab, weil u2 das echte Konto mit 55 eigenen Einträgen ist (Annahme im Skript falsch, kein Fehler der Datenbank); die Transaktion wurde zurückgerollt, alle 55 Einträge sind unverändert vorhanden.
- **Entscheidung:** Beide Fehler werden vor dem Deploy behoben (beschlossen und umgesetzt am 2026-11-14). Danach: erneuter `/qa`-Lauf bzw. Regression und SQL-Skript.

### Produktionsreife
**BEREIT (JA):** Keine kritischen oder hohen Fehler, BUG-1 und BUG-2 behoben und nachgetestet (Vitest 332, Browser 249 grün), SQL-Skript bestanden. Alle 39 Kriterien erfüllt. Status: Approved.

## Deployment
- **Produktions-URL:** https://time-tracker-light.vercel.app (Seite `/zeiten`, Bearbeiten und Löschen auch auf der Startseite)
- **Deployed:** 2026-11-16, Tag `v1.6.0-PROJ-5` (Commit `62fb198`)
- **Datenbank:** Migration `time_entries_delete` in Supabase angewendet (Löschrecht nur für den Besitzer); SQL-Prüfung bestanden.
- **Prüfung in Produktion:** Alle 39 Browser-Tests von `tests/PROJ-5-zeiten-qa.spec.ts` laufen grün gegen die Live-Seite. Der Test «Heute» wurde dabei unabhängiger gemacht (der Link «Alle Zeiten» erscheint nur, solange heute Einträge existieren; er wird jetzt vor dem Löschen geprüft).
- **Hinweis PROJ-9:** Die Datenbank liefert höchstens 1000 Zeilen pro Antwort; der CSV-Export muss seitenweise laden.
