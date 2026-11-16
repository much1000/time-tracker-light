# PROJ-7: Wochenübersicht

## Status: In Progress
**Created:** 2026-11-16
**Last Updated:** 2026-11-16

## Dependencies
- Requires: PROJ-1 (Supabase Infrastructure Setup) — Datenbank und Zugriffsregeln
- Requires: PROJ-2 (Anmeldung) — Seite geschützt, Daten gehören dem angemeldeten Nutzer
- Requires: PROJ-3 (Kunden- und Projektverwaltung) — Kunden und Projekte, Archiv
- Requires: PROJ-4 (Manuelle Zeiterfassung) — Zeiteinträge und Zeitmodell (Minuten, 24:00, Zürcher Zeit)
- Requires: PROJ-5 (Zeiten prüfen und korrigieren) — Bearbeiten und Löschen von Einträgen werden im Detail wiederverwendet
- Requires: PROJ-6 (Timer) — Einträge aus dem Timer erscheinen wie alle anderen
- Requires: PROJ-11 (Design-System-Basis) — Navigation, Layout, Theme
- Wird gebraucht von: PROJ-8 (Monatsauswertung) als verwandte Ansicht (keine harte Abhängigkeit)

## User Stories
- Als Einzelnutzer möchte ich auf einen Blick sehen, wie viele Stunden ich in einer Woche pro Tag und Projekt gearbeitet habe, damit ich erkenne, wo die Woche geblieben ist.
- Als Einzelnutzer möchte ich pro Kunde und Projekt die Wochensumme (gearbeitet und verrechenbar) sehen, damit ich weiss, was ich diese Woche für wen geleistet habe.
- Als Einzelnutzer möchte ich zu einer Zelle (Projekt an einem Tag) die Einträge mit Beschreibung sehen, damit ich nachvollziehen kann, was ich gemacht habe.
- Als Einzelnutzer möchte ich einen Eintrag direkt aus der Wochenübersicht korrigieren oder löschen, damit ich einen Fehler sofort beheben kann, wenn ich ihn bemerke.
- Als Einzelnutzer möchte ich zwischen Wochen blättern und schnell zur aktuellen Woche zurückspringen, damit ich vergangene Wochen prüfen kann.
- Als Einzelnutzer möchte ich die Übersicht am Handy bequem lesen, damit ich unterwegs nachsehe.

## Out of Scope
- **Monatsauswertung pro Kunde und Projekt mit Beschreibungstexten, Aufrundung in 15-Minuten-Einheiten:** PROJ-8. Die Wochenübersicht rundet nicht, sie zeigt die minutengenauen Werte.
- **CSV-Export:** PROJ-9.
- **Eigene Eintragsliste mit Filtern (Kunde, ohne Beschreibung), Monatsnavigation:** bleibt auf der Seite «Zeiten» (PROJ-5). Die Wochenübersicht hat keine Filter.
- **Neue Einträge erfassen aus einer leeren Zelle:** nicht im MVP; Erfassen geht über «Start» (Timer, «Zeit erfassen») und «Zeiten».
- **Stundensätze, Beträge, Soll-Stunden, Über-/Unterzeit:** Non-Goals laut PRD.
- **Wechsel der Ansicht auf Monat oder Tag, Diagramme:** nicht im MVP.
- **Laufender Timer:** Ein Timer, der noch läuft, ist noch kein Eintrag und zählt erst nach dem Stoppen mit (siehe Offene Fragen).
- **Wochenstart anpassen (Sonntag), andere Zeitzone:** fest Montag bis Sonntag, Zürcher Zeit.

## Acceptance Criteria

**Format:** Angenommen [Vorbedingung] / Wenn [Aktion] / Dann [Ergebnis]

### Navigation und Seitenschutz
- [ ] Angenommen der Nutzer ist angemeldet, wenn er die Navigation ansieht, dann gibt es den Eintrag «Woche» (Seitenleiste und Tab-Leiste) mit der Adresse `/woche`, der beim Besuch von `/woche` als aktiv markiert ist; die Reihenfolge ist Start, Woche, Zeiten, Kunden, Status.
- [ ] Angenommen die Tab-Leiste am Handy hat fünf Einträge, wenn sie bei 320 px und 375 px angezeigt wird, dann bleibt jeder Eintrag lesbar und mindestens 44 px hoch und breit, ohne horizontales Scrollen.
- [ ] Angenommen der Nutzer ist nicht angemeldet, wenn er `/woche` öffnet, dann landet er auf der Anmeldeseite und sieht keine Daten.
- [ ] Angenommen die Seite lädt, dann trägt sie den Titel «Woche · Time Tracker Light».

