# PROJ-3: Kunden- und Projektverwaltung

## Status: Architected
**Created:** 2026-11-11
**Last Updated:** 2026-11-11

## Dependencies
- Requires: PROJ-1 (Supabase Infrastructure Setup) — Datenbank und Schema-Entwurf (Kunde, Projekt)
- Requires: PROJ-2 (Anmeldung) — alle Seiten sind geschützt, Daten gehören dem angemeldeten Nutzer
- Requires: PROJ-11 (Design-System-Basis) — Navigation, Layout und Theme
- Wird gebraucht von: PROJ-4 (Zeiterfassung), PROJ-6 (Timer), PROJ-7, PROJ-8, PROJ-9 (Auswertung, Export)

## User Stories
- Als Einzelnutzer möchte ich Kunden mit Kürzel und Namen anlegen, damit ich meine Zeiten später dem richtigen Kunden zuordnen kann.
- Als Einzelnutzer möchte ich zu jedem Kunden Projekte mit Name und Projektnummer anlegen, damit ich Zeiten pro Projekt erfasse und auf der Rechnung zuordnen kann.
- Als Einzelnutzer möchte ich, dass beim Anlegen eines Kunden automatisch ein Projekt «Allgemein» entsteht, damit ich sofort Zeiten erfassen kann, ohne zuerst ein Projekt zu erfinden.
- Als Einzelnutzer möchte ich Kunden und Projekte bearbeiten, damit ich Tippfehler und geänderte Namen überall korrigieren kann.
- Als Einzelnutzer möchte ich Kunden und Projekte archivieren und wieder aktivieren, damit abgeschlossene Aufträge die Auswahl nicht verstopfen, aber alte Zeiten und Auswertungen erhalten bleiben.
- Als Einzelnutzer möchte ich die Verwaltung auf dem Handy bequem bedienen, damit ich unterwegs einen neuen Kunden anlegen kann.

## Out of Scope
- **Löschen** von Kunden und Projekten: bewusst nicht vorgesehen, Archivieren genügt (schützt alte Zeiten und Auswertungen).
- **Weitere Felder** (Adresse, Kundennummer, Notiz, Farbe, Stundensatz): nicht im MVP. Stundensätze und Beträge sind laut PRD ausdrücklich ausgeschlossen.
- **Zeiten direkt auf einem Kunden ohne Projekt:** Jeder Zeiteintrag gehört zu einem Projekt (PROJ-4).
- **Zeiterfassung, Timer, Auswertung, Export:** eigene Features (PROJ-4, PROJ-6, PROJ-7, PROJ-8, PROJ-9). PROJ-3 liefert nur die Stammdaten.
- **Anzeige von Stunden pro Kunde oder Projekt** auf den Verwaltungsseiten: kommt mit den Auswertungen.
- **Sortierung per Drag and Drop, Favoriten, Suche und Filter:** nicht im MVP, die Liste ist alphabetisch nach Kürzel.
- **Importe** (aus Excel oder anderen Tools): nicht im MVP.
- **Mehrere Nutzer, Teams, Freigaben:** laut PRD ausgeschlossen.

## Acceptance Criteria

**Format:** Angenommen [Vorbedingung] / Wenn [Aktion] / Dann [Ergebnis]

### Navigation und Seitenschutz
- [ ] Angenommen der Nutzer ist angemeldet, wenn er die Navigation ansieht, dann gibt es den Eintrag «Kunden» (Seitenleiste und Tab-Leiste) mit der Adresse `/kunden`, und er ist beim Besuch von `/kunden` und darunter als aktiv markiert.
- [ ] Angenommen der Nutzer ist nicht angemeldet, wenn er `/kunden` oder eine Kundenseite öffnet, dann landet er auf der Anmeldeseite und sieht keine Daten.
- [ ] Angenommen ein Kunde existiert nicht oder gehört nicht dem Nutzer, wenn er dessen Adresse öffnet, dann sieht er eine Hinweisseite «Kunde nicht gefunden» mit Link zurück zur Liste und keine fremden Daten.

