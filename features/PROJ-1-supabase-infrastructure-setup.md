# PROJ-1: Supabase Infrastructure Setup

## Status: Architected
**Created:** 2026-11-08
**Last Updated:** 2026-11-08

## Dependencies
- Keine. Das ist die Basis für alle anderen Features.

## User Stories
- Als Nutzer will ich, dass die App mit meiner Supabase-Datenbank verbunden ist, damit meine Zeiten zentral gespeichert werden und auf allen Geräten verfügbar sind.
- Als Nutzer will ich, dass nur ich Zugang zu meinen Daten habe, damit niemand Fremdes meine Arbeitszeiten und Kundennamen sehen kann.
- Als Entwickler (ich selbst) will ich, dass alle Zugangsdaten in Umgebungsvariablen liegen und dokumentiert sind, damit keine Geheimnisse im Repo landen und ich das Projekt auf einem neuen Rechner aufsetzen kann.
- Als Entwickler will ich einen dokumentierten Schema-Entwurf, damit die späteren Features (PROJ-3, PROJ-4, PROJ-6) auf einer gemeinsamen Datenbasis aufbauen.
- Als Nutzer will ich eine verständliche Meldung sehen, wenn die Datenbank nicht erreichbar ist, damit ich weiß, dass es nicht an mir liegt (z. B. pausiertes Projekt).

## Out of Scope
- Anlegen der Tabellen und der RLS-Regeln. Das macht jedes Feature selbst (Kunden/Projekte in PROJ-3, Zeiteinträge in PROJ-4).
- Login-Formular, Logout, Passwort-Reset und geschützte Seiten (PROJ-2).
- Automatisches Backup. Der CSV-Export (PROJ-9) dient als Sicherung.
- Automatischer Keep-alive gegen die Pausierung des Free-Tarifs.
- Getrennte Entwicklungs- und Produktionsumgebung (ein Projekt für beides).
- Das Vercel-Projekt und die Produktiv-URL (`/deploy`). Die Redirect-URL dafür wird dann ergänzt.

## Acceptance Criteria

**Format:** Angenommen [Vorbedingung] / Wenn [Aktion] / Dann [Ergebnis]

- [ ] Angenommen die Umgebungsvariablen sind in `.env.local` gesetzt, wenn die App startet, dann wird der Supabase-Client erstellt und ein Verbindungstest meldet Erfolg
- [ ] Angenommen eine Umgebungsvariable fehlt, wenn die App startet, dann erscheint eine klare Fehlermeldung mit dem Namen der fehlenden Variable
- [ ] Angenommen die Datei `.env.local.example` existiert, wenn ich das Repo frisch klone, dann kann ich daraus alle benötigten Variablen und ihre Bedeutung ablesen
- [ ] Angenommen das Repo ist durchsucht, wenn ich nach Schlüsseln und Tokens suche, dann findet sich kein Geheimnis im Quellcode oder in committeten Dateien
- [ ] Angenommen der öffentliche (anon) Schlüssel wird im Browser verwendet, wenn der Service-Role-Schlüssel existiert, dann wird dieser nie an den Browser ausgeliefert
- [ ] Angenommen E-Mail/Passwort-Login ist in Supabase aktiviert, wenn ich mein Konto angelegt habe, dann kann ich mich damit anmelden
- [ ] Angenommen mein Konto existiert, wenn eine fremde Person versucht, sich zu registrieren, dann wird die Registrierung von Supabase abgelehnt
- [ ] Angenommen die Redirect-URLs sind konfiguriert, wenn ich lokal teste, dann funktionieren Weiterleitungen auf `http://localhost:3000`
- [ ] Angenommen das Supabase-Projekt ist pausiert oder nicht erreichbar, wenn die App die Datenbank abfragen will, dann erscheint die Meldung «Datenbank nicht erreichbar. Ist das Supabase-Projekt pausiert?» statt eines leeren Bildschirms
- [ ] Angenommen der Schema-Entwurf liegt vor, wenn PROJ-3 oder PROJ-4 gestartet wird, dann können sie Entitäten, Beziehungen und Besitzer-Feld direkt daraus übernehmen

## Schema-Entwurf (nur Text, keine Tabellen)
| Entität | Felder | Beziehung |
|---------|--------|-----------|
| Kunde | Name, archiviert (ja/nein) | gehört dem Nutzer |
| Projekt | Name, archiviert (ja/nein) | gehört genau einem Kunden und dem Nutzer |
| Zeiteintrag | Datum, Beginn, Ende, gearbeitete Stunden, verrechenbare Stunden, Beschreibung | gehört einem Projekt und dem Nutzer |

