import { describe, expect, it } from 'vitest'
import { InMemoryCustomersRepository } from '@/lib/customers/in-memory-repository'
import { TimeEntryError, describeTimeEntryError } from './errors'
import { loadAllEntries } from './export-all'
import { InMemoryTimeEntriesRepository } from './in-memory-repository'
import type { TimeEntriesRepository } from './repository'
import { EXPORT_PAGE_SIZE, type EntriesPage, type TimeEntry } from './types'

function fake(id: string): TimeEntry {
  return {
    id,
    projectId: 'p',
    customerId: 'c',
    customerCode: 'X',
    customerName: 'X',
    projectName: 'P',
    date: '2026-11-01',
    durationMinutes: 1,
    billableMinutes: 1,
    startTime: null,
    endTime: null,
    description: null,
    createdAt: '2026-11-01T00:00:00Z',
  }
}

// Datenschicht, deren Antworten ein Skript bestimmt
function scripted(pages: EntriesPage[]): TimeEntriesRepository {
  let call = 0
  return {
    listEntriesPage: async () => pages[Math.min(call++, pages.length - 1)],
  } as unknown as TimeEntriesRepository
}

async function kind(promise: Promise<unknown>) {
  try {
    await promise
  } catch (error) {
    return error instanceof TimeEntryError ? error.kind : 'other'
  }
  return undefined
}

async function setup() {
  const customers = new InMemoryCustomersRepository(0)
  const repo = new InMemoryTimeEntriesRepository(customers, 0)
  const customer = await customers.createCustomer({ code: 'MUS', name: 'Muster AG' })
  const projectId = (await customers.getCustomer(customer.id))!.projects[0].id
  return { repo, projectId }
}

describe('loadAllEntries', () => {
  it('liefert bei null Einträgen eine leere Liste nach einer Abfrage', async () => {
    expect(await loadAllEntries(scripted([{ entries: [], total: 0 }]))).toEqual([])
  })

  it('lädt über 1000 Einträge in Blöcken lückenlos und in Reihenfolge', async () => {
    const { repo, projectId } = await setup()
    const count = EXPORT_PAGE_SIZE * 2 + 345
    for (let i = 0; i < count; i++) {
      const day = String((i % 28) + 1).padStart(2, '0')
      await repo.createEntry({
        projectId,
        date: `2026-10-${day}`,
        durationMinutes: 1 + (i % 59),
        billableMinutes: 0,
        startTime: null,
        endTime: null,
        description: `Eintrag ${i}`,
      })
    }
    const all = await loadAllEntries(repo)
    expect(all).toHaveLength(count)
    expect(new Set(all.map((e) => e.id)).size).toBe(count)
    const dates = all.map((e) => e.date)
    expect(dates).toEqual([...dates].sort())
  }, 30000)

  it('sortiert Datum, Startzeit (ohne Uhrzeit danach) und Anlegezeit', async () => {
    const { repo, projectId } = await setup()
    const base = { projectId, durationMinutes: 30, billableMinutes: 30, endTime: null }
    await repo.createEntry({ ...base, date: '2026-11-02', startTime: null, description: 'ohne' })
    await repo.createEntry({ ...base, date: '2026-11-02', startTime: '09:00', endTime: '09:30', description: 'neun' })
    await repo.createEntry({ ...base, date: '2026-11-01', startTime: null, description: 'früher' })
    await repo.createEntry({ ...base, date: '2026-11-02', startTime: '08:00', endTime: '08:30', description: 'acht' })
    const all = await loadAllEntries(repo)
    expect(all.map((e) => e.description)).toEqual(['früher', 'acht', 'neun', 'ohne'])
  })

  it('bricht ab, wenn sich die Gesamtzahl zwischen den Blöcken ändert', async () => {
    const first = Array.from({ length: EXPORT_PAGE_SIZE }, (_, i) => fake(`a${i}`))
    const repo = scripted([
      { entries: first, total: EXPORT_PAGE_SIZE + 5 },
      { entries: [fake('b')], total: EXPORT_PAGE_SIZE + 6 },
    ])
    expect(await kind(loadAllEntries(repo))).toBe('export-changed')
  })

  it('bricht ab, wenn ein Block leer ist, obwohl noch Einträge fehlen', async () => {
    const repo = scripted([
      { entries: [fake('a')], total: 3 },
      { entries: [], total: 3 },
    ])
    expect(await kind(loadAllEntries(repo))).toBe('export-changed')
  })

  it('bricht ab bei doppelten Einträgen (Verschiebung durch eine Änderung)', async () => {
    const repo = scripted([
      { entries: [fake('a'), fake('b')], total: 4 },
      { entries: [fake('b'), fake('c')], total: 4 },
    ])
    expect(await kind(loadAllEntries(repo))).toBe('export-changed')
  })

  it('bricht ab, wenn mehr Einträge ankommen als angekündigt', async () => {
    expect(await kind(loadAllEntries(scripted([{ entries: [fake('a'), fake('b')], total: 1 }])))).toBe('export-changed')
  })

  it('reicht Fehler der Datenschicht unverändert weiter', async () => {
    const repo = {
      listEntriesPage: async () => {
        throw new TimeEntryError('session')
      },
    } as unknown as TimeEntriesRepository
    expect(await kind(loadAllEntries(repo))).toBe('session')
  })

  it('hat eine verständliche Meldung für «export-changed»', () => {
    expect(describeTimeEntryError(new TimeEntryError('export-changed'))).toContain('Export')
  })
})
