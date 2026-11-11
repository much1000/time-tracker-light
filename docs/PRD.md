# Product Requirements Document

## Vision
Eine persönliche Zeiterfassung als Web-App, mit der ich meine Arbeitszeit pro Kunde und Projekt schnell festhalte, auf jedem Gerät. Wochenübersicht und Monatsauswertung zeigen mir, was ich wann gemacht habe, und liefern die Grundlage für die Rechnungsstellung.

## Target Users
Ich selbst als Einzelperson, die für mehrere Kunden und Projekte arbeitet.
- **Schmerz:** Zeiten verteilen sich auf Zettel, Excel und Gedächtnis. Am Monatsende fehlt die saubere Auswertung samt Tätigkeitstexten, und es ist unklar, wie viel verrechenbar ist.
- **Anforderung:** schnell erfassen (Start/Stopp, nachträglich), Zeiten prüfen und korrigieren, geräteübergreifend nutzen.

## Core Features (Roadmap)

| Priorität | Feature | Status |
|-----------|---------|--------|
| P0 (MVP) | Supabase Infrastructure Setup (Projekt, Umgebungsvariablen, Datenbankschema, Login-Konfiguration) | Deployed |
| P0 | Anmeldung (E-Mail und Passwort, Einzelnutzer) | Deployed |
| P0 | Kunden- und Projektverwaltung (anlegen, bearbeiten, archivieren) | Deployed |
| P0 | Manuelle Zeiterfassung inkl. Nacherfassung (Datum, von–bis oder Dauer, Beschreibung, verrechenbare Stunden) | Planned |
| P0 | Zeiten prüfen und korrigieren (Liste, bearbeiten, löschen) | Planned |
| P0 | Timer (ein Start/Stopp-Knopf pro Kunde/Projekt, immer nur ein Timer aktiv) | Planned |
| P0 | Wochenübersicht (Stunden pro Tag, Kunde, Projekt, mit Beschreibung) | Planned |
| P0 | Monatsauswertung (Summe pro Kunde, gearbeitet und verrechenbar, inkl. Beschreibungstexte) | Planned |
| P0 | CSV-Export aller Zeiten (jederzeit) | Planned |
| P1 | Installierbare Web-App (PWA) für das Handy | Planned |

## Success Metrics
1. Ich erfasse meine gesamte Arbeitszeit nur noch in dieser App, ohne parallele Zettel oder Excel-Listen.
2. Eine Zeit zu erfassen dauert höchstens 10 Sekunden (Timer-Klick oder manueller Eintrag).
3. Die Monatsauswertung pro Kunde ist nach Monatsende in unter 5 Minuten fertig und direkt für die Rechnung nutzbar.
4. Zeiten lassen sich jederzeit korrigieren und nachträglich erfassen, ohne dass Auswertung oder Export dabei falsch werden.

## Constraints
- **Plattform:** Web-App, auf Laptop, Tablet und Handy gut bedienbar (responsive, mobile-first).
- **Kosten:** kostenlos, Supabase Free und Vercel Hobby.
- **Team:** Einzelperson, MVP nebenbei entwickelt.
- **Backend:** Supabase (PostgreSQL und Auth), Projekt `time-tracker-light` (vorher `my-first-app`) existiert bereits.
- **Design:** siehe `docs/design-system.md`. Kontrast nach WCAG AA, einfache Bedienung hat Vorrang.

## Non-Goals
- Kein Mehrbenutzer-Betrieb, keine Teams, Rollen oder Freigaben
- Keine Stundensätze, Beträge oder Rechnungserstellung (MVP erfasst nur Stunden, auch die verrechenbaren)
- Kein PDF-Export (nur Tabellen-Export als CSV)
- Keine Anbindung an andere Tools (Kalender, Buchhaltung, Jira o. Ä.)
- Keine native iOS-/Android-App
- Keine Offline-Erfassung ohne Internet
