# PROJ-6: Timer

## Status: Approved
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
- [ ] Angenommen der Nutzer ist angemeldet und es gibt aktive Projekte, wenn er die Startseite öffnet, dann sieht er unter dem Abschnitt «Timer» eine Liste «Projekt starten» mit allen aktiven Projekten, gruppiert nach Kunde (Kürzel und Name, alphabetisch nach Kürzel, «Allgemein» zuerst), jedes mit einem Knopf «Start». Die Liste lässt sich über ihre Überschrift «Projekt starten (n)» ein- und ausklappen (per Maus und Tastatur), und die Wahl bleibt in diesem Browser erhalten; Standard ist aufgeklappt. _(Ergänzt nach QA, Beobachtung 2.)_
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
- [x] **Endzeit «24:00» bei der Aufteilung über Mitternacht (entschieden in `/architecture`: 24:00 ist in der Datenbank als Ende eines Tages zulässig, die Formular-Eingabe bleibt bis 23:59):** PROJ-4 kennt Uhrzeiten nur von 00:00 bis 23:59. Ein Eintrag bis Mitternacht endet fachlich um 24:00. Ob 24:00 als Anzeige und Wert zulässig wird oder ob der Eintrag um 23:59 endet (eine Minute weniger), klärt `/architecture` zusammen mit der Anpassung der PROJ-4-Regeln.
- [x] **Anpassung der PROJ-4-Regeln (entschieden in `/architecture`: Ausnahme nur innerhalb der Stopp-Funktion):** Ein Timer-Eintrag auf ein inzwischen archiviertes Projekt muss erlaubt sein (Spec PROJ-3: Timer läuft nach dem Archivieren weiter). Die Datenbankregel «nur aktive Ziele beim Anlegen» aus PROJ-4 braucht dafür eine Ausnahme für den Stopp eines Timers. Klärung in `/architecture`.
- [x] **Zeit im Tab-Titel (entschieden in `/architecture`: jede Minute):** Aktualisierung jede Sekunde oder jede Minute (Akku, Ablenkung)? Entscheidung beim Bau der Oberfläche.
- [x] **Speichern der Beschreibung im laufenden Timer (entschieden in `/architecture`: nach etwa 1,5 Sekunden Pause und beim Verlassen des Feldes, beim Stopp mitgeschickt):** Nach wie vielen Sekunden Pause in der Eingabe gespeichert wird, klärt `/architecture`.

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
| Der laufende Timer liegt als eigene Tabelle in Supabase (höchstens eine Zeile pro Nutzer), nicht im Browser | Geräteübergreifend, überlebt das Schliessen des Browsers; die Eindeutigkeit in der Tabelle verhindert zwei Timer auch an der Oberfläche vorbei | 2026-11-13 |
| Start/Wechsel, Stopp und Verwerfen als je ein unteilbarer Schritt (Funktion) in der Datenbank | Keine halben Zustände bei Verbindungsabbruch (zwei Timer, gespeichert aber weiterlaufend); gleichzeitiger Stopp auf zwei Geräten ergibt nur einen Eintrag | 2026-11-13 |
| Der Browser darf Timer-Zeilen weder anlegen noch löschen und nur die Beschreibung ändern; die Funktionen setzen Startzeit und Projekt | Verhindert falsche Startzeiten und fremde Projekte; die Funktionen prüfen innen den Besitzer und sind für anon gesperrt | 2026-11-13 |
| Start- und Endzeit von der Serveruhr, angezeigt und aufgeteilt nach der Uhr in Zürich | Geräteuhr oder Zeitzone dürfen Einträge nicht verfälschen (wie PROJ-4) | 2026-11-13 |
| Aufteilung nach Kalendertagen erst beim Stopp, kein Hintergrunddienst um Mitternacht | Kein Serverdienst auf dem kostenlosen Plan nötig; Warnung ab 10 Stunden Laufzeit statt automatischem Stopp | 2026-11-13 |
| Endzeit 24:00 in der Datenbank zulässig (Ende eines Tages), Formular-Eingabe bleibt bis 23:59 | Ein Eintrag bis Mitternacht verliert sonst jede Nacht eine Minute; löst die offene Frage der Spec | 2026-11-13 |
| Ausnahme von der Regel «nur aktive Ziele» nur innerhalb der Stopp-Funktion für Timer auf inzwischen archivierte Projekte | Spec PROJ-3: Archivieren stoppt den Timer nicht; die Zeit darf nicht verloren gehen; von aussen nicht auslösbar | 2026-11-13 |
| Einträge aus dem Timer bekommen kein eigenes Merkmal «vom Timer»; verrechenbar = Dauer, Beschreibung des Timers in jedem Tageseintrag | Ein einziges Eintragsmodell; Korrekturen in PROJ-5 gelten für alle Einträge gleich | 2026-11-13 |
| Beschreibung im laufenden Timer wird nach etwa 1,5 Sekunden Eingabepause und beim Verlassen des Feldes gespeichert und mit der Stopp-Anfrage mitgeschickt | Text ist auf jedem Gerät sichtbar und geht nicht verloren; der Stopp hat immer den letzten Stand | 2026-11-13 |
| Laufende Zeit wird aus Startzeit und Serverzeit (beim Laden mitgeliefert) berechnet; Zustand wird beim Zurückkehren in den Tab neu geladen | Stimmt nach Schlaf, Tab-Wechsel und bei falscher Geräteuhr | 2026-11-13 |
| Tab-Titel aktualisiert jede Minute, die Karte zeigt Sekunden | Weniger Ablenkung und Akku; löst die offene Frage der Spec | 2026-11-13 |
| Kein Live-Abgleich (Realtime) im MVP: Neuladen beim Zurückkehren in den Tab und bei jeder Aktion | Genügt für einen Einzelnutzer; spart Komplexität und Verbindungen auf dem kostenlosen Plan | 2026-11-13 |
| Bau-Reihenfolge: zuerst Datenbank (/backend), dann Oberfläche (/frontend), keine Platzhalter-Phase | Ein Platzhalter-Timer würde echte, nicht löschbare Einträge erzeugen oder wirkungslos sein; die echten Funktionen sind der Kern des Features | 2026-11-13 |
| Direkt über Supabase ohne eigene API-Routen, Browser lädt | Wie PROJ-3 und PROJ-4: die Datenbank schützt die Daten | 2026-11-13 |

