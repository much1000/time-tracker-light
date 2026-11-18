// Zeiteinträge (PROJ-4). Felder und Regeln stehen im Spec «Datenmodell».

export interface TimeEntry {
  id: string
  projectId: string
  customerId: string
  // Anzeige: Kürzel und Namen des Kunden und Projekts (aktueller Stand)
  customerCode: string
  customerName: string
  projectName: string
  // «2026-11-13»
  date: string
  durationMinutes: number
  billableMinutes: number
  // «08:30», beide gesetzt oder beide null
  startTime: string | null
  endTime: string | null
  description: string | null
  createdAt: string
  // Nur in Wochenabfragen (PROJ-7) gesetzt: Kunde bzw. Projekt sind inzwischen archiviert
  customerArchived?: boolean
  projectArchived?: boolean
}

export interface TimeEntryInput {
  projectId: string
  date: string
  durationMinutes: number
  billableMinutes: number
  startTime: string | null
  endTime: string | null
  description: string | null
}

// Auswahl im Formular: nur aktive Kunden und deren aktive Projekte.
export interface BookableProject {
  id: string
  name: string
  // Nur beim Bearbeiten: das aktuelle Projekt eines Eintrags ist inzwischen archiviert
  archived?: boolean
}

export interface BookableCustomer {
  id: string
  code: string
  name: string
  projects: BookableProject[]
  // Nur beim Bearbeiten: der Kunde des Eintrags ist inzwischen archiviert
  archived?: boolean
}

export interface LastTarget {
  customerId: string
  projectId: string
}

// Filter der Monatsliste (Seite «Zeiten», PROJ-5)
export interface EntryFilter {
  // «2026-11»
  month: string
  customerId?: string
  // Nur Einträge ohne Beschreibung
  withoutDescription?: boolean
}

export interface MonthEntries {
  entries: TimeEntry[]
  // Es gibt mehr Einträge, als angezeigt werden (Obergrenze MONTH_ENTRY_LIMIT): Summen sind unvollständig.
  truncated: boolean
}

// Einträge einer Woche (Wochenübersicht, PROJ-7): aufsteigend nach Datum, innerhalb eines Tages nach
// Startzeit, sonst nach Anlegezeit; jeder Eintrag trägt die Archiv-Hinweise.
export interface WeekEntries {
  entries: TimeEntry[]
  // Es gibt mehr Einträge, als angezeigt werden (Obergrenze MONTH_ENTRY_LIMIT): Zahlen sind unvollständig.
  truncated: boolean
}

// Obergrenze der Einträge pro Monats- und Wochenabfrage
export const MONTH_ENTRY_LIMIT = 1000

// CSV-Export (PROJ-9): Eintrag für Eintrag in Blöcken geladen. Die Datenbank liefert höchstens 1000 Zeilen
// pro Antwort.
export const EXPORT_PAGE_SIZE = 1000

export interface EntriesPage {
  // Einträge ab «offset», in fester Reihenfolge (siehe listEntriesPage), mit Archiv-Hinweisen
  entries: TimeEntry[]
  // Gesamtzahl aller Einträge zum Zeitpunkt der Abfrage
  total: number
}
