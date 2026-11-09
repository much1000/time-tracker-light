# PROJ-11: Design-System-Basis

## Status: Deployed
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
- [x] ~~Welches Logo erscheint wo?~~ Entschieden in `/architecture`: überall nur der Würfel plus Name als Text, die Wortmarke entfällt.
- [ ] Grössere Fassung des Würfels (ideal SVG) für scharfe Handy- und PWA-Icons nachliefern (spätestens für PROJ-10).

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
| Reines Frontend, keine Datenbank | Es gibt keine Anwendungsdaten; die Theme-Wahl gehört zum Gerät | 2026-11-09 |
| Theme-Wahl per `next-themes` (bereits installiert), gespeichert im Browser des Geräts | Verhindert Aufblitzen, folgt der Geräteeinstellung, kein neues Paket | 2026-11-09 |
| Umschaltung Seitenleiste/Tab-Leiste allein per Stylesheet-Breakpoint (768 px) | Kein Flackern, kein Skript; Tablet bekommt die Seitenleiste wie in der Spec | 2026-11-09 |
| ~~shadcn-`Sidebar` wird nicht verwendet~~ **Geändert in `/frontend`:** Seitenleiste nutzt die shadcn-`Sidebar` (Modus «none», nur ab 768 px sichtbar); nur die Tab-Leiste am Handy ist eine eigene Komposition | Projektregel: Sidebar/Navigation nie selbst bauen. Die shadcn-Sidebar passt für den Laptop; für die feste Tab-Leiste am Handy gibt es keinen shadcn-Baustein. Beide lesen eine gemeinsame Eintragsliste | 2026-11-09 |
| Route-Gruppe «App» für alle Seiten mit Navigation, Wurzel-Layout nur mit Schrift und Theme | Die Anmeldeseite (PROJ-2) braucht keine Navigation; die Adressen bleiben unverändert | 2026-11-09 |
| Farben als Variablen für `:root` und `.dark`, zusätzliche Werte für «Erfolg» und gelben Button-Rand | shadcn-Bausteine übernehmen sie ohne Code-Eingriff; Werte stammen unverändert aus dem Design-System | 2026-11-09 |
| Inter über die Next.js-Schriftfunktion (beim Bauen geladen, selbst ausgeliefert) | Keine Anfragen an Google zur Laufzeit, kein zusätzliches Paket | 2026-11-09 |
| Nur Würfel als Logo, Name als Text; Wortmarke nicht verwendet | Wortmarke hat weissen Hintergrund und rund 1,9:1 Kontrast; Würfel genügt für Navigation und Favicon | 2026-11-09 |
| Handy-Symbol: Würfel auf dunkler quadratischer Fläche, nicht hochskaliert | Quelldatei nur 64 × 73 px; grössere Fassung später für PROJ-10 | 2026-11-09 |

---
<!-- Sections below are added by subsequent skills -->

## Tech Design (Solution Architect)

### Backend nötig?
Nein. PROJ-11 ist reines Frontend. Es gibt keine neuen Tabellen, keine API und keine Datenbankabfragen. Einzige gespeicherte Information ist die Theme-Wahl im Browser des jeweiligen Geräts.

### A) Seitenstruktur
```
Wurzel-Layout (für alle Seiten)
+-- Schrift Inter (von der App selbst ausgeliefert)
+-- Theme-Verwaltung (System / Hell / Dunkel, merkt sich die Wahl)
+-- Seitentitel «Time Tracker Light», Favicon, Handy-Symbol

Bereich «App» (alle Seiten mit Navigation: Start, Status, später alle weiteren)
+-- Link «Zum Inhalt springen» (erstes Element für Tastaturnutzer)
+-- Seitenleiste (ab Tablet-Breite, 768 px)
|   +-- Würfel-Logo + Name «Time Tracker Light»
|   +-- Navigationseinträge: Start, Status
|   +-- Theme-Schalter (unten)
+-- Kopfzeile (nur Handy)
|   +-- Würfel-Logo + Name
|   +-- Theme-Schalter
+-- Inhaltsbereich (hier erscheint die jeweilige Seite)
+-- Tab-Leiste (nur Handy, unten fest)
    +-- Navigationseinträge: Start, Status

Seiten
+-- Start (/)    Willkommenstext, Link zur Statusseite
+-- Status (/status)  bestehende Seite, übernimmt Theme und Layout
```