### Wochennavigation
- [ ] Angenommen der Nutzer öffnet `/woche`, wenn die Seite lädt, dann zeigt sie die aktuelle Woche (nach Zürcher Uhr, Montag bis Sonntag) mit der Überschrift «KW 46 · 9.–15. Nov. 2026» (Kalenderwoche nach ISO, Datumsbereich; über Monats- und Jahresgrenzen mit beiden Monaten, z. B. «KW 1 · 29. Dez. 2025 – 4. Jan. 2026»).
- [ ] Angenommen eine Woche ist angezeigt, wenn der Nutzer «Vorherige Woche» oder «Nächste Woche» wählt, dann wechselt die Ansicht um eine Woche; «Nächste Woche» ist in der aktuellen Woche deaktiviert (keine zukünftigen Wochen).
- [ ] Angenommen der Nutzer ist in einer anderen Woche, wenn er «Diese Woche» wählt, dann springt die Ansicht zur aktuellen Woche; in der aktuellen Woche ist der Knopf deaktiviert oder als aktuell erkennbar.
- [ ] Angenommen der Nutzer hat eine Woche gewählt, wenn er die Seite neu lädt oder den Link öffnet, dann zeigt die Adresse die Woche (z. B. `/woche?woche=2026-W46`), und derselbe Link öffnet wieder dieselbe Woche; eine ungültige oder zukünftige Woche führt zur aktuellen Woche.
- [ ] Angenommen die Woche wechselt, wenn Daten laden, dann sieht der Nutzer einen Ladezustand; schlägt das Laden fehl, dann erscheint eine Fehlermeldung mit «Erneut versuchen», und die Zahlen der vorigen Woche stehen nicht fälschlich unter der neuen Überschrift.

### Raster (Laptop und Tablet, ab ca. 768 px)
- [ ] Angenommen die Woche hat Einträge, wenn das Raster angezeigt wird, dann hat es je eine Zeile pro Kunde und Projekt mit Einträgen in dieser Woche («Kürzel · Projekt», nach Kürzel, dann Projektname sortiert; auch archivierte Kunden und Projekte, mit Hinweis «archiviert») und sieben Spalten Montag bis Sonntag mit Kurzname und Datum (z. B. «Mo 9.»).
- [ ] Angenommen eine Zelle (Projekt an einem Tag), wenn sie Einträge hat, dann zeigt sie die gearbeitete Zeit in h:mm wie überall in der App (z. B. «1:30»), sonst «–».
- [ ] Angenommen das Raster, wenn es angezeigt wird, dann steht rechts je Zeile die Wochensumme des Projekts (gearbeitet und verrechenbar, beide beschriftet), unten je Spalte die Tagessumme (gearbeitet und verrechenbar) und unten rechts die Wochensumme gesamt (gearbeitet und verrechenbar).
- [ ] Angenommen der heutige Tag liegt in der angezeigten Woche, wenn das Raster angezeigt wird, dann ist seine Spalte erkennbar markiert (nicht nur Farbe, z. B. Text «Heute»).
- [ ] Angenommen die Woche hat keine Einträge, wenn die Seite lädt, dann sieht der Nutzer einen Leerzustand mit Erklärung und dem Knopf «Zeit erfassen» (öffnet das Formular wie auf der Startseite); die Wochennavigation bleibt bedienbar.

### Tageskarten (Handy, unter ca. 768 px)
- [ ] Angenommen der Bildschirm ist schmaler als ca. 768 px, wenn die Woche angezeigt wird, dann stehen oben die Wochensummen (gearbeitet und verrechenbar) und darunter sieben Tageskarten (Montag bis Sonntag) mit Wochentag, Datum und Tagessumme.
- [ ] Angenommen eine Tageskarte, wenn der Tag Einträge hat, dann zeigt sie je Projekt eine Zeile («Kürzel · Projekt», gearbeitete Zeit); ein Tag ohne Einträge ist kompakt mit «–» dargestellt.
- [ ] Angenommen eine Projektzeile in der Tageskarte, wenn der Nutzer sie antippt, dann öffnet sich dasselbe Detail wie bei einer Zelle im Raster.