---
<!-- Sections below are added by subsequent skills -->

## Tech Design (Solution Architect)

### Backend nötig?
Ja, und zwar zuerst. Der laufende Timer muss **auf dem Server** liegen, damit er das Schliessen des Browsers überlebt und auf jedem Gerät sichtbar ist. Dazu kommt **eine neue Tabelle «Laufender Timer»** (höchstens eine Zeile pro Nutzer) und **drei unteilbare Funktionen in der Datenbank** (Start/Wechsel, Stopp, Verwerfen). Eigene Schnittstellen (API-Routen) sind nicht nötig: Die Seiten sprechen direkt mit Supabase, und die Datenbank sichert alles ab (wie bei PROJ-3 und PROJ-4).

**Bau-Reihenfolge (mit dem Nutzer vereinbart):** zuerst `/backend` (Tabelle, Funktionen, Prüfung per SQL), dann `/frontend` direkt gegen die echten Funktionen. Es gibt keine Platzhalter-Phase im Browser: Der Stopp legt echte Zeiteinträge an, und die lassen sich vor PROJ-5 nicht löschen.

### A) Seitenstruktur
```
App-Bereich (geschützt, mit Navigation)
+-- Rahmen (für alle Seiten): Timer-Anbindung (lädt und hält den Zustand des laufenden Timers)
|   +-- Timer-Leiste (schmal; nur wenn ein Timer läuft und nicht auf der Startseite)
|       Kürzel · Projekt · laufende Zeit · «Stopp»; Tipp führt zur Startseite
|       Am Handy über der Tab-Leiste, am Laptop oben im Inhaltsbereich
+-- Startseite «/»
|   +-- Karte «Timer läuft» (nur wenn ein Timer läuft)
|   |   Kürzel, Kunde, Projekt, Startzeit, laufende Zeit h:mm:ss, Hinweis «Läuft schon sehr lange»
|   |   Textfeld «Beschreibung (optional)», Knöpfe «Stopp» und «Verwerfen»
|   +-- Liste «Projekt starten» (alle aktiven Projekte, nach Kunde gruppiert)
|   |   Zeile: Projektname, Knopf «Start» (beim laufenden Projekt: Markierung «läuft»)
|   |   Hinweis «Lege zuerst einen Kunden an», wenn es keine aktiven Projekte gibt
|   +-- Zeit erfassen und Abschnitt «Heute» (PROJ-4, unverändert, lädt nach einem Stopp neu)
+-- Kundenseite «/kunden/[Kunde]»
|   +-- Projektzeile: neu der Knopf «Start» neben «Bearbeiten» und «Archivieren» (nur aktive Projekte)
+-- Rückfrage «Timer verwerfen?» (Dialog, nennt die gemessene Zeit)
```

### B) Bausteine
- **Vorhandene shadcn-Bausteine:** Card, Button, Alert, Alert Dialog (Rückfrage), Textarea, Badge, Skeleton, Sonner (Meldungen), Separator. Nichts Neues zu installieren.
- **Neue eigene Zusammensetzungen:** Timer-Anbindung (Zustand und Aktionen für alle Seiten), Timer-Karte, Timer-Leiste, Projektliste «Projekt starten», Start-Knopf (wiederverwendet auf Startseite und Kundenseite), Rückfrage «Verwerfen».
- **Wiederverwendet:** Auswahl der aktiven Kunden und Projekte aus PROJ-4 (dieselbe Abfrage), Lade- und Fehlerzustände, Rückfrage-Dialog mit Fokusrückgabe aus PROJ-3, Formatierung von Dauer und Uhrzeiten aus PROJ-4.
- **Anzeige der Zeit:** Die Oberfläche berechnet die laufende Zeit aus der Startzeit und der **Serveruhr** (beim Laden wird die aktuelle Serverzeit mitgeliefert, die Anzeige rechnet damit). Falsche Geräteuhren verfälschen sie nicht. Beim Zurückkehren in den Tab oder nach dem Aufwachen des Geräts lädt die Anbindung den Zustand neu, die Zeit stimmt sofort wieder.
- **Tab-Titel:** zeigt Zeit und Kürzel, aktualisiert **jede Minute** (nicht jede Sekunde: weniger Ablenkung und Akku). Die Karte zeigt Sekunden.
- **Vorlesen:** Start, Stopp, Wechsel und Fehler werden angesagt, die laufende Zeit nicht sekündlich (kein Dauergeplapper für Screenreader).

### C) Datenmodell (in Alltagssprache)
```
Der laufende Timer hat:
- Eindeutige ID
- Besitzer (der angemeldete Nutzer, automatisch gesetzt, unveränderlich), höchstens ein Timer pro Besitzer
- Projekt (ein aktives Projekt des Besitzers)
- Startzeit (von der Serveruhr gesetzt, mit Sekunden)
- Beschreibung (optional, höchstens 1000 Zeichen, ohne Leerzeichen am Rand)
- Angelegt am, zuletzt geändert am

Gespeichert in: Supabase (PostgreSQL), geräteübergreifend.
```
Die **Zeiteinträge** (PROJ-4) bleiben unverändert in ihrer Tabelle. Ein Timer ist nur der «noch offene» Eintrag: Beim Stopp entstehen aus ihm ein oder mehrere normale Zeiteinträge, und der Timer verschwindet. Es gibt kein zusätzliches Merkmal an den Einträgen («vom Timer erzeugt»); an der Uhrzeit-Angabe sieht man, dass sie von–bis haben.

