import type {
  BookableCustomer,
  EntriesPage,
  EntryFilter,
  LastTarget,
  MonthEntries,
  TimeEntry,
  TimeEntryInput,
  WeekEntries,
} from './types'

// Schnittstelle zur Datenhaltung für Zeiteinträge.
// Die Oberfläche kennt nur diese Schnittstelle. Dahinter steht Supabase (supabase-repository.ts),
// Tests nutzen in-memory-repository.ts.
// Alle Methoden werfen bei Fehlern einen TimeEntryError (siehe errors.ts).
export interface TimeEntriesRepository {
  // Einträge eines Tages (Datum «2026-11-13»), nach Startzeit, sonst nach Anlegezeit sortiert.
  listEntries(date: string): Promise<TimeEntry[]>
  // Aktive Kunden mit ihren aktiven Projekten für die Auswahl (Kunden nach Kürzel, «Allgemein» zuerst).
  listTargets(): Promise<BookableCustomer[]>
  // Kunde und Projekt des zuletzt angelegten Eintrags, sonst null.
  getLastTarget(): Promise<LastTarget | null>
  // Legt einen Eintrag an. Lehnt archivierte Kunden und Projekte ab.
  createEntry(input: TimeEntryInput): Promise<TimeEntry>
  // Einträge eines Monats (nach Datum des Eintrags), optional nach Kunde und «ohne Beschreibung» gefiltert,
  // neueste Tage zuerst, innerhalb eines Tages nach Startzeit, sonst nach Anlegezeit. Höchstens
  // MONTH_ENTRY_LIMIT; gibt es mehr, ist «truncated» gesetzt.
  listMonth(filter: EntryFilter): Promise<MonthEntries>
  // Einträge einer Woche («2026-W46», Montag bis Sonntag nach Eintragsdatum), alle Kunden, aufsteigend nach
  // Datum, innerhalb eines Tages nach Startzeit, sonst nach Anlegezeit. Jeder Eintrag trägt die Hinweise
  // «Kunde/Projekt archiviert». Höchstens MONTH_ENTRY_LIMIT; gibt es mehr, ist «truncated» gesetzt.
  listWeek(week: string): Promise<WeekEntries>
  // Einträge eines Monats («2026-11») für die Monatsauswertung (PROJ-8), alle Kunden, aufsteigend nach Datum,
  // innerhalb eines Tages nach Startzeit, sonst nach Anlegezeit. Jeder Eintrag trägt die Hinweise
  // «Kunde/Projekt archiviert». Höchstens MONTH_ENTRY_LIMIT; gibt es mehr, ist «truncated» gesetzt.
  // Die Monatsliste von «Zeiten» (listMonth) bleibt unverändert.
  listMonthReport(month: string): Promise<MonthEntries>
  // Einträge für den CSV-Export (PROJ-9), alle Monate und Kunden: ab Position «offset» höchstens
  // EXPORT_PAGE_SIZE Stück, aufsteigend nach Datum, dann Startzeit (ohne Uhrzeit danach), dann Anlegezeit,
  // dann Kennung (damit die Blöcke lückenlos aneinanderpassen). Mit Archiv-Hinweisen und der Gesamtzahl.
  listEntriesPage(offset: number): Promise<EntriesPage>
  // Ändert einen Eintrag (alle Felder, gleiche Regeln wie beim Anlegen). Der Anlegezeitpunkt bleibt.
  // Wirft «entry-not-found», wenn es ihn nicht mehr gibt.
  updateEntry(id: string, input: TimeEntryInput): Promise<TimeEntry>
  // Löscht genau einen Eintrag endgültig. Wirft «entry-not-found», wenn es ihn nicht mehr gibt.
  deleteEntry(id: string): Promise<void>
}