### Detail (Zelle antippen)
- [ ] Angenommen eine Zelle mit Einträgen (Raster) oder eine Projektzeile (Handy), wenn der Nutzer sie antippt oder per Tastatur auslöst, dann öffnet sich ein Fenster (am Laptop) bzw. ein Blatt von unten (am Handy) mit Titel «Kürzel · Projekt, Wochentag, Datum», der Summe (gearbeitet und verrechenbar) und allen Einträgen dieser Zelle.
- [ ] Angenommen das Detail, wenn Einträge angezeigt werden, dann stehen je Eintrag die Beschreibung (lange Texte vollständig lesbar, Zeilenumbrüche erhalten), die Dauer, die verrechenbare Dauer, die Uhrzeiten (falls vorhanden, auch «24:00») und die Aktionen «Bearbeiten» und «Löschen»; Einträge ohne Beschreibung tragen den Hinweis «Keine Beschreibung».
- [ ] Angenommen eine leere Zelle, wenn der Nutzer sie ansieht, dann ist sie nicht anklickbar (kein Detail ohne Einträge).
- [ ] Angenommen der Nutzer schliesst das Detail (Escape, Schliessen-Knopf, Tippen daneben), dann liegt der Fokus wieder auf der auslösenden Zelle bzw. Zeile.
- [ ] Angenommen das Detail ist offen, wenn der Nutzer einen Eintrag bearbeitet und speichert, dann gilt das Formular und die Regeln aus PROJ-5 (auch Verschieben auf anderes Datum oder Projekt); danach zeigen Detail, Raster und alle Summen die neuen Werte, ohne die Seite neu zu laden; liegt der geänderte Eintrag nicht mehr in dieser Zelle, verschwindet er aus dem Detail, und das Detail schliesst sich, wenn die Zelle leer wird.
- [ ] Angenommen das Detail ist offen, wenn der Nutzer einen Eintrag löscht, dann erscheint dieselbe Rückfrage wie in PROJ-5; nach dem Bestätigen sind Detail, Raster und Summen aktualisiert, das Detail schliesst sich bei der letzten Löschung der Zelle, und der Fokus liegt danach auf einem sinnvollen Element (Nachbar-Eintrag, sonst Überschrift der Woche).
- [ ] Angenommen der Nutzer hat auf einem anderen Gerät einen Eintrag geändert oder gelöscht, wenn er ihn hier bearbeitet oder löscht, dann erscheinen die Hinweise aus PROJ-5 (z. B. «existiert nicht mehr») und die Woche lädt neu.

### Aktualität
- [ ] Angenommen der Nutzer startet oder stoppt einen Timer oder erfasst eine Zeit (Formular «Zeit erfassen» auf dieser Seite oder Timer-Leiste), wenn dadurch ein Eintrag in der angezeigten Woche entsteht, dann aktualisieren sich Raster, Tageskarten und Summen ohne manuelles Neuladen.
- [ ] Angenommen der Nutzer wechselt zur Seite «Zeiten» oder «Start» und zurück, dann sieht er nach dem Zurückkehren aktuelle Zahlen (keine veralteten Werte).

### Zahlen und Zeit
- [ ] Angenommen Einträge, die um Mitternacht enden (24:00), wenn die Woche angezeigt wird, dann zählen sie vollständig zum Tag, an dem sie beginnen (ein Eintrag zählt immer zu seinem Datum).
- [ ] Angenommen eine Woche mit Sommer-/Winterzeitwechsel, wenn die Woche angezeigt wird, dann stimmen Wochentage und Datumsbereich (die Wochengrenzen richten sich nach dem Zürcher Kalenderdatum, nicht nach UTC).
- [ ] Angenommen die Summen, wenn sie angezeigt werden, dann stimmen sie minutengenau mit der Summe der Einträge überein (keine Rundung) und sind für Raster, Tageskarten und die Seite «Zeiten» (gleicher Zeitraum) identisch.

### Bedienung, Darstellung, Zugänglichkeit
- [ ] Angenommen jedes Bedienelement (Pfeile, «Diese Woche», Zellen, Zeilen, Aktionen), wenn es auf Handy oder Tablet bedient wird, dann ist es mindestens 44 × 44 px gross, und es entsteht kein horizontales Scrollen der Seite (320 px bis 1440 px).
- [ ] Angenommen das Raster, wenn ein Screenreader es liest, dann ist es als Tabelle mit Spaltenköpfen (Tage) und Zeilenköpfen (Projekte) erkennbar; Zellen sagen ihren Inhalt vollständig an (z. B. «Muster AG Allgemein, Montag 9. November, 1 Stunde 30 Minuten»).
- [ ] Angenommen die Seite, wenn Hell- oder Dunkelmodus aktiv ist, dann erfüllt sie WCAG AA (Kontrast, sichtbarer Fokus, Bedienung mit der Tastatur, Hinweise nicht nur über Farbe), geprüft mit axe in beiden Modi, auch bei geöffnetem Detail.
- [ ] Angenommen Tage mit Wochentag und Datum, wenn sie angezeigt werden, dann erscheinen sie deutsch (z. B. «Montag, 9. November 2026»; Kurzform «Mo 9.»).

