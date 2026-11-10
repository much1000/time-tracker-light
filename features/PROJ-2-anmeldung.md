# PROJ-2: Anmeldung

## Status: In Progress
**Created:** 2026-11-08
**Last Updated:** 2026-11-10

## Dependencies
- Requires: PROJ-1 (Supabase Infrastructure Setup): Konto existiert, Registrierung ist abgeschaltet, E-Mail-Login ist aktiv
- Requires: PROJ-11 (Design-System-Basis): Theme, Route-Gruppe ohne Navigation für die Anmeldeseiten, Navigation für den Abmelden-Knopf
- Grundlage für: PROJ-3 bis PROJ-9 (alle Daten gehören dem angemeldeten Nutzer)

## User Stories
- Als Einzelnutzer möchte ich mich mit E-Mail und Passwort anmelden, damit nur ich meine Zeiten sehe und bearbeite.
- Als Einzelnutzer möchte ich auf jedem Gerät angemeldet bleiben, bis ich mich selbst abmelde, damit ich Zeiten ohne Passworteingabe erfasse.
- Als Einzelnutzer möchte ich, dass jede Seite ausser der Anmeldung geschützt ist, damit niemand ohne Login Daten oder die Statusseite sieht.
- Als Einzelnutzer möchte ich mein Passwort per E-Mail-Link zurücksetzen können, damit ich nicht ausgesperrt bin, wenn ich es vergesse.
- Als Einzelnutzer möchte ich mich abmelden können, damit ich ein fremdes oder geteiltes Gerät sauber verlasse.
- Als Einzelnutzer möchte ich das Passwort anzeigen können und der Browser soll es ausfüllen können, damit die Anmeldung auf dem Handy schnell und fehlerarm ist.

## Out of Scope
- Registrierung neuer Konten (bleibt abgeschaltet, PROJ-1)
- Mehrere Nutzer, Rollen, Freigaben (Non-Goal laut PRD)
- Passwort ändern im eingeloggten Zustand, E-Mail-Adresse ändern, Konto löschen (später, bei Bedarf)
- Anmelden über Google, Apple, Magic Link oder Zwei-Faktor-Anmeldung
- Auswahl «Angemeldet bleiben» (die Anmeldung bleibt immer bestehen)
- Eigene Sperre nach Fehlversuchen oder eigene Zähler (Supabase begrenzt Versuche selbst)
- Knopf «Auf allen Geräten abmelden» (geht bei Bedarf im Supabase-Dashboard)
- Eigene Fehlerseite für unbekannte Adressen (BUG-3 aus PROJ-11): kann nebenbei erledigt werden, ist aber nicht Teil dieses Features
- Theme-Schalter auf der Anmeldeseite (sie folgt der Geräteeinstellung bzw. der gespeicherten Wahl)
- Sicherheits-Header, Content-Security-Policy (separat, `/deploy`)

## Acceptance Criteria

**Format:** Angenommen [Vorbedingung] / Wenn [Aktion] / Dann [Ergebnis]

**Seitenschutz**
- [ ] Angenommen der Nutzer ist nicht angemeldet, wenn er eine geschützte Adresse (`/`, `/status` und später alle weiteren) öffnet, dann landet er auf der Anmeldeseite und sieht keinen Inhalt der geschützten Seite.
- [ ] Angenommen der Nutzer wurde von einer geschützten Adresse umgeleitet, wenn er sich erfolgreich anmeldet, dann kommt er auf die ursprünglich gewünschte Seite zurück.
- [ ] Angenommen der Nutzer hat die Anmeldeseite direkt geöffnet, wenn er sich erfolgreich anmeldet, dann kommt er auf die Startseite `/`.
- [ ] Angenommen der Nutzer ist angemeldet, wenn er die Anmeldeseite öffnet, dann wird er auf die Startseite weitergeleitet.
- [ ] Angenommen der Nutzer ist nicht angemeldet, wenn eine unbekannte Adresse geöffnet wird, dann landet er ebenfalls auf der Anmeldeseite (nichts verrät, welche Seiten es gibt).
- [ ] Angenommen der Nutzer ist nicht angemeldet, wenn `/status` aufgerufen wird, dann löst das keine Datenbankanfrage aus (BUG-6 aus PROJ-1 behoben).

