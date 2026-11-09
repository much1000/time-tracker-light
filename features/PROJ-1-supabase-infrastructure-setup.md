# PROJ-1: Supabase Infrastructure Setup

## Status: Deployed
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

## Implementation Notes (Backend, 2026-11-08)

**Gebaut:**
- `src/lib/env.ts`: zentrale Prüfung der Variablen mit Zod. Fehler nennen den Variablennamen (`EnvError`). Lehnt zusätzlich `NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY` ab.
- `src/lib/supabase/client.ts`: Supabase-Zugang für den Browser.
- `src/lib/supabase/server.ts`: Supabase-Zugang für den Server (Anmeldung aus Cookies).
- `src/lib/supabase/health.ts`: `checkDatabase()` ruft den Health-Endpunkt des Auth-Dienstes auf (5 s Timeout) und liefert `ok`, `config-error` oder `unreachable` mit der vereinbarten Meldung.
- `supabase/migrations/.gitkeep`: Ordner für die Migrationen von PROJ-3 und PROJ-4.
- Neues Paket `@supabase/ssr`.
- Tests: `src/lib/env.test.ts` und `src/lib/supabase/health.test.ts` (10 Tests, alle grün).

**Abweichungen vom Design:**
- Der Platzhalter `src/lib/supabase.ts` wurde entfernt. Niemand hat ihn importiert, und er wird durch die beiden Dateien in `src/lib/supabase/` ersetzt.
- Die Seite `/status` ist noch **nicht** gebaut. Sie kommt mit `/frontend` und nutzt `checkDatabase()`.
- Es gibt keine API-Route. Der Verbindungstest läuft serverseitig direkt in der Seite.
- Es wurden keine Tabellen angelegt (Out of Scope), also gibt es auch keine RLS-Regeln.

**Geprüft:**
- `npm test`: 10 von 10 grün. `npx tsc --noEmit`: keine Fehler. `npm run build`: erfolgreich.
- Gegen das echte Projekt: Der Health-Endpunkt antwortet mit HTTP 200 mit öffentlichem Schlüssel und mit 401 ohne.

**Offen / zu beachten:**
- `.env.local.example` ist noch nicht auf Vollständigkeit geprüft. Sie muss `NEXT_PUBLIC_SUPABASE_URL` und `NEXT_PUBLIC_SUPABASE_ANON_KEY` mit Dummy-Werten und Erklärung enthalten, ohne Service-Role-Schlüssel. Die Datei ist für die KI-Werkzeuge gesperrt (Lesen von `.env*`) und muss von Hand geprüft werden.
- Dashboard-Schritte (manuell, erledigt am 2026-11-08): Konto angelegt (1 Nutzer, bestätigt), Registrierung abgeschaltet (`disable_signup: true` über die Auth-Einstellungen geprüft), E-Mail-Login aktiv. Die Redirect-URL `http://localhost:3000` kann nicht von außen geprüft werden und gilt als vom Nutzer eingetragen.
- `npm run lint` war defekt (`next lint` gibt es in Next 16 nicht mehr). Behoben außerhalb des Feature-Umfangs: neue `eslint.config.mjs` (Flat Config mit `eslint-config-next`), Skript auf `eslint .` umgestellt, alte `.eslintrc.json` entfernt. Für die generierten shadcn-Komponenten in `src/components/ui` ist die Regel `react-hooks/purity` abgeschaltet. Verbleibend: 1 Warnung in `src/hooks/use-toast.ts` (Starter-Code).

## Implementation Notes (Frontend, 2026-11-09)

**Gebaut:**
- `src/app/status/page.tsx`: Seite `/status` (Server-Komponente, bei jedem Aufruf frisch). Ruft `checkDatabase()` auf und zeigt das Ergebnis in einer Card.
- `src/app/status/loading.tsx`: Ladezustand mit Skeleton und Hinweis für Screenreader.
- `src/components/database-status.tsx`: zeigt die drei Zustände «Datenbank erreichbar», «Datenbank nicht erreichbar. Ist das Supabase-Projekt pausiert?» und «Konfiguration unvollständig» mit den Variablennamen. Jeder Zustand hat Symbol und Text, nicht nur Farbe. Nutzt die shadcn-Komponenten Alert, Card und Skeleton. Keine neuen UI-Komponenten installiert.
- `src/components/database-status.test.tsx`: 3 Tests (alle drei Zustände).
- `src/app/layout.tsx`: `lang` von `en` auf `de` gesetzt, da die Oberfläche deutsch ist.

