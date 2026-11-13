# PROJ-6: Timer

## Status: Planned
**Created:** 2026-11-13
**Last Updated:** 2026-11-13

## Dependencies
- Requires: PROJ-1 (Supabase Infrastructure Setup) — Datenbank und Zugriffsregeln
- Requires: PROJ-2 (Anmeldung) — Seiten geschützt, Daten gehören dem angemeldeten Nutzer
- Requires: PROJ-3 (Kunden- und Projektverwaltung) — Projekte als Ziel des Timers, Kundenseite mit Projektliste
- Requires: PROJ-4 (Manuelle Zeiterfassung) — Zeiteinträge (Tabelle, Regeln, Anzeige «Heute»); der Timer erzeugt Einträge im selben Modell
- Requires: PROJ-11 (Design-System-Basis) — Layout, Navigation, Theme
- Wird gebraucht von: PROJ-5 (Korrigieren und Löschen von Timer-Einträgen), PROJ-7, PROJ-8, PROJ-9

## User Stories
- Als Einzelnutzer möchte ich bei einem Projekt mit einem Knopf einen Timer starten, damit meine Arbeitszeit gemessen wird, ohne dass ich Uhrzeiten notieren muss.
- Als Einzelnutzer möchte ich den Timer mit einem Knopf stoppen und damit sofort einen Zeiteintrag erhalten, damit ich nichts nachtragen muss.
- Als Einzelnutzer möchte ich, dass immer nur ein Timer läuft und ein Start bei einem anderen Projekt den laufenden Timer speichert, damit ich mit einem Klick zwischen Projekten wechseln kann.
- Als Einzelnutzer möchte ich während des Laufs eine Beschreibung eintippen, damit der Tätigkeitstext schon beim Stoppen im Eintrag steht.
- Als Einzelnutzer möchte ich den laufenden Timer auf jedem Gerät und auf jeder Seite sehen, damit ich ihn nicht vergesse und vom Handy stoppen kann, was ich am Laptop gestartet habe.
- Als Einzelnutzer möchte ich einen versehentlich gestarteten Timer verwerfen, damit kein falscher Eintrag entsteht.
- Als Einzelnutzer möchte ich den Timer auf dem Handy bequem bedienen, damit ich unterwegs Zeiten messe.

## Out of Scope
- **Pause und Weiter:** nicht im MVP (mehr Zustände, ein Eintrag bräuchte mehrere von–bis-Teile).
- **Startzeit des laufenden Timers ändern:** nicht im MVP. Fehler lassen sich nach dem Stoppen in PROJ-5 korrigieren.
- **Mehrere gleichzeitige Timer:** nicht erlaubt, immer nur einer.
- **Verrechenbare Dauer ändern beim Stoppen:** Der Eintrag bekommt «verrechenbar = gearbeitet»; Korrekturen in PROJ-5.
- **15-Minuten-Rundung für die Abrechnung:** gehört in die Monatsauswertung (PROJ-8), nicht in den Timer und nicht in die Einträge. Der Timer speichert minutengenau.
- **Bearbeiten und Löschen von Timer-Einträgen:** PROJ-5.
- **Automatisches Stoppen des Timers zu einer bestimmten Zeit (z. B. um Mitternacht):** nicht im MVP, dafür gibt es die Aufteilung beim Stoppen und die Warnung bei langem Lauf.
- **Benachrichtigungen, Erinnerungen (Push, E-Mail):** nicht im MVP.
- **Timer pro Kunde ohne Projekt:** Jeder Eintrag gehört zu einem Projekt (Spec PROJ-3).
- **Tastenkürzel, Menüleisten-Widgets, Browser-Erweiterung:** nicht im MVP.

## Acceptance Criteria

**Format:** Angenommen [Vorbedingung] / Wenn [Aktion] / Dann [Ergebnis]