**Anmeldung**
- [ ] Angenommen der Nutzer ist nicht angemeldet, wenn er die Anmeldeseite öffnet, dann sieht er Logo, Überschrift, ein Feld «E-Mail», ein Feld «Passwort», den Knopf «Anmelden» und den Link «Passwort vergessen?», ohne Seitenleiste und ohne Tab-Leiste.
- [ ] Angenommen die Felder sind ausgefüllt, wenn der Nutzer mit korrekten Daten auf «Anmelden» klickt oder Enter drückt, dann ist er angemeldet und wird weitergeleitet.
- [ ] Angenommen der Nutzer meldet sich an, wenn die Anfrage läuft, dann ist der Knopf deaktiviert und zeigt «Anmelden …», damit nicht doppelt gesendet wird.
- [ ] Angenommen der Nutzer hat sich angemeldet, wenn er die Seite neu lädt, den Browser schliesst und später wieder öffnet, dann ist er weiterhin angemeldet.
- [ ] Angenommen die Anmeldung wird auf einem zweiten Gerät durchgeführt, wenn beide Geräte genutzt werden, dann sind beide unabhängig angemeldet.
- [ ] Angenommen der Nutzer gibt falsche Daten ein, wenn er absendet, dann erscheint am Formular die Meldung «E-Mail oder Passwort stimmt nicht» mit Symbol und Text, die E-Mail bleibt stehen, das Passwortfeld wird geleert, und die Meldung verrät nicht, ob die E-Mail existiert.
- [ ] Angenommen ein Pflichtfeld ist leer oder die E-Mail hat kein gültiges Format, wenn der Nutzer absendet, dann erscheint ein Hinweis direkt am Feld, und es geht keine Anfrage raus.
- [ ] Angenommen es gab zu viele Versuche (Begrenzung durch Supabase), wenn der Nutzer erneut absendet, dann erscheint «Zu viele Versuche. Bitte warte ein paar Minuten.»
- [ ] Angenommen die Anmeldung ist nicht erreichbar (Netzwerk oder Dienst), wenn der Nutzer absendet, dann erscheint «Die Anmeldung ist gerade nicht erreichbar. Bitte versuche es später erneut.» und die Eingabe bleibt erhalten.

**Passwortfeld und Bedienung**
- [ ] Angenommen das Passwortfeld, wenn der Nutzer auf das Auge-Symbol klickt, dann wird das Passwort angezeigt bzw. wieder verdeckt; der Schalter heisst «Passwort anzeigen» bzw. «Passwort verbergen», ist per Tastatur bedienbar, und das Passwort ist beim Laden der Seite und nach dem Absenden verdeckt.
- [ ] Angenommen ein Browser oder Passwortmanager, wenn die Anmeldeseite geladen wird, dann erkennt er E-Mail- und Passwortfeld und kann sie ausfüllen.
- [ ] Angenommen eine Handy-Tastatur, wenn die Felder fokussiert werden, dann erscheint für die E-Mail die passende Tastatur, und Grossschreibung und Autokorrektur sind abgeschaltet.
- [ ] Angenommen alle Elemente der Anmeldeseiten, wenn sie gemessen werden, dann sind sie mindestens 44 px hoch, Labels sind immer sichtbar (kein reiner Platzhaltertext), Fehler werden Screenreadern angesagt, und Kontrast und Fokusring entsprechen dem Design-System.
- [ ] Angenommen die Anmeldeseiten, wenn sie geladen werden, dann tragen sie den Titel «Anmelden · Time Tracker Light» bzw. «Passwort zurücksetzen · Time Tracker Light».

**Passwort vergessen**
- [ ] Angenommen der Nutzer klickt auf «Passwort vergessen?», wenn er seine E-Mail eingibt und absendet, dann erscheint immer «Falls ein Konto existiert, haben wir eine E-Mail gesendet», egal ob die Adresse stimmt.
- [ ] Angenommen der Nutzer hat die E-Mail erhalten, wenn er den Link öffnet, dann sieht er die Seite «Neues Passwort» mit einem Passwortfeld samt Anzeigen-Schalter.
- [ ] Angenommen die Seite «Neues Passwort», wenn der Nutzer ein Passwort mit mindestens 10 Zeichen absendet, dann ist das Passwort geändert, er ist angemeldet und landet auf `/`.
- [ ] Angenommen ein Passwort mit weniger als 10 Zeichen, wenn der Nutzer absendet, dann erscheint ein Hinweis am Feld mit der Anforderung, und das Passwort bleibt unverändert.
- [ ] Angenommen der Link ist abgelaufen, schon benutzt oder ungültig, wenn er geöffnet wird, dann erscheint «Dieser Link ist nicht mehr gültig» mit der Möglichkeit, einen neuen anzufordern.
- [ ] Angenommen der Nutzer hat das Passwort geändert, wenn er sich auf einem anderen Gerät anmelden will, dann gilt das neue Passwort.

**Abmelden**
- [ ] Angenommen der Nutzer ist angemeldet, wenn er die Navigation ansieht, dann gibt es einen Knopf «Abmelden» in der Seitenleiste (Laptop, Tablet) bzw. in der Kopfzeile (Handy).
- [ ] Angenommen der Nutzer klickt auf «Abmelden», wenn die Abmeldung abgeschlossen ist, dann landet er auf der Anmeldeseite, und die Zurück-Taste des Browsers zeigt keinen geschützten Inhalt mehr.
- [ ] Angenommen der Nutzer hat sich abgemeldet, wenn er eine geschützte Adresse öffnet, dann wird er wieder zur Anmeldeseite geleitet.

**Prüfung der offenen Punkte aus PROJ-1**
- [ ] Angenommen die Redirect-URLs sind in Supabase eingetragen, wenn der Link zum Zurücksetzen lokal (`http://localhost:3000`) und auf der Produktiv-Adresse geöffnet wird, dann kommt der Nutzer auf der jeweils richtigen Adresse an (AC-6 und AC-8 aus PROJ-1).

