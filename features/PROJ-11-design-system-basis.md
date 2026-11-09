# PROJ-11: Design-System-Basis

## Status: Planned
**Created:** 2026-11-08
**Last Updated:** 2026-11-09

## Dependencies
- Requires: PROJ-1 (Supabase Infrastructure Setup), für die bestehende Statusseite `/status`
- Grundlage für: PROJ-2 bis PROJ-10 (alle Seiten nutzen Theme, Navigation und Layout)

## User Stories
- Als Nutzer möchte ich die App auf Handy, Tablet und Laptop mit einer Navigation bedienen, die zum Gerät passt, damit ich mit einem Daumen- bzw. Mausklick zwischen den Bereichen wechsle.
- Als Nutzer möchte ich, dass die App automatisch hell oder dunkel erscheint wie mein Gerät, damit sie mich weder blendet noch im Weg ist.
- Als Nutzer möchte ich das Theme manuell auf «Hell» oder «Dunkel» stellen können und die Wahl pro Gerät behalten, damit die App meinen Gewohnheiten folgt.
- Als Nutzer möchte ich in der App das Logo und im Browser-Tab das Würfel-Symbol sehen, damit ich die App schnell wiederfinde.
- Als Nutzer möchte ich gut lesbare Texte und Meldungen (Kontrast nach WCAG AA, Schrift Inter), damit ich Zeiten und Fehlermeldungen auch unterwegs sicher lese.
- Als Entwickler späterer Features möchte ich ein fertiges App-Layout mit Navigation, damit ich neue Seiten nur noch eintragen muss.

## Out of Scope
- Anmeldeseite, Login-Zustand, Abmelden-Knopf (PROJ-2)
- Navigationseinträge für Timer, Woche, Monat, Kunden, Export (jedes Feature trägt seinen Eintrag selbst ein)
- «Mehr»-Menü bei mehr als fünf Einträgen (wird entschieden, wenn es soweit ist)
- Timer-Inhalt der Startseite (PROJ-6)
- Installierbare App, Manifest, Icons in allen Grössen (PROJ-10); hier nur Favicon und Apple-Touch-Icon
- Mehrere Sprachen, es gibt nur Deutsch
- Eigene Farbthemen oder Akzentfarben zur Auswahl
- Sicherheits-Header (BUG-4, geht in `/deploy`)
- Entscheid, ob `/status` hinter dem Login liegt (BUG-6, PROJ-2)

## Acceptance Criteria

**Format:** Angenommen [Vorbedingung] / Wenn [Aktion] / Dann [Ergebnis]

**Navigation und Layout**
- [ ] Angenommen die Bildschirmbreite ist die eines Handys, wenn eine Seite geöffnet wird, dann erscheint unten eine feste Tab-Leiste mit den Einträgen «Start» und «Status» und oben eine Kopfzeile mit Würfel-Logo und Theme-Schalter.
- [ ] Angenommen die Bildschirmbreite ist die eines Tablets oder Laptops, wenn eine Seite geöffnet wird, dann erscheint links eine feste Seitenleiste mit Logo oben, den Einträgen «Start» und «Status» und dem Theme-Schalter unten, und es gibt keine untere Tab-Leiste.
- [ ] Angenommen der Nutzer sieht die Navigation, wenn er auf einen Eintrag tippt oder klickt, dann öffnet sich die zugehörige Seite, ohne dass die Navigation neu aufgebaut wird oder flackert.
- [ ] Angenommen der Nutzer ist auf einer Seite, wenn er die Navigation ansieht, dann ist der aktuelle Eintrag erkennbar an Fettschrift und einem Balken, nicht nur an der Farbe.
- [ ] Angenommen eine beliebige Navigationsfläche, wenn sie gemessen wird, dann ist sie mindestens 44 × 44 px gross.
- [ ] Angenommen die Tab-Leiste ist sichtbar, wenn die Seite gescrollt wird, dann bleibt die Leiste unten stehen und verdeckt keinen Seiteninhalt am Seitenende.
- [ ] Angenommen der Nutzer bedient nur mit der Tastatur, wenn er durch die Navigation tabbt, dann hat jeder Eintrag einen sichtbaren Fokusring, und es gibt einen Link «Zum Inhalt springen».

