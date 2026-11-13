# PROJ-4: Manuelle Zeiterfassung inkl. Nacherfassung

## Status: Architected
**Created:** 2026-11-13
**Last Updated:** 2026-11-13

## Dependencies
- Requires: PROJ-1 (Supabase Infrastructure Setup) — Datenbank und Zugriffsregeln
- Requires: PROJ-2 (Anmeldung) — Seiten geschützt, Daten gehören dem angemeldeten Nutzer
- Requires: PROJ-3 (Kunden- und Projektverwaltung) — Kunden und Projekte als Ziel jedes Zeiteintrags
- Requires: PROJ-11 (Design-System-Basis) — Layout, Navigation, Theme, Startseite
- Wird gebraucht von: PROJ-5 (Liste, Bearbeiten, Löschen), PROJ-6 (Timer), PROJ-7, PROJ-8, PROJ-9 (Auswertung, Export)

## User Stories
- Als Einzelnutzer möchte ich eine Arbeitszeit mit Datum, Kunde, Projekt und Dauer in wenigen Sekunden erfassen, damit ich meine gesamte Arbeitszeit nur noch in dieser App festhalte.
- Als Einzelnutzer möchte ich wahlweise von–bis (Uhrzeiten) oder nur eine Dauer eingeben, damit ich beides nutzen kann: genau, wenn ich die Uhrzeiten weiss, schnell, wenn ich nur «1:30 für Kunde X» weiss.
- Als Einzelnutzer möchte ich Zeiten nachträglich für frühere Tage erfassen, damit ich vergessene Einträge nachholen kann.
- Als Einzelnutzer möchte ich pro Eintrag eine Beschreibung der Tätigkeit festhalten, damit sie später in der Monatsauswertung für die Rechnung zur Verfügung steht.
- Als Einzelnutzer möchte ich pro Eintrag die verrechenbare Dauer getrennt von der gearbeiteten Dauer angeben, damit ich nur verrechne, was ich verrechnen will (z. B. 2:00 gearbeitet, 1:30 verrechenbar).
- Als Einzelnutzer möchte ich nach dem Speichern auf der Startseite sehen, was ich heute erfasst habe, damit ich sicher bin, dass der Eintrag gespeichert ist.
- Als Einzelnutzer möchte ich die Erfassung auf dem Handy bequem bedienen, damit ich unterwegs Zeiten festhalte.

## Out of Scope
- **Liste aller Zeiten, Bearbeiten und Löschen von Einträgen:** PROJ-5. PROJ-4 zeigt nur die heute erfassten Einträge, nur lesend.
- **Timer (Start/Stopp):** PROJ-6. Der Timer erzeugt später Einträge mit Start- und Endzeit im selben Datenmodell.
- **Wochenübersicht, Monatsauswertung, CSV-Export:** PROJ-7, PROJ-8, PROJ-9.
- **Stundensätze, Beträge, Rechnungserstellung:** laut PRD ausgeschlossen.
- **Einträge über Mitternacht (Ende am Folgetag):** nicht unterstützt, Nachtarbeit wird auf zwei Einträge aufgeteilt.
- **Wiederkehrende oder kopierte Einträge, Vorlagen, Tags, Notizen ausser der Beschreibung:** nicht im MVP.
- **Planung in der Zukunft:** Einträge mit Datum in der Zukunft sind nicht erlaubt.
- **Verrechenbare Dauer grösser als die gearbeitete Dauer** (z. B. Mindestverrechnung): nicht erlaubt.
- **Rundungsregeln** (z. B. auf Viertelstunden): nicht im MVP, es wird minutengenau gespeichert.
- **Zeiten auf einen archivierten Kunden oder ein archiviertes Projekt buchen:** nicht möglich (Spec PROJ-3: archivierte Einträge verschwinden aus den Auswahllisten).

## Acceptance Criteria

**Format:** Angenommen [Vorbedingung] / Wenn [Aktion] / Dann [Ergebnis]

### Einstieg und Startseite
- [ ] Angenommen der Nutzer ist angemeldet, wenn er die Startseite öffnet, dann sieht er den Knopf «Zeit erfassen» und darunter den Abschnitt «Heute» mit den heute erfassten Einträgen und der Tagessumme (gearbeitet und verrechenbar).
- [ ] Angenommen heute ist noch nichts erfasst, wenn der Nutzer die Startseite öffnet, dann sieht er im Abschnitt «Heute» einen Leerzustand mit Hinweis und dem Knopf «Zeit erfassen».
- [ ] Angenommen der Nutzer ist nicht angemeldet, wenn er die Startseite öffnet, dann landet er auf der Anmeldeseite und sieht keine Daten.
- [ ] Angenommen der Nutzer klickt auf «Zeit erfassen», wenn sich das Formular öffnet, dann erscheint es als Dialog am Laptop und als Blatt von unten am Handy, der Fokus liegt im ersten Feld, und alle Felder haben sichtbare Beschriftungen.
- [ ] Angenommen die Daten laden, wenn die Antwort noch aussteht, dann sieht der Nutzer einen Ladezustand; schlägt das Laden fehl, dann erscheint eine Fehlermeldung mit «Erneut versuchen».
- [ ] Angenommen der Abschnitt «Heute» enthält Einträge, wenn die Liste angezeigt wird, dann stehen die Einträge nach Startzeit, bei Einträgen ohne Uhrzeit nach Erfassungszeitpunkt, mit Kürzel und Projekt, Beschreibung (falls vorhanden), Dauer und verrechenbarer Dauer, und es gibt keine Knöpfe zum Bearbeiten oder Löschen (kommt mit PROJ-5).