### D) Regeln in der Datenbank (das Sicherheitsnetz)
- **Nur eigene Daten:** Der Nutzer darf nur seinen eigenen Timer lesen. Ohne Anmeldung (nur öffentlicher Schlüssel) ist nichts lesbar oder schreibbar.
- **Ein Timer pro Nutzer:** Eine zweite Zeile ist unmöglich, auch an der Oberfläche vorbei (Eindeutigkeit in der Tabelle).
- **Anlegen, Wechseln, Stoppen, Verwerfen nur über die drei Funktionen.** Der Browser darf **keine Zeilen anlegen oder löschen**, und er darf an der Zeile nur die **Beschreibung ändern**, nicht Projekt, Startzeit oder Besitzer. Damit kann niemand eine falsche Startzeit setzen oder fremde Projekte einschleusen.
- **Start nur auf aktive Projekte** des Nutzers (aktives Projekt und aktiver Kunde, nur eigene). Die Startzeit ist immer die aktuelle Serverzeit, nie in der Zukunft.
- **Beschreibung:** höchstens 1000 Zeichen, ohne Leerzeichen am Rand, leer wird zu «keine».
- **Ausnahme für den Stopp:** Ein Timer, der bei einem inzwischen **archivierten** Projekt weiterlief, darf beim Stopp trotzdem seinen Eintrag speichern (Spec PROJ-3). Die Regel «nur aktive Ziele beim Anlegen» aus PROJ-4 gilt weiter für alle anderen Wege. Die Ausnahme gilt nur innerhalb der Stopp-Funktion und ist nicht von aussen auslösbar.
- **Einträge aus dem Stopp** erfüllen dieselben Regeln wie bei PROJ-4 (Besitzer, Dauer, Datum, Beschreibung). Die Datenbank-Regel für Endzeiten wird um **24:00** erweitert (Ende eines Tages), damit ein Eintrag bis Mitternacht möglich ist. Die Eingabe im Formular bleibt bis 23:59.
- **Kein Löschen von Einträgen:** weiterhin kein Recht dazu. Das Verwerfen löscht nur die Timer-Zeile, nie einen Zeiteintrag.

### E) Ablauf in Worten
1. **Laden:** Beim Öffnen einer Seite und beim Zurückkehren in den Tab fragt die Anbindung den Timer samt Serverzeit ab. Gibt es einen Timer, erscheinen Karte bzw. Leiste. Mit der Anzeige läuft eine eigene Uhr im Browser (jede Sekunde in der Karte, jede Minute im Tab-Titel).
2. **Start:** Ein Klick auf «Start» ruft die Start-Funktion auf. Diese prüft das Projekt, **beendet einen laufenden Timer wie beim Stopp** (Eintrag speichern oder bei unter einer Minute verwerfen) und legt den neuen Timer an, alles in **einem unteilbaren Schritt**. Die Antwort enthält, was gespeichert wurde, für die Meldung («MUS · Allgemein: 0:47 gespeichert. Timer für ABC gestartet.»).
3. **Beschreibung:** Die Oberfläche speichert den Text kurz nach der letzten Eingabe (etwa 1,5 Sekunden Pause) und beim Verlassen des Feldes. Beim Stopp wird der aktuelle Text **mit der Stopp-Anfrage geschickt**, damit nichts durch ein Timing verloren geht.
4. **Stopp:** Die Stopp-Funktion schneidet Start und Ende auf die volle Minute ab. Ist beides gleich, entsteht kein Eintrag («Unter einer Minute»). Sonst teilt sie die Zeit **nach Kalendertagen der Zürcher Uhr** auf und legt pro Tag einen Eintrag an (Dauer = Ende minus Start, verrechenbar = Dauer, gleiche Beschreibung). Danach verschwindet der Timer. Alles in einem Schritt: entweder alle Einträge und kein Timer mehr, oder nichts.
5. **Verwerfen:** Nach der Rückfrage löscht die Verwerfen-Funktion nur den Timer.
6. **Zwei Geräte:** Weil jeder Schritt unteilbar ist und es höchstens einen Timer gibt, entsteht bei gleichzeitigem Stopp nur ein Eintrag; die zweite Anfrage findet keinen Timer mehr und meldet «Timer wurde beendet». Ein Start auf einem anderen Gerät wechselt den Timer wie oben.
7. **Aktualisierung der Anzeige:** Nach Start, Stopp, Wechsel und Verwerfen lädt die Anbindung den Timer neu, und die Liste «Heute» lädt ihre Einträge neu. Änderungen von einem anderen Gerät erscheinen beim Zurückkehren in den Tab, beim nächsten Seitenwechsel und bei einer eigenen Aktion (kein Live-Abgleich im MVP).
8. **Fehler:** Archiviertes oder fremdes Projekt, Netzwerk, abgelaufene Sitzung und Dienstfehler werden in verständliche Meldungen übersetzt; bei jedem Fehler bleibt der Zustand unverändert (der Timer läuft weiter, die Beschreibung bleibt erhalten).