### Start-Knöpfe
- [ ] Angenommen der Nutzer ist angemeldet und es gibt aktive Projekte, wenn er die Startseite öffnet, dann sieht er unter dem Abschnitt «Timer» eine Liste «Projekt starten» mit allen aktiven Projekten, gruppiert nach Kunde (Kürzel und Name, alphabetisch nach Kürzel, «Allgemein» zuerst), jedes mit einem Knopf «Start».
- [ ] Angenommen der Nutzer öffnet die Kundenseite eines aktiven Kunden, wenn die Seite lädt, dann hat jedes aktive Projekt einen Knopf «Start» neben «Bearbeiten» und «Archivieren»; archivierte Projekte und archivierte Kunden haben keinen Start-Knopf.
- [ ] Angenommen es gibt noch keinen aktiven Kunden oder kein aktives Projekt, wenn der Nutzer die Startseite öffnet, dann sieht er statt der Liste einen Hinweis «Lege zuerst einen Kunden an» mit Link zu `/kunden`.
- [ ] Angenommen kein Timer läuft, wenn der Nutzer bei einem Projekt auf «Start» klickt, dann läuft der Timer sofort (ohne Rückfrage und ohne Formular), der Knopf zeigt einen Ladezustand bis die Anfrage bestätigt ist, und eine kurze Bestätigung erscheint.
- [ ] Angenommen der Nutzer klickt zweimal schnell auf «Start», wenn die Anfrage läuft, dann entsteht nur ein Timer (kein doppeltes Absenden).

### Laufender Timer
- [ ] Angenommen ein Timer läuft, wenn der Nutzer die Startseite öffnet, dann steht oben die Karte «Timer läuft» mit Kürzel, Kundenname und Projektname, der Startzeit (Uhrzeit), der laufenden Zeit im Format h:mm:ss (aktualisiert jede Sekunde), dem Textfeld «Beschreibung (optional)» und den Knöpfen «Stopp» und «Verwerfen».
- [ ] Angenommen ein Timer läuft, wenn der Nutzer eine andere Seite der App öffnet, dann sieht er eine schmale Leiste mit Kürzel, Projekt, laufender Zeit und «Stopp» (am Handy über der Tab-Leiste, am Laptop oben im Inhaltsbereich), die zur Startseite führt.
- [ ] Angenommen ein Timer läuft, wenn der Nutzer die App im Browser-Tab geöffnet hat, dann zeigt der Tab-Titel die laufende Zeit und das Kürzel (z. B. «0:47 · MUS · Time Tracker Light»).
- [ ] Angenommen ein Timer läuft, wenn die Seite im Hintergrund war oder das Gerät geschlafen hat, dann zeigt die Zeit nach dem Zurückkehren den korrekten Stand (berechnet aus der Startzeit, nicht aus einem mitlaufenden Zähler).
- [ ] Angenommen ein Timer läuft, wenn der Nutzer den Browser schliesst und die App später oder auf einem anderen Gerät öffnet, dann läuft der Timer weiter und zeigt die korrekte Zeit seit dem Start.
- [ ] Angenommen ein Timer läuft, wenn die Startseite die Liste «Projekt starten» zeigt, dann ist das laufende Projekt als «läuft» markiert (kein Start-Knopf für dasselbe Projekt).
- [ ] Angenommen ein Timer läuft schon 10 Stunden oder länger, wenn der Nutzer die App öffnet, dann erscheint in Karte und Leiste der Hinweis «Läuft schon sehr lange. Vergessen zu stoppen?».
- [ ] Angenommen der Nutzer tippt die Beschreibung ins Textfeld, wenn er pausiert (kurze Zeit ohne Eingabe) oder das Feld verlässt, dann ist der Text gespeichert und auf jedem Gerät sichtbar; er geht nicht verloren, wenn die Seite neu geladen wird.