**Startseite**
- [ ] Angenommen der Nutzer öffnet `/`, wenn die Seite lädt, dann erscheint sie im App-Layout mit Würfel-Logo, kurzem Willkommenstext und einem Link zur Statusseite, und die Next.js-Starter-Seite ist weg.

**Theme**
- [ ] Angenommen das Gerät steht auf dunkel und der Nutzer hat nichts gewählt, wenn er die App öffnet, dann erscheint sie im dunklen Theme (Standard «System»), und umgekehrt für hell.
- [ ] Angenommen der Theme-Schalter, wenn er geöffnet wird, dann bietet er «System», «Hell» und «Dunkel» an, zeigt die aktuelle Wahl mit Text oder Haken an und ist per Tastatur bedienbar.
- [ ] Angenommen der Nutzer wählt «Dunkel», wenn er die Seite neu lädt oder die App später wieder öffnet, dann bleibt «Dunkel» auf diesem Gerät gewählt, auch wenn das Gerät auf hell steht.
- [ ] Angenommen der Nutzer hat «Dunkel» gewählt, wenn die Seite lädt, dann erscheint von Anfang an das dunkle Theme, ohne kurzes Aufblitzen des hellen.
- [ ] Angenommen der Nutzer ist auf «System», wenn er die Geräteeinstellung ändert, dann wechselt die App ohne Neuladen mit.
- [ ] Angenommen die Statusseite `/status`, wenn das dunkle Theme aktiv ist, dann ist sie ebenfalls dunkel (BUG-5).

**Farben, Schrift, Kontrast**
- [ ] Angenommen beide Themes, wenn Text und Bedienelemente geprüft werden, dann verwenden sie die Farbwerte aus `docs/design-system.md` und erreichen Text ≥ 4,5:1 und UI-Elemente ≥ 3:1.
- [ ] Angenommen eine Fehlermeldung wie in `/status`, wenn sie im hellen Theme erscheint, dann hat sie mindestens 4,5:1 Kontrast (BUG-5) und zeigt zusätzlich Symbol und Text.
- [ ] Angenommen ein Primär-Button im hellen Theme, wenn er angezeigt wird, dann hat er gelbe Fläche, dunkle Schrift und den dunklen Rand `#7A5C00`.
- [ ] Angenommen jede Seite, wenn sie lädt, dann ist die Schrift Inter, mit der Ausweichschrift `system-ui`, wenn Inter nicht ladbar ist, und Zahlen stehen mit tabellarischen Ziffern.
- [ ] Angenommen eine Seite, wenn sie lädt, dann entstehen keine Anfragen an Schriftdienste Dritter (Inter wird von der App selbst ausgeliefert).

**Logo, Favicon, Titel**
- [ ] Angenommen der Browser-Tab, wenn eine beliebige Seite geöffnet ist, dann zeigt er das Würfel-Symbol, und es gibt keinen 404 für das Favicon (BUG-2).
- [ ] Angenommen ein Handy, wenn die Seite zum Home-Bildschirm hinzugefügt wird, dann erscheint das Würfel-Symbol als Apple-Touch-Icon.
- [ ] Angenommen jede Seite, wenn sie lädt, dann heisst der Seitentitel «Time Tracker Light» (bzw. «Status · Time Tracker Light») und nicht mehr «AI Coding Starter Kit».
- [ ] Angenommen das Logo ist im dunklen Theme zu sehen, wenn es angezeigt wird, dann bleibt es erkennbar (ausreichender Kontrast zum Hintergrund) und hat einen Alternativtext.

**Bestehende Funktionen**
- [ ] Angenommen PROJ-1 ist Approved, wenn PROJ-11 fertig ist, dann laufen alle bisherigen Unit- und E2E-Tests (die Selektoren dürfen angepasst werden) und `/status` zeigt weiterhin die drei Datenbankzustände.