**Abweichungen / Hinweise:**
- Das Theme (Farben, Schrift Inter, Hell-/Dunkelmodus, Logo, Navigation) wird erst in PROJ-11 umgesetzt. Die Statusseite nutzt bis dahin die Standard-Farben von shadcn/ui. Die Fehlerfarbe der Standard-Theme-Variable erreicht den Kontrast aus dem Design-System (4,5 : 1) möglicherweise nicht. Das wird mit PROJ-11 korrigiert und in `/qa` geprüft.
- Die Seite ist öffentlich erreichbar und zeigt nur den Zustand und Variablennamen, nie Werte. Soll sie nach PROJ-2 hinter dem Login liegen, ist das dort zu entscheiden.
- Die Startseite (`/`) ist weiterhin die Starter-Seite. Sie wird durch PROJ-11 und die späteren Features ersetzt.

**Geprüft:**
- `npm test`: 13 von 13 grün. `npx tsc --noEmit`: keine Fehler. `npm run lint`: 0 Fehler, 1 Warnung (Starter-Code). `npm run build`: erfolgreich, `/status` ist dynamisch.
- Produktivserver lokal gestartet: `/status` antwortet mit HTTP 200 und zeigt «Datenbank erreichbar» gegen das echte Supabase-Projekt.
- Noch nicht geprüft: Aussehen im Browser (Mobil 375 px, Tablet, Desktop) und die Fehlerzustände mit absichtlich falscher Konfiguration. Das gehört in `/qa`.

---

## QA Test Results

**Tested:** 2026-11-09
**App URL:** http://localhost:3000 (Entwicklungsserver mit echtem Supabase-Projekt)
**Tester:** QA Engineer (AI)
**Browser:** Google Chrome (Desktop). Firefox und Safari/WebKit nicht getestet (siehe «Nicht geprüft»).

### Automatische Tests
- Unit-Tests (`npm test`): 13 von 13 bestanden.
- E2E-Tests (`tests/PROJ-1-supabase-infrastructure-setup.spec.ts`): 7 von 7 bestanden, ausgeführt mit dem installierten Google Chrome.
- `npx tsc --noEmit`: keine Fehler. `npm run lint`: 0 Fehler, 1 Warnung (Starter-Code). `npm run build`: erfolgreich.

### Acceptance Criteria Status

#### AC-1: Verbindungstest meldet Erfolg
- [x] `/status` zeigt «Datenbank erreichbar» gegen das echte Projekt (E2E und Screenshot).

#### AC-2: Fehlende Variable ergibt klare Meldung mit Variablennamen
- [x] Durch Unit-Tests belegt (`env.test.ts`, `health.test.ts`, `database-status.test.tsx`): Name wird genannt, leerer Wert und ungültige URL werden erkannt.
- Hinweis: Nicht im Browser gegengeprüft, da der Dev-Server des Nutzers auf Port 3000 einen zweiten Start im Projektordner blockierte.

#### AC-3: `.env.local.example` dokumentiert alle Variablen
- [x] Vom Nutzer bestätigt («passt»). Für die KI-Werkzeuge gesperrt, daher nicht selbst gelesen.

#### AC-4: Keine Geheimnisse im Repo
- [x] `git grep` über alle versionierten Dateien und `git log -G` über die gesamte Historie: keine Tokens oder Schlüssel. `.env.local` und `.mcp.json` sind in `.gitignore`, nur `.env.local.example` ist versioniert.

#### AC-5: Service-Role-Schlüssel erreicht nie den Browser
- [x] Der Code referenziert ihn nirgends. Ein `NEXT_PUBLIC_`-Service-Role-Schlüssel wird abgelehnt (Unit-Test). E2E: Weder HTML noch alle Skripte der Seite enthalten `service_role`, `sbp_…` oder `sb_secret_`.

#### AC-6: Anmeldung mit E-Mail und Passwort möglich
- [ ] Nicht vollständig prüfbar: E-Mail-Provider ist aktiv, 1 bestätigter Nutzer existiert. Ein echter Login ist erst mit PROJ-2 möglich. Bei PROJ-2 prüfen.

#### AC-7: Fremde Registrierung wird abgelehnt
- [x] Über die öffentlichen Auth-Einstellungen: `disable_signup: true`. Es wurde bewusst kein Registrierungsversuch ausgeführt, weil er bei einer Fehlkonfiguration ein echtes Konto angelegt hätte.

#### AC-8: Redirect-URL `http://localhost:3000`
- [ ] Von außen nicht prüfbar. Wird mit dem ersten Login in PROJ-2 sichtbar.

#### AC-9: Meldung bei nicht erreichbarer oder pausierter Datenbank
- [x] Netzwerkfehler und Fehlerantworten ergeben die vereinbarte Meldung (Unit-Tests). Ein echter Verbindungsfehler wurde gegen einen unbekannten Host nachgestellt (DNS-Fehler, der `fetch`-Fehlerpfad greift).
- [ ] BUG-1: Auch ein falscher Schlüssel führt zu dieser Meldung (siehe unten).