### Stoppen
- [ ] Angenommen ein Timer läuft seit mindestens einer vollen Minute, wenn der Nutzer auf «Stopp» klickt, dann entsteht sofort ein Zeiteintrag für das Projekt mit Datum, Start- und Endzeit (auf die volle Minute abgeschnitten), der Dauer (Endzeit minus Startzeit), «verrechenbar» gleich der Dauer und der Beschreibung (falls eingegeben), der Timer ist beendet, und eine Bestätigung nennt Projekt und Dauer.
- [ ] Angenommen der Eintrag wurde gespeichert, wenn der Nutzer die Startseite ansieht, dann erscheint er im Abschnitt «Heute» (PROJ-4) mit den Uhrzeiten, und die Tagessumme aktualisiert sich ohne Neuladen.
- [ ] Angenommen ein Timer wird in derselben Minute gestoppt, in der er gestartet wurde (Start und Ende gleich nach dem Abschneiden), wenn der Nutzer auf «Stopp» klickt, dann entsteht kein Eintrag, der Timer ist beendet, und eine Meldung sagt «Unter einer Minute, nicht gespeichert».
- [ ] Angenommen der Timer lief über Mitternacht (Zürcher Uhr), wenn der Nutzer stoppt, dann entsteht pro Kalendertag ein Eintrag (z. B. 23:30–24:00 und 00:00–00:40), jeder mit Dauer und «verrechenbar» gleich der Dauer; die Beschreibung steht im ersten Eintrag und in jedem weiteren (gleicher Text).
- [ ] Angenommen der Timer lief über mehrere Tage, wenn der Nutzer stoppt, dann entsteht für jeden Tag ein Eintrag (ein ganzer Zwischentag als 00:00–24:00 mit Dauer 24:00).
- [ ] Angenommen der Nutzer klickt auf «Stopp», wenn die Anfrage läuft, dann ist der Knopf deaktiviert und zeigt «Wird gespeichert …»; bei einem Fehler (Netzwerk, Dienst) erscheint eine Meldung, der Timer läuft weiter, und die Beschreibung bleibt erhalten.
- [ ] Angenommen der Timer wird auf zwei Geräten fast gleichzeitig gestoppt, wenn beide Anfragen ankommen, dann entsteht nur ein Eintrag (bzw. ein Eintrag pro Tag), und das zweite Gerät zeigt, dass der Timer schon beendet ist.

### Wechseln und Verwerfen
- [ ] Angenommen ein Timer läuft bei Projekt A, wenn der Nutzer bei Projekt B auf «Start» klickt, dann wird der Timer von A wie beim Stopp gespeichert, der Timer für B startet im selben Schritt, und eine Meldung nennt beides («MUS · Allgemein: 0:47 gespeichert. Timer für ABC · Relaunch gestartet.»); es läuft nie mehr als ein Timer.
- [ ] Angenommen ein Timer läuft bei Projekt A seit weniger als einer Minute, wenn der Nutzer bei B auf «Start» klickt, dann wird der Timer von A ohne Eintrag beendet («Unter einer Minute, nicht gespeichert»), und der Timer für B startet.
- [ ] Angenommen ein Timer läuft, wenn der Nutzer auf «Verwerfen» klickt, dann erscheint eine Rückfrage «Timer verwerfen? Die gemessene Zeit (h:mm) wird nicht gespeichert.»; nach Bestätigung ist der Timer beendet, und es entsteht kein Eintrag; ohne Bestätigung läuft er weiter.
- [ ] Angenommen der Wechsel oder das Verwerfen schlägt fehl (Netzwerk, Dienst), wenn die Meldung erscheint, dann bleibt der Zustand unverändert (der alte Timer läuft weiter, es entsteht kein halber Zustand).

### Archivieren während der Timer läuft
- [ ] Angenommen ein Timer läuft bei einem Projekt, wenn das Projekt oder der Kunde archiviert wird, dann läuft der Timer weiter (Spec PROJ-3), und beim Stoppen wird der Eintrag normal gespeichert, auch wenn das Projekt inzwischen archiviert ist.
- [ ] Angenommen ein Projekt oder Kunde ist archiviert, wenn der Nutzer die Start-Knöpfe sieht, dann gibt es keinen Start-Knopf für archivierte Einträge; ein Timer lässt sich nur bei aktiven Projekten starten (auch nicht direkt an der Datenbank vorbei).