### F) Tech-Entscheidungen (für Nicht-Techniker begründet)
- **Timer auf dem Server, nicht im Browser:** Er muss das Schliessen des Browsers überleben und auf dem Handy sichtbar sein. Nur die Datenbank sieht für alle Geräte dasselbe.
- **Start, Stopp und Verwerfen als Funktionen in der Datenbank:** Stopp und Wechsel ändern mehrere Dinge auf einmal (Einträge anlegen, Timer entfernen, neuen Timer anlegen). Als ein Schritt in der Datenbank gibt es keinen halben Zustand (zum Beispiel zwei laufende Timer oder einen Timer, der gespeichert wurde, aber noch läuft), auch bei Verbindungsabbruch.
- **Der Browser darf den Timer nicht selbst anlegen oder löschen:** Sonst könnte er eine falsche Startzeit setzen. Nur die Funktionen setzen die Zeit, und zwar mit der Serveruhr. Die Funktionen prüfen innen selbst, dass sie nur den Timer des angemeldeten Nutzers anfassen.
- **Serveruhr statt Geräteuhr:** Start und Ende stammen von der Datenbank. Eine falsche Geräteuhr ändert nichts an den Einträgen.
- **Aufteilung nach Tagen im Stopp, kein nächtlicher Dienst:** Der Timer wird erst beim Stopp ausgewertet. Es braucht keinen Hintergrunddienst um Mitternacht (auf dem kostenlosen Plan aufwändig). Die Warnung ab 10 Stunden weist früh auf Vergessenes hin.
- **Endzeit 24:00 zulässig (nur für Einträge bis Mitternacht):** Der erste Teil eines über Mitternacht gelaufenen Timers endet fachlich um 24:00. Ein Ende um 23:59 würde jede Nacht eine Minute verschenken.
- **Ausnahme für archivierte Projekte nur im Stopp:** Sonst würde das Archivieren eines Projekts mit laufendem Timer den Stopp blockieren und die Zeit verlieren (Spec PROJ-3).
- **Kein Live-Abgleich (Realtime) im MVP:** Beim Zurückkehren in den Tab und bei jeder Aktion wird neu geladen. Das genügt für einen Einzelnutzer und spart Komplexität und Verbindungen.
- **Tab-Titel einmal pro Minute:** Die Karte zeigt Sekunden, der Titel nur Minuten. Das schont Akku und Aufmerksamkeit.
- **Beschreibung mit Pause von etwa 1,5 Sekunden speichern und beim Stopp mitschicken:** Der Text ist auf jedem Gerät sichtbar, geht beim Neuladen nicht verloren, und der Stopp hat immer den letzten Stand.
- **Direkt über Supabase, keine eigenen API-Routen, Browser lädt:** wie bei PROJ-3 und PROJ-4.

### G) Abhängigkeiten (Pakete)
Keine neuen. Vorhanden und genutzt: `@supabase/ssr`, `@supabase/supabase-js` (Zugriff), `sonner` (Meldungen), `lucide-react` (Symbole).

### H) Risiken und Hinweise für Bau und QA
- **Zeit-Logik gehört in Datenbanktests:** Die Aufteilung nach Tagen (Mitternacht, mehrere Tage, Sommer-/Winterzeit-Umstellung), das Abschneiden auf Minuten und der Wechsel sollten per SQL mit künstlich in die Vergangenheit gelegter Startzeit geprüft werden, nicht mit Warten. Im E2E braucht ein echter Stopp mindestens eine volle Minute Laufzeit (ein bis zwei Tests dürfen langsam sein).
- **Sommer-/Winterzeit:** Ein Timer über die Umstellung (Oktober, März) liefert pro Tag Einträge nach Uhrzeit; die Dauer ergibt sich aus der Differenz der Uhrzeiten auf der Uhr (wie PROJ-4). In der Umstellungsnacht kann die Summe um eine Stunde vom echten Zeitablauf abweichen. Das ist im MVP bewusst so.
- **Gleichzeitigkeit:** Stopp und Start von zwei Geräten gleichzeitig prüfen (Datenbank-Test mit zwei Verbindungen oder nacheinander mit demselben Timer).
- **Tabulatorwechsel und Schlaf:** Die Anzeige darf nach dem Aufwachen nicht den alten Stand zeigen (Zustand beim Zurückkehren neu laden).
- **Testdaten:** E2E-Tests erzeugen Zeiteinträge auf Testkunden «T-…», die sich vor PROJ-5 nicht löschen lassen. Das Aufräumen übernimmt der Nutzer im SQL-Editor oder per Berechtigungsregel.
- **Rechte der Funktionen:** Die drei Funktionen laufen mit erweiterten Rechten (sie legen Einträge an und löschen die Timer-Zeile). Sie müssen innen den Besitzer prüfen und dürfen für `anon` nicht aufrufbar sein. Das gehört in die Datenbanktests (fremder Nutzer, ohne Anmeldung).
- **Mobile:** Die Leiste über der Tab-Leiste darf Inhalte und Bestätigungsmeldungen nicht verdecken (Sonner-Position), 44-px-Ziele, 320 px prüfen.
- **Änderung an PROJ-4:** Die Anpassung der Datenbank-Regeln (Endzeit 24:00, Ausnahme im Stopp) ändert Regeln eines bereits veröffentlichten Features. `/backend` muss die PROJ-4-Tests und die Zugriffsregeln erneut prüfen; Änderungen an Zugriffsregeln brauchen die Freigabe des Nutzers.

## Implementation Notes (Backend)
**Stand 2026-11-14: Backend fertig. Migration auf Supabase angewendet** (vom Nutzer im SQL-Editor ausgeführt, weil das Anwenden und das Ausführen von Test-SQL durch Claude Code von der Berechtigungsprüfung abgelehnt wurde; die Ablehnung wurde nicht umgangen). Tabelle, Funktionen, Rechte und der geänderte Trigger sind in der Datenbank vorhanden (per Abfrage der Systemkataloge bestätigt). Die Zeitlogik der Datenbank wurde mit dem Skript `supabase/tests/PROJ-6-timer-rules.sql` geprüft (siehe «Geprüft»).