## Edge Cases
- **Sitzung läuft auf einer offenen Seite ab** (z. B. am Passwort geändert oder im Dashboard beendet): Beim nächsten Seitenwechsel oder Speichern wird zur Anmeldeseite geleitet, ohne Fehlerseite. Nicht gespeicherte Eingaben sind in diesem Feature nicht gesichert.
- **Doppelklick auf «Anmelden»:** Es geht nur eine Anfrage raus.
- **Zurück-Taste nach dem Anmelden:** Sie führt nicht wieder auf die Anmeldeseite, sondern bleibt in der App.
- **E-Mail mit Gross- und Kleinbuchstaben oder Leerzeichen am Ende:** Die Anmeldung funktioniert trotzdem (Gross-/Kleinschreibung egal, Leerzeichen werden entfernt).
- **Passwort mit Sonderzeichen oder sehr lang (z. B. 200 Zeichen):** Wird akzeptiert und nicht abgeschnitten.
- **Reset-Link in einem anderen Browser oder auf einem anderen Gerät geöffnet als angefordert:** Mit der Standardvorlage von Supabase (Free-Plan) funktioniert das nicht. Es erscheint «Dieser Link ist nicht mehr gültig» mit dem Formular für einen neuen Link. Unter der Bestätigung steht der Hinweis, den Link im selben Browser zu öffnen. (Geändert in `/backend` am 2026-11-10, siehe Decision Log. Mit eigenem SMTP-Server und angepasster Vorlage würde es auch geräteübergreifend funktionieren.)
- **Mehrfach «Passwort vergessen» in kurzer Zeit:** Die Begrenzung von Supabase greift, die App zeigt «Zu viele Versuche. Bitte warte ein paar Minuten.»
- **Fehlende oder falsche Konfiguration (Umgebungsvariablen):** Statt Absturz erscheint eine verständliche Meldung auf der Anmeldeseite.
- **Anmeldeseite im dunklen Theme und bei 320 px Breite:** Nichts läuft über, alles bleibt lesbar und bedienbar.
- **JavaScript lädt nicht:** Die Seite bleibt sichtbar, die Anmeldung funktioniert dann aber nicht; eine Meldung ist nicht Teil dieses Features.

## Technical Requirements
- **Sicherheit:** Eingaben werden serverseitig geprüft; Passwörter werden nie angezeigt, protokolliert oder in der Adresse übertragen; die Prüfung «angemeldet oder nicht» passiert auf dem Server, bevor eine geschützte Seite ausgeliefert wird.
- **Browser:** aktuelle Chrome, Firefox, Safari (auch iOS), Passwortmanager
- **Performance:** Anmeldung bis zur Weiterleitung unter 2 Sekunden bei normaler Verbindung
- **Barrierefreiheit:** WCAG 2.1 AA, Tastaturbedienung, Fehlermeldungen für Screenreader

## Open Questions
- [ ] **Mindestlänge des Passworts (10 Zeichen, bestätigt)** muss auch in Supabase unter Authentication → Providers → Email eingestellt werden (Dashboard-Schritt für dich; wird in `/architecture` als Checkliste festgehalten).
- [ ] **Redirect-URLs in Supabase:** `http://localhost:3000` und `https://time-tracker-light.vercel.app` müssen eingetragen sein (laut `/deploy` offen bzw. unklar, ob erledigt).
- [x] ~~E-Mail-Vorlage für «Passwort zurücksetzen» auf Deutsch anpassen~~ Entschieden in `/backend`: Auf dem Free-Plan ist die Vorlage nur mit eigenem SMTP-Server änderbar. Es bleibt bei der englischen Standardvorlage (siehe Decision Log).
- [ ] **Eigener SMTP-Server später?** Bringt deutsche Vorlage, geräteübergreifenden Link und höheres Mail-Limit. Nur bei Bedarf (z. B. wenn Link-Scanner oder Browserwechsel auf dem Handy stören).
- [ ] **Wie testet `/qa` die echte Anmeldung?** Vorschlag: Zugangsdaten für den Test kommen aus einer lokalen, nicht eingecheckten Datei (z. B. `.env.test.local`, in `.gitignore`), nur auf deinem Rechner. Ohne sie prüft `/qa` alle Abläufe ohne Login und überlässt dir die Handprüfung von Anmelden, Abmelden und Passwort-Reset. Entscheidung vor `/qa`.
- [ ] **Abmelden-Knopf in der Kopfzeile am Handy:** Bei 320 px Breite könnte es mit Logo, Theme-Knopf und Abmelden-Knopf eng werden. Fällt es zu eng aus, werden Darstellung und Abmelden in ein gemeinsames Menü gelegt. Entscheidung in `/frontend`.
- [ ] **E-Mail-Versand:** Supabase Free versendet mit eingeschränktem eigenem Dienst (wenige Mails pro Stunde, Absender von Supabase). Für ein Konto genügt das. Nachprüfen, dass die Mail nicht im Spam landet.

## Decision Log