### Kundenliste
- [ ] Angenommen es gibt noch keinen Kunden, wenn der Nutzer `/kunden` öffnet, dann sieht er einen Leerzustand mit Erklärung und dem Knopf «Ersten Kunden anlegen».
- [ ] Angenommen aktive Kunden existieren, wenn der Nutzer `/kunden` öffnet, dann sieht er sie als Karten mit Kürzel, Name und Anzahl aktiver Projekte, alphabetisch nach Kürzel sortiert, und oben den Knopf «Neuer Kunde».
- [ ] Angenommen archivierte Kunden existieren, wenn der Nutzer `/kunden` öffnet, dann stehen sie in einer eingeklappten Liste «Archiv» unten, die sich öffnen lässt.
- [ ] Angenommen eine Kundenkarte, wenn der Nutzer sie antippt oder per Tastatur auslöst, dann öffnet sich die Kundenseite.
- [ ] Angenommen die Daten laden, wenn die Antwort noch aussteht, dann sieht der Nutzer einen Ladezustand; schlägt das Laden fehl, dann erscheint eine Fehlermeldung mit «Erneut versuchen».

### Kunde anlegen
- [ ] Angenommen der Nutzer klickt auf «Neuer Kunde», wenn sich das Formular öffnet, dann enthält es die Felder «Kürzel» und «Name» (Dialog am Laptop, Blatt von unten am Handy), mit sichtbaren Beschriftungen und dem Fokus im ersten Feld.
- [ ] Angenommen gültige Eingaben, wenn der Nutzer auf «Speichern» klickt, dann ist der Kunde angelegt, es entsteht automatisch das aktive Projekt «Allgemein» ohne Projektnummer, das Formular schliesst sich, der Kunde erscheint in der Liste, und eine Bestätigung wird kurz angezeigt.
- [ ] Angenommen Kürzel oder Name fehlen, wenn der Nutzer speichert, dann erscheint ein Hinweis direkt am Feld, und es wird nichts gespeichert.
- [ ] Angenommen das Kürzel enthält andere Zeichen als Buchstaben, Ziffern und Bindestrich oder ist kürzer als 2 oder länger als 10 Zeichen, wenn der Nutzer speichert, dann erscheint ein Hinweis am Feld.
- [ ] Angenommen der Name ist länger als 100 Zeichen, wenn der Nutzer speichert, dann erscheint ein Hinweis am Feld.
- [ ] Angenommen das Kürzel wird in Kleinbuchstaben eingegeben, wenn der Kunde gespeichert wird, dann ist es in Grossbuchstaben gespeichert; Leerzeichen am Rand des Namens und des Kürzels werden entfernt.
- [ ] Angenommen es gibt schon einen Kunden mit demselben Kürzel oder demselben Namen (Gross- und Kleinschreibung egal, auch archivierte), wenn der Nutzer speichert, dann erscheint am Feld «Dieses Kürzel gibt es schon» bzw. «Diesen Kunden gibt es schon», bei archivierten mit dem Zusatz «(im Archiv)», und nichts wird gespeichert.

### Kundenseite und Projekte
- [ ] Angenommen der Nutzer öffnet einen Kunden, wenn die Seite lädt, dann sieht er Kürzel und Name mit den Aktionen «Bearbeiten» und «Archivieren», darunter die aktiven Projekte (Name und Projektnummer, alphabetisch nach Name) und den Knopf «Neues Projekt».
- [ ] Angenommen der Nutzer klickt auf «Neues Projekt», wenn er einen gültigen Namen (1 bis 100 Zeichen) und optional eine Projektnummer (höchstens 30 Zeichen, freier Text) eingibt und speichert, dann ist das Projekt beim Kunden angelegt und in der Liste sichtbar.
- [ ] Angenommen der Projektname fehlt oder ist zu lang oder die Projektnummer ist länger als 30 Zeichen, wenn der Nutzer speichert, dann erscheint ein Hinweis am Feld, und nichts wird gespeichert.
- [ ] Angenommen der Kunde hat schon ein Projekt mit gleichem Namen (Gross- und Kleinschreibung egal, auch archiviert), wenn der Nutzer speichert, dann erscheint am Feld «Dieses Projekt gibt es bei diesem Kunden schon», bei archivierten mit «(im Archiv)».
- [ ] Angenommen zwei verschiedene Kunden, wenn beide ein Projekt «Allgemein» haben, dann ist das erlaubt (der Name ist nur pro Kunde eindeutig).
- [ ] Angenommen zwei Projekte haben dieselbe Projektnummer, wenn gespeichert wird, dann ist das erlaubt (die Nummer muss nicht eindeutig sein).
- [ ] Angenommen archivierte Projekte existieren, wenn der Nutzer die Kundenseite öffnet, dann stehen sie in einer eingeklappten Liste «Archiv» des Kunden.
- [ ] Angenommen ein Kunde hat kein aktives Projekt, wenn die Kundenseite geladen wird, dann erscheint ein Hinweis «Lege ein Projekt an, um Zeiten zu erfassen» mit dem Knopf «Neues Projekt».