## Edge Cases
- **Woche über Monats- oder Jahresgrenze (z. B. 29. Dez. bis 4. Jan.):** Überschrift zeigt beide Monate und die richtige Kalenderwoche (KW 1 des neuen Jahres, ISO); Einträge werden nach ihrem Datum in die richtigen Spalten gelegt.
- **Mehrere Einträge für dasselbe Projekt am selben Tag:** werden in einer Zelle summiert; das Detail zeigt sie einzeln.
- **Projekt mit Einträgen nur an einem Tag:** erscheint als Zeile mit «–» an den übrigen Tagen.
- **Archivierter Kunde oder archiviertes Projekt mit Einträgen:** erscheint normal mit Hinweis «archiviert»; Bearbeiten und Löschen von Einträgen ist weiterhin erlaubt (wie in PROJ-5).
- **Eintrag wird im Detail auf ein anderes Projekt oder eine andere Woche verschoben:** Zelle, Zeile, Summen und Detail aktualisieren sich; eine Zeile ohne Einträge verschwindet aus dem Raster; ein Eintrag, der in eine andere Woche wandert, verschwindet aus dieser Ansicht, und der Nutzer erhält einen Hinweis («Gespeichert am dd.mm.yyyy.», wie in PROJ-5).
- **Zeile mit sehr langem Kunden- oder Projektnamen (bis zur Grenze der Namen):** bricht um oder wird mit Tooltip bzw. im Detail vollständig gezeigt, das Raster bleibt lesbar, keine abgeschnittenen Bedienelemente.
- **Viele Projekte in einer Woche (z. B. 20):** Raster wird länger, die Kopfzeile bleibt verständlich; die Seite scrollt senkrecht, nicht waagrecht.
- **Sehr viele Einträge in einer Woche (über 1000):** unrealistisch; die Datenbank liefert höchstens 1000 Zeilen pro Antwort, es muss dann ein sichtbarer Hinweis erscheinen, dass die Zahlen unvollständig sind (wie in PROJ-5, nicht still falsch rechnen).
- **Laden schlägt fehl oder Sitzung abgelaufen:** Fehlermeldung mit «Erneut versuchen» bzw. Weiterleitung zur Anmeldung; keine fremden oder veralteten Zahlen.
- **Nutzer löscht den letzten Eintrag der Woche im Detail:** Detail schliesst sich, Leerzustand der Woche erscheint, Fokus auf der Wochenüberschrift.
- **Zukünftige Woche per Adresse:** wird auf die aktuelle Woche umgeleitet (Einträge in der Zukunft sind nicht erlaubt).

## Technical Requirements (optional)
- **Sicherheit:** Nur angemeldete Nutzer; Daten über dieselben Zugriffsregeln wie PROJ-4/PROJ-5 (nur eigene Einträge). Beschreibungstexte werden immer als Text dargestellt (kein HTML).
- **Performance:** Die Woche lädt mit einer Abfrage; Raster steht in unter ca. 1 Sekunde nach dem Laden der Seite (bei normaler Verbindung).
- **Responsive:** Mobile-first; Raster ab ca. 768 px, Tageskarten darunter; getestet bei 320, 375, 768 und 1440 px.
- **Browser:** Chrome, Firefox, Safari (aktuelle Versionen).
- **Design:** `docs/design-system.md`; Kontrast WCAG AA; bestehende Bausteine (Dialog/Blatt, Formular, Rückfrage) wiederverwenden.

## Open Questions
- [ ] Soll ein **laufender Timer** in der aktuellen Woche mitgezählt oder zumindest als Hinweis («Timer läuft, wird nach dem Stoppen eingerechnet») erwähnt werden? Vorschlag für den MVP: nicht mitzählen, kein Hinweis (die Timer-Leiste zeigt ihn ohnehin); bei Bedarf später ergänzen.
- [ ] Soll die Zelle im Raster zusätzlich ein Zeichen zeigen, wenn die verrechenbare Zeit von der gearbeiteten abweicht (z. B. Punkt oder «v»)? Vorschlag: nein im MVP, das Detail und die Summen reichen.
- [ ] Ist die Reihenfolge der Zeilen (nach Kürzel, dann Projekt) richtig, oder lieber nach Wochenstunden absteigend? Vorschlag: Kürzel (stabil, vergleichbar von Woche zu Woche).

## Decision Log

### Product Decisions
| Decision | Rationale | Date |
|----------|-----------|------|
| Raster Projekt × Wochentag statt Tagesblöcken | Die Seite «Zeiten» (PROJ-5) zeigt schon Tage mit Einträgen; das Raster liefert etwas Neues: auf einen Blick, wo die Woche geblieben ist | 2026-11-16 |
| Beschreibung und Aktionen im Detail nach Antippen einer Zelle, nicht im Raster | Raster bleibt übersichtlich, PRD-Forderung «mit Beschreibung» erfüllt; Bearbeiten und Löschen aus PROJ-5 wiederverwendet statt neu gebaut | 2026-11-16 |
| Montag bis Sonntag immer sichtbar, Pfeile, «Diese Woche», Adresse mit `?woche=2026-W46` | Stabiles Raster von Woche zu Woche; Link und Zurück-Knopf funktionieren wie bei «Zeiten» | 2026-11-16 |
| Zellen zeigen nur gearbeitet; Zeilen-, Spalten- und Wochensummen zeigen gearbeitet und verrechenbar | Zwei Zahlen pro Zelle überladen das Raster, vor allem am Handy; verrechenbar je Zelle steht im Detail | 2026-11-16 |
| Am Handy Tageskarten statt scrollbarem Raster | Zweidimensionales Scrollen ist am Handy mühsam; Projekt pro Tag bleibt lesbar, Tipp öffnet dasselbe Detail | 2026-11-16 |
| Eigener Navigationseintrag «Woche» (5 Einträge) | Die Wochenübersicht ist ein täglich genutzter Einstieg; Zugang mit einem Tipp, keine versteckte Umschaltung | 2026-11-16 |
| Keine Rundung, keine Filter, kein Erfassen aus der Wochenübersicht | Rundung in 15-Minuten-Einheiten gehört in die Monatsauswertung (PROJ-8); Filter und Erfassen gibt es schon an anderer Stelle | 2026-11-16 |
| Ein Eintrag zählt immer zu seinem Datum, auch bei Ende 24:00 | Entspricht dem Zeitmodell (ein Eintrag gehört zu einem Tag, kein Aufteilen über Mitternacht) | 2026-11-16 |
| Keine zukünftigen Wochen | Einträge in der Zukunft sind nicht erlaubt; Verhalten wie Monatsnavigation in PROJ-5 | 2026-11-16 |