### Fertig
- **Migration** `supabase/migrations/20261114000000_running_timers.sql` (liegt im Projekt, nicht angewendet): Tabelle `running_timers` (ein Timer pro Nutzer, Row Level Security, der Browser darf nur lesen und die Beschreibung ändern), Funktionen `get_timer`, `start_timer`, `stop_timer`, `discard_timer` (nur angemeldete Nutzer, `anon` gesperrt), interne Hilfsfunktionen `timer_json` und `finish_timer_internal` (Abschneiden auf Minuten, Aufteilung nach Tagen der Zürcher Uhr, Endzeit 24:00, verrechenbar = Dauer), und eine Anpassung des Triggers `time_entries_before_insert` (PROJ-4): Ausnahme für archivierte Ziele nur, wenn die Stopp-Funktion die Sitzungsvariable `app.timer_stop` setzt.
- **Datenschicht** `src/lib/timer/` (`types.ts`, `errors.ts`, `repository.ts`, `supabase-repository.ts`, `index.ts`): `SupabaseTimerRepository` mit `getTimer`, `startTimer`, `stopTimer`, `discardTimer`, `saveDescription`; Datenbankfehler werden zu `TimerError` (Ziel archiviert, Ziel nicht gefunden, kein Timer, Beschreibung zu lang, Sitzung abgelaufen, nicht erreichbar).
- **Tests:** 11 Vitest-Tests der Datenschicht (Übersetzung, Wechsel, Stopp mit und ohne Text, zu kurz, Verwerfen, Beschreibung speichern, Fehlerarten). `tsc` sauber, Lint ohne Fehler.

### Geprüft
- **Rechte und Regeln per Abfrage der Systemkataloge:** Auf `running_timers` hat nur `authenticated` das Recht `SELECT` und `UPDATE` ausschliesslich auf die Spalte `description`; `anon` hat nichts, kein `INSERT`, kein `DELETE`. Die Policies sind `running_timers_select_own` und `running_timers_update_own`. `get_timer`, `start_timer`, `stop_timer` und `discard_timer` sind nur für `authenticated` ausführbar; `timer_json` und `finish_timer_internal` für niemanden ausser dem Besitzer der Funktionen. Der Trigger `time_entries_before_insert` enthält die Ausnahme (`app.timer_stop`).
- **E2E gegen die echte Datenbank** (`tests/PROJ-6-timer-datenbank.spec.ts`, 12 Tests, über REST mit der Sitzung des Testkontos), alle grün: `get_timer` ohne Timer (null, Serverzeit), `start_timer` (Startzeit von der Serveruhr, nicht in der Zukunft, derselbe Start ist idempotent, nur ein Timer), Beschreibung speichern, lesen und Grenzen (1001 Zeichen, mit Rand, leer wird abgelehnt), Browser darf Timer nicht anlegen oder löschen und weder Projekt, Startzeit noch Besitzer ändern, interne Hilfsfunktionen von aussen nicht aufrufbar, `anon` (öffentlicher Schlüssel) kommt an keine der Funktionen und nicht an die Tabelle, Wechsel (unter einer Minute ohne Eintrag, ein Timer übrig), Verwerfen (zweites Mal «kein Timer»), Stopp ohne Timer abgelehnt, fremdes oder unbekanntes Projekt abgelehnt, Start bei archiviertem Projekt abgelehnt, und ein **echter Stopp nach 62 Sekunden** (ein Eintrag mit Uhrzeiten, verrechenbar gleich Dauer, Beschreibung, Timer weg).
- **Vitest:** 240 von 240 grün (11 neue zur Timer-Datenschicht). `tsc` sauber, Lint ohne Fehler.
- **Regression:** Alle 175 E2E-Tests (PROJ-1, 2, 3, 4, 11 und 6) grün. Dabei zwei Test-Anpassungen: Der Test «Keine Anfragen an Schriftdienste Dritter» (PROJ-11) erlaubt jetzt Anfragen an das eigene Supabase-Projekt (die Startseite liest seit PROJ-4 im Browser), und der Test «zweites Gerät» (PROJ-4) legt seinen Eintrag selbst an, weil parallele Testdateien das «zuletzt benutzte Ziel» verändern.

- **Zeitlogik der Datenbank per SQL** (Skript `supabase/tests/PROJ-6-timer-rules.sql`, vom Nutzer im Supabase-SQL-Editor ausgeführt; das Skript bricht am Ende bewusst mit «RESULT …» ab und rollt alles zurück): **alle 51 Prüfungen wie erwartet, keine Zeile «(bad)».** Start, Wechsel (unter einer Minute ohne Eintrag), idempotenter Start, Stopp ohne Timer; Abschneiden auf Minuten (08:30:20–10:00:40 = 08:30–10:00, 90 min; gleiche Minute = zu kurz; 08:30:50–08:31:10 = 1 min); über Mitternacht (23:30–24:00 30 min und 00:00–00:40 40 min, gleiche Beschreibung); drei Tage (120, 1440, 60); Ende genau um Mitternacht ohne leeren Eintrag; Sommerzeit-Umstellung (Differenz der Uhrzeiten, 150 min) und Winterzeit (60, 1440, 30; in der Herbstnacht fehlt gegenüber der echten Zeit eine Stunde, bewusst wie bei PROJ-4); Beschreibung über 1000 Zeichen abgelehnt; Ende 24:00 wird gespeichert (6 Einträge); **Stopp auf archiviertem Projekt speichert** (12 Tageseinträge über 12 Tage, 16 561 Minuten), während direktes Anlegen auf archiviertes Projekt und Start bei archiviertem Projekt abgelehnt werden; direkte Zugriffe als Besitzer (Anlegen, Löschen, Ändern von Projekt, Startzeit, Besitzer verweigert; Beschreibung ändern ok, 1001 Zeichen und Leerzeichen am Rand abgelehnt; interne Hilfsfunktion nicht aufrufbar); zweiter Nutzer (sieht nichts, kann nicht ändern, stoppen, verwerfen, nicht auf fremdes Projekt starten); `anon` bei allen Funktionen und der Tabelle gesperrt; zweiter Timer pro Nutzer abgelehnt. Der Fehler in der ersten Fassung des Skripts (Startzeit nachträglich ändern, vom Trigger bewusst verhindert) war ein Testfehler und ist behoben.