### Bearbeiten
- [ ] Angenommen der Nutzer klickt bei einem Kunden oder Projekt auf «Bearbeiten», wenn sich das Formular öffnet, dann sind die aktuellen Werte vorausgefüllt, und es gelten dieselben Prüfregeln wie beim Anlegen (der eigene Eintrag zählt nicht als Duplikat).
- [ ] Angenommen der Nutzer ändert Kürzel, Name oder Projektnummer, wenn er speichert, dann gilt die Änderung überall, auch für bereits erfasste Zeiten (rückwirkend), und die Anzeige aktualisiert sich ohne Neuladen.
- [ ] Angenommen der Nutzer schliesst ein Formular mit nicht gespeicherten Änderungen (Abbrechen, Escape, Tippen daneben), wenn er es schliesst, dann gehen die Änderungen verloren, ohne dass etwas gespeichert wird.

### Archivieren und Reaktivieren
- [ ] Angenommen der Nutzer klickt bei einem Projekt auf «Archivieren», wenn er die Rückfrage bestätigt, dann ist das Projekt archiviert, steht im Archiv des Kunden und erscheint nicht mehr in Auswahllisten für neue Zeiten und den Timer.
- [ ] Angenommen der Nutzer klickt bei einem Kunden auf «Archivieren», wenn er die Rückfrage bestätigt (die Rückfrage nennt die Folge für die Projekte), dann sind der Kunde und alle seine Projekte archiviert, und der Kunde steht im Archiv der Liste.
- [ ] Angenommen ein archivierter Kunde, wenn der Nutzer ihn reaktiviert (ohne Rückfrage), dann ist der Kunde wieder aktiv, und es sind nur die Projekte wieder aktiv, die zusammen mit dem Kunden archiviert wurden; vorher einzeln archivierte Projekte bleiben im Archiv des Kunden.
- [ ] Angenommen ein archiviertes Projekt eines aktiven Kunden, wenn der Nutzer es reaktiviert (ohne Rückfrage), dann ist es wieder aktiv.
- [ ] Angenommen ein archiviertes Projekt eines archivierten Kunden, wenn die Kundenseite geöffnet wird, dann lässt sich das Projekt nicht einzeln reaktivieren, und ein Hinweis nennt, dass zuerst der Kunde reaktiviert werden muss.
- [ ] Angenommen der Nutzer archiviert oder reaktiviert etwas, wenn die Anfrage läuft, dann ist der Knopf deaktiviert (kein doppeltes Absenden), und bei einem Fehler erscheint eine Meldung, der Zustand bleibt unverändert.
- [ ] Angenommen ein Kunde oder Projekt wird archiviert, wenn bereits Zeiten dazu erfasst sind, dann bleiben diese Zeiten unverändert erhalten (sichtbar in späteren Auswertungen und im Export mit dem aktuellen Namen).
- [ ] Angenommen es gibt weder in der Oberfläche noch in der Datenbank eine Möglichkeit zu löschen, wenn der Nutzer die Verwaltung bedient, dann gibt es nirgends einen Knopf «Löschen».

### Bedienung, Darstellung, Zugänglichkeit
- [ ] Angenommen ein Formular, wenn es abgesendet wird, dann ist der Speichern-Knopf während der Anfrage deaktiviert und zeigt «Wird gespeichert …»; bei einem Fehler (Netzwerk, Dienst) erscheint eine Meldung, die Eingaben bleiben erhalten.
- [ ] Angenommen Enter in einem Formularfeld, wenn die Eingaben gültig sind, dann wird gespeichert.
- [ ] Angenommen die Verwaltungsseiten, wenn sie bei 375 px, 768 px und 1440 px Breite angesehen werden, dann läuft nichts über, es gibt kein horizontales Scrollen, und alle bedienbaren Elemente sind mindestens 44 px hoch.
- [ ] Angenommen die Verwaltungsseiten, wenn sie mit Tastatur und Screenreader genutzt werden, dann sind Dialoge fokusgefangen und per Escape schliessbar, Fehler werden als `role=alert` angesagt, und Beschriftungen sind immer sichtbar.
- [ ] Angenommen Hell- und Dunkelmodus, wenn die Seiten angesehen werden, dann erfüllen alle Farbpaare WCAG AA (Design-System aus PROJ-11).
- [ ] Angenommen die Seiten, wenn sie geladen werden, dann tragen sie die Titel «Kunden · Time Tracker Light» bzw. «<Kürzel> · Time Tracker Light».