### Technical Decisions
<!-- Added by /architecture -->
| Decision | Rationale | Date |
|----------|-----------|------|
| Keine Datenbank-Änderung, keine neue Tabelle, kein Server-Code | Reine Ansicht auf vorhandene Einträge; bestehende Zugriffsregeln (nur eigene Daten) genügen | 2026-11-16 |
| Summen im Browser aus den Einträgen der Woche berechnen | Eine Abfrage, Raster, Tageskarten, Detail und «Zeiten» können nicht auseinanderlaufen; Rechenlogik als eigene, getestete Funktion | 2026-11-16 |
| Neue Abfrage «Einträge einer Woche» statt Monatsabfrage | Eine Woche kann über zwei Monate gehen; teilt sich Technik und Obergrenze/Zähler mit der Monatsabfrage (Lehre aus BUG-1: Datenbank liefert höchstens 1000 Zeilen) | 2026-11-16 |
| Wochenlogik in eigener Datei, reine Kalenderdaten statt Uhrzeiten | Wie bei Monaten; Sommer-/Winterzeit und Jahreswechsel können nichts verschieben; ISO-Kalenderwoche | 2026-11-16 |
| Archiv-Hinweise (Kunde/Projekt archiviert) mit den Einträgen mitliefern | Daten liegen schon in der Datenbank; vermeidet viele Einzelabfragen pro Kunde | 2026-11-16 |
| Adresse als Zustand: `/woche?woche=2026-W46` | Wie `?monat=`: Link, Zurück-Knopf und Neuladen behalten die Woche | 2026-11-16 |
| Raster als semantische Tabelle (shadcn/ui «Table»), am Handy Tageskarten, nur eine Darstellung je Breite erreichbar | Screenreader lesen Tabellen richtig; zweidimensionales Scrollen am Handy vermeiden | 2026-11-16 |
| Detail merkt sich nur die Zelle und liest die Einträge aus der geladenen Woche | Nach jeder Änderung stimmen Detail, Raster und Summen; Detail schliesst sich bei leerer Zelle | 2026-11-16 |
| Bearbeiten/Löschen unverändert aus PROJ-5 (verschachtelte Dialoge über dem Detail) | Keine zweite Umsetzung derselben Regeln; Fokus-Rückgabe besonders testen (BUG-2-Erfahrung) | 2026-11-16 |
| Keine neuen Pakete | Vorhandene shadcn/ui-Bausteine und Standard-Datumsfunktionen genügen | 2026-11-16 |

---
<!-- Sections below are added by subsequent skills -->

## Tech Design (Solution Architect)

### Überblick
Die Wochenübersicht ist eine **reine Ansicht auf bestehende Zeiteinträge**. Es entstehen keine neue Tabelle, keine neuen Zugriffsregeln und keine Datenbank-Änderung. Neu ist die Seite `/woche`, eine Wochenlogik (welche Tage gehören zur Woche) und eine Abfrage «alle Einträge von Montag bis Sonntag». Alles andere (Eintragszeile, Bearbeiten, Löschen, Dialog/Blatt, Ladezustände, Fokus-Rückgabe) wird aus PROJ-4/PROJ-5 wiederverwendet. **Backend-Aufwand: klein**, nur in der Datenschicht (Abfrage), kein SQL.