### Offen
- **Testdaten:** Die E2E-Tests legen Testkunden `T-…` und Zeiteinträge an (kein Löschen). Zum Aufräumen die Zeiteinträge auf `T-…`-Kunden per SQL löschen (Skript siehe Spec PROJ-4, QA-Abschnitt).

## Implementation Notes (Frontend)
**Stand:** 2026-11-14. Die Oberfläche steht vollständig und läuft gegen die echten Datenbank-Funktionen (keine Platzhalter-Phase, wie im Tech Design vereinbart).

### Was gebaut wurde
- **Anbindung** `src/components/timer/timer-provider.tsx` (im App-Rahmen für alle Seiten): lädt den Timer samt Serverzeit beim Öffnen und beim Zurückkehren in den Tab, führt Start, Wechsel, Stopp und Verwerfen aus (nie zwei Aktionen gleichzeitig, Fehler als Meldung, Zustand bleibt dann unverändert), meldet Ergebnisse («MUS · Allgemein: 0:47 gespeichert. Timer für ABC · Relaunch gestartet.» bzw. «Unter einer Minute, nicht gespeichert.»), speichert die Beschreibung leise, zählt `entriesVersion` hoch (die Liste «Heute» lädt dann neu) und hält den **Tab-Titel** aktuell («0:47 · MUS · Time Tracker Light», jede Minute, auch wenn eine Seite ihren eigenen Titel setzt). Ohne Anbindung (Tests einzelner Komponenten) läuft nie ein Timer.
- **Startseite** `src/app/(app)/page.tsx`: Abschnitt «Timer» (`timer-section.tsx`) mit der **Karte «Timer läuft»** (`timer-card.tsx`: Kürzel, Kunde, Projekt, Startzeit, laufende Zeit h:mm:ss, Hinweis ab 10 Stunden, Beschreibung mit Speichern nach etwa 1,5 Sekunden Pause und beim Verlassen des Feldes, «Stopp», «Verwerfen» mit Rückfrage) und der **Liste «Projekt starten»** (`project-start-list.tsx`, alle aktiven Projekte nach Kunde gruppiert). Danach «Zeit erfassen» und «Heute» wie bisher.
- **Leiste** `timer-bar.tsx` auf allen anderen Seiten: am Laptop oben und klebend, am Handy fest über der Tab-Leiste mit Platzhalter am Seitenende; Link zur Startseite, «Stopp»; auf der Startseite ausgeblendet.
- **Start-Knopf** `start-button.tsx` bei jedem aktiven Projekt auf der Startseite und der Kundenseite (`customer-detail.tsx`); beim laufenden Projekt steht «Läuft» (Symbol und Text).
- **Formate** `src/lib/timer/format.ts`: laufende Zeit aus Startzeit und Serverzeit (nicht aus einem mitlaufenden Zähler), Uhrzeit des Starts in Zürich, Tab-Titel, Schwelle 10 Stunden.
- Kleinere Änderungen: Der Rückfrage-Dialog aus PROJ-3 hat jetzt anpassbare Beschriftungen; die Bestätigungsmeldungen (Sonner) stehen am Handy höher, damit sie die Leiste nicht verdecken. Keine neuen Pakete.

### Abweichungen und Entscheidungen
- **Die Liste «Projekt starten» ist immer sichtbar** (nicht einklappbar). Bei vielen Kunden rutscht «Heute» weiter nach unten; bei Bedarf in `/qa` als Punkt aufnehmen.
- **Die Leiste am Handy hat eine feste Höhe und verschiebt die Bestätigungsmeldungen** (global höherer Abstand, auch für PROJ-3 und PROJ-4).
- **Stopp aus der Leiste** schickt den zuletzt gespeicherten Text der Beschreibung (die Leiste hat kein eigenes Textfeld).
- **Test-Aufbau:** Die Timer-Tests laufen als eigenes Playwright-Projekt `timer` nach allen anderen (ein Konto hat nur einen Timer, und die Leiste erscheint auf jeder Seite). Die Tests von PROJ-4 und PROJ-11 wurden an die neue Startseite angepasst (Wartezeit auf geladene Daten beim Tastaturtest des Theme-Schalters).

### Tests
- **Vitest:** 272 von 272 grün (neu: 32 zu laufender Zeit, Serveruhr-Versatz, Zeitzone, Tab-Titel in `format.test.ts` und zur Oberfläche in `timer-ui.test.tsx`: Start, Wechsel mit Meldung, unter einer Minute, Fehler, Karte mit Serverzeit, Warnung ab 10 Stunden, Stopp mit Text, Beschreibung nach Pause und beim Verlassen, Rückfrage beim Verwerfen, Leiste, Tab-Titel).
- `tsc` sauber, Lint ohne Fehler, Build erfolgreich.
- **E2E gegen die echte Datenbank** (`tests/PROJ-6-timer.spec.ts`, Projekt `timer`, 27 Tests, Chrome, Produktionsbuild): 12 Datenbank-Tests (siehe Backend) und 15 Oberflächentests: Start über die Liste (Karte, «Läuft», Sekunden laufen), Doppelklick, Beschreibung nach dem Neuladen und auf einem zweiten Gerät, Leiste und Tab-Titel auf anderen Seiten, «Läuft» auf der Kundenseite, Wechsel, Verwerfen mit Rückfrage und Fokus, Fehler beim Start (kein Netz), Layout bei 320/375/768/1440 px (kein Überlauf, 44-px-Ziele, Leiste verdeckt die Tab-Leiste und das Seitenende nicht), lange Namen bei 320 px, axe in Hell und Dunkel (Startseite, Rückfrage, Leiste), abgelaufene Sitzung beim Stopp, und der **ganze Ablauf** (Start, Kunde wird archiviert, Stopp nach über einer Minute speichert Einträge mit Uhrzeiten und Beschreibung, erscheinen unter «Heute»).
- **Gesamtlauf:** Alle 190 E2E-Tests (PROJ-1, 2, 3, 4, 6, 11) grün.
- **Sichtprüfung** (Chrome, 375 und 1280 px): Liste, Karte, Leiste, Kundenseite, Rückfrage.
- **Nicht geprüft:** Firefox und Safari, echtes Handy (Bildschirmtastatur, Sperrbildschirm, Hintergrund-Tab), Screenreader von Hand, Verhalten über Mitternacht in der Oberfläche (nur in der Datenbank geprüft).
- **Testdaten:** Die Tests legen Testkunden `T-…` und Zeiteinträge an (kein Löschen). 15 übrig gebliebene aktive Testkunden wurden über die Oberfläche archiviert. Die Zeiteinträge auf `T-…`-Kunden müssen per SQL gelöscht werden.