Künftige Seiten ohne Navigation (die Anmeldeseite aus PROJ-2) liegen ausserhalb des Bereichs «App» und bekommen nur Schrift und Theme.

### B) Verwendete Bausteine
- **Theme-Schalter:** das vorhandene Aufklappmenü von shadcn/ui, mit den drei Optionen und einem Haken bei der aktiven.
- **Navigation:** Seitenleiste und Tab-Leiste werden aus Tailwind und den vorhandenen Bausteinen zusammengesetzt. Beide lesen **dieselbe Liste** von Einträgen. Ein neues Feature trägt sich an einer einzigen Stelle ein, und beide Ansichten zeigen es.
- **Symbole:** lucide-react (Haus für Start, Aktivität für Status), jeweils zusammen mit dem Text.
- **Bestehendes:** Die Statusseite und ihre Meldungen (`database-status`) bleiben, bekommen aber die neuen Farben automatisch.

### C) Daten
Es gibt keine Anwendungsdaten. Gespeichert wird nur:
- die Theme-Wahl («System», «Hell» oder «Dunkel») im Browser des Geräts, ohne Server und ohne Konto.

Fehlt dieser Wert (neues Gerät, Browserdaten gelöscht), gilt «System».

### D) Wie die wichtigsten Anforderungen erfüllt werden
- **Navigation je nach Gerät:** Bei 768 px Breite und mehr gilt die Seitenleiste, darunter Kopfzeile plus Tab-Leiste. Die Umschaltung macht allein das Stylesheet, nicht ein Skript. Es gibt also kein Flackern und keinen Sprung beim Drehen des Handys.
- **Aktiver Eintrag:** Er wird aus der aktuellen Adresse bestimmt und mit Fettschrift, Balken und Hintergrund markiert (nie nur Farbe).
- **Kein Aufblitzen beim Theme:** Die Theme-Verwaltung setzt das richtige Theme, bevor die Seite sichtbar wird. Ohne JavaScript folgt die Seite der Geräteeinstellung.
- **Farben:** Alle Werte aus `docs/design-system.md` werden einmalig als Farbvariablen für Hell und Dunkel hinterlegt. Die vorhandenen shadcn-Bausteine übernehmen sie ohne Eingriff in ihren Code. Neu dazu kommen ein Farbwert für «Erfolg» und für die Randfarbe des gelben Buttons im hellen Theme. Die Fehlerfarbe wechselt auf `#C62828` (hell) bzw. `#FF8A80` (dunkel). Damit ist BUG-5 behoben.
- **Schrift:** Inter wird beim Bauen der App geladen und von der eigenen Domain ausgeliefert, nicht von Google. Fällt die Schrift aus, greift `system-ui`. Tabellarische Ziffern gelten global.
- **Logo und Favicon:** Es wird nur der Würfel verwendet, daneben steht der Name als Text. Das Favicon und das Handy-Symbol werden aus dem Würfel erzeugt und von Next.js automatisch eingebunden, womit BUG-2 behoben ist. Das Handy-Symbol bekommt eine dunkle quadratische Fläche, damit der kleine Würfel nicht unscharf hochgezogen wird.
- **Handy-Besonderheiten:** Die Tab-Leiste berücksichtigt den Systembereich unten (Home-Indikator), und der Inhalt hat unten so viel Abstand, dass nichts verdeckt wird.
- **Tastatur:** Sichtbarer Fokusring in Theme-Farbe, Link «Zum Inhalt springen», Theme-Menü per Tastatur bedienbar.

### E) Tests
- **Unit (Vitest):** Navigationsliste markiert den passenden Eintrag als aktiv; Theme-Schalter bietet drei Optionen und markiert die aktive.
- **E2E (Playwright, bei `/qa`):** Layout bei 375, 768 und 1440 px, Theme-Wahl bleibt nach Neuladen erhalten, kein 404 beim Favicon, bestehende `/status`-Tests laufen weiter.
- **Kontrast:** In `/qa` werden die Farbpaare beider Themes gegen die Werte im Design-System gemessen.

### F) Abhängigkeiten
Keine neuen Pakete nötig.
- `next-themes` (schon installiert): Theme-Wahl und Speicherung
- `lucide-react` (schon installiert): Symbole
- Schrift Inter über die in Next.js enthaltene Schriftfunktion