#### AC-10: Schema-Entwurf liegt vor
- [x] Tabelle im Spec («Schema-Entwurf»), inklusive Besitzer-Feld und Timer-Regel.

### Edge Cases Status

#### EC-1: Variablen zeigen auf falsches oder gelöschtes Projekt
- [x] Unbekannter Host ergibt «nicht erreichbar» statt Absturz.
- [ ] BUG-1: Falscher Schlüssel bei richtigem Projekt wird als «pausiert?» gemeldet.

#### EC-2: Projekt nach 7 Tagen pausiert
- [ ] Nicht testbar, ohne das Projekt zu pausieren. Die Meldung ist durch Unit-Tests belegt. Das tatsächliche Antwortverhalten eines pausierten Projekts ist unbestätigt.

#### EC-3: Internet fällt aus
- [x] Der Fehlerpfad liefert die Meldung (Unit-Test, 5-Sekunden-Timeout vorhanden).

#### EC-4: Zugriffstoken für den MCP-Server läuft ab
- [x] Die App nutzt ihn nicht. Er steht nur in `.mcp.json` (ignoriert) und in einer Windows-Umgebungsvariable.

#### EC-5: Service-Role-Schlüssel mit `NEXT_PUBLIC_`-Präfix
- [x] Wird abgelehnt (Unit-Test).

#### EC-6: Variablen fehlen auf Vercel
- [ ] Nicht testbar vor `/deploy`. Das Verhalten ist dasselbe wie lokal (gleicher Code). Bei `/deploy` prüfen.

### Security Audit Results
- [x] Geheimnisse: keine im Quellcode, in der Historie oder im ausgelieferten Browser-Code.
- [x] Schlüssel-Trennung: nur der öffentliche Schlüssel wird verwendet. Er ist im Browser-Code sichtbar, das ist so vorgesehen.
- [x] Registrierung: abgeschaltet, 1 Nutzer vorhanden.
- [x] Eingaben: Die Seite hat keine Nutzereingaben, daher keine XSS- oder Injection-Fläche. Variablennamen in der Fehlermeldung stammen aus einer festen Liste.
- [x] Fehlermeldungen: nennen nur Variablennamen, nie Werte.
- [x] Abhängigkeiten: `npm audit --omit=dev` meldet 0 Schwachstellen (BUG-3 behoben). Offen nur Entwicklungswerkzeuge.
- [ ] BUG-4: Sicherheits-Header fehlen.
- [ ] BUG-6: Die öffentliche Seite löst bei jedem Aufruf eine Anfrage an Supabase aus, ohne Begrenzung.
- Autorisierung und RLS: nicht anwendbar, es gibt keine Tabellen und keine Nutzerdaten.

### Regression
Keine bereitgestellten Features vorhanden (keines mit Status «Deployed»). Die Starter-Seite `/` baut und lädt weiterhin (Build erfolgreich).

### Bugs Found

#### BUG-1: Falscher Schlüssel wird als «Projekt pausiert?» gemeldet
- **Severity:** Low
- **Steps to Reproduce:**
  1. In `.env.local` `NEXT_PUBLIC_SUPABASE_ANON_KEY` auf einen ungültigen Wert setzen.
  2. `/status` öffnen.
  3. Erwartet: Hinweis auf einen ungültigen Schlüssel.
  4. Tatsächlich: «Datenbank nicht erreichbar. Ist das Supabase-Projekt pausiert?». Supabase antwortet mit HTTP 401 (am echten Dienst bestätigt), und der Code behandelt jede Fehlerantwort gleich.
- **Priority:** Fix in next sprint

#### BUG-2: Kein Favicon (404)
- **Severity:** Low
- **Steps to Reproduce:**
  1. `/status` öffnen und die Konsole ansehen.
  2. Erwartet: keine Fehler.
  3. Tatsächlich: `GET /favicon.ico` antwortet mit 404 («Failed to load resource»). Das Design-System sieht das Würfel-Logo als Favicon vor.
- **Priority:** Fix in PROJ-11 (Logo und Layout). Der E2E-Test klammert diesen Fehler bewusst aus.