### Fehler und Sonderfälle
- [ ] Angenommen die Daten laden, wenn die Antwort noch aussteht, dann sieht der Nutzer einen Ladezustand; schlägt das Laden fehl, dann erscheint eine Fehlermeldung mit «Erneut versuchen».
- [ ] Angenommen die Sitzung ist abgelaufen, wenn der Nutzer startet, stoppt oder verwirft, dann erscheint ein Hinweis, der Nutzer wird zur Anmeldung geleitet, und der Timer läuft serverseitig weiter (nichts geht verloren).
- [ ] Angenommen ein Timer läuft auf einem Gerät, wenn der Nutzer auf einem anderen Gerät die Seite öffnet, dann zeigt auch dieses Gerät den laufenden Timer; ein Start dort wechselt den Timer wie oben beschrieben.

### Bedienung, Darstellung, Zugänglichkeit
- [ ] Angenommen der Timer, wenn die Startseite und die Leiste bei 320, 375, 768 und 1440 px Breite angesehen werden, dann läuft nichts über, es gibt kein horizontales Scrollen, und alle bedienbaren Elemente sind mindestens 44 px hoch.
- [ ] Angenommen ein sehr langer Kunden- oder Projektname ohne Leerzeichen, wenn er in Karte, Leiste und Liste angezeigt wird, dann bricht er um oder wird sauber gekürzt, nichts läuft über.
- [ ] Angenommen die Seiten, wenn sie mit Tastatur und Screenreader genutzt werden, dann sind Knöpfe per Tastatur erreichbar, die Rückfrage ist fokusgefangen und per Escape schliessbar, der Fokus kehrt danach zum auslösenden Knopf zurück, Zustandswechsel («Timer gestartet», «gespeichert», Fehler) werden angesagt, und die laufende Zeit wird nicht jede Sekunde vorgelesen (nur Start und Stopp).
- [ ] Angenommen Hell- und Dunkelmodus, wenn die Seiten angesehen werden, dann erfüllen alle Farbpaare WCAG AA, und der laufende Zustand ist nicht nur an der Farbe erkennbar (Symbol und Text).
- [ ] Angenommen ein Nutzer mit reduzierter Bewegung, wenn der Timer läuft, dann gibt es keine blinkenden oder pulsierenden Animationen.

### Datenschutz und Sicherheit
- [ ] Angenommen ein Timer gehört einem Nutzer, wenn ein anderer angemeldeter Nutzer (oder ein Aufruf nur mit dem öffentlichen Schlüssel) ihn lesen, starten, ändern oder stoppen will, dann ist das auf Datenbankebene verwehrt (nur eigene Daten).
- [ ] Angenommen es läuft schon ein Timer, wenn direkt an der Datenbank ein zweiter angelegt werden soll (Umgehen der Oberfläche), dann lehnt die Datenbank ihn ab (ein Timer pro Nutzer).
- [ ] Angenommen ein Timer soll direkt an der Datenbank bei einem archivierten Projekt, einem fremden oder einem unbekannten Projekt gestartet werden, dann lehnt die Datenbank ihn ab; eine Startzeit in der Zukunft oder ein Beschreibungstext über 1000 Zeichen werden ebenfalls abgelehnt.
- [ ] Angenommen manipulierte Eingaben (HTML, Skripte, SQL-Zeichen) in der Beschreibung, wenn sie gespeichert und angezeigt werden, dann werden sie als reiner Text behandelt.
- [ ] Angenommen ein laufender Timer, wenn er gestoppt wird, dann gelten für die entstehenden Einträge dieselben Regeln wie bei PROJ-4 (Besitzer, Dauer, Datum nicht in der Zukunft, Beschreibung höchstens 1000 Zeichen); es gibt weiterhin kein Löschen von Einträgen (Verwerfen löscht nur den Timer, nie einen Zeiteintrag).