Ein laufender Timer ist ein Zeiteintrag mit Beginn, aber ohne Ende. So sehen alle Geräte denselben Timer.

## Edge Cases
- Die Umgebungsvariablen zeigen auf ein falsches oder gelöschtes Projekt: Der Verbindungstest schlägt fehl, und die App zeigt die Fehlermeldung statt eines Absturzes.
- Das Supabase-Projekt ist nach 7 Tagen Inaktivität pausiert: Die Fehlermeldung nennt diese Ursache. Das Reaktivieren erfolgt manuell im Dashboard.
- Das Internet fällt aus: Die App zeigt eine Fehlermeldung. Offline-Erfassung ist ausdrücklich kein Ziel.
- Der Zugriffstoken (Personal Access Token) für den MCP-Server läuft ab oder wird erneuert: Der Server ist nur für die Entwicklung nötig. Die App läuft davon unabhängig.
- Der Service-Role-Schlüssel wird versehentlich mit `NEXT_PUBLIC_` benannt: Das würde ihn an den Browser ausliefern. Der Spec verbietet das, und `/qa` prüft es.
- Die Variablen fehlen auf Vercel: Der Build zeigt dieselbe klare Fehlermeldung wie lokal.

## Technical Requirements
- Security: Keine Geheimnisse im Repo. `.env.local` und `.mcp.json` bleiben in der `.gitignore`.
- Kosten: Ausschließlich Supabase Free und Vercel Hobby.
- Verfügbarkeit: Das Pausieren nach 7 Tagen ist akzeptiert.

## Open Questions
- [ ] Die Produktiv-URL für die Redirect-Konfiguration steht erst nach `/deploy` fest und wird dann ergänzt.

## Decision Log

### Product Decisions
| Decision | Rationale | Date |
|----------|-----------|------|
| PROJ-1 liefert nur Verbindung und Konfiguration, das Schema nur als Entwurf | Jedes Feature bringt seine Tabellen und RLS-Regeln mit und bleibt einzeln testbar. Es werden keine Entscheidungen vorweggenommen, die erst in den Feature-Interviews fallen. | 2026-11-08 |
| Eigenes Konto einmal anlegen, danach öffentliche Registrierung abschalten, zusätzlich RLS | Doppelter Schutz. Fremde können kein Konto erstellen, und Free-Tier-Limits bleiben geschützt. | 2026-11-08 |
| Ein Supabase-Projekt für Entwicklung und Produktion | Einzelnutzer. Ein zweites Projekt verdoppelt den Einrichtungsaufwand. Schema-Änderungen kommen als Migrationsdateien ins Repo. | 2026-11-08 |
| Pausierung des Free-Tarifs wird akzeptiert, kein Keep-alive | Die App wird voraussichtlich täglich genutzt. Ein Keep-alive wäre Technik für ein seltenes Problem. | 2026-11-08 |
| CSV-Export (PROJ-9) dient als Backup | Datenmenge klein, Export ist für die Abrechnung ohnehin nötig. Kein automatisches Backup im MVP. | 2026-11-08 |
| Laufender Timer = Zeiteintrag ohne Ende | Alle Geräte sehen denselben Timer. «Nur ein Timer aktiv» lässt sich in PROJ-6 einfach absichern. | 2026-11-08 |

### Technical Decisions
| Decision | Rationale | Date |
|----------|-----------|------|
| Zusätzliches Paket `@supabase/ssr` neben `@supabase/supabase-js` | Speichert die Anmeldung in Cookies. Nur so erkennen geschützte Seiten (PROJ-2) den eingeloggten Nutzer schon auf dem Server. Das reine Browser-Paket kann das nicht. | 2026-11-08 |
| Nur zwei Variablen in der App: Projekt-URL und öffentlicher Schlüssel | Der Service-Role-Schlüssel (Vollzugriff) wird von der App nie gebraucht. Ohne ihn kann er auch nicht versehentlich an den Browser gelangen. | 2026-11-08 |
| Variablen werden zentral an einer Stelle geprüft | Fehlt eine Variable, erscheint überall dieselbe klare Meldung mit dem Variablennamen, lokal wie auf Vercel. | 2026-11-08 |
| Verbindungstest auf einer eigenen Seite `/status` | Bleibt dauerhaft nützlich (z. B. bei pausiertem Projekt) und ist ohne Terminal testbar. | 2026-11-08 |
| Schema-Änderungen als Migrationsdateien im Repo (Ordner `supabase/migrations`) | Ein Projekt für Entwicklung und Produktion: Jede Änderung ist nachvollziehbar und das Schema lässt sich neu aufbauen. | 2026-11-08 |
| Auth-Einstellungen (Registrierung aus, Redirect-URLs) manuell im Supabase Dashboard | Diese Einstellungen sind nicht Teil des Codes. Eine Checkliste im Spec stellt sicher, dass nichts vergessen wird. | 2026-11-08 |