### Product Decisions
| Decision | Rationale | Date |
|----------|-----------|------|
| Nur die Anmeldeseiten sind öffentlich, alles andere (auch `/status` und unbekannte Adressen) liegt hinter dem Login | Einfachste Regel, löst BUG-6 aus PROJ-1 (unbegrenzte Anfragen von aussen) | 2026-11-09 |
| «Passwort vergessen» in der einfachen Form (E-Mail-Link, neues Passwort, danach angemeldet) | Vermeidet Aussperren bei einem einzigen Konto; Aufwand klein; PROJ-1 hatte den Reset für PROJ-2 vorgesehen | 2026-11-09 |
| Antwort bei «Passwort vergessen» immer gleich, egal ob die Adresse existiert | Verrät nicht, welche Adressen ein Konto haben | 2026-11-09 |
| Anmeldung bleibt dauerhaft bestehen, bis zum Abmelden, ohne Auswahl «Angemeldet bleiben» | Passt zum Ziel «Zeit in unter 10 Sekunden»; private App, eine Option weniger | 2026-11-09 |
| Abmelden-Knopf in Seitenleiste (Laptop) und Kopfzeile (Handy); «Auf allen Geräten abmelden» nur im Dashboard | Genug für ein Einzelkonto, kein zusätzlicher Bildschirm | 2026-11-09 |
| Eine allgemeine Fehlermeldung bei falschen Daten («E-Mail oder Passwort stimmt nicht»), keine eigene Sperre | Verrät keine Existenz von Konten; Supabase begrenzt Versuche, eigene Sperre könnte nur dich aussperren | 2026-11-09 |
| Passwortfeld mit Anzeigen-Schalter, kein zweites Feld zur Wiederholung; Passwortmanager-Unterstützung | Handy-tauglich, weniger Tippfehler | 2026-11-09 |
| Mindestlänge 10 Zeichen, keine Zeichenregeln | Länge schützt am besten; Zeichenregeln verbessern wenig und stören Passwortmanager | 2026-11-09 |
| Nach dem Anmelden Rückkehr zur ursprünglich gewünschten Seite, sonst `/` | Fühlt sich selbstverständlich an, besonders bei Lesezeichen | 2026-11-09 |
| Theme-Schalter nicht auf der Anmeldeseite | Seite ist kurz; Theme folgt Gerät bzw. gespeicherter Wahl | 2026-11-09 |

### Technical Decisions
<!-- Added by /architecture -->
| Decision | Rationale | Date |
|----------|-----------|------|
| Türsteher-Schicht (`proxy.ts`, in Next.js 16 der Nachfolger von «Middleware») schützt alle Adressen ausser Bildern und Icons | Eine zentrale Stelle, auch für künftige Seiten; unbekannte Adressen werden ohne Login ebenfalls umgeleitet | 2026-11-09 |
| Zusätzliche Prüfung im App-Rahmen auf dem Server | Zweite Verteidigungslinie; der Türsteher soll laut Next.js-Dokumentation nicht die einzige Absicherung sein | 2026-11-09 |
| ~~Reset-Mail verlinkt mit Einmal-Schlüssel (Token-Hash) statt Standard-Code-Austausch~~ **Geändert in `/backend` (2026-11-10):** Der Einlöse-Punkt `/auth/bestaetigen` versteht den Code der Standardvorlage (`code`) und weiterhin den Einmal-Schlüssel (`token_hash` mit `type=recovery`) | Die Vorlage ist auf dem Free-Plan nur mit eigenem SMTP-Server änderbar, die Standardvorlage liefert einen Code, der nur im selben Browser einlösbar ist. Der Nutzer hat «Standardvorlage nutzen» gewählt. Der Einmal-Schlüssel-Weg bleibt für einen späteren eigenen SMTP-Server lauffähig. | 2026-11-10 |
| Anmelden, Abmelden und Passwort setzen direkt aus dem Browser bei Supabase (`signInWithPassword`, `signOut`, `updateUser`), Weiterleitung per `window.location.href` | Projektregel für Supabase-Login; Supabase prüft Passwörter und begrenzt Versuche selbst | 2026-11-09 |
| Der Türsteher erneuert die Sitzung bei jedem Aufruf (`@supabase/ssr`) und gibt geschützten Antworten `Cache-Control: no-store` | Dauerhaft angemeldet bleiben; Zurück-Taste nach dem Abmelden zeigt keinen geschützten Inhalt | 2026-11-09 |
| Zieladresse nach dem Login nur akzeptieren, wenn sie mit genau einem «/» beginnt | Schutz vor Umleitung auf fremde Seiten (Open Redirect) | 2026-11-09 |
| Seiten: `/login`, `/passwort-vergessen`, `/passwort-neu` in der Route-Gruppe «Anmeldung» ohne App-Rahmen | Gruppe aus PROJ-11 (Route-Gruppen) dafür vorgesehen; Adressen bleiben kurz und deutsch | 2026-11-09 |
| Keine neuen Pakete und keine neuen Umgebungsvariablen | Alles Nötige ist seit PROJ-1 und PROJ-11 vorhanden | 2026-11-09 |
| Passwort-Reset beendet andere Sitzungen nicht | Standard von Supabase; Beenden aller Sitzungen ist Out of Scope (Dashboard) | 2026-11-09 |

---
<!-- Sections below are added by subsequent skills -->

## Tech Design (Solution Architect)