### Datenschutz und Sicherheit
- [ ] Angenommen ein Kunde oder Projekt gehört einem Nutzer, wenn ein anderer angemeldeter Nutzer (oder ein Aufruf mit nur dem öffentlichen Schlüssel) Daten lesen oder ändern will, dann ist das auf Datenbankebene verwehrt (nur eigene Daten).
- [ ] Angenommen manipulierte Eingaben (HTML, Skripte, SQL-Zeichen, sehr lange Texte) in Kürzel, Name oder Projektnummer, wenn sie gespeichert und angezeigt werden, dann werden sie als reiner Text behandelt und führen nicht zu Fehlern oder Skriptausführung.
- [ ] Angenommen eine Datenbankregel, wenn ein Eintrag mit ungültigen Werten direkt an die Datenbank geschickt wird (Umgehen der Oberfläche), dann lehnt die Datenbank ihn ab (Längen, Pflichtfelder, Eindeutigkeit).

## Edge Cases
- **Doppelklick auf «Speichern»:** Es entsteht nur ein Kunde bzw. ein Projekt.
- **Zwei Geräte legen gleichzeitig denselben Kunden an:** Die Eindeutigkeit gilt in der Datenbank, die zweite Speicherung scheitert mit dem Hinweis «Diesen Kunden gibt es schon».
- **Zwei Geräte ändern denselben Eintrag:** Die letzte Speicherung gilt (Einzelnutzer, bewusst einfach). Die Anzeige auf dem anderen Gerät aktualisiert sich beim nächsten Laden.
- **Kunde wurde auf einem anderen Gerät archiviert, während die Kundenseite offen ist:** Beim Speichern einer Änderung erscheint ein verständlicher Hinweis, oder die Seite zeigt nach dem Neuladen den neuen Stand.
- **Kunde anlegen, Anlegen von «Allgemein» schlägt fehl:** Es wird entweder beides oder nichts angelegt; der Nutzer sieht keinen Kunden ohne «Allgemein» durch einen halben Vorgang.
- **Kunde reaktivieren:** Nur die Projekte werden wieder aktiv, die zusammen mit dem Kunden archiviert wurden. Vorher einzeln archivierte Projekte bleiben im Archiv und lassen sich dort einzeln reaktivieren.
- **Namen mit Sonderzeichen, Umlauten, Emojis und Leerzeichen innen:** Werden gespeichert und richtig angezeigt (Kürzel nur Buchstaben, Ziffern, Bindestrich; Umlaute im Kürzel nicht erlaubt, damit es überall gleich aussieht).
- **Sehr langer Name am Handy (320 px):** Der Text bricht um oder wird sauber gekürzt, nichts läuft über.
- **Laufender Timer auf einem Projekt, das archiviert wird:** Das Archivieren stoppt den Timer nicht, er lässt sich normal beenden (Details in PROJ-6).
- **Sitzung abgelaufen, während das Formular offen ist:** Beim Speichern erscheint ein Hinweis, die Eingabe bleibt erhalten, und der Nutzer wird zur Anmeldung geleitet.
- **Direkter Aufruf einer Kundenadresse mit ungültiger Kennung (kein gültiges Format):** «Kunde nicht gefunden», kein Fehlerbildschirm.
- **Supabase nicht erreichbar oder pausiert:** Fehlermeldung mit «Erneut versuchen», keine leere Seite.

## Technical Requirements (optional)
- **Sicherheit:** Authentifizierung erforderlich (PROJ-2). Daten gehören dem Nutzer, Zugriff nur auf eigene Datensätze, abgesichert in der Datenbank selbst (nicht nur in der Oberfläche).
- **Datenintegrität:** Eindeutigkeit und Längen gelten in der Datenbank. Kein Löschen.
- **Performance:** Liste und Kundenseite sind nach unter 1 Sekunde sichtbar (bei bis zu 100 Kunden und 500 Projekten).
- **Browser:** Chrome, Firefox, Safari, Handy und Desktop (responsive, mobile-first, 44 px Ziele).
- **Design:** `docs/design-system.md`, WCAG AA, shadcn/ui vor eigenen Komponenten.

## Open Questions
- [x] **Reaktivierung eines Kunden:** Entschieden am 2026-11-11: Es werden nur die Projekte wieder aktiv, die zusammen mit dem Kunden archiviert wurden. Vorher einzeln archivierte bleiben im Archiv. Acceptance Criteria und Edge Case sind angepasst.
- [x] **Nachträgliche Eindeutigkeit beim Reaktivieren:** Kann nicht auftreten, weil die Eindeutigkeit auch gegen archivierte Einträge gilt (in `/architecture` bestätigt).
- [ ] **Anzahl aktiver Projekte auf der Karte:** Reicht die Zahl, oder sollen die ersten Projektnamen erscheinen? Entscheidung beim Bauen der Oberfläche.