### Felder und Vorbelegung
- [ ] Angenommen das Formular öffnet sich, wenn noch nichts eingegeben wurde, dann ist das Datum auf heute vorbelegt, der Modus «Dauer» gewählt, und Kunde und Projekt sind mit dem zuletzt erfassten Kunden und Projekt vorbelegt, sofern beide noch aktiv sind (geräteübergreifend aus dem letzten Eintrag abgeleitet).
- [ ] Angenommen es wurde noch nie etwas erfasst oder Kunde bzw. Projekt des letzten Eintrags sind archiviert, wenn das Formular sich öffnet, dann sind Kunde und Projekt leer und müssen gewählt werden.
- [ ] Angenommen der Nutzer wählt einen Kunden, wenn die Projektauswahl erscheint, dann enthält sie nur die aktiven Projekte dieses Kunden (Projekt «Allgemein» zuerst, die übrigen alphabetisch), und die Kundenauswahl enthält nur aktive Kunden, alphabetisch nach Kürzel (mit Name).
- [ ] Angenommen der Nutzer wechselt den Kunden, wenn das bisher gewählte Projekt nicht zum neuen Kunden gehört, dann wird die Projektauswahl geleert (oder auf «Allgemein» gesetzt, wenn es dieses beim neuen Kunden gibt).
- [ ] Angenommen es gibt keinen aktiven Kunden, wenn der Nutzer das Formular öffnet, dann sieht er einen Hinweis «Lege zuerst einen Kunden an» mit Link zu `/kunden`, und es lässt sich nichts speichern.
- [ ] Angenommen das Formular, wenn die Beschreibung eingegeben wird, dann ist sie optional, mehrzeilig und auf höchstens 1000 Zeichen begrenzt; Leerzeichen am Rand werden entfernt, eine leere Beschreibung wird als «keine Beschreibung» gespeichert.

### Eingabe «Dauer»
- [ ] Angenommen der Modus «Dauer», wenn der Nutzer eine Dauer als «1:30», «1,5» oder «1.5» eingibt, dann versteht die App sie als 1 Stunde 30 Minuten; Eingaben wie «abc», «0:00», negative, unvollständige oder mehrdeutige Werte (z. B. «90» ohne Trennzeichen, siehe Edge Cases) führen zu einem Hinweis am Feld.
- [ ] Angenommen eine gültige Dauer, wenn gespeichert wird, dann ist der Eintrag mit Datum und Dauer in ganzen Minuten gespeichert, ohne Start- und Endzeit.
- [ ] Angenommen die Dauer ist länger als 24 Stunden oder kürzer als 1 Minute, wenn der Nutzer speichert, dann erscheint ein Hinweis am Feld, und nichts wird gespeichert.

### Eingabe «Von–bis»
- [ ] Angenommen der Nutzer wechselt zum Modus «Von–bis», wenn er Startzeit und Endzeit eingibt (Format «08:30» bzw. «8:30»), dann wird die Dauer sofort daraus berechnet und angezeigt, und beim Speichern sind Datum, Start- und Endzeit sowie die Dauer in Minuten gespeichert.
- [ ] Angenommen Modus «Von–bis», wenn das Ende nicht nach dem Start liegt (gleich oder davor), dann erscheint ein Hinweis am Feld, und nichts wird gespeichert; Einträge über Mitternacht sind nicht möglich.
- [ ] Angenommen Modus «Von–bis», wenn die Startzeit oder die Endzeit fehlt oder keine gültige Uhrzeit ist, dann erscheint ein Hinweis am Feld.
- [ ] Angenommen das Datum ist heute, wenn die Endzeit in der Zukunft liegt, dann erscheint ein Hinweis am Feld, und nichts wird gespeichert.
- [ ] Angenommen der Nutzer hat im Modus «Von–bis» Werte eingegeben, wenn er zurück zum Modus «Dauer» wechselt, dann bleibt die berechnete Dauer stehen und lässt sich ändern, die Uhrzeiten werden dann nicht gespeichert.
- [ ] Angenommen der neue Eintrag mit Uhrzeiten überschneidet sich zeitlich mit einem bestehenden Eintrag desselben Tages, der ebenfalls Uhrzeiten hat, wenn der Nutzer das Formular ausfüllt, dann erscheint ein Hinweis mit den betroffenen Einträgen, und Speichern bleibt trotzdem möglich (z. B. parallele Arbeit).