### Backend nötig?
Ja, aber **keine neuen Tabellen und keine eigenen Schnittstellen für Daten**. Die Anmeldedaten (E-Mail, Passwort) liegen bei Supabase Auth, das seit PROJ-1 eingerichtet ist. Was neu entsteht, ist eine **Türsteher-Schicht vor allen Seiten** und ein **Einlöse-Punkt für den Link in der Reset-Mail**. Das baut `/backend`. Die Formulare und Seiten baut `/frontend`.

### A) Seitenstruktur
```
Türsteher (läuft vor jeder Seite, ausser Bilder und Icons)
+-- Ohne Anmeldung und geschützte Adresse -> Anmeldeseite (Zieladresse wird gemerkt)
+-- Mit Anmeldung und Adresse «Anmelden» oder «Passwort vergessen» -> Startseite
+-- Frischt die Anmeldung bei jedem Aufruf auf (damit sie dauerhaft bleibt)
+-- Geschützte Antworten dürfen nicht zwischengespeichert werden

Wurzel-Layout (Schrift, Theme)
+-- Bereich «Anmeldung» (ohne Navigation, zentrierte Karte mit Logo)
|   +-- /login              Formular: E-Mail, Passwort mit Auge, Anmelden, Link «Passwort vergessen?»
|   +-- /passwort-vergessen Formular: E-Mail, danach neutrale Bestätigung; zeigt auch «Link nicht mehr gültig»
|   +-- /passwort-neu       Formular: neues Passwort mit Auge (nur nach gültigem Link erreichbar)
|   +-- /auth/bestaetigen   kein Bildschirm: löst den Link aus der Mail ein, leitet weiter
+-- Bereich «App» (mit Navigation, geschützt)
    +-- Start (/) und Status (/status), später alle weiteren
    +-- Seitenleiste (Laptop): unten «Darstellung» und «Abmelden»
    +-- Kopfzeile (Handy): Theme-Knopf und Abmelden-Knopf
```

### B) Bausteine
- **Vorhandene shadcn-Bausteine:** Card, Input, Label, Button, Form, Alert. Nichts Neues zu installieren.
- **Neue, eigene Zusammensetzungen:** Anmelde-Karte (Rahmen für alle drei Seiten), Passwortfeld mit Auge-Schalter, die drei Formulare, Abmelden-Knopf.
- **Gemeinsame Prüfregeln** für E-Mail und Passwort (mindestens 10 Zeichen) an einer Stelle, damit Anmeldung und «Neues Passwort» dieselben Regeln nutzen.
- **Regel für «Zielseite nach dem Login»:** Es werden nur Adressen innerhalb der App akzeptiert (beginnen mit einem einzelnen «/»). Alles andere wird ignoriert, damit niemand den Nutzer über einen manipulierten Link auf eine fremde Seite schickt.

### C) Ablauf in Worten
1. **Anmelden:** Das Formular prüft die Eingaben, schickt sie an Supabase und leitet bei Erfolg zur gemerkten Zielseite weiter (sonst `/`). Fehler werden in die drei vereinbarten Meldungen übersetzt (falsche Daten, zu viele Versuche, nicht erreichbar).
2. **Dauerhaft angemeldet:** Die Anmeldung steckt in Cookies. Der Türsteher erneuert sie bei jedem Aufruf, deshalb bleibt sie auf dem Gerät bestehen, bis zum Abmelden.
3. **Passwort vergessen:** Das Formular fordert bei Supabase die Mail an und zeigt immer dieselbe Bestätigung. Die Mail (Standardvorlage, englisch) enthält einen Link, der über Supabase auf unsere Seite `/auth/bestaetigen` mit einem Code führt.
4. **Link einlösen:** `/auth/bestaetigen` tauscht den Code gegen eine Anmeldung und leitet auf `/passwort-neu`. Ist der Code abgelaufen, schon benutzt oder in einem anderen Browser geöffnet, geht es zu `/passwort-vergessen` mit der Meldung «Dieser Link ist nicht mehr gültig».
5. **Neues Passwort:** Das Formular speichert das Passwort bei Supabase. Danach ist man angemeldet und landet auf `/`.
6. **Abmelden:** Der Knopf beendet die Anmeldung auf diesem Gerät und leitet zur Anmeldeseite. Weil geschützte Seiten nicht zwischengespeichert werden, zeigt die Zurück-Taste danach keinen Inhalt.

### D) Daten
Es werden keine neuen Anwendungsdaten gespeichert.
- **Anmeldung:** zwei Cookies von Supabase im Browser des Geräts (verwaltet von `@supabase/ssr`).
- **Zielseite:** wird nur für die Dauer der Umleitung in der Adresse mitgegeben.
- **Datenbank:** unverändert. Zeilenzugriffsregeln (RLS) kommen mit den ersten Tabellen in PROJ-3.