## Decision Log

### Product Decisions
| Decision | Rationale | Date |
|----------|-----------|------|
| Jeder Zeiteintrag gehört zu einem Projekt; beim Anlegen eines Kunden entsteht automatisch das Projekt «Allgemein» | Eine einzige Regel für Timer, Auswertung und Export, keine Sonderfälle; wenige Klicks bei der Erfassung (Ziel: 10 Sekunden) | 2026-11-11 |
| Archivieren statt Löschen, kein Löschen im MVP | Alte Zeiten und Auswertungen bleiben vollständig; laut PRD genügen «anlegen, bearbeiten, archivieren» | 2026-11-11 |
| Archivierte Einträge verschwinden aus Auswahllisten, bleiben aber in Auswertung und Export | Neue Zeiten gehen nur auf aktive Projekte; Abrechnung früherer Monate bleibt korrekt | 2026-11-11 |
| Kunde archivieren archiviert alle Projekte, Reaktivieren aktiviert nur die damit archivierten wieder (angepasst in `/architecture`) | Einfach und vorhersehbar; ein Kunde ohne aktive Projekte wäre in der Praxis nutzlos | 2026-11-11 |
| Reaktivieren braucht keine Rückfrage, Archivieren schon | Reaktivieren ist harmlos und jederzeit umkehrbar; Archivieren ändert die Auswahl | 2026-11-11 |
| Name 1 bis 100 Zeichen, Kunden-Name eindeutig (ohne Gross-/Kleinschreibung, auch gegen Archiv), Projekt-Name nur pro Kunde eindeutig | Verhindert Doppelte, erlaubt «Allgemein» bei jedem Kunden | 2026-11-11 |
| Kunden-Kürzel: Pflicht, 2 bis 10 Zeichen (Buchstaben, Ziffern, Bindestrich), Grossbuchstaben, eindeutig | Kurze Anzeige in Listen und beim Timer; Wunsch des Nutzers | 2026-11-11 |
| Projektnummer: optionaler freier Text, höchstens 30 Zeichen, nicht eindeutig | Rechnungs- oder Bestellnummern können mehrfach vorkommen; Wunsch des Nutzers | 2026-11-11 |
| Änderungen an Namen, Kürzel und Nummer wirken überall, auch rückwirkend | Ein einziger Stand, Tippfehler lassen sich überall mit einer Änderung beheben; für eine einzelne Person ausreichend | 2026-11-11 |
| Aufbau: Navigationseintrag «Kunden», Liste unter `/kunden`, Kundenseite mit Projekten, Formulare als Dialog bzw. Blatt von unten am Handy | Mobile-first, wenige Schritte, passt zum Layout aus PROJ-11 | 2026-11-11 |
| Bei gleichzeitiger Änderung auf zwei Geräten gilt die letzte Speicherung | Einzelnutzer, keine Konfliktbehandlung nötig | 2026-11-11 |
| Laufender Timer wird durch Archivieren nicht gestoppt | Keine versehentlich verlorene Zeit; Details in PROJ-6 | 2026-11-11 |

