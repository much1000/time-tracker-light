# Design System

> Abgeleitet aus den Marken-Assets in `docs/design/` (decs Data Analytics: gelb-graues Würfel-Logo, PowerPoint-Vorlage).
> Grundsatz: **Kontrast und einfache Bedienung vor Dekoration.** Alle Werte erfüllen WCAG 2.1 AA (Text ≥ 4.5:1, UI-Elemente ≥ 3:1).

## Markenelemente
- Logo: `docs/design/logo gelb.png` (Wortmarke), `docs/design/Wuerfel gelb.png` (Signet für Navigation/Favicon)
- Markenfarbe: Gelb `#F1C232` (aus dem Logo; Vorlage nutzt `#FFD966`)
- Neutrale Töne: Grau- bzw. Anthrazit-Skala (aus dem Grau des Logos)

## Typografie
- Schrift: **Inter** (frei verfügbar, sehr gut lesbar), Fallback `system-ui, sans-serif`. Aptos aus der Vorlage wird nicht verwendet (nicht frei im Web verfügbar).
- Basisgröße 16 px, Zeilenhöhe 1.5. Zahlen (Stunden) mit tabellarischen Ziffern (`font-variant-numeric: tabular-nums`), damit Spalten sauber untereinander stehen.

## Farben

### Helles Theme
| Rolle | Wert | Kontrast |
|---|---|---|
| Hintergrund | `#FFFFFF` | – |
| Fläche (Karten, Tabellenkopf) | `#F6F7F8` | – |
| Text | `#1F2328` | 15.8 : 1 auf Hintergrund |
| Text gedämpft | `#5B6068` | 6.3 : 1 auf Hintergrund, 5.9 : 1 auf Fläche |
| Primär (Buttons, aktive Timer) | `#F1C232` | Text `#1F2328` darauf: 9.4 : 1 |
| Primär Hover | `#E0B020` | Text darauf: 7.8 : 1 |
| Primär-Rand | `#7A5C00` | 6.3 : 1 auf Hintergrund |
| Link / Akzenttext | `#7A5C00` | 6.3 : 1 |
| Rand von Eingabefeldern | `#8A9099` | 3.2 : 1 |
| Fokusring | `#1F2328`, 2 px + 2 px Abstand | 15.8 : 1 |
| Erfolg | `#1B7F3B` | 5.1 : 1 |
| Fehler / Löschen | `#C62828` | 5.6 : 1 |

### Dunkles Theme
| Rolle | Wert | Kontrast |
|---|---|---|
| Hintergrund | `#16181B` | – |
| Fläche | `#1F2226` | – |
| Text | `#F2F3F5` | 16.0 : 1 |
| Text gedämpft | `#A7ACB3` | 7.8 : 1 auf Hintergrund, 7.0 : 1 auf Fläche |
| Primär | `#F1C232` | 10.6 : 1 auf Hintergrund; Text `#16181B` darauf: 10.6 : 1 |
| Link / Akzenttext | `#FFD966` | 13.0 : 1 |
| Rand von Eingabefeldern | `#6B7280` | 3.7 : 1 |
| Fokusring | `#FFD966` | 13.0 : 1 |
| Erfolg | `#4ADE80` | 10.2 : 1 |
| Fehler | `#FF8A80` | 7.8 : 1 |

Umschaltung automatisch per Systemeinstellung (`prefers-color-scheme`), zusätzlich manuell wählbar.

## Regeln für gute Bedienbarkeit
1. **Gelb nie als Textfarbe auf hellem Grund** (nur 1.7 : 1). Gelb ist Flächenfarbe; Text darauf immer dunkel. Primär-Buttons im hellen Theme haben zusätzlich einen dunklen Rand (`#7A5C00`), weil Gelb auf Weiß als UI-Element den Mindestkontrast von 3 : 1 nicht erreicht.
2. **Zustand nie nur über Farbe** anzeigen: laufender Timer = gelbe Fläche **plus** Symbol (Stopp) **plus** Text „läuft“ und mitlaufende Uhrzeit.
3. **Große Klickflächen:** mindestens 44 × 44 px für Start/Stopp und alle Buttons (Handy-tauglich). Start/Stopp ist die größte und auffälligste Schaltfläche pro Kunde/Projekt.
4. **Eine Hauptaktion pro Bereich:** nur ein gelber Primär-Button je Ansicht, alles andere als Sekundär (Umriss) oder Text-Button.
5. **Sichtbarer Fokus** bei Tastaturbedienung auf allen interaktiven Elementen.
6. **Beschriftete Felder:** Labels immer sichtbar (kein reiner Platzhaltertext), Fehlermeldungen direkt am Feld mit Text und Symbol.
7. **Destruktive Aktionen** (Löschen) in Fehlerfarbe, nie als Primär-Button, mit Bestätigung bzw. Rückgängig-Möglichkeit.
8. **Responsive:** Mobile-first. Wochenübersicht als Tabelle am Laptop, als gestapelte Tageskarten am Handy.
9. **Abstände:** 4-px-Raster; großzügige Zeilenabstände in Tabellen, damit Einträge schnell prüfbar sind.

## Umsetzung
- Basis: Tailwind CSS + shadcn/ui (Komponenten nicht neu bauen), Farben als CSS-Variablen im Theme (`:root` und `.dark`) hinterlegen.