### E) Tech-Entscheidungen (mit Begründung)
- **Türsteher vor allen Seiten statt Prüfung in jeder Seite:** Eine Stelle, an der alles geschützt wird, auch Seiten, die später dazukommen. Zusätzlich prüft der App-Rahmen die Anmeldung noch einmal auf dem Server, falls der Türsteher einmal umgangen würde.
- **Einlösung der Reset-Mail: Standard-Code-Austausch (geändert in `/backend`):** Geplant war ein Einmal-Schlüssel, der auch auf einem anderen Gerät funktioniert. Das braucht eine angepasste E-Mail-Vorlage, und die ist auf dem Free-Plan nur mit eigenem SMTP-Server änderbar. Daher gilt die Standardvorlage: Der Link funktioniert nur im selben Browser, in dem er angefordert wurde. Der Einlöse-Punkt versteht beide Formen.
- **Anmelden, Abmelden und Passwort setzen direkt aus dem Browser bei Supabase:** So verlangt es die Projektregel für Supabase-Anmeldung. Supabase prüft Passwörter und begrenzt Versuche selbst. Eigene Schnittstellen dafür wären doppelter Aufwand ohne Gewinn.
- **Geschützte Seiten ohne Zwischenspeicher:** Der Browser darf sie nicht für die Zurück-Taste aufbewahren.
- **Passwort-Mindestlänge in Supabase und in den Formularen:** Supabase ist die verbindliche Stelle, die Formulare geben nur früh einen Hinweis.
- **Nach Passwort-Reset bleiben andere Geräte angemeldet:** Das ist das Verhalten von Supabase und wird hier nicht geändert. Zum Beenden aller Sitzungen gibt es das Dashboard (Out of Scope).
- **Adressen:** `/login`, `/passwort-vergessen`, `/passwort-neu`, `/auth/bestaetigen`.

### F) Abhängigkeiten
Keine neuen Pakete. Genutzt werden `@supabase/ssr` und `@supabase/supabase-js` (vorhanden), `react-hook-form` und `zod` (vorhanden, Formulare und Prüfregeln), `lucide-react` (Symbole), shadcn/ui (vorhanden). Keine neuen Umgebungsvariablen.

### G) Dashboard-Checkliste für dich (Supabase, manuell)
Die genauen Menünamen können je nach Version des Dashboards leicht abweichen.
1. **Passwort-Mindestlänge auf 10 stellen:** Authentication → Sign In / Providers (Email) bzw. Passwort-Anforderungen.
2. **Adressen eintragen:** Authentication → URL Configuration.
   - **Site URL:** `https://time-tracker-light.vercel.app`
   - **Redirect URLs:** `http://localhost:3000/**` und `https://time-tracker-light.vercel.app/**`
3. ~~E-Mail-Vorlage anpassen~~ Entfällt: Auf dem Free-Plan nur mit eigenem SMTP-Server änderbar (siehe Decision Log). Wichtig bleibt, dass die Redirect-URLs aus Schritt 2 stehen, sonst führt der Link in der Mail auf die falsche Adresse.
4. **Spam-Prüfung:** Nach dem ersten Test prüfen, dass die Mail im Posteingang ankommt (die eingebaute Absenderadresse von Supabase landet manchmal im Spam). Auf Free sind nur wenige Mails pro Stunde erlaubt, für ein Konto genügt das.

### H) Tests
- **Unit (Vitest):** Prüfregeln (E-Mail, Passwort-Mindestlänge), Regel für gültige Zieladressen (gerade noch erlaubt, fremde Adressen abgelehnt), Einteilung «öffentlich oder geschützt» im Türsteher, Passwortfeld mit Auge-Schalter.
- **Integration (Vitest):** `/auth/bestaetigen` mit gültigem, abgelaufenem und fehlendem Schlüssel; Fehlermeldungen der Anmeldung (falsche Daten, zu viele Versuche, nicht erreichbar).
- **E2E (Playwright, bei `/qa`):** Alle Abläufe ohne Anmeldung (Umleitung, Formularfehler, neutrale Antworten, keine Navigation auf der Anmeldeseite, Handy und Laptop, dunkles Theme). Abläufe mit echter Anmeldung nur, wenn Zugangsdaten für den Test bereitstehen (siehe offene Fragen).

## Implementation Notes (Frontend)
**Frontend umgesetzt am 2026-11-10.** Die Anmeldung funktioniert gegen Supabase, der Seitenschutz und der Einlöse-Punkt für den Reset-Link fehlen noch (siehe «Offen für `/backend`»).

**Neu**
- Route-Gruppe `src/app/(auth)/` mit `layout.tsx` (zentrierte Karte, ohne Navigation) und den Seiten `login`, `passwort-vergessen`, `passwort-neu`.
- `src/components/auth/`: `auth-card.tsx`, `auth-notice.tsx` (Meldung mit Symbol und Text), `password-input.tsx` (Auge-Schalter, verdeckt sich beim Absenden), `login-form.tsx`, `forgot-password-form.tsx`, `new-password-form.tsx`.
- `src/components/logout-button.tsx`: Abmelden mit Text in der Seitenleiste, nur Symbol in der Kopfzeile am Handy.
- `src/lib/auth/schemas.ts` (Prüfregeln, Mindestlänge 10), `errors.ts` (Supabase-Fehler in die vereinbarten deutschen Meldungen), `redirect.ts` (nur interne Zieladressen, keine Anmeldeseiten).