## QA Test Results

**Getestet am:** 2026-11-14 · **Umgebung:** Produktionsbuild (`next start`), Chrome, echte Supabase-Datenbank, Testkonto · **Ergebnis:** Alle Akzeptanzkriterien erfüllt, 0 Critical/High/Medium, 1 Low-Fehler (QA-1) und 2 Beobachtungen.

### Automatische Tests
- **Vitest:** 276 von 277 grün plus 1 erwarteter Fehlschlag (`it.fails` für QA-1, siehe unten).
- **Playwright (Chrome):** Timer-Projekt `timer` mit 37 Tests grün (12 Datenbank, 15 Oberfläche, 10 QA); alle anderen Projekte (setup, chromium, logout) mit 153 Tests grün aus dem letzten Gesamtlauf (190 Tests). Neu in der QA: 10 Tests in `tests/PROJ-6-timer.spec.ts` (Block «QA») und 4 Komponententests der Liste «Projekt starten» (`project-start-list.test.tsx`).
- **Nicht geprüft:** Firefox und Safari. Der Firefox-Download von Playwright bricht auf diesem Rechner beim Entpacken ab (nur ein leeres Verzeichnis); die vorbereitete Konfiguration `PW_FIREFOX=1` (Projekte `firefox`, `firefox-timer`) steht bereit. Außerdem nicht geprüft: echtes Handy (Bildschirmtastatur, Sperrbildschirm, Hintergrund-Tab), Screenreader von Hand.
- **Hinweis zur Stabilität:** Zwei Testläufe scheiterten an kurzzeitigen Verbindungsproblemen meines Rechners (`ENOTFOUND`, `ECONNRESET`, ein Lauf mit 24 Minuten Dauer). Die Wiederholung lief jeweils grün (37 von 37 in 3,1 Minuten). Außerdem blockt der Schutz vor Supabase Abfragen mit SQL-Zeichen in der Adresse (HTML-Antwort statt JSON); der Test liest Einträge deshalb über ihre IDs.

### Akzeptanzkriterien
| Bereich | Ergebnis | Nachweis |
|---|---|---|
| Start-Knöpfe (5) | bestanden | E2E und Komponententest: Liste «Projekt starten» nach Kunde gruppiert, Start auf der Kundenseite bei aktiven Projekten und kein Knopf bei archivierten Kunden, Hinweis ohne Kunden (Komponententest), sofortiger Start mit Meldung, Doppelklick ein Timer, zehn gleichzeitige Starts ergeben einen Timer |
| Laufender Timer (9) | bestanden | E2E: Karte mit allen Angaben und laufenden Sekunden, Leiste auf anderen Seiten, Tab-Titel mit Zeit und Kürzel, richtige Zeit bei falscher Geräteuhr (2020), Neuladen und zweites Gerät (Zeit, Beschreibung), Markierung «Läuft», Hinweis ab 10 Stunden (Komponententest), Beschreibung gespeichert nach Pause und beim Verlassen |
| Stoppen (7) | bestanden | E2E: echter Stopp nach über einer Minute mit Uhrzeiten und Beschreibung, Eintrag unter «Heute» ohne Neuladen, unter einer Minute «nicht gespeichert», Netzwerkfehler (Timer läuft weiter, Text bleibt), zwei Geräte gleichzeitig: ein Erfolg, die zweite Anfrage «kein Timer». Aufteilung über Mitternacht, mehrere Tage, Sommer- und Winterzeit per SQL geprüft (siehe Backend) |
| Wechseln und Verwerfen (4) | bestanden | E2E: Meldung nennt beides, unter einer Minute ohne Eintrag, Verwerfen mit Rückfrage (Abbrechen lässt laufen), Fehler lässt den Zustand unverändert |
| Archivieren während der Timer läuft (2) | bestanden | E2E: Kunde wird archiviert, Timer läuft weiter, Stopp speichert; kein Start bei archivierten Einträgen (Oberfläche und Datenbank) |
| Fehler und Sonderfälle (3) | bestanden | Ladefehler (Komponententest), abgelaufene Sitzung (Timer läuft serverseitig weiter), anderes Gerät beendet den Timer (Abgleich beim Zurückkehren in den Tab und bei «Stopp») |
| Bedienung, Darstellung, Zugänglichkeit (5) | bestanden | 320/375/768/1440 px ohne Überlauf, 44-px-Ziele, Leiste verdeckt Tab-Leiste und Seitenende nicht, lange Namen bei 320 px, Tastatur allein (Start per Enter, per Tab zu «Stopp», Fokus kehrt nach der Rückfrage zurück), axe in Hell und Dunkel (Startseite, Rückfrage, Leiste) ohne Verstösse, keine laufenden Animationen bei «reduzierte Bewegung» |
| Datenschutz und Sicherheit (5) | bestanden | Siehe Sicherheitsprüfung |