### Technical Decisions
<!-- Added by /architecture -->
| Decision | Rationale | Date |
|----------|-----------|------|
| Zwei Tabellen (Kunden, Projekte) in Supabase, Zugriff direkt über Supabase ohne eigene API-Routen | Die Zugriffsregeln der Datenbank (Row Level Security) schützen die Daten; ein Server-Zwischenschritt würde nichts schützen und mehr Code bedeuten; gleiches Muster wie PROJ-2 | 2026-11-11 |
| Besitzer wird von der Datenbank aus der Anmeldung gesetzt und ist unveränderlich | Der Browser kann keinen fremden Besitzer vortäuschen | 2026-11-11 |
| Längen, Zeichen, Pflichtfelder und Eindeutigkeit werden in der Datenbank erzwungen | Schutz auch gegen Umgehen der Oberfläche; Oberfläche übersetzt Fehler in Hinweise am Feld | 2026-11-11 |
| Kürzel in Grossbuchstaben gespeichert, Namen ohne Beachtung der Gross-/Kleinschreibung eindeutig | Einfache, überall gleich aussehende Eindeutigkeit | 2026-11-11 |
| Kein Löschen: weder Knopf noch Datenbankrecht | Spec-Entscheidung, in der Datenbank abgesichert; Zeiten (PROJ-4) verweisen auf Projekte und gehen nie verloren | 2026-11-11 |
| «Kunde anlegen» (mit Projekt «Allgemein»), «Kunde archivieren» und «Kunde reaktivieren» als je ein unteilbarer Schritt in der Datenbank | Keine halben Zustände bei Verbindungsabbruch | 2026-11-11 |
| Projekt-Merkmal «Mit dem Kunden archiviert»; Reaktivieren des Kunden aktiviert nur diese Projekte | Vorher einzeln archivierte Projekte tauchen nicht unerwartet wieder auf; löst die offene Frage der Spec | 2026-11-11 |
| Projekt eines archivierten Kunden lässt sich nicht einzeln reaktivieren (in der Datenbank erzwungen) | Konsistenz: kein aktives Projekt unter einem archivierten Kunden | 2026-11-11 |
| Server lädt die Daten, der Browser schreibt direkt an Supabase und lädt die Seite danach neu | Schneller erster Anblick, geschützt; einfacher Ablauf ohne Zwischenspeicher | 2026-11-11 |
| Formulare: Dialog ab Tablet-Breite, Blatt von unten am Handy, mit vorhandenen shadcn-Bausteinen | Mobile-first, keine neuen Pakete | 2026-11-11 |
| Tabellen als Migrationsdateien in `supabase/migrations` | Nachvollziehbar und wiederholbar, so in PROJ-1 vorgesehen | 2026-11-11 |
| Kein Namens-Schnappschuss in späteren Zeiteinträgen | Spec: Umbenennen wirkt rückwirkend; Zeiten verweisen nur auf die Projekt-ID | 2026-11-11 |

---
<!-- Sections below are added by subsequent skills -->

## Tech Design (Solution Architect)

### Backend nötig?
Ja. Das sind die **ersten Anwendungsdaten** der App: zwei neue Tabellen (Kunden, Projekte) in Supabase, mit Zugriffsregeln direkt in der Datenbank. Eigene Schnittstellen (API-Routen) sind nicht nötig: Die Seiten lesen und schreiben wie bei der Anmeldung direkt über Supabase, und die Datenbank selbst sorgt dafür, dass nur der Besitzer seine Daten sieht und ändert. Das hält die Zahl der beweglichen Teile klein. Die Tabellen und Regeln baut `/backend`, die Oberfläche `/frontend`.

### A) Seitenstruktur
```
App-Bereich (geschützt, mit Navigation)
+-- Navigation: neuer Eintrag «Kunden» (Reihenfolge: Start, Kunden, Status)
+-- /kunden  (Kundenliste)
|   +-- Kopf: Titel «Kunden» und Knopf «Neuer Kunde»
|   +-- Kundenkarten (aktive Kunden): Kürzel, Name, Anzahl aktiver Projekte
|   +-- Leerzustand: Erklärung und Knopf «Ersten Kunden anlegen»
|   +-- Eingeklappt: «Archiv» (archivierte Kunden, mit «Reaktivieren»)
|   +-- Ladezustand und Fehlerzustand mit «Erneut versuchen»
+-- /kunden/[Kunde]  (Kundenseite)
|   +-- Kopf: Kürzel und Name, Aktionen «Bearbeiten» und «Archivieren» (bzw. «Reaktivieren»)
|   +-- Aktive Projekte: Name, Projektnummer, Aktionen «Bearbeiten» und «Archivieren»
|   +-- Knopf «Neues Projekt»; Hinweis, wenn kein aktives Projekt existiert
|   +-- Eingeklappt: «Archiv» (archivierte Projekte, mit «Reaktivieren»)
|   +-- «Kunde nicht gefunden» bei fremder oder ungültiger Kennung
+-- Formulare (je ein Dialog am Laptop, ein Blatt von unten am Handy)
|   +-- Kunde anlegen / bearbeiten: Kürzel, Name
|   +-- Projekt anlegen / bearbeiten: Name, Projektnummer (optional)
+-- Rückfrage vor dem Archivieren (nennt bei Kunden die Folge für die Projekte)
```