#### BUG-3: Abhängigkeiten mit bekannten Schwachstellen — BEHOBEN (2026-11-09)
- **Behebung:** `npm audit fix`. `next` 16.1.1 auf 16.4.5, `zod` auf 4.6.7, außerdem `postcss`, `nanoid`, `sharp` und weitere indirekte Pakete. `npm audit --omit=dev` meldet jetzt **0 Schwachstellen**. `package.json` blieb unverändert (Versionsbereiche erlaubten die neuen Versionen), geändert ist `package-lock.json`.
- **Folgefehler, ebenfalls behoben:** Mit Zod 4.6.7 lehnte `src/lib/env.ts` auch eine gültige Konfiguration ab (`z.undefined()` gilt im Objekt jetzt als Pflichtfeld). Die Unit-Tests haben das aufgefangen. Korrektur: Feld ist nun optional. Zusätzlich schließt `vitest.config.ts` den Ordner `tests/` aus, damit Vitest die Playwright-Tests nicht mitstartet.
- **Erneut geprüft:** 13 von 13 Unit-Tests, 7 von 7 E2E-Tests (gegen einen frisch gebauten Produktivserver mit Next 16.4.5), TypeScript ohne Fehler, Lint ohne Fehler, Build erfolgreich.
- **Rest:** `npm audit` (mit Dev-Paketen) zeigt noch 12 Meldungen (11 mittel, 1 hoch: `picomatch`) in `vitest`, `@vitest/ui`, `eslint-config-next` und deren Unterpaketen. Das sind reine Entwicklungswerkzeuge, die nicht ausgeliefert werden. Ein Update würde größere Versionssprünge (`--force`) erfordern und bleibt außerhalb von PROJ-1.
- **Ursprüngliche Meldung:**
- **Severity:** High (laut `npm audit`: 1 kritisch, 5 hoch, 1 mittel)
- **Details:**
  - `next` 16.1.1 (direkt): Dienstblockade über Bildoptimierung und über unsichere Verarbeitung von Server-Komponenten-Anfragen. Betroffen bis einschließlich 16.4.0.
  - `zod` (direkt): hoher Speicherverbrauch bei übergroßen Sammlungen. In dieser App nicht auslösbar, da nur kurze Texte geprüft werden.
  - Indirekt: `postcss`, `nanoid`, `sharp`, `source-map-js`, `baseline-browser-mapping`.
  - Laut `npm audit` ist für alle eine Korrektur verfügbar (`npm audit fix`).
- **Priority:** Fix before deployment. Danach Tests, Lint und Build erneut laufen lassen.

#### BUG-4: Sicherheits-Header fehlen
- **Severity:** Low
- **Details:** Die Regeln verlangen X-Frame-Options, X-Content-Type-Options, Referrer-Policy und Strict-Transport-Security. `next.config.ts` setzt keine.
- **Priority:** Fix in `/deploy` (dort vorgesehen)

#### BUG-5: Fehlerfarbe zu kontrastarm, Dunkelmodus nicht aktiv
- **Severity:** Low
- **Details:** Die Standard-Fehlerfarbe von shadcn/ui hat auf Weiß 3,76 : 1 (Soll laut Design-System: 4,5 : 1). Erfolgsgrün erreicht 5,0 : 1 (hell) und 10,2 : 1 (dunkel). Bei dunkler Systemeinstellung bleibt die Seite hell, das Theme-Umschalten gibt es noch nicht.
- **Priority:** Fix in PROJ-11 (Theme). Danach mit der Fehleransicht erneut prüfen.

#### BUG-6: Öffentliche Seite ruft Supabase bei jedem Aufruf ab
- **Severity:** Low
- **Details:** `/status` ist ohne Login erreichbar und löst pro Aufruf eine Anfrage an Supabase aus (Timeout 5 Sekunden). Ohne Begrenzung ließe sich damit unnötig Last erzeugen. Risiko gering, da die App privat genutzt wird.
- **Priority:** In PROJ-2 entscheiden, ob die Seite hinter den Login kommt.

### Nicht geprüft
- Firefox und Safari/WebKit. Der Download des mitgelieferten Chromium (und damit der WebKit-Variante «Mobile Safari» der Playwright-Konfiguration) blieb auf dieser Maschine hängen. `npm run test:e2e` funktioniert hier erst nach einem erfolgreichen `npx playwright install`.
- Die drei Fehleransichten im Browser.
- Verhalten eines tatsächlich pausierten Projekts.

### Summary
- **Acceptance Criteria:** 8/10 bestanden. AC-6 und AC-8 sind erst mit PROJ-2 prüfbar. Beides sind offene Prüfungen, keine Fehler.
- **Bugs Found:** 6 insgesamt, davon 1 behoben (BUG-3, High). Offen: 5 low (0 critical, 0 high, 0 medium).
- **Security:** Keine Geheimnisse und keine Zugriffsprobleme. Ausgelieferte Abhängigkeiten ohne bekannte Schwachstellen.
- **Production Ready:** YES (nach Behebung von BUG-3 und erneuter Prüfung)
- **Recommendation:** Deploy möglich. Die offenen Low-Fehler wandern in PROJ-11 (BUG-2, BUG-5), PROJ-2 (BUG-6), `/deploy` (BUG-4) und den nächsten Sprint (BUG-1). Vor dem Deployment die Redirect-URL und die Variablen auf Vercel prüfen (AC-8, EC-6).

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

