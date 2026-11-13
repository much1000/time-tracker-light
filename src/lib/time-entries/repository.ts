import type { BookableCustomer, LastTarget, TimeEntry, TimeEntryInput } from './types'

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
}