**Geändert**
- `app-sidebar.tsx` und `mobile-header.tsx`: Abmelden-Knopf ergänzt.
- `brand.tsx`: Der Name neben dem Würfel ist unter 360 px nur für Screenreader sichtbar, damit die Kopfzeile mit zwei Knöpfen bei 320 px nicht überläuft (offene Frage aus der Spec entschieden: kein gemeinsames Menü nötig).
- `app/layout.tsx`: `Toaster` eingebunden (Meldung, wenn Abmelden fehlschlägt).
- `tests/PROJ-1-…spec.ts` und `tests/PROJ-11-…spec.ts`: Die Prüfung «keine Geheimnisse im ausgelieferten Code» sucht jetzt nach echten Schlüsseln (JWT mit Rolle ausser `anon`, `sb_secret_…` mit Schlüsselteil, `sbp_…`). Vorher schlug sie an, sobald das Wort «service_role» irgendwo stand. Seit die Browser-Anmeldung eingebunden ist, steht der Variablenname `NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY` der Konfigurationsprüfung im Browser-Code, und die Supabase-Bibliothek prüft auf das Präfix `sb_secret_`. Beides sind Texte, keine Schlüssel; im ausgelieferten Code liegt nur der öffentliche `anon`-Schlüssel.

**Entscheidungen und Abweichungen**
- Die Eingabefelder bleiben beim Absenden aktiv (nur der Knopf wird gesperrt), damit nach einem Fehler der Fokus wieder in das Passwortfeld springen kann.
- Passwort-Reset: Auf `/passwort-vergessen` führen auch «Konto unbekannt»-Antworten zur neutralen Bestätigung. Bei zu vielen Anfragen oder Netzwerkfehlern erscheint die jeweilige Meldung.
- `/passwort-neu` prüft auf dem Server, ob eine Sitzung besteht (sonst Weiterleitung zu `/passwort-vergessen?fehler=link`). Das ist die Seitenseite der zweiten Verteidigungslinie, der Türsteher folgt in `/backend`.
- Der Anzeigen-Schalter hat eine Beschriftung («Passwort anzeigen»). Für Tests muss das Passwortfeld mit `exact: true` gesucht werden, sonst trifft die Beschriftung auch den Schalter.

**Offen für `/backend`**
- Türsteher (`src/proxy.ts`): Seitenschutz, Umleitung mit `?next=`, angemeldete Nutzer von `/login` und `/passwort-vergessen` auf `/` leiten, Sitzung erneuern, `Cache-Control: no-store` für geschützte Seiten.
- Einlöse-Punkt `/auth/bestaetigen` für den Link aus der Reset-Mail, mit Integrationstests.
- Zweite Prüfung im App-Rahmen auf dem Server.
- ~~Fertiger deutscher Text der E-Mail-Vorlage~~ entfällt (Vorlage auf dem Free-Plan nicht änderbar).
- `findLeaks` in den E2E-Tests beachtet nur den `anon`-Schlüssel; falls der Türsteher weitere Variablen braucht, dort ergänzen.

**Geprüft**
- `npm test`: 82 von 82 grün (neu: Prüfregeln, Fehlermeldungen, Zieladressen, Formulare, Passwortfeld, Abmelden), `npm run lint`: 0 Fehler, `tsc` sauber, Produktionsbuild grün.
- E2E (Chrome, Produktionsbuild): alle 46 Tests aus PROJ-1 und PROJ-11 laufen weiter (zweifach wiederholt, 92 von 92).
- Im Browser: `/login`, `/passwort-vergessen` (mit Hinweis «Link nicht mehr gültig») bei 375 px hell und 1440 px dunkel, ohne Navigation, ohne horizontales Scrollen, Titel «Anmelden · Time Tracker Light» bzw. «Passwort zurücksetzen · Time Tracker Light», keine Konsolenfehler. Kopfzeile bei 320 px mit Theme- und Abmelden-Knopf ohne Überlauf.
- Echter Fehlversuch gegen Supabase mit erfundenen Daten: Meldung «E-Mail oder Passwort stimmt nicht.», E-Mail bleibt stehen, Passwort leer, Fokus im Passwortfeld.
- **Nicht geprüft:** erfolgreiche Anmeldung, Abmelden und Reset mit dem echten Konto (brauchen deine Zugangsdaten und den Türsteher), Firefox und Safari, Autofill durch einen echten Passwortmanager.

## Implementation Notes (Backend)
**Backend umgesetzt am 2026-11-10.** Es gibt keine Datenbank-Änderung (keine Tabellen, keine RLS-Regeln) und keine eigene Daten-Schnittstelle.

**Neu**
- `src/proxy.ts`: Türsteher vor allen Seiten ausser `_next/static`, `_next/image`, Icons und Bildern. Ruft `updateSession` auf.
- `src/lib/supabase/session.ts` (`updateSession`): erneuert die Anmeldung bei jedem Aufruf (Cookies), prüft sie mit `getClaims()` und wendet die Entscheidung an. Bei Umleitungen gehen die erneuerten Cookies mit. Alle Antworten bekommen `Cache-Control: private, no-store`. Bei fehlender Konfiguration oder wenn Supabase nicht antwortet, gilt «nicht angemeldet» (geschützte Seiten bleiben zu, die Anmeldeseite zeigt den Grund).
- `src/lib/auth/access.ts` (`decideAccess`): reine Entscheidungslogik.
  - ohne Anmeldung: geschützte und unbekannte Adressen gehen auf `/login?next=…` (die Startseite ohne `next`); `/login`, `/passwort-vergessen` und `/auth/bestaetigen` sind erreichbar; `/passwort-neu` führt auf `/passwort-vergessen?fehler=link`
  - mit Anmeldung: alles erreichbar, nur `/login` und `/passwort-vergessen` leiten auf `/`