### Datum
- [ ] Angenommen das Datumsfeld, wenn der Nutzer ein früheres Datum wählt, dann ist der Eintrag für dieses Datum gespeichert (Nacherfassung ohne untere Grenze).
- [ ] Angenommen das Datum liegt in der Zukunft, wenn der Nutzer speichert, dann erscheint ein Hinweis am Feld, und nichts wird gespeichert.
- [ ] Angenommen das Datumsfeld ist leer oder ungültig, wenn der Nutzer speichert, dann erscheint ein Hinweis am Feld.

### Verrechenbare Dauer
- [ ] Angenommen eine gültige Dauer ist eingegeben, wenn der Nutzer die verrechenbare Dauer nicht anfasst, dann ist sie mit der gearbeiteten Dauer vorbelegt und folgt jeder Änderung der gearbeiteten Dauer.
- [ ] Angenommen der Nutzer hat die verrechenbare Dauer von Hand geändert, wenn er danach die gearbeitete Dauer ändert, dann bleibt seine Eingabe stehen (es sei denn, sie wäre dann grösser als die gearbeitete Dauer, dann erscheint ein Hinweis).
- [ ] Angenommen die verrechenbare Dauer, wenn sie «0» oder «0:00» ist, dann ist das erlaubt (nicht verrechenbar).
- [ ] Angenommen die verrechenbare Dauer ist grösser als die gearbeitete Dauer, wenn der Nutzer speichert, dann erscheint ein Hinweis am Feld, und nichts wird gespeichert.
- [ ] Angenommen die verrechenbare Dauer hat kein gültiges Format, wenn der Nutzer speichert, dann erscheint ein Hinweis am Feld.

### Speichern
- [ ] Angenommen gültige Eingaben, wenn der Nutzer auf «Speichern» klickt, dann schliesst sich das Formular, der Eintrag erscheint sofort im Abschnitt «Heute» (wenn das Datum heute ist), die Tagessumme aktualisiert sich, und eine kurze Bestätigung wird angezeigt.
- [ ] Angenommen der Eintrag hat ein früheres Datum, wenn er gespeichert ist, dann erscheint eine Bestätigung mit dem Datum («Gespeichert am 05.11.2026»), und der Eintrag erscheint nicht unter «Heute».
- [ ] Angenommen Pflichtfelder fehlen (Kunde, Projekt, Datum, Dauer bzw. Start und Ende), wenn der Nutzer speichert, dann erscheint ein Hinweis direkt am Feld, und es wird nichts gespeichert.
- [ ] Angenommen Enter in einem einzeiligen Formularfeld, wenn die Eingaben gültig sind, dann wird gespeichert (in der mehrzeiligen Beschreibung erzeugt Enter einen Zeilenumbruch).
- [ ] Angenommen das Formular wird abgesendet, wenn die Anfrage läuft, dann ist der Speichern-Knopf deaktiviert und zeigt «Wird gespeichert …» (kein doppeltes Absenden); bei einem Fehler (Netzwerk, Dienst) erscheint eine Meldung, und die Eingaben bleiben erhalten.
- [ ] Angenommen der Nutzer schliesst das Formular mit nicht gespeicherten Eingaben (Abbrechen, Escape, Tippen daneben), wenn er es schliesst, dann gehen die Eingaben verloren, und nichts wird gespeichert; der Fokus kehrt zum Knopf «Zeit erfassen» zurück.

### Bedienung, Darstellung, Zugänglichkeit
- [ ] Angenommen die Erfassung, wenn sie bei 320 px, 375 px, 768 px und 1440 px Breite angesehen wird, dann läuft nichts über, es gibt kein horizontales Scrollen, und alle bedienbaren Elemente sind mindestens 44 px hoch.
- [ ] Angenommen ein sehr langer Kundenname, Projektname oder eine lange Beschreibung ohne Leerzeichen, wenn sie in Auswahl, Formular oder «Heute» angezeigt werden, dann brechen sie um oder werden sauber gekürzt, nichts läuft über.
- [ ] Angenommen die Seiten, wenn sie mit Tastatur und Screenreader genutzt werden, dann sind Dialoge fokusgefangen und per Escape schliessbar, der Fokus kehrt nach dem Schliessen zum auslösenden Knopf zurück, Feldfehler sind mit dem Feld verbunden, Meldungen oberhalb des Formulars sind `role=alert`, und Beschriftungen sind immer sichtbar.
- [ ] Angenommen Hell- und Dunkelmodus, wenn die Seiten angesehen werden, dann erfüllen alle Farbpaare WCAG AA (Design-System aus PROJ-11).
- [ ] Angenommen der Nutzer erfasst eine Zeit, wenn er sie auf dem Handy mit vorbelegtem Kunden und Projekt eingibt, dann braucht er höchstens: Knopf, Dauer eintippen, Speichern (ohne Auswahl und ohne Scrollen im Formular).