### A) Komponentenstruktur
```
Seite /woche (geschützt, Titel «Woche · Time Tracker Light»)
+-- Kopfzeile: Überschrift «Woche» + Knopf «Zeit erfassen» (Formular wie auf «Zeiten»)
+-- Wochenleiste
|   +-- Pfeil «Vorherige Woche»
|   +-- Überschrift «KW 46 · 9.–15. Nov. 2026» (kündigt Wechsel an)
|   +-- Pfeil «Nächste Woche» (in der aktuellen Woche gesperrt)
|   +-- Knopf «Diese Woche»
+-- Wochensummen (gearbeitet · verrechenbar)
+-- Hinweis «Zahlen unvollständig» (nur bei mehr als 1000 Einträgen)
+-- Zustände: Laden (Platzhalter) / Fehler mit «Erneut versuchen» / Leerzustand mit «Zeit erfassen»
+-- Raster (ab ca. 768 px, als echte Tabelle)
|   +-- Kopfzeile: Projekt | Mo 9. | Di 10. | … | So 15. | Summe   (heutiger Tag mit «Heute» markiert)
|   +-- eine Zeile je Kunde · Projekt (Kürzel, Name, «archiviert»-Hinweis)
|   |   +-- 7 Zellen: «1:30» als Knopf (mit Einträgen) oder «–» (leer, nicht klickbar)
|   |   +-- Zeilensumme (gearbeitet, verrechenbar)
|   +-- Fusszeile: Tagessummen (gearbeitet, verrechenbar) + Wochensumme gesamt
+-- Tageskarten (unter ca. 768 px)
|   +-- eine Karte je Tag Mo–So: Wochentag, Datum, Tagessumme
|       +-- eine Zeile je Projekt (Knopf, öffnet das Detail) oder «–»
+-- Detail (Dialog am Laptop, Blatt von unten am Handy; schon vorhanden: ResponsiveDialog)
    +-- Titel «Kürzel · Projekt, Wochentag, Datum», Summe der Zelle
    +-- Einträge der Zelle (vorhandene Eintragszeile mit Bearbeiten und Löschen)
    +-- (öffnet bei Bedarf die bestehenden Dialoge «Zeit bearbeiten» und «Eintrag löschen?»)
```
Raster und Tageskarten zeigen **dieselben Daten**. Nur eine der beiden Darstellungen ist je Bildschirmbreite sichtbar (die andere ist für Screenreader und Tastatur ausgeblendet), die Umschaltung geschieht ohne Flackern beim Laden.

### B) Datenmodell (in Alltagssprache)
**Es werden keine neuen Daten gespeichert.** Die Wochenübersicht liest die vorhandenen Zeiteinträge (PROJ-4) und rechnet daraus:

```
Eine Woche hat:
- Kennung (Jahr und Kalenderwoche, z. B. «2026-W46»), Montag bis Sonntag nach Zürcher Datum
- 7 Tage (Datum, Wochentag), jeder mit Tagessumme (gearbeitet, verrechenbar)
- Zeilen: je Kunde · Projekt mit Einträgen in dieser Woche
    - Kürzel, Kundenname, Projektname, Hinweis «archiviert»
    - je Tag: Zelle mit Summe (gearbeitet, verrechenbar) und den zugehörigen Einträgen
    - Wochensumme der Zeile (gearbeitet, verrechenbar)
- Wochensumme gesamt (gearbeitet, verrechenbar)

Ein Eintrag (bekannt aus PROJ-4) hat: Datum, Projekt, Dauer, verrechenbare Dauer,
optionale Uhrzeiten, optionale Beschreibung. Neu mitgeliefert für diese Ansicht:
«Kunde archiviert?» und «Projekt archiviert?» (liegen schon in der Datenbank).

Gespeichert in: Supabase (bestehende Tabelle der Zeiteinträge, bestehende Zugriffsregeln:
nur eigene Einträge). Die Zusammenfassung (Zellen, Summen) entsteht nur im Browser aus den Einträgen.
```