## Edge Cases
- **Doppelklick auf «Start» oder «Stopp»:** Es entsteht nur ein Timer bzw. ein Eintrag (pro Tag).
- **Start auf zwei Geräten fast gleichzeitig (gleiches oder verschiedene Projekte):** Es läuft am Ende genau ein Timer; der zweite Start wechselt bzw. ersetzt wie beschrieben, kein zweiter läuft parallel.
- **Stopp auf einem Gerät, während ein anderes Gerät noch den Timer anzeigt:** Das zweite Gerät merkt es beim nächsten Laden oder Wechsel des Tabs und zeigt «Timer wurde beendet».
- **Gerät mit falscher Uhr:** Die Zeit wird aus der Serveruhr abgeleitet (Start- und Endzeit stammen vom Server), nicht von der Geräteuhr.
- **Timer läuft über Sommer-/Winterzeit-Umstellung:** Die Einträge folgen der Uhr in Zürich; die Dauer ergibt sich aus der Differenz der Uhrzeiten auf der Uhr (wie PROJ-4, keine Sonderbehandlung im MVP).
- **Beschreibung länger als 1000 Zeichen im Timer-Feld:** Hinweis am Feld, das Feld lässt sich nicht über die Grenze hinaus speichern; Stopp ist nur mit gültiger Beschreibung möglich.
- **Stopp, wenn das Projekt inzwischen archiviert wurde:** Der Eintrag wird gespeichert (siehe Acceptance Criteria).
- **Stopp, wenn das Projekt inzwischen nicht mehr existiert oder dem Nutzer nicht gehört:** nicht möglich (kein Löschen, nur eigene Projekte); bei einem unerwarteten Fehler bleibt der Timer erhalten, und eine Meldung erscheint.
- **Abgelaufene Sitzung während der Timer läuft:** Der Timer läuft serverseitig weiter; nach der Anmeldung ist er wieder sichtbar.
- **Supabase nicht erreichbar:** Die Leiste zeigt weiter die zuletzt bekannte Zeit mit Hinweis «Keine Verbindung»; Start, Stopp und Verwerfen sind erst bei Verbindung wieder möglich, nichts geht verloren.
- **Sehr langer Timer (z. B. 3 Tage vergessen):** Beim Stopp entstehen pro Tag Einträge (mehrere); Korrektur oder Löschen in PROJ-5. Die Warnung ab 10 Stunden weist früh darauf hin.
- **Beschreibung nur Leerzeichen:** wird als «keine Beschreibung» behandelt (wie PROJ-4).

## Technical Requirements (optional)
- **Sicherheit:** Authentifizierung erforderlich (PROJ-2). Der Timer gehört dem Nutzer, Zugriff nur auf den eigenen Timer, abgesichert in der Datenbank selbst. Regeln (ein Timer pro Nutzer, aktives Projekt beim Start, Startzeit nicht in der Zukunft, Beschreibungslänge) gelten in der Datenbank.
- **Datenintegrität:** Der Timer-Zustand liegt serverseitig (nicht nur im Browser). Wechsel, Stopp und Aufteilung auf Tage sind je ein unteilbarer Schritt: entweder alles oder nichts (kein halb gespeicherter Eintrag, kein zweiter Timer).
- **Zeitquelle:** Start- und Endzeit stammen von der Serveruhr; angezeigt wird nach der Uhr in Zürich.
- **Performance:** Start, Stopp und Wechsel fühlen sich sofort an (unter 1 Sekunde bei normaler Verbindung); der Zustand wird beim Öffnen und beim Zurückkehren in den Tab geladen.
- **Browser:** Chrome, Firefox, Safari, Handy und Desktop (responsive, mobile-first, 44 px Ziele).
- **Design:** `docs/design-system.md`, WCAG AA, shadcn/ui vor eigenen Komponenten.