### Datenschutz und Sicherheit
- [ ] Angenommen ein Zeiteintrag gehört einem Nutzer, wenn ein anderer angemeldeter Nutzer (oder ein Aufruf nur mit dem öffentlichen Schlüssel) Einträge lesen oder ändern will, dann ist das auf Datenbankebene verwehrt (nur eigene Daten).
- [ ] Angenommen ein Eintrag verweist auf ein Projekt, wenn das Projekt einem anderen Nutzer gehört, dann lehnt die Datenbank den Eintrag ab.
- [ ] Angenommen ein Eintrag mit ungültigen Werten (Dauer 0 oder über 24 Std, verrechenbar über gearbeitet, Ende vor Start, Datum in der Zukunft, Beschreibung über 1000 Zeichen) wird direkt an die Datenbank geschickt (Umgehen der Oberfläche), dann lehnt die Datenbank ihn ab.
- [ ] Angenommen ein Eintrag soll direkt in der Datenbank auf ein archiviertes Projekt oder einen archivierten Kunden gebucht werden, dann lehnt die Datenbank ihn ab.
- [ ] Angenommen manipulierte Eingaben (HTML, Skripte, SQL-Zeichen) in der Beschreibung, wenn sie gespeichert und angezeigt werden, dann werden sie als reiner Text behandelt.
- [ ] Angenommen ein Projekt wird später umbenannt oder archiviert, wenn bereits Zeiten darauf erfasst sind, dann bleiben diese Zeiten erhalten und zeigen den aktuellen Namen (Spec PROJ-3); die Datenbank verhindert, dass ein Projekt mit erfassten Zeiten verschwindet (kein Löschen).

## Edge Cases
- **Doppelklick auf «Speichern»:** Es entsteht nur ein Eintrag.
- **Zwei Geräte erfassen gleichzeitig:** Beide Einträge werden gespeichert (kein Konflikt, jeder Eintrag ist eigenständig); der Abschnitt «Heute» zeigt den anderen Eintrag beim nächsten Laden.
- **Projekt oder Kunde wird auf einem anderen Gerät archiviert, während das Formular offen ist:** Beim Speichern lehnt die Datenbank den Eintrag ab, der Nutzer sieht den Hinweis «Dieses Projekt ist archiviert. Wähle ein anderes Projekt oder reaktiviere es unter Kunden», und die Eingaben bleiben erhalten.
- **Dauer «90» ohne Trennzeichen:** Wird nicht als 90 Minuten und nicht als 90 Stunden gedeutet, sondern mit dem Hinweis «Bitte als Std:Min eingeben, z. B. 1:30» abgelehnt (vermeidet Fehlerfassung).
- **Dezimaleingabe mit Komma und Punkt («1,5», «1.5», «0,25»):** Beides wird verstanden; 0,25 entspricht 15 Minuten; mehr als 2 Nachkommastellen werden auf die Minute gerundet.
- **Eintrag um 23:30 bis 00:30:** Nicht möglich (Ende nach Start am selben Tag); der Hinweis erklärt, dass Nachtarbeit auf zwei Einträge verteilt wird.
- **Gearbeitete Dauer wird verkürzt, verrechenbare Dauer von Hand gesetzt:** Siehe Akzeptanzkriterien; ist sie grösser, erscheint ein Hinweis, und Speichern ist erst möglich, wenn sie angepasst ist.
- **Nacherfassung für ein Datum, an dem der Kunde damals schon bestand, aber heute archiviert ist:** Nicht möglich, die Auswahl zeigt nur aktive Kunden und Projekte. Der Nutzer muss den Kunden zuerst reaktivieren (PROJ-3).
- **Sitzung abgelaufen, während das Formular offen ist:** Beim Speichern erscheint ein Hinweis, die Eingaben bleiben erhalten, und der Nutzer wird zur Anmeldung geleitet.
- **Supabase nicht erreichbar oder pausiert:** Fehlermeldung mit «Erneut versuchen», keine leere Seite; beim Speichern bleibt das Formular mit den Eingaben offen.
- **Zeitwechsel (Sommer-/Winterzeit):** Einträge von–bis gelten als Uhrzeiten des jeweiligen Tages, die Dauer ergibt sich aus der Differenz der Uhrzeiten auf der Uhr (kein Sonderfall im MVP).
- **Mehrere Tausend Einträge:** Die Startseite lädt nur die Einträge von heute, nicht alle (Performance).
- **Sehr lange Beschreibung (1000 Zeichen) am Handy:** Das Feld wächst oder scrollt, die Anzeige in «Heute» bricht um oder wird gekürzt (mit Möglichkeit, den vollen Text zu sehen).

## Technical Requirements (optional)
- **Sicherheit:** Authentifizierung erforderlich (PROJ-2). Daten gehören dem Nutzer, Zugriff nur auf eigene Datensätze, abgesichert in der Datenbank selbst. Regeln (Dauer, Datum, Verrechenbar, Archivierung) gelten in der Datenbank.
- **Datenintegrität:** Einträge verweisen auf Projekte; Projekte mit Einträgen lassen sich nicht löschen (kein Löschen im Projekt). Dauern in ganzen Minuten.
- **Performance:** Startseite mit «Heute» in unter 1 Sekunde sichtbar; Erfassen ohne spürbare Verzögerung.
- **Browser:** Chrome, Firefox, Safari, Handy und Desktop (responsive, mobile-first, 44 px Ziele).
- **Design:** `docs/design-system.md`, WCAG AA, shadcn/ui vor eigenen Komponenten.