### C) Technische Entscheidungen (begründet)
- **Keine neue Datenbank-Struktur, kein neuer Server-Code.** Die Seite spricht wie «Zeiten» direkt über die bestehende Datenschicht mit Supabase; die vorhandenen Zugriffsregeln schützen die Daten. Das hält das Projekt kostenlos und einfach (Supabase Free, Vercel Hobby).
- **Summen im Browser berechnen statt in der Datenbank.** Eine Woche hat realistisch höchstens ein paar Dutzend Einträge. Eine einzige Abfrage genügt, die Summen von Raster, Tageskarten, Detail und der Seite «Zeiten» stammen aus denselben Einträgen und können deshalb nicht auseinanderlaufen (Erfolgskriterium 4 aus dem PRD: Auswertung bleibt nach Korrekturen richtig). Die Rechenlogik steht als eigene, einzeln testbare Funktion getrennt von der Oberfläche.
- **Eine Abfrage «Einträge von Datum bis Datum» für die Woche.** Eine Woche kann über zwei Monate gehen (29. Dez. bis 4. Jan.), die Monatsabfrage von PROJ-5 reicht daher nicht. Die Wochenabfrage nutzt dieselbe Technik (Zeitraum, Sortierung, Zähler für «mehr als 1000») und teilt sich den Code mit der Monatsabfrage, statt ihn zu kopieren. Aus der Erfahrung mit BUG-1 (Datenbank liefert höchstens 1000 Zeilen) zählt sie die Gesamtzahl mit und zeigt bei Überschreitung den Hinweis «Zahlen unvollständig».
- **Wochenlogik als eigene kleine Bibliothek (wie `month.ts` für Monate):** Kennung «2026-W46» prüfen, aktuelle Woche nach Zürcher Uhr, vor- und zurückblättern, Montag/Sonntag, Kalenderwoche nach ISO, Beschriftung «KW 46 · 9.–15. Nov. 2026». Alle Daten werden als reine Kalenderdaten («2026-11-09») gerechnet, nie als Uhrzeit mit Zeitzone, damit Sommer-/Winterzeit und Jahreswechsel nicht stören.
- **Adresse als Zustand (`/woche?woche=2026-W46`):** wie `?monat=` auf «Zeiten»: Link teilbar, Zurück-Knopf des Browsers funktioniert, Neuladen behält die Woche; ungültige oder zukünftige Woche führt zur aktuellen.
- **Raster als echte Tabelle, am Handy Tageskarten mit denselben Daten.** Eine semantische Tabelle (Spaltenköpfe, Zeilenköpfe) wird von Screenreadern richtig vorgelesen (Spec: Barrierefreiheit). Das bestehende Tabellen-Bauteil (shadcn/ui «Table») wird verwendet. Zwei Darstellungen über Bildschirmbreite statt eines scrollbaren Rasters, weil Scrollen in zwei Richtungen am Handy mühsam ist (Produktentscheidung).
- **Detail zeigt Daten aus der geladenen Woche, nicht eine Kopie.** Das Detail merkt sich nur «welche Zelle» (Projekt und Tag) und holt die Einträge aus der aktuell geladenen Woche. Nach Bearbeiten, Löschen, Timer-Stopp oder «Zeit erfassen» lädt die Woche neu, und Detail, Raster und Summen stimmen sofort wieder; wird die Zelle leer, schliesst sich das Detail. So gibt es keine veralteten Zahlen.
- **Bearbeiten und Löschen unverändert aus PROJ-5** (gleiche Dialoge, gleiche Regeln, gleiche Hinweise, gleiche Fokus-Rückgabe). Die Dialoge «Zeit bearbeiten» und «Eintrag löschen?» öffnen sich über dem Detail (verschachtelte Dialoge); beim Schliessen kehrt der Fokus zuerst ins Detail und beim Schliessen des Details zur Zelle zurück. Dieses Zusammenspiel ist der heikelste Punkt der Oberfläche und wird besonders getestet.
- **Aktualisierung bei Änderungen an anderer Stelle:** wie «Heute» und «Zeiten» reagiert die Seite auf den vorhandenen «Einträge geändert»-Zähler des Timers (Timer stoppen, Zeit erfassen); beim Zurückkehren auf die Seite wird frisch geladen.
- **Navigation: ein Eintrag mehr in der zentralen Liste** (Start, Woche, Zeiten, Kunden, Status). Seitenleiste und Tab-Leiste lesen dieselbe Liste; die Tab-Leiste ist für höchstens fünf Einträge gebaut, jeder Eintrag hat bei 320 px rund 64 px Breite (Vorgabe: mindestens 44 px).
- **Bewusst nicht gebaut:** Rundung (PROJ-8), Filter, Erfassen aus leerer Zelle, laufender Timer in der Summe.

### D) Neue Datenschicht-Bausteine (ohne Code)
- **Wochenlogik** (neue Datei neben der Monatslogik) mit Tests: Grenzfälle Jahreswechsel (KW 1 / KW 52/53), Sommer-/Winterzeit-Wochen, ungültige oder zukünftige Wochen.
- **Wochenzusammenfassung** (reine Funktion): Einträge → Zeilen je Projekt, Zellen je Tag, Tages-, Zeilen- und Wochensummen, mit Tests (mehrere Einträge pro Zelle, 24:00, archivierte Projekte, leere Woche, Summen stimmen mit der Summe der Einträge überein).
- **Neue Methode «Einträge einer Woche»** in der Schnittstelle der Zeiteinträge: Implementierung für Supabase und für die Tests im Speicher; liefert zusätzlich die Archiv-Hinweise (Kunde/Projekt archiviert).
- **Gemeinsame Anzeige-Bausteine:** Die Summenzeile «X gearbeitet · Y verrechenbar» und die Tagesbeschriftung gibt es schon auf «Zeiten»; sie werden in einen gemeinsamen Baustein verschoben, damit beide Seiten gleich aussehen.

### E) Abhängigkeiten (Pakete)
**Keine neuen Pakete.** Verwendet werden das vorhandene shadcn/ui «Table», «Button», «Card», «Alert», «Badge», «Skeleton», Dialog/Sheet (über den vorhandenen ResponsiveDialog) sowie die vorhandenen Symbole (lucide-react). Eine Kalender- oder Datumsbibliothek ist nicht nötig, weil die Wochenlogik nur Kalenderdaten braucht.

### F) Reihenfolge der Umsetzung (Hinweis für /backend und /frontend)
1. **/backend (klein):** Wochenlogik, Wochenzusammenfassung, Abfrage «Einträge einer Woche» (Supabase und im Speicher) samt Tests. Keine Datenbank-Änderung.
2. **/frontend:** Navigation «Woche», Seite `/woche`, Wochenleiste, Raster, Tageskarten, Detail, Ladezustände, Barrierefreiheit, Tests.
3. **/qa:** Kriterien, Randfälle (Jahreswechsel, verschachtelte Dialoge, über 1000 Einträge), Layout 320–1440 px, axe, Regression von «Zeiten» und «Start».