- `src/app/auth/bestaetigen/route.ts`: löst den Link aus der Reset-Mail ein. Nimmt entweder `code` (Standardvorlage, im selben Browser einlösbar) oder `token_hash` mit `type=recovery` (angepasste Vorlage), jeweils Zod-geprüft mit höchstens 512 Zeichen, tauscht ihn gegen eine Anmeldung und leitet auf `/passwort-neu`. Bei jedem Fehler (fehlend, falscher Typ, abgelaufen, benutzt, anderer Browser, Netzwerk, Konfiguration) geht es auf `/passwort-vergessen?fehler=link`. Das Ziel ist fest, eine Adresse aus dem Link wird nie übernommen.

**Geändert**
- `src/app/(app)/layout.tsx`: zweite Prüfung auf dem Server (`getClaims`), sonst Weiterleitung auf `/login`. Dadurch werden alle App-Seiten dynamisch gerendert (auch `/`).
- `forgot-password-form.tsx`: Der Link in der Mail zeigt auf `…/auth/bestaetigen` ohne Zusatz (die frühere Angabe `?next=/passwort-neu` entfällt, weil das Ziel fest ist).

**Dashboard-Schritte für dich (Supabase, manuell; Menünamen können abweichen)**
1. **Passwort-Mindestlänge** auf 10 stellen (Authentication → Sign In / Providers → Email bzw. Passwort-Anforderungen).
2. **URL Configuration:** Site URL `https://time-tracker-light.vercel.app`; Redirect URLs `http://localhost:3000/**` und `https://time-tracker-light.vercel.app/**`.
3. **E-Mail-Vorlage:** Nicht änderbar (Free-Plan, nur mit eigenem SMTP-Server). Die Mail kommt englisch von Supabase («Reset your password»). Wichtig: Die Redirect-URLs aus Schritt 2 müssen stehen, sonst führt der Link auf die falsche Adresse.
4. **Spam-Prüfung** nach dem ersten Test.

**Risiken und Hinweise**
- **Link nur im selben Browser:** Öffnet dein Mailprogramm den Link in einem anderen Browser (z. B. dem eingebauten), erscheint «Dieser Link ist nicht mehr gültig». Dann forderst du im gewünschten Browser einen neuen an. Unter der Bestätigung auf `/passwort-vergessen` steht der Hinweis.
- **E-Mail-Programme, die Links vorab öffnen** (Sicherheitsprüfungen mancher Anbieter) können den Einmal-Link verbrauchen, bevor du ihn anklickst. Dann zeigt die Seite «Dieser Link ist nicht mehr gültig», und du forderst einen neuen an. Eine Zwischenseite mit Bestätigungsknopf würde das verhindern. Sie ist nicht gebaut, weil sie für ein Konto selten nötig ist. Tritt es auf, nachrüsten.
- **Bestehende E2E-Tests:** Seit dem Seitenschutz leiten alle Tests für `/` und `/status` ohne Anmeldung auf `/login`. Die Suiten aus PROJ-1 und PROJ-11 brauchen für die geschützten Seiten eine echte Anmeldung. Das ist in `/qa` zu lösen (offene Frage zu den Testzugangsdaten).
- **Nicht angemeldet und `/status`:** Es entsteht keine Datenbankanfrage mehr (der Türsteher leitet vorher um). BUG-6 aus PROJ-1 ist damit behoben.
- **`/status` bei fehlender Konfiguration:** Ohne Anmeldung nicht mehr erreichbar. Der Grund erscheint auf der Anmeldeseite («Die App ist nicht vollständig eingerichtet»).

**Geprüft**
- `npm test`: 113 von 113 grün (neu: Zugriffsentscheidung 12, `updateSession` 9, Einlöse-Punkt 11, Rest wie vorher), `npm run lint`: 0 Fehler, `tsc` sauber, Produktionsbuild grün (der Türsteher erscheint als «Proxy»).
- Gegen den Produktionsbuild ohne Anmeldung (`curl`): `/`, `/status`, unbekannte Adressen und Adressen mit Parametern → 307 auf `/login` mit `next`; `/login` und `/passwort-vergessen` → 200; `/passwort-neu` und `/auth/bestaetigen` (ohne oder mit falschem oder fremdem Schlüssel, falschem Typ) → 307 auf `/passwort-vergessen?fehler=link`; Icons → 200; Sicherheits-Header bleiben bei allen Antworten erhalten; geschützte Antworten tragen `Cache-Control: private, no-store`.
- **Nicht geprüft:** Alles mit gültiger Anmeldung (Weiterleitung nach dem Login, Sitzung bleibt, Abmelden, Zurück-Taste, Reset-Link per echter Mail), weil das Zugangsdaten und das Dashboard brauchen.

## QA Test Results
_To be added by /qa_

## Deployment
_To be added by /deploy_