### G) Hinweise für die Umsetzung
- Die Logo-Datei in `docs/design/` ist nur 64 × 73 px gross. Für Navigation und Favicon reicht das. Eine grössere Fassung (ideal SVG) wäre für PROJ-10 (PWA-Icons in allen Grössen) sinnvoll.
- Die Wortmarke «decs Data Analytics» wird nicht verwendet: weisser Hintergrund, hellgraue Schrift (ca. 1,9:1) und im dunklen Theme nicht brauchbar.
- Das Würfel-Logo ist eine Marke und von der Kontrastpflicht für Text ausgenommen. Der Name daneben ist normaler Text mit vollem Kontrast.

## Implementation Notes (Frontend)
**Umgesetzt am 2026-11-09.**

**Neu**
- `src/app/(app)/layout.tsx`, `src/app/(app)/page.tsx`: Route-Gruppe «App» mit Rahmen; Platzhalter-Startseite. `/status` wurde in die Gruppe verschoben (Adresse unverändert).
- `src/components/app-shell.tsx`, `app-sidebar.tsx`, `mobile-header.tsx`, `bottom-tab-bar.tsx`, `brand.tsx`, `theme-provider.tsx`, `theme-switch.tsx`
- `src/lib/navigation.ts`: einzige Liste der Navigationseinträge plus Funktion für den aktiven Eintrag (mit Test).
- `src/assets/logo-cube.png` (Würfel), `src/app/icon.png` (64 × 64, transparent) und `src/app/apple-icon.png` (180 × 180, dunkle Fläche, Würfel in Originalgrösse). Next.js bindet beide automatisch ein (BUG-2).

**Geändert**
- `globals.css`, `tailwind.config.ts`: Farben aus dem Design-System für Hell und Dunkel, neue Werte `primary-border`, `primary-hover`, `brand-text`, `success`; Fehlerfarbe `#C62828` bzw. `#FF8A80` (BUG-5); Schrift Inter; tabellarische Ziffern.
- `layout.tsx`: Inter, Theme-Verwaltung (Standard «System»), Titel «Time Tracker Light», Viewport mit `viewport-fit=cover`.
- `ui/button.tsx` (shadcn-Datei, bewusst angepasst): Primär mit Rand und Hover aus dem Design-System, Link-Variante in `brand-text` statt Gelb, Standardhöhe und Symbolgrösse 44 px.
- `database-status.tsx`: Erfolgssymbol nutzt `success`. `status/page.tsx`, `status/loading.tsx`: eigenes `<main>` entfernt, der Rahmen liefert es.

**Abweichungen und Hinweise**
- Seitenleiste nutzt die shadcn-`Sidebar` (siehe Decision Log), nicht eine eigene.
- Das Logo-Bild hat einen leeren Alternativtext, weil der Name als Text daneben steht. Sonst läse ein Screenreader den Namen doppelt.
- Die Button-Variante `sm` (36 px) ist weiterhin kleiner als 44 px. Beim ersten Einsatz in einem Feature prüfen.
- `checkbox` und `radio-group` (shadcn) nutzen Gelb als Rand, das auf Weiss nur 1,7:1 erreicht. Sie werden noch nirgends verwendet. Beim ersten Einsatz `border-input` verwenden.
- Der Theme-Schalter ist ein Aufklappmenü mit den Optionen «System», «Hell», «Dunkel» (Auswahl per Punkt markiert).

**Geprüft**
- `npm test`: 24 von 24 grün (neu: Navigation, Tab-Leiste, Theme-Schalter), `npm run lint`: 0 Fehler, `npm run build`: grün.
- Im Browser (Chrome, Produktionsbuild): Layout bei 375 und 1440 px, Hell und Dunkel, Schrift Inter, Favicon ohne 404, Theme-Wahl bleibt nach Neuladen erhalten, Navigationsflächen 48 bzw. 56 px hoch, kein horizontales Scrollen am Handy, «Zum Inhalt springen» ist das erste Tab-Ziel.
- **Nicht geprüft** (für `/qa`): Playwright-E2E (die PROJ-1-Tests sind noch nicht gegen das neue Layout gelaufen), Tablet 768 px, Firefox und Safari, Kontrastmessung aller Farbpaare, Zoom 200 %.

## QA Test Results

**Tested:** 2026-11-09
**App URL:** http://localhost:3100 (Produktionsbuild, `next start`; Chrome)
**Tester:** QA Engineer (AI)

### Acceptance Criteria Status