## Open Questions
- [ ] **Mehrere Einträge nacheinander (Nacherfassung eines ganzen Tages):** Genügt das erneute Öffnen mit vorbelegtem Kunden und Projekt, oder braucht es einen Knopf «Speichern und weiteren Eintrag»? Entscheidung beim Bau der Oberfläche.
- [ ] **Untere Grenze beim Datum:** Heute keine (Nacherfassung beliebig weit zurück). Falls Tippfehler im Jahr auffallen sollen, könnte ein Hinweis bei Daten älter als ein Jahr ergänzt werden.
- [x] **Zeitzone:** Entschieden in `/architecture`: «heute» und «nicht in der Zukunft» gelten nach der Zürcher Uhr, Uhrzeiten werden als Wanduhrzeit ohne Zeitzone gespeichert (vom Nutzer bestätigt: Einzelnutzer in der Schweiz).

## Decision Log

### Product Decisions
| Decision | Rationale | Date |
|----------|-----------|------|
| Ein Eintrag hat Datum und Dauer (Minuten); Uhrzeiten von–bis sind optional und werden gespeichert, wenn sie eingegeben wurden | Beides möglich laut PRD («von–bis oder Dauer»); der Timer (PROJ-6) liefert später Start und Ende im selben Modell | 2026-11-13 |
| Verrechenbare Dauer als eigenes Feld, vorbelegt mit der gearbeiteten Dauer, nicht grösser als diese, 0 erlaubt | Monatsauswertung braucht «gearbeitet» und «verrechenbar» getrennt; Vorbelegung hält das Erfassen schnell | 2026-11-13 |
| Dauern minutengenau, Eingabe «Std:Min» oder Dezimal (Komma oder Punkt) | Genau und flexibel; Rundung nach Bedarf später in der Auswertung | 2026-11-13 |
| Kunde und Projekt in zwei Auswahlen, zuletzt benutztes vorbelegt, nur aktive Einträge | 10-Sekunden-Ziel (Erfolgsmetrik 2); archivierte Einträge verschwinden aus Auswahllisten (Spec PROJ-3) | 2026-11-13 |
| Beschreibung optional, bis 1000 Zeichen | Schnelles Erfassen hat Vorrang; fehlende Texte lassen sich in PROJ-5 nachtragen | 2026-11-13 |
| Ende muss nach dem Start am selben Tag liegen; Überschneidungen mit Hinweis, aber nicht verboten | Verhindert Rechenfehler, erlaubt Parallelarbeit und blockiert Nacherfassung nicht; Nachtarbeit wird auf zwei Einträge verteilt | 2026-11-13 |
| Datum heute vorbelegt, nicht in der Zukunft, Dauer 1 Minute bis 24 Stunden | Schützt vor Tippfehlern im Jahr oder in der Dauer; Nacherfassung ohne untere Grenze | 2026-11-13 |
| Erfassen auf der Startseite mit Knopf «Zeit erfassen» und Abschnitt «Heute» (nur lesen) | Schnellster Weg zum Erfassen und sofortige Bestätigung; Liste, Bearbeiten, Löschen bleiben PROJ-5 | 2026-11-13 |
| Zeiten auf archivierte Kunden und Projekte nicht möglich, auch nicht direkt an der Datenbank | Konsistent mit PROJ-3; Reaktivieren genügt, wenn nachträglich etwas gebucht werden muss | 2026-11-13 |

