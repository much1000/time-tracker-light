import { getCustomersRepository } from '@/lib/customers'
import { MockTimeEntriesRepository } from './mock-repository'
import type { TimeEntriesRepository } from './repository'

// Einzige Stelle, die entscheidet, welche Datenhaltung die Oberfläche nutzt.
// PLATZHALTER: Browser-Speicher. `/backend` tauscht dies gegen Supabase aus.
let repository: MockTimeEntriesRepository | null = null

function getMock(): MockTimeEntriesRepository {
  if (!repository) {
    let storage: Storage | null = null
    try {
      storage = typeof window === 'undefined' ? null : window.localStorage
    } catch {
      storage = null
    }
    repository = new MockTimeEntriesRepository(getCustomersRepository(), storage)
  }
  return repository
}

export function getTimeEntriesRepository(): TimeEntriesRepository {
  return getMock()
}

// Nur für die Vorschau mit Platzhalter-Daten (Knopf «Zurücksetzen»). Entfällt mit `/backend`.
export function resetPreviewEntries(): void {
  getMock().reset()
}

export { TimeEntryError, describeTimeEntryError } from './errors'
export type * from './types'