#### Navigation und Layout (7 Kriterien)
- [x] Handy (375 px): feste Tab-Leiste unten (Start, Status), Kopfzeile mit Logo und Theme-Schalter, keine Seitenleiste
- [x] Tablet (768 px) und Laptop (1440 px): Seitenleiste mit Logo, Einträgen und Theme-Schalter, keine Tab-Leiste und keine Kopfzeile
- [x] Klick auf einen Eintrag öffnet die Seite, die Navigation bleibt bestehen (Marker am Rahmen überlebt den Wechsel)
- [x] Aktiver Eintrag: `aria-current`, Fettschrift und Balken, in Seitenleiste und Tab-Leiste
- [x] Navigationsflächen mindestens 44 × 44 px (gemessen: Seitenleiste 239 × 48, Tab-Leiste 188 × 56, Theme-Knöpfe ≥ 44)
- [x] Tab-Leiste bleibt beim Scrollen unten (`position: fixed`) und verdeckt am Seitenende nichts
- [x] Tastatur: «Zum Inhalt springen» ist erstes Tab-Ziel und setzt den Fokus auf den Inhalt, Einträge haben sichtbaren Fokus

#### Startseite (1)
- [x] `/` zeigt Logo, Willkommenstext und Link zum Status; keine Starter-Seite, kein «Next.js»-Text

#### Theme (6)
- [x] Standard «System» folgt der Geräteeinstellung (dunkel und hell)
- [x] Theme-Schalter bietet System, Hell, Dunkel, markiert die aktuelle Wahl (`aria-checked`), per Tastatur bedienbar (Öffnen, Pfeile, Enter/Leertaste)
- [x] Wahl «Dunkel» bleibt nach Neuladen und auf anderen Seiten erhalten, auch bei hellem Gerät
- [x] Kein Aufblitzen: Die Klasse wird gesetzt, solange das Dokument noch lädt, und nie «light» zwischendurch
- [x] Auf «System» wechselt die App live mit der Geräteeinstellung
- [x] `/status` ist im dunklen Theme dunkel (BUG-5 aus PROJ-1 behoben)

#### Farben, Schrift, Kontrast (5)
- [x] Farbwerte entsprechen dem Design-System (Abweichung höchstens 1 Stufe je Kanal durch HSL-Rundung, z. B. dunkler Hintergrund rgb(23,25,28) statt rgb(22,24,27)); Kontrast aller 11 Paare in beiden Themes ≥ 4,5:1 (Text) bzw. ≥ 3:1 (Eingabefeld-Rand)
- [x] Fehlerfarbe erreicht in beiden Themes ≥ 4,5:1 (BUG-5 aus PROJ-1 behoben); Symbol und Text kommen aus `database-status` (Unit-Tests)
- [x] Primär-Button im hellen Theme: gelbe Fläche, dunkle Schrift, Rand `#7A5C00` (nur über Farbwerte und Button-Klassen geprüft: Es gibt noch keinen Primär-Button in der App)
- [x] Schrift Inter mit `system-ui`-Ausweichschrift, tabellarische Ziffern, Schrift wird geladen
- [x] Keine Anfragen an Drittdienste (auch keine Schriftdienste)

#### Logo, Favicon, Titel (4)
- [x] Favicon eingebunden, `/icon.png` liefert 200 `image/png` (BUG-2 aus PROJ-1 behoben), kein Konsolenfehler beim Laden
- [x] Apple-Touch-Icon eingebunden und erreichbar (auf einem echten iPhone nicht angesehen)
- [x] Titel «Time Tracker Light» und «Status · Time Tracker Light»
- [x] Logo im dunklen Theme sichtbar und geladen. Hinweis: Das Bild hat bewusst einen leeren Alternativtext, der Name steht als Text daneben (siehe Implementation Notes); das ist enger gefasst als der Wortlaut «hat einen Alternativtext»

#### Bestehende Funktionen (1)
- [x] Alle 7 E2E-Tests und 13 Unit-Tests aus PROJ-1 laufen weiter, `/status` zeigt «Datenbank erreichbar». Angepasst wurde nur der Konsolentest: Die Ausnahme für das Favicon (BUG-2) ist entfallen.