### B) Bausteine
- **Vorhandene shadcn-Bausteine:** Card, Dialog, Sheet, Alert Dialog (Rückfrage), Collapsible (Archiv), Form, Input, Label, Button, Badge, Skeleton, Sonner (kurze Bestätigung). Nichts Neues zu installieren.
- **Neue, eigene Zusammensetzungen:** Kundenkarte, Kundenliste, Projektzeile, Kunden- und Projektformular (mit Wechsel zwischen Dialog und Blatt je nach Bildschirmbreite), Archiv-Bereich, Archivieren-Rückfrage, Leer- und Fehlerzustand.
- **Gemeinsame Prüfregeln** für Kürzel, Name und Projektnummer an einer Stelle, damit Formulare und Datenbank dieselben Grenzen kennen (Kürzel 2 bis 10 Zeichen aus Buchstaben, Ziffern und Bindestrich; Name 1 bis 100; Projektnummer höchstens 30).
- **Navigation:** Der Eintrag «Kunden» kommt in die zentrale Liste der Navigationspunkte. Seitenleiste und Tab-Leiste übernehmen ihn automatisch. Aktiv ist er auf `/kunden` und allen Seiten darunter.

### C) Datenmodell (in Alltagssprache)
```
Jeder Kunde hat:
- Eindeutige ID
- Besitzer (der angemeldete Nutzer, wird automatisch gesetzt)
- Kürzel (2 bis 10 Zeichen, Grossbuchstaben, Ziffern, Bindestrich), eindeutig pro Besitzer
- Name (1 bis 100 Zeichen, ohne Leerzeichen am Rand), eindeutig pro Besitzer, Gross-/Kleinschreibung egal
- Archiviert (ja/nein) und Zeitpunkt des Archivierens
- Angelegt am, zuletzt geändert am

Jedes Projekt hat:
- Eindeutige ID
- Besitzer (derselbe wie beim Kunden)
- Kunde (gehört genau einem Kunden)
- Name (1 bis 100 Zeichen, ohne Leerzeichen am Rand), eindeutig pro Kunde, Gross-/Kleinschreibung egal
- Projektnummer (optional, freier Text, höchstens 30 Zeichen, nicht eindeutig)
- Archiviert (ja/nein) und Zeitpunkt des Archivierens
- «Mit dem Kunden archiviert» (ja/nein): merkt sich, ob das Projekt erst durch das Archivieren des Kunden archiviert wurde
- Angelegt am, zuletzt geändert am

Gespeichert in: Supabase (PostgreSQL), geräteübergreifend.
```
Löschen gibt es nicht: weder einen Knopf noch ein Recht in der Datenbank. Spätere Zeiteinträge (PROJ-4) verweisen auf Projekte, und die Datenbank verhindert, dass ein Projekt mit Zeiten verschwindet.

### D) Regeln in der Datenbank (das Sicherheitsnetz)
- **Nur eigene Daten:** Lesen, Anlegen und Ändern ist für angemeldete Nutzer nur auf eigenen Zeilen erlaubt (Row Level Security auf beiden Tabellen). Der Besitzer wird nicht vom Browser mitgeschickt, sondern von der Datenbank aus der Anmeldung gesetzt und kann später nicht geändert werden. Ohne Anmeldung (nur mit dem öffentlichen Schlüssel) ist nichts lesbar oder schreibbar.
- **Kein Löschen:** Es gibt keine Regel, die das Löschen erlaubt.
- **Grenzen und Eindeutigkeit** (Längen, Zeichen im Kürzel, Pflichtfelder, doppelte Kürzel, Namen, Projektnamen pro Kunde) werden in der Datenbank erzwungen, nicht nur im Formular. Wer die Oberfläche umgeht, scheitert trotzdem. Der Formularfehler übersetzt die Datenbank-Antwort in den passenden Hinweis am Feld («Dieses Kürzel gibt es schon»).
- **Ein Projekt gehört immer dem Besitzer seines Kunden:** Die Datenbank lehnt Projekte ab, deren Besitzer nicht zum Kunden passt.
- **Kein Reaktivieren unter einem archivierten Kunden:** Ein archiviertes Projekt eines archivierten Kunden lässt sich nicht einzeln reaktivieren (auch nicht an der Oberfläche vorbei).