### Technical Decisions
<!-- Added by /architecture -->
| Decision | Rationale | Date |
|----------|-----------|------|
| Eine Tabelle «Zeiteinträge» in Supabase, Zugriff direkt über Supabase ohne eigene API-Routen, wie PROJ-3 | Zugriffsregeln der Datenbank (Row Level Security) schützen die Daten; ein Server-Zwischenschritt würde nichts schützen | 2026-11-13 |
| Ein Zeiteintrag gehört genau einem Projekt (nur die Projekt-ID); der Kunde ergibt sich über das Projekt | Eine einzige Verknüpfung, Umbenennen wirkt rückwirkend (Spec PROJ-3), kein Namens-Schnappschuss | 2026-11-13 |
| Gespeichert werden Datum, Dauer und verrechenbare Dauer in ganzen Minuten; Start und Ende als optionale Uhrzeiten ohne Zeitzone | Ein einheitliches Modell für manuelle Einträge und den späteren Timer; Summen und Auswertungen rechnen nur mit Minuten | 2026-11-13 |
| Konsistenz von Dauer und Uhrzeiten in der Datenbank erzwungen: Start und Ende nur zusammen, Ende nach Start, Dauer = Differenz | Verhindert widersprüchliche Einträge auch an der Oberfläche vorbei | 2026-11-13 |
| «Heute» und «nicht in der Zukunft» gelten nach der Uhr in Zürich (Europe/Zurich), in Oberfläche und Datenbank gleich | Ein Nutzer in der Schweiz; unabhängig von der Zeitzone des Geräts (Reisen, falsche Geräteuhr) kein Streit zwischen Anzeige und Datenbank | 2026-11-13 |
| Die Datenbank prüft das Datum (nicht in der Zukunft) und die Archivierung (Kunde und Projekt aktiv) beim Anlegen. Die Endzeit «nicht in der Zukunft» prüft nur die Oberfläche | Ein Eintrag, der gerade eben endet, soll nicht an einer Minute Uhrenabweichung scheitern | 2026-11-13 |
| Überschneidungs-Hinweis nur in der Oberfläche (aus den Einträgen desselben Tages), nicht in der Datenbank | Spec: nur Hinweis, kein Verbot; Parallelarbeit bleibt möglich | 2026-11-13 |
| Kunde und Projekt des zuletzt erfassten Eintrags (nach Anlegezeitpunkt) als Vorbelegung, ohne eigene Merk-Tabelle | Funktioniert geräteübergreifend ohne zusätzliche Daten; der Wert wird beim Öffnen des Formulars ermittelt | 2026-11-13 |
| Kein Löschen in PROJ-4; die Datenbank erlaubt aber schon das Ändern eigener Zeilen für PROJ-5 | PROJ-5 braucht Bearbeiten und Löschen; die Regeln (Besitzer, Grenzen) stehen dann schon, das Löschrecht wird erst dort mit eigener Freigabe vergeben | 2026-11-13 |
| Daten werden im Browser geladen (Datenschicht mit Schnittstelle, Platzhalter zuerst), wie bei PROJ-3 | Bewährtes Muster dieses Projekts; die Oberfläche lässt sich vor dem Backend vollständig prüfen | 2026-11-13 |
| Datum und Uhrzeiten über die eingebauten Felder des Browsers, kein neues Kalender-Paket | Am Handy der bekannte Wähler des Geräts, am Laptop Tastatureingabe; keine neue Abhängigkeit | 2026-11-13 |
| Dauer-Eingabe über eine gemeinsame Prüf- und Format-Funktion (Std:Min, Dezimal, Ablehnung von «90») an einer Stelle | Formular, Anzeige und spätere Features (Timer, Auswertung) nutzen dieselbe Regel | 2026-11-13 |
| Index auf Besitzer und Datum sowie auf das Projekt | «Heute» jetzt, Wochen- und Monatsauswertung (PROJ-7, PROJ-8) und Export später ohne Umbau schnell | 2026-11-13 |

---
<!-- Sections below are added by subsequent skills -->

## Tech Design (Solution Architect)

### Backend nötig?
Ja. Zeiteinträge sind die **wichtigsten Daten der App** und müssen geräteübergreifend in Supabase liegen. Es kommt eine neue Tabelle «Zeiteinträge» dazu, abgesichert wie die Kunden und Projekte aus PROJ-3 (nur eigene Daten, Regeln in der Datenbank). Eigene Schnittstellen (API-Routen) sind nicht nötig: Die Seite liest und schreibt direkt über Supabase. Die Oberfläche baut `/frontend`, Tabelle und Regeln baut `/backend`.

### A) Seitenstruktur
```
App-Bereich (geschützt, mit Navigation)
+-- Startseite «/» (ersetzt den Willkommens-Platzhalter, Adresse bleibt)
|   +-- Kopf: Titel «Heute» mit dem Datum und Knopf «Zeit erfassen»
|   +-- Tagessumme: gearbeitet und verrechenbar
|   +-- Liste «Heute» (nur lesen)
|   |   +-- Eintrag: Kürzel · Projekt, Beschreibung, Dauer, verrechenbar, Uhrzeiten (falls vorhanden)
|   +-- Leerzustand: Erklärung und Knopf «Zeit erfassen»
|   +-- Ladezustand und Fehlerzustand mit «Erneut versuchen»
+-- Formular «Zeit erfassen» (Dialog am Laptop, Blatt von unten am Handy)
    +-- Datum (heute vorbelegt)
    +-- Kunde, Projekt (zuletzt benutztes vorbelegt, nur aktive)
    +-- Umschalter: «Dauer» oder «Von–bis»
    |   +-- Dauer: ein Feld, z. B. 1:30
    |   +-- Von–bis: Start, Ende, daraus berechnete Dauer
    +-- Verrechenbar (vorbelegt mit der gearbeiteten Dauer)
    +-- Beschreibung (optional, mehrzeilig)
    +-- Hinweise: Überschneidung, kein aktiver Kunde, Fehler beim Speichern
    +-- Knöpfe «Abbrechen» und «Speichern»
```
Bei **keinem aktiven Kunden** zeigt das Formular statt der Felder den Hinweis «Lege zuerst einen Kunden an» mit Link zu «/kunden».