### Edge Cases Status
- [x] Gelöschter Browserspeicher: Theme fällt auf «System» zurück
- [ ] BUG-1: Ohne JavaScript folgt die Seite nicht der Geräteeinstellung (siehe unten); Navigation per Link funktioniert
- [x] Fenstergrösse ändern (Desktop ↔ Handy): aktive Seite und aktiver Eintrag bleiben
- [x] 320 px Breite: nichts läuft über, Beschriftungen nicht abgeschnitten
- [x] Home-Indikator: `viewport-fit=cover` gesetzt, Tab-Leiste mit `safe-area-inset-bottom` (auf echtem Gerät nicht geprüft)
- [x] Inter nicht ladbar: `system-ui` steht in der Schriftliste (Ausfall selbst nicht simuliert)
- [x] Logo lädt nicht: Name steht als Text daneben, Navigation bleibt nutzbar (Ausfall nicht simuliert)
- [x] Zoom 200 % (≈ 720 px Breite): Navigation bedienbar
- [ ] BUG-3: Unbekannte Seite zeigt Next.js-Standard-404 ohne eigenes Theme

### Security Audit Results
- [x] Keine Authentifizierung in diesem Feature (kommt mit PROJ-2); es gibt keine Eingabefelder und keine API
- [x] Manipulierter Theme-Wert (`<script>…`, 5000 Zeichen): keine Skriptausführung, Seite bleibt benutzbar
- [x] Weder Service-Role-Schlüssel noch Tokens in HTML oder Skripten von `/` und `/status`
- [x] Keine Cookies für die Theme-Wahl, keine Anfragen an Dritte
- [ ] BUG-4: Theme-Wert mit Leerzeichen im Browserspeicher legt die Seite lahm (nur durch Eingriff in den eigenen Speicher erreichbar)
- Offen aus PROJ-1: Sicherheits-Header (BUG-4 dort) bleiben für `/deploy`.

### Bugs Found

#### BUG-1: Ohne JavaScript erscheint immer das helle Theme
- **Severity:** Low
- **Steps to Reproduce:**
  1. JavaScript im Browser deaktivieren, Gerät auf dunkel stellen
  2. `/` öffnen
  3. Erwartet (Spec, Edge Case): dunkles Theme nach Geräteeinstellung
  4. Tatsächlich: helles Theme, weil das Dunkel-Theme an eine Klasse gebunden ist, die ein Skript setzt
- **Priority:** Nice to have (die App braucht JavaScript ohnehin für alles Wesentliche)
- **Test:** `test.fail` in `tests/PROJ-11-design-system-basis.spec.ts`

#### BUG-2: Zwei verschachtelte `<main>`-Bereiche — **behoben am 2026-11-09**
- **Severity:** Medium
- **Steps to Reproduce:**
  1. Eine beliebige Seite öffnen, im DOM nach `main` suchen
  2. Erwartet: genau ein Hauptbereich
  3. Tatsächlich: Die shadcn-Komponente `SidebarInset` ist selbst ein `<main>` und umschliesst Kopfzeile, Inhalt und Tab-Leiste. Darin liegt unser `<main id="main-content">`. Verschachtelte Hauptbereiche sind ungültiges HTML, Screenreader melden zwei Hauptbereiche, Kopfzeile und Tab-Leiste liegen im Hauptbereich.
- **Hinweis zur Behebung:** `SidebarInset` mit `asChild` auf ein `div` setzen oder das innere `<main>` durch ein `div` ersetzen und die Kopfzeile ausserhalb halten.
- **Behebung:** `SidebarInset` ist jetzt das einzige `<main>` (trägt `id="main-content"`), Kopfzeile und Tab-Leiste liegen daneben in einer Spalte, das innere `<main>` entfällt. Der Test ist jetzt ein normaler Test und grün.
- **Priority:** Fix before deployment (Ziel ist WCAG AA)

#### BUG-3: Unbekannte Seite folgt nicht dem gewählten Theme
- **Severity:** Low
- **Steps to Reproduce:**
  1. Gerät auf dunkel, `/gibt-es-nicht` öffnen
  2. Erwartet (Spec): Standardfehlerseite im neuen Theme
  3. Tatsächlich: Next.js-Standard-404 mit festem Schwarz/Weiss (rgb(0,0,0) statt `#16181B`), ohne Navigation. Wählt jemand «Hell» bei dunklem Gerät, bleibt die 404-Seite dunkel.
- **Priority:** Fix in next sprint (eigene `not-found`-Seite, eventuell mit PROJ-2)
- **Test:** `test.fail` «Unbekannte Seite zeigt eine Fehlerseite im aktuellen Theme»