### E) Ablauf in Worten
1. **Liste laden:** `/kunden` lädt auf dem Server alle Kunden des Nutzers samt Zahl der aktiven Projekte, trennt aktiv und archiviert und sortiert nach Kürzel. Die Seite ist wie alle anderen geschützt (PROJ-2).
2. **Kunde anlegen:** Das Formular prüft die Eingaben und sendet sie. **Kunde und Projekt «Allgemein» entstehen in einem einzigen, unteilbaren Schritt in der Datenbank:** entweder beides oder nichts, auch bei Verbindungsabbruch.
3. **Projekt anlegen, bearbeiten:** Einzelne Schreibvorgänge mit denselben Prüfregeln. Änderungen am Kunden oder Projekt gelten überall, weil Zeiten (später) nur auf die ID verweisen.
4. **Projekt archivieren und reaktivieren:** Setzt Kennzeichen und Zeitpunkt. Reaktivieren ist nur erlaubt, wenn der Kunde aktiv ist.
5. **Kunde archivieren:** In einem unteilbaren Schritt werden der Kunde und **alle noch aktiven** Projekte archiviert; Projekte, die dabei archiviert wurden, bekommen das Merkmal «Mit dem Kunden archiviert».
6. **Kunde reaktivieren:** In einem unteilbaren Schritt wird der Kunde aktiv, und **nur die Projekte mit dem Merkmal «Mit dem Kunden archiviert»** werden wieder aktiv (siehe Entscheidung unten). Vorher einzeln archivierte Projekte bleiben im Archiv.
7. **Aktualisierung der Anzeige:** Nach jedem Schreiben lädt die Seite die Daten neu, sodass der Stand dem der Datenbank entspricht (auch bei Änderungen vom anderen Gerät beim nächsten Laden).
8. **Fehler:** Duplikate, Netzwerkfehler und abgelaufene Sitzung werden in verständliche Meldungen übersetzt, Eingaben bleiben erhalten (Muster aus PROJ-2).

### F) Tech-Entscheidungen (für Nicht-Techniker begründet)
- **Direkt über Supabase, keine eigenen API-Routen:** Die Zugriffsregeln der Datenbank sind der eigentliche Schutz. Ein zusätzlicher Server-Zwischenschritt würde nichts schützen, aber mehr Code bedeuten. Dasselbe Muster nutzt schon die Anmeldung.
- **Mehrschrittige Vorgänge in der Datenbank:** «Kunde plus Allgemein», «Kunde archivieren» und «Kunde reaktivieren» ändern mehrere Zeilen. Als ein Schritt in der Datenbank gibt es keine halben Zustände (zum Beispiel einen Kunden ohne «Allgemein»), auch wenn die Verbindung abbricht.
- **Mit dem Merkmal «Mit dem Kunden archiviert» statt blindem Reaktivieren:** Ein Projekt, das du vor Jahren einzeln archiviert hast, soll nicht auftauchen, nur weil du den Kunden zurückholst. Das ist die vorsichtigere Variante der Spec-Frage und kostet nur ein Feld.
- **Das Kürzel wird in Grossbuchstaben gespeichert:** So reicht eine einfache Eindeutigkeit, und es sieht überall gleich aus.
- **Gross-/Kleinschreibung bei Namen egal:** «Muster AG» und «muster ag» zählen als dasselbe, geprüft in der Datenbank.
- **Server lädt, Browser schreibt:** Listen und Kundenseiten werden auf dem Server geladen (schneller erster Anblick, geschützt), Änderungen sendet der Browser direkt an Supabase. Danach lädt die Seite neu.
- **Migrationsdateien im Projekt:** Die Tabellen werden als Dateien in `supabase/migrations` festgehalten und in Supabase angewendet, damit der Aufbau nachvollziehbar und wiederholbar ist (so von PROJ-1 vorgesehen).
- **Zeiteinträge später:** PROJ-4 verweist nur auf die Projekt-ID. Wegen der Regel «kein Löschen» und wegen rückwirkender Umbenennung (Spec) gibt es keinen Namens-Schnappschuss.

### G) Abhängigkeiten (Pakete)
Keine neuen. Vorhanden und genutzt: `react-hook-form`, `zod`, `@hookform/resolvers` (Formulare), `@supabase/ssr`, `@supabase/supabase-js` (Zugriff), `sonner` (Meldungen), `lucide-react` (Symbole).

### H) Risiken und Hinweise für Bau und QA
- **Erste echte Tabellen:** Die Zugriffsregeln müssen getestet werden, auch gegen einen zweiten Nutzer und gegen Aufrufe nur mit dem öffentlichen Schlüssel. Für den zweiten Nutzer braucht QA ein weiteres Testkonto oder einen direkten Aufruf ohne Anmeldung.
- **Testdaten:** E2E-Tests legen eigene Kunden mit eindeutigem Kürzel an und archivieren sie wieder; da es kein Löschen gibt, bleiben Testdaten im Archiv. Das Testkonto bekommt dafür ein erkennbares Präfix im Kürzel (z. B. «T-…»).
- **Mobile:** Blatt von unten, 44-px-Ziele, 320 px Breite prüfen.
- **Supabase Free:** Bei 100 Kunden und 500 Projekten ist keine Optimierung nötig; ein Index auf Besitzer und Kunde genügt.

## QA Test Results
_To be added by /qa_

## Deployment
_To be added by /deploy_