### B) Bausteine
- **Vorhandene shadcn-Bausteine:** Card, Dialog und Sheet (über den vorhandenen Rahmen aus PROJ-3), Form, Input (auch für Datum und Uhrzeit), Select (Kunde, Projekt), Tabs (Umschalter Dauer/Von–bis), Textarea, Button, Alert, Badge, Skeleton, Sonner. Nichts Neues zu installieren.
- **Neue eigene Zusammensetzungen:** Startseite mit Kopf und Tagessumme, Liste «Heute» mit Eintragszeile, Zeiterfassungs-Formular, Hinweis auf Überschneidung, Leer- und Fehlerzustand.
- **Wiederverwendet aus PROJ-3:** `ResponsiveDialog` (Dialog/Blatt, Fokus kehrt zurück), `AuthNotice` für Formularfehler, Lade- und Fehlerzustände, Hook für das Laden mit Neuladen.
- **Gemeinsame Prüfregeln und Formate an einer Stelle:** Dauer lesen und anzeigen («1:30», «1,5», «1.5»; «90» abgelehnt), Uhrzeiten, Datum (nicht in der Zukunft, nach Zürcher Uhr), verrechenbar nicht grösser als gearbeitet, Beschreibung höchstens 1000 Zeichen. Formular und Datenbank kennen dieselben Grenzen.
- **Startseite:** Der Willkommens-Platzhalter wird ersetzt. Das Logo bleibt in der Navigation; der Systemstatus ist ohnehin dort erreichbar.

### C) Datenmodell (in Alltagssprache)
```
Jeder Zeiteintrag hat:
- Eindeutige ID
- Besitzer (der angemeldete Nutzer, wird automatisch gesetzt, unveränderlich)
- Projekt (gehört genau einem Projekt des Besitzers; der Kunde ergibt sich daraus)
- Datum (nicht in der Zukunft, nach der Uhr in Zürich)
- Dauer in Minuten (1 bis 1440)
- Verrechenbare Dauer in Minuten (0 bis zur Dauer)
- Startzeit und Endzeit (beide oder keine; Uhrzeiten ohne Zeitzone; Ende nach Start; Dauer = Ende minus Start)
- Beschreibung (optional, 1 bis 1000 Zeichen, ohne Leerzeichen am Rand; leer wird «keine»)
- Angelegt am, zuletzt geändert am

Gespeichert in: Supabase (PostgreSQL), geräteübergreifend.
```
Was **nicht** gespeichert wird: ein Namens-Schnappschuss von Kunde und Projekt (Umbenennen wirkt rückwirkend, Spec PROJ-3) und die Eingabeart (Dauer oder Von–bis). Ob Uhrzeiten vorhanden sind, ergibt sich daraus, ob Start und Ende gesetzt sind.

### D) Regeln in der Datenbank (das Sicherheitsnetz)
- **Nur eigene Daten:** Lesen, Anlegen und Ändern nur auf eigenen Zeilen (Row Level Security). Der Besitzer wird von der Datenbank gesetzt und lässt sich nicht ändern. Ohne Anmeldung ist nichts lesbar oder schreibbar.
- **Projekt gehört dem Besitzer:** Ein Eintrag kann nur auf ein Projekt des eigenen Kontos zeigen (wie bei Projekt und Kunde in PROJ-3).
- **Kein Löschen in PROJ-4:** Es gibt weder Knopf noch Datenbankrecht zum Löschen. PROJ-5 vergibt es später mit eigener Freigabe. Ein Projekt mit Zeiteinträgen lässt sich ohnehin nie löschen.
- **Grenzen und Konsistenz:** Dauer 1 bis 1440 Minuten, verrechenbar 0 bis zur Dauer, Start und Ende nur zusammen, Ende nach Start, Dauer passt zu den Uhrzeiten, Beschreibung höchstens 1000 Zeichen. Wer die Oberfläche umgeht, scheitert trotzdem.
- **Datum nicht in der Zukunft:** Die Datenbank vergleicht mit dem heutigen Datum in Zürich.
- **Nur aktive Ziele beim Anlegen:** Neue Einträge auf ein archiviertes Projekt oder einen archivierten Kunden lehnt die Datenbank ab. Bereits erfasste Einträge bleiben unverändert erhalten und zählen in Auswertung und Export weiter.
- **Nicht in der Datenbank:** Überschneidungen (nur Hinweis in der Oberfläche) und die Endzeit «nicht in der Zukunft» (nur Oberfläche, damit eine Minute Uhrenabweichung nicht stört).

### E) Ablauf in Worten
1. **Startseite laden:** Die Seite lädt die Einträge von heute (Datum nach Zürcher Uhr) mit Kürzel, Kundenname und Projektname und bildet die Tagessummen. Sie ist wie alle anderen Seiten geschützt (PROJ-2).
2. **Formular öffnen:** Es lädt die aktiven Kunden mit ihren aktiven Projekten und ermittelt den zuletzt erfassten Eintrag. Sind dessen Kunde und Projekt noch aktiv, werden sie vorbelegt. Datum ist heute, der Modus «Dauer».
3. **Eingeben:** Die Dauer wird beim Tippen geprüft und angezeigt. Im Modus «Von–bis» berechnet die Oberfläche die Dauer. Die verrechenbare Dauer folgt der gearbeiteten, bis der Nutzer sie von Hand ändert. Bei Uhrzeiten werden die Einträge desselben Tages geladen, und eine Überschneidung erscheint als Hinweis.
4. **Speichern:** Das Formular prüft alles erneut, sendet den Eintrag, und die Datenbank prüft die Regeln ein zweites Mal. Danach schliesst es sich, die Liste «Heute» lädt neu, und eine kurze Bestätigung erscheint (bei früherem Datum mit dem Datum).
5. **Fehler:** Archiviertes Ziel, Netzwerk, abgelaufene Sitzung und Dienstfehler werden in verständliche Meldungen übersetzt, die Eingaben bleiben erhalten (Muster aus PROJ-2 und PROJ-3).