### G) Risiken
- **Verschachtelte Dialoge (Detail → Bearbeiten/Löschen) und Fokus:** BUG-2 in PROJ-5 hat gezeigt, dass Fokus-Rückgabe leicht verloren geht. Wird früh im Browser getestet.
- **Doppelte Darstellung (Raster und Tageskarten) im Seitenbaum:** Tests und Barrierefreiheitsprüfung müssen sicherstellen, dass nur die sichtbare Darstellung für Screenreader und Tastatur erreichbar ist.
- **Zeilen mit sehr langen Namen:** Raster darf nicht seitlich überlaufen (Umbruch statt Abschneiden).

## Implementation Notes (Backend)
**Umgesetzt am 2026-11-16. Keine Datenbank-Änderung, keine neue Tabelle, kein Server-Code (wie im Entwurf).** Alles liegt in der Datenschicht `src/lib/time-entries/`:

- **Wochenlogik** `week.ts` (+ `week.test.ts`, 18 Tests): Wochenkennung «2026-W46» (ISO, Montag bis Sonntag) prüfen und lesen, aktuelle Woche nach Zürcher Uhr, `resolveWeek` (ungültig oder zukünftig → aktuelle Woche), `shiftWeek` (über Jahreswechsel, auch KW 53), `weekRange`/`weekDays`/`weekStart`, `weekOfDate`, Beschriftungen `formatWeekLabel` («KW 46 · 9.–15. Nov. 2026», über Monats- und Jahresgrenzen) und `formatDayShort` («Mo 9.»). Gerechnet wird nur mit Kalenderdaten, Monatsnamen aus eigener Liste (nicht von der Laufzeitumgebung abhängig). Getestet: Jahreswechsel, Schaltjahr, KW 53, Zeitumstellung (25. Okt. 2026), Zürcher Mitternacht.
- **Wochenzusammenfassung** `week-summary.ts` (+ `week-summary.test.ts`, 11 Tests): `buildWeekSummary(week, entries)` liefert sieben Tage, Zeilen je Kunde · Projekt (nach Kürzel, dann Projektname), je Zeile sieben Zellen mit Einträgen und Summen (gearbeitet, verrechenbar), Tages-, Zeilen- und Wochensummen. Minutengenau, keine Rundung; Einträge ausserhalb der Woche werden ignoriert; Einträge bis 24:00 zählen zu ihrem Datum. Dazu `rowsOfDay` (für die Tageskarten am Handy) und `findCell` (Zelle für das Detail; null, wenn leer oder weg).
- **Neue Abfrage `listWeek(week)`** in der Schnittstelle (`repository.ts`), in `supabase-repository.ts` und im Test-Double `in-memory-repository.ts`. Neuer Typ `WeekEntries`; `TimeEntry` hat optional `customerArchived` und `projectArchived` (nur in Wochenabfragen gesetzt). Aufsteigend nach Datum, innerhalb eines Tages nach Startzeit, sonst Anlegezeit; höchstens 1000 Einträge, Zähler (`count: 'exact'`) meldet `truncated` (Lehre aus BUG-1).
- **Geteilter Code:** `listMonth` und `listWeek` benutzen dieselbe private Abfrage `listRange` (Zeitraum, Filter, Zähler, Sortierung). Verhalten und Tests von `listMonth` unverändert.
- **Tests:** Vitest 365 von 365 grün (vorher 332, neu 33: Wochenlogik 18, Zusammenfassung 11, Repository 4). `tsc` ohne Fehler, Lint nur die alte Warnung in `use-toast.ts`.
- **Prüfung gegen die echte Datenbank** (temporäres Skript, mit Testdaten, aufgeräumt und gelöscht): Die Abfrage mit den Archiv-Feldern von Projekt und Kunde wird von Supabase akzeptiert; von vier Einträgen (Sonntag davor, Montag, Sonntag, Montag danach) kommen genau Montag und Sonntag der Woche zurück, `count` stimmt, und die Archiv-Hinweise wechseln nach dem Archivieren von false auf true.

### Offen für /frontend
- Navigation «Woche» (`src/lib/navigation.ts`), Seite `/woche`, Wochenleiste, Raster (Tabelle), Tageskarten, Detail, Ladezustände. Die Bausteine `weekRange`, `buildWeekSummary`, `findCell`, `rowsOfDay`, `formatWeekLabel`, `formatDayShort` und `repository.listWeek` stehen bereit.
- Gemeinsame Summenzeile «X gearbeitet · Y verrechenbar» aus `zeiten-view.tsx` in einen gemeinsamen Baustein verschieben.

## QA Test Results
_To be added by /qa_

## Deployment
_To be added by /deploy_