## Edge Cases
- Der Nutzer hat im Browser gespeicherte Daten gelöscht: Das Theme fällt auf «System» zurück, die App bleibt benutzbar.
- JavaScript ist deaktiviert oder lädt noch: Die Seite erscheint im Theme der Geräteeinstellung, und Navigation per Link funktioniert weiter.
- Das Handy wird gedreht oder das Browserfenster wird verändert: Beim Wechsel zwischen Tab-Leiste und Seitenleiste springt nichts, und die Auswahl bleibt erhalten.
- Sehr schmales Fenster (320 px): Nichts läuft über den Rand, die Leiste bleibt bedienbar.
- Handy mit Home-Indikator/Notch: Die Tab-Leiste liegt nicht unter dem Systembereich.
- Inter kann nicht geladen werden: Die App bleibt mit `system-ui` lesbar, das Layout bricht nicht.
- Das Logo-Bild lädt nicht: Der Alternativtext «Time Tracker Light» erscheint, und die Navigation bleibt nutzbar.
- Zoom auf 200 % oder grosse Systemschrift: Navigationstexte werden nicht abgeschnitten.
- Der Nutzer wählt eine Seite, die es nicht gibt: Die Standardfehlerseite erscheint im neuen Theme (ein eigenes Design ist nicht Teil dieses Features).

## Technical Requirements
- Browser: aktuelle Versionen von Chrome, Firefox, Safari (auch iOS)
- Responsive: 375 px (Handy), 768 px (Tablet), 1440 px (Laptop) geprüft
- Barrierefreiheit: WCAG 2.1 AA, Tastaturbedienung, sichtbarer Fokus
- Performance: Theme erscheint beim ersten Rendern ohne Aufblitzen; die Navigation verursacht keine zusätzlichen Datenbankabfragen
- Datenschutz: keine Anfragen an Schrift- oder Analysedienste Dritter

## Open Questions
- [ ] Steht der Eintrag «Status» dauerhaft in der Hauptnavigation oder wandert er später in die Einstellungen? (Entscheid in PROJ-2, siehe BUG-6)
- [ ] Welches Logo erscheint wo: Wortmarke in der Seitenleiste und Würfel in der mobilen Kopfzeile? (Vorschlag, in `/architecture` bestätigen; die PNG-Dateien müssen ggf. für dunklen Hintergrund geprüft werden.)

## Decision Log

### Product Decisions
| Decision | Rationale | Date |
|----------|-----------|------|
| Gerätespezifische Navigation: Tab-Leiste unten am Handy, Seitenleiste am Laptop und Tablet | Daumenerreichbar und 44-px-Ziele; passt zum Ziel «Zeit in unter 10 Sekunden erfassen» | 2026-11-09 |
| Startseite `/` ist ein Platzhalter im App-Layout | Layout und Theme sind in einer echten Seite prüfbar; PROJ-6 ersetzt den Inhalt, die Adresse bleibt | 2026-11-09 |
| Dreifach-Schalter «System/Hell/Dunkel», Standard «System», pro Gerät gespeichert | Folgt automatisch der Geräteeinstellung, wie im Design-System verlangt, und ist trotzdem überschreibbar | 2026-11-09 |
| Favicon und Fehlerfarbe (BUG-2, BUG-5) gehören in dieses Feature | Gleiche Dateien und Design-System-Werte; später doppelt anzufassen lohnt sich nicht | 2026-11-09 |
| Navigation zeigt heute nur «Start» und «Status», keine ausgegrauten Platzhalter | Tote Einträge wirken unfertig; jedes Feature trägt seinen Eintrag selbst ein | 2026-11-09 |
| Aktiver Eintrag mit Fettschrift und Balken | Zustand nie nur über Farbe (Design-System, Regel 2) | 2026-11-09 |
| Inter wird von der App selbst ausgeliefert, nicht von einem Drittdienst | Keine Anfragen an Dritte, kein Datenschutzthema | 2026-11-09 |

### Technical Decisions
<!-- Added by /architecture -->
| Decision | Rationale | Date |
|----------|-----------|------|
| _Wird von `/architecture` ergänzt_ | | |

---
<!-- Sections below are added by subsequent skills -->

## Tech Design (Solution Architect)
_To be added by /architecture_

## QA Test Results
_To be added by /qa_

## Deployment
_To be added by /deploy_
