import { MockCustomersRepository } from './mock-repository'
import type { CustomersRepository } from './repository'

// Einzige Stelle, die entscheidet, welche Datenhaltung die Oberfläche nutzt.
// PLATZHALTER: Browser-Speicher. `/backend` tauscht dies gegen Supabase aus.
let repository: MockCustomersRepository | null = null

function getMock(): MockCustomersRepository {
  if (!repository) {
    let storage: Storage | null = null
    try {
      storage = typeof window === 'undefined' ? null : window.localStorage
    } catch {
      storage = null
    }
    repository = new MockCustomersRepository(storage)
  }
  return repository
}

export function getCustomersRepository(): CustomersRepository {
  return getMock()
}

// Nur für die Vorschau mit Platzhalter-Daten (Knopf «Zurücksetzen»). Entfällt mit `/backend`.
export function resetPreviewData(): void {
  getMock().reset()
}

export { RepositoryError, describeRepositoryError } from './errors'
export type * from './types'
