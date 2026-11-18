import { TimeEntryError } from './errors'
import type { TimeEntriesRepository } from './repository'
import type { TimeEntry } from './types'

// Lädt alle Zeiteinträge für den CSV-Export (PROJ-9), Block für Block. Die Datenbank liefert höchstens
// 1000 Zeilen pro Antwort; ohne Blöcke würden Zeilen stillschweigend fehlen.
// Eine falsche Datei ist schlimmer als keine: Ändert sich der Bestand während des Ladens (Gesamtzahl
// wechselt, Zeilen fehlen oder doppelt), wird mit «export-changed» abgebrochen.
export async function loadAllEntries(repository: TimeEntriesRepository): Promise<TimeEntry[]> {
  const all: TimeEntry[] = []
  const seen = new Set<string>()
  let total: number | null = null

  while (total === null || all.length < total) {
    const page = await repository.listEntriesPage(all.length)
    if (total !== null && page.total !== total) throw new TimeEntryError('export-changed')
    total = page.total
    // Leerer Block, obwohl noch Einträge fehlen: Bestand hat sich verändert
    if (page.entries.length === 0 && all.length < total) throw new TimeEntryError('export-changed')
    for (const entry of page.entries) {
      if (seen.has(entry.id)) throw new TimeEntryError('export-changed')
      seen.add(entry.id)
      all.push(entry)
    }
    if (all.length > total) throw new TimeEntryError('export-changed')
  }
  return all
}