### F) Tech-Entscheidungen (für Nicht-Techniker begründet)
- **Eine Tabelle, direkt über Supabase:** Wie bei den Kunden schützt die Datenbank selbst die Daten. Ein Server-Zwischenschritt würde nichts schützen und mehr Code bedeuten.
- **Minuten als einzige Rechengrösse:** Summen für Tag, Woche und Monat sind einfache Additionen ohne Rundungsfehler. Das Anzeigeformat «1:30» entsteht erst bei der Darstellung. Der Timer (PROJ-6) und die Auswertungen (PROJ-7 bis PROJ-9) bauen darauf auf.
- **Uhrzeiten optional neben der Dauer:** Ein Eintrag «1:30 für Kunde X» braucht keine Uhrzeit, ein Eintrag «08:30 bis 10:00» behält sie. So kann PROJ-5 sie später anzeigen und bearbeiten, und der Timer füllt dieselben Felder.
- **Feste Zeitzone Zürich für «heute»:** Das Gerät kann eine andere Zeitzone oder eine falsche Uhr haben. Mit einer festen Zeitzone sehen Oberfläche und Datenbank denselben «heute»-Tag. Wer später in einer anderen Zeitzone arbeiten will, braucht eine Einstellung (nicht im MVP).
- **Datenbank prüft Datum und Archivierung, Oberfläche prüft Endzeit und Überschneidung:** Alles, was die Datenintegrität betrifft, steht in der Datenbank. Was unscharf sein darf (eine Minute Uhrenabweichung, bewusst erlaubte Überschneidung), prüft nur die Oberfläche.
- **Vorbelegung aus dem letzten Eintrag:** Keine zusätzliche Tabelle oder Einstellung. Der letzte Eintrag ist die Quelle, auf jedem Gerät gleich.
- **Browser lädt, Browser schreibt:** Wie bei PROJ-3 (Datenschicht mit Schnittstelle, zuerst Platzhalter, dann Supabase). Der Schutz liegt in der Datenbank; ein Laden im Server wäre nur ein schnellerer erster Anblick.
- **Eingebaute Datums- und Zeitfelder des Browsers:** Am Handy der gewohnte Wähler, am Laptop Tastatur. Kein neues Kalender-Paket.

### G) Abhängigkeiten (Pakete)
Keine neuen. Vorhanden und genutzt: `react-hook-form`, `zod`, `@hookform/resolvers` (Formular und Prüfregeln), `@supabase/ssr`, `@supabase/supabase-js` (Zugriff), `sonner` (Meldungen), `lucide-react` (Symbole).

### H) Risiken und Hinweise für Bau und QA
- **Dauer-Eingabe ist der heikelste Teil:** «1:30», «1,5», «1.5», «0,25» und «90» müssen eindeutig behandelt werden. Viele Fälle gehören in Komponententests (reine Funktionen), nicht nur in E2E.
- **Zeitzone:** Sommer-/Winterzeit und die Mitternachtsgrenze testen («heute» kurz nach 00:00 und kurz vor 24:00 in Zürich). Die Uhr des Browsers lässt sich in Playwright steuern.
- **Zusammenspiel mit PROJ-3:** Beim Anlegen darf kein archivierter Kunde oder kein archiviertes Projekt gebucht werden, auch nicht durch Archivieren auf einem anderen Gerät, während das Formular offen ist (Datenbank lehnt ab, Oberfläche zeigt den Hinweis).
- **Testdaten:** E2E-Tests legen Einträge auf eigene Testkunden mit Präfix «T-» an. Solange es kein Löschen gibt (kommt mit PROJ-5), bleiben Testeinträge im Konto bestehen und würden in späteren Auswertungen mitzählen. Mögliche Lösung: Testeinträge auf archivierte Testkunden beschränken oder später ein eigenes Testkonto.
- **Mobile:** Formular im Blatt von unten, die Tastatur auf dem Handy darf das Speichern nicht verdecken; 44-px-Ziele; 320 px Breite prüfen.
- **Performance:** Die Startseite lädt nur die Einträge von heute. Index auf Besitzer und Datum, damit auch spätere Wochen- und Monatsabfragen schnell bleiben.
- **PROJ-5 kommt danach:** Die Tabelle erlaubt schon das Ändern eigener Zeilen, Löschen erst mit PROJ-5.

## QA Test Results
_To be added by /qa_

## Deployment
_To be added by /deploy_