### Randfälle
Bestanden: Doppelklick, Start auf zwei Geräten gleichzeitig (genau ein Timer), Stopp auf einem Gerät während das andere anzeigt (Abgleich), falsche Geräteuhr, Beschreibung über 1000 Zeichen (Stopp gesperrt, Hinweis), Stopp nach Archivieren, abgelaufene Sitzung, Supabase nicht erreichbar beim Abgleich (Karte bleibt, Hinweis «Keine Verbindung», verschwindet wieder), Sommer-/Winterzeit und Mitternacht (Datenbank), Beschreibung nur Leerzeichen. Eingeschränkt: Wird die Seite **ohne Verbindung neu geladen**, ist ein laufender Timer nicht sichtbar, weil sein Zustand unbekannt ist (siehe Beobachtung 1).

### Sicherheitsprüfung (Red Team)
- **Fremdzugriff und Rechte:** `anon` kommt an keine der vier Funktionen und nicht an die Tabelle; der Browser darf Timer weder anlegen noch löschen und weder Projekt, Startzeit noch Besitzer ändern; die interne Hilfsfunktion ist von aussen nicht aufrufbar; ein zweiter Nutzer sieht nichts und kann nicht stoppen, verwerfen oder auf ein fremdes Projekt starten (SQL im Backend-Schritt, E2E über REST).
- **Wettlauf:** Zehn gleichzeitige Starts ergeben einen Timer, zwei gleichzeitige Stopps genau einen Eintrag (je Tag) und einen Fehler «kein Timer» (Sperre pro Nutzer in der Datenbank).
- **Eingaben:** `<img onerror>` und SQL-Zeichen in der Beschreibung werden im laufenden Timer und im gespeicherten Eintrag als Text behandelt, kein Skript läuft, kein Dialog.
- **Geheimnisse und Konsole:** Keine Schlüssel mit Rolle ausser `anon` und keine Tokens in Antworten von Startseite und Kundenliste, keine Konsolenfehler bei laufendem Timer.
- **Offen (ausserhalb PROJ-6):** Supabase «Leaked Password Protection» ist ausgeschaltet.

### Fehler und Beobachtungen
- **QA-1 (Low): Der Überschneidungs-Hinweis im PROJ-4-Formular übersieht Einträge, die um 24:00 enden.** Schritte: Timer über Mitternacht stoppen (Eintrag 22:00–24:00 am ersten Tag) oder entsprechenden Eintrag haben, dann im Formular «Zeit erfassen» für diesen Tag Von–bis 23:00–23:30 eingeben. Erwartet: Hinweis «Überschneidung mit …». Ist: kein Hinweis, weil `parseTime` die Uhrzeit «24:00» nicht kennt (Eintrag wird beim Vergleich ignoriert). Das Speichern selbst funktioniert, nur der Hinweis fehlt. Ursache: Die Endzeit 24:00 ist erst mit PROJ-6 möglich geworden. Abgesichert durch `it.fails` in `src/lib/time-entries/time-entries.test.ts`; Behebung: 24:00 im Vergleich (nicht im Formularfeld) zulassen.
- **Beobachtung 1:** Ein Neuladen ohne Verbindung zeigt keinen laufenden Timer (die Anzeige weiss nichts davon). Gefahr gering: Ein Start bei einem anderen Projekt speichert den laufenden Timer ohnehin, nichts geht verloren. Kein Eingriff nötig.
- **Beobachtung 2:** Die Liste «Projekt starten» ist immer sichtbar; bei vielen Kunden liegt «Heute» weit unten. Entscheidung offen, ob sie einklappbar werden soll (nicht Teil der Spec).

### Testdaten
Die Tests legen Testkunden `T-…` und Zeiteinträge an (kein Löschen). Übrig gebliebene aktive Testkunden wurden über die Oberfläche archiviert. Die Zeiteinträge auf `T-…`-Kunden bleiben in der Tabelle und müssen per SQL gelöscht werden (Skript in der Spec PROJ-4, Abschnitt QA).

### Production-Ready (vor Behebung)
**JA.** Keine Critical-, High- oder Medium-Fehler. Empfehlung: QA-1 vor dem Deploy beheben (kleine Änderung), Beobachtung 1 so lassen, bei Beobachtung 2 entscheiden.

### Fehlerbehebung und Re-Test (2026-11-14)
Entscheidungen des Nutzers: QA-1 vor dem Deploy beheben, Beobachtung 1 so lassen, Beobachtung 2 umsetzen.
- **QA-1 behoben:** Der Vergleich im Überschneidungs-Hinweis (`findOverlaps` in `src/lib/time-entries/validation.ts`) kennt jetzt «24:00» als Ende des Tages; der Hinweis zeigt die echte Zeit («(22:00–24:00)»). Der `it.fails`-Test ist ein normaler Test, dazu ein E2E-Test gegen die echte Datenbank (Eintrag 22:00–24:00 per REST, Formular 23:00–23:30 zeigt den Hinweis).
- **Beobachtung 2 umgesetzt:** Die Liste «Projekt starten» ist einklappbar (`project-start-list.tsx`): Die Überschrift ist ein Knopf «Projekt starten (n)», die Wahl bleibt im Browser erhalten (`localStorage`, Standard aufgeklappt), das Pfeilsymbol dreht ohne Animation bei reduzierter Bewegung. Komponententests (Einklappen, Gedächtnis, Standard) und ein E2E-Test (Einklappen, Neuladen, Aufklappen per Tastatur). Akzeptanzkriterium ergänzt.
- **Beobachtung 1:** unverändert (kein Eingriff).
- **Re-Test:** Vitest 279 von 279, `tsc` sauber, Lint ohne Fehler, Build erfolgreich, **alle 202 E2E-Tests** (setup, chromium, timer, logout) grün. Ein Tastaturtest von PROJ-4 (Umschalter per Pfeiltasten) war in zwei Läufen unter Last empfindlich und wurde abgesichert (wartet auf den Fokus); ein weiterer Lauf wurde durch den Ruhezustand des Rechners unterbrochen (`ERR_NETWORK_IO_SUSPENDED`) und wiederholt.

### Production-Ready (nach Re-Test)
**JA.** Keine offenen Fehler. Status: **Approved**.

## Deployment
_To be added by /deploy_