## Open Questions
- [ ] **Endzeit «24:00» bei der Aufteilung über Mitternacht:** PROJ-4 kennt Uhrzeiten nur von 00:00 bis 23:59. Ein Eintrag bis Mitternacht endet fachlich um 24:00. Ob 24:00 als Anzeige und Wert zulässig wird oder ob der Eintrag um 23:59 endet (eine Minute weniger), klärt `/architecture` zusammen mit der Anpassung der PROJ-4-Regeln.
- [ ] **Anpassung der PROJ-4-Regeln:** Ein Timer-Eintrag auf ein inzwischen archiviertes Projekt muss erlaubt sein (Spec PROJ-3: Timer läuft nach dem Archivieren weiter). Die Datenbankregel «nur aktive Ziele beim Anlegen» aus PROJ-4 braucht dafür eine Ausnahme für den Stopp eines Timers. Klärung in `/architecture`.
- [ ] **Zeit im Tab-Titel:** Aktualisierung jede Sekunde oder jede Minute (Akku, Ablenkung)? Entscheidung beim Bau der Oberfläche.
- [ ] **Speichern der Beschreibung im laufenden Timer:** Nach wie vielen Sekunden Pause in der Eingabe gespeichert wird, klärt `/architecture`.

## Decision Log

### Product Decisions
| Decision | Rationale | Date |
|----------|-----------|------|
| Ein Start/Stopp-Knopf pro Projekt, ohne vorherige Auswahl; Knöpfe auf der Startseite (Liste «Projekt starten», nach Kunde gruppiert) und auf der Kundenseite | Roadmap-Vorgabe («ein Knopf pro Kunde/Projekt»); Start in einem Klick, ohne Navigation | 2026-11-13 |
| Es läuft immer nur ein Timer; ein Start bei einem anderen Projekt stoppt und speichert den laufenden Timer im selben Schritt, ohne Rückfrage | Ein Klick pro Wechsel (10-Sekunden-Ziel); der gewechselte Timer geht nicht verloren | 2026-11-13 |
| Stopp speichert sofort; die Beschreibung wird schon während des Laufs im Timer eingetippt; «verrechenbar» ist gleich der gearbeiteten Dauer | Schnellster Ablauf; Korrekturen (weniger verrechenbar, Text ändern) sind in PROJ-5 möglich | 2026-11-13 |
| Start und Ende werden auf die volle Minute abgeschnitten; ein Timer unter einer Minute erzeugt keinen Eintrag | Passt zu den minutengenauen Einträgen aus PROJ-4 (mindestens 1 Minute); keine Phantomeinträge durch Fehlstarts | 2026-11-13 |
| 15-Minuten-Abrechnung gehört in die Monatsauswertung (PROJ-8: verrechenbare Summe pro Kunde und Projekt auf 15 Minuten aufrunden), nicht in Einträge oder Timer | Der Nutzer rechnet immer in 15 Minuten ab; Rundung auf der Summe ist fairer als pro Eintrag, und Einträge bleiben minutengenau (PROJ-4: verrechenbar höchstens gleich gearbeitet) | 2026-11-13 |
| Läuft ein Timer über Mitternacht, entsteht beim Stopp pro Kalendertag (Zürcher Uhr) ein Eintrag; ab 10 Stunden Laufzeit erscheint eine Warnung | PROJ-4 kennt keine Einträge über Mitternacht; kein Serverdienst um Mitternacht nötig; vergessene Zeit lässt sich in PROJ-5 korrigieren | 2026-11-13 |
| Der Timer-Zustand liegt serverseitig und gilt geräteübergreifend; Karte auf der Startseite, Leiste auf jeder anderen Seite, Zeit im Tab-Titel | PRD: geräteübergreifend nutzen; der Timer soll nicht vergessen werden | 2026-11-13 |
| Zusatzfunktionen im MVP: «Verwerfen» mit Rückfrage. Nicht im MVP: Startzeit ändern, Pause | Versehentliche Starts brauchen einen Ausweg; alles Weitere lässt sich nach dem Stopp in PROJ-5 korrigieren und hält den Timer einfach | 2026-11-13 |
| Der laufende Timer wird durch Archivieren von Projekt oder Kunde nicht gestoppt, und der Stopp speichert den Eintrag auch bei inzwischen archiviertem Projekt | Spec PROJ-3 (Timer-Edge-Case): keine verlorene Zeit | 2026-11-13 |
| Start und Ende stammen von der Serveruhr, angezeigt nach der Zürcher Uhr | Falsche Geräteuhr oder Zeitzone soll den Eintrag nicht verfälschen (wie PROJ-4: «heute» nach Zürcher Uhr) | 2026-11-13 |

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