---
<!-- Sections below are added by subsequent skills -->

## Tech Design (Solution Architect)

### A) Bausteine (Struktur)
```
App
+-- Verbindung zu Supabase (zentral, einmal gebaut)
|   +-- Prüfung der Umgebungsvariablen (klare Meldung bei fehlender Variable)
|   +-- Zugang für den Browser (öffentlicher Schlüssel)
|   +-- Zugang für den Server (liest die Anmeldung aus den Cookies)
+-- Seite /status
|   +-- Statusanzeige «Datenbank erreichbar» (grün, mit Symbol und Text)
|   +-- Fehleranzeige «Datenbank nicht erreichbar. Ist das Supabase-Projekt pausiert?»
|   +-- Fehleranzeige «Variable X fehlt» (bei fehlender Konfiguration)
+-- Konfigurationsdateien
|   +-- .env.local.example (Variablen mit Erklärung)
|   +-- supabase/migrations (leer, bereit für PROJ-3 und PROJ-4)
+-- Dokumentation im Spec
    +-- Checkliste für die Einstellungen im Supabase Dashboard
```
Für die Statusseite werden die vorhandenen shadcn/ui-Komponenten (z. B. Alert und Card) verwendet. Neue UI-Komponenten sind nicht nötig.

### B) Datenmodell (in einfachen Worten)
In PROJ-1 werden **keine Daten gespeichert** und keine Tabellen angelegt. Der Schema-Entwurf im Spec bleibt maßgeblich:
- **Kunde:** Name, archiviert (ja/nein), gehört dem Nutzer
- **Projekt:** Name, archiviert (ja/nein), gehört einem Kunden und dem Nutzer
- **Zeiteintrag:** Datum, Beginn, Ende, gearbeitete und verrechenbare Stunden, Beschreibung, gehört einem Projekt und dem Nutzer. Ein laufender Timer ist ein Eintrag ohne Ende.

Gespeichert wird später in der Supabase-Datenbank (PostgreSQL). Die Anmeldedaten liegen bei Supabase Auth.

### C) Technische Entscheidungen (mit Begründung)
- **Supabase als einziges Backend:** Es deckt Datenbank und Login in einem kostenlosen Dienst ab. Das passt zu «geräteübergreifend» und «kostenlos».
- **Anmeldung in Cookies statt im Browser-Speicher:** Die Seiten können so schon vor dem Anzeigen prüfen, ob du eingeloggt bist. Das braucht PROJ-2 für geschützte Seiten.
- **Kein Service-Role-Schlüssel in der App:** Er hebelt alle Zugriffsregeln aus. Die App arbeitet nur mit dem öffentlichen Schlüssel, und die Datenbank schützt sich über RLS.
- **Eine zentrale Variablenprüfung:** Ein Tippfehler im Namen fällt sofort auf und nicht erst als unverständlicher Fehler später.
- **Statusseite:** Sie ist die schnellste Diagnose, wenn die App «nicht geht». Sie zeigt, ob die Ursache bei der Konfiguration oder beim pausierten Projekt liegt.
- **Migrationsdateien im Repo:** Ohne getrennte Test- und Produktivdatenbank ist die Versionierung des Schemas die Sicherung gegen Fehler.

### D) Manuelle Schritte im Supabase Dashboard (Checkliste)
1. E-Mail/Passwort-Login ist aktiviert.
2. Dein Konto wird einmal angelegt (Registrierung oder Dashboard).
3. Danach wird die öffentliche Registrierung abgeschaltet.
4. Redirect-URL `http://localhost:3000` ist eingetragen. Die Vercel-URL folgt bei `/deploy`.
5. Der Service-Role-Schlüssel wird nirgends in der App oder in `.env.local` hinterlegt.

### E) Abhängigkeiten (Pakete)
- `@supabase/ssr` (neu): Anmeldung über Cookies für Server und Browser
- `@supabase/supabase-js` (vorhanden): Verbindung zu Supabase
- `zod` (vorhanden): Prüfung der Umgebungsvariablen

### F) Auswirkungen auf andere Features
- **PROJ-2** baut auf dem Server-Zugang mit Cookies auf.
- **PROJ-3 und PROJ-4** legen ihre Tabellen als Migrationsdateien in `supabase/migrations` an, jeweils mit RLS.
- **PROJ-11** kann die Statusseite später in das App-Layout einbinden.

## QA Test Results
_To be added by /qa_

## Deployment
_To be added by /deploy_