#### BUG-4: Beschädigter Theme-Wert im Browserspeicher legt die Seite lahm
- **Severity:** Low
- **Steps to Reproduce:**
  1. In den Entwicklerwerkzeugen `localStorage.theme = 'x y'` setzen
  2. Seite neu laden
  3. Erwartet: Fallback auf «System», Seite normal
  4. Tatsächlich: Das Theme-Skript wirft `Failed to execute 'add' on 'DOMTokenList'`, es erscheint kein Inhalt. Behebung nur durch Löschen der Browserdaten. Ohne Leerzeichen (z. B. 5000 Zeichen, `<script>`) funktioniert alles.
- **Priority:** Nice to have (nur durch absichtlichen Eingriff erreichbar; die App schreibt nur «system», «light», «dark»)
- **Test:** `test.fail` «Manipulierter Theme-Wert mit Leerzeichen legt die Seite nicht lahm»

### Nicht geprüft
- **Firefox und Safari:** Die Browser-Downloads von Playwright sind auf diesem Rechner blockiert (veraltete Sperre `ms-playwright/__dirlock` von einem früheren, abgebrochenen Download). Nur Chrome wurde getestet.
- Tablet-Breite (768 px) wurde per Test, nicht per Sichtprüfung kontrolliert.
- Echte Geräte: Apple-Touch-Icon auf dem iPhone und Verhalten rund um den Home-Indikator.
- Der dunkle Theme-Zustand von Fehlermeldungen (`config-error`, `unreachable`) in `/status` wurde nur über Farbwerte und Unit-Tests, nicht im Browser erzeugt.

### Tests
- **Unit (Vitest):** 24 von 24 grün (neu aus `/frontend`: Navigation, Tab-Leiste, Theme-Schalter)
- **E2E (Playwright, Chrome):** `tests/PROJ-11-design-system-basis.spec.ts` mit 39 Tests; 3 davon sind als bekannte Lücken markiert (`test.fail`, entsprechen BUG-1, BUG-3, BUG-4). Gesamtlauf mit PROJ-1: 46 Tests, nach dem Fix von BUG-2 230 von 230 bei 5-facher Wiederholung stabil.
- `npm run lint`: 0 Fehler (1 bekannte Warnung in `use-toast.ts`), `tsc`: sauber, Produktionsbuild grün.

### Summary
- **Acceptance Criteria:** 24/24 erfüllt (zwei mit Hinweis: Alternativtext des Logos, Primär-Button nur über Farbwerte geprüft)
- **Bugs Found:** 4 total (0 critical, 0 high, 1 medium, 3 low); BUG-2 (medium) ist behoben, offen sind 3 niedrige
- **Security:** Keine Probleme in diesem Feature gefunden (BUG-4 nur durch Eingriff in den eigenen Browserspeicher erreichbar)
- **Production Ready:** YES (keine kritischen oder hohen Fehler)
- **Recommendation:** Deploy; BUG-3 mit PROJ-2 angehen, Firefox/Safari bei Gelegenheit nachprüfen

## Deployment
**Deployed:** 2026-11-09
**Produktions-URL:** https://time-tracker-light.vercel.app
**Hosting:** Vercel Hobby, automatisches Deployment bei Push auf `main`

**Geprüft nach dem Deployment**
- [x] `/`, `/status`, `/icon.png`, `/apple-icon.png` antworten mit 200, eine unbekannte Seite mit 404
- [x] `/status` meldet «Datenbank erreichbar» (Umgebungsvariablen auf Vercel sind korrekt)
- [x] Sicherheits-Header auf allen Antworten: `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: origin-when-cross-origin`, `Strict-Transport-Security` (BUG-4 aus PROJ-1 behoben, siehe `next.config.ts`)
- [x] Keine Konsolenfehler und keine fehlgeschlagenen Anfragen auf `/` und `/status` bei 375 und 1440 px
- [x] Weder Service-Role-Schlüssel noch Tokens im ausgelieferten HTML
- [x] Genau ein `<main>` im Produktionsbuild

**Nicht gemacht**
- Fehlerverfolgung (Sentry): bewusst weggelassen, persönliche App ohne Nutzerverkehr; Fehler stehen in den Vercel-Logs.
- Lighthouse-Messung: nicht ausgeführt (Werkzeug nicht installiert); bei Bedarf in Chrome unter «Lighthouse» nachholen.
- Content-Security-Policy: bewusst noch nicht gesetzt (kann die App brechen, braucht eigene Tests).
- Redirect-URL in Supabase (AC-8) und echter Login (AC-6) bleiben bis PROJ-2 offen.

