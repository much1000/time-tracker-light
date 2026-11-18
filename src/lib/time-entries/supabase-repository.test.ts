import type { SupabaseClient } from '@supabase/supabase-js'
import { describe, expect, it } from 'vitest'
import { TimeEntryError } from './errors'
import { SupabaseTimeEntriesRepository } from './supabase-repository'

// Ein Ergebnis pro Aufruf (in Reihenfolge); jede Methode der Abfragekette gibt dieselbe Kette
// zurück, `await` liefert das nächste Ergebnis.
type Result = { data?: unknown; error?: Record<string, unknown> | null; count?: number | null }

function fakeClient(results: Result[]) {
  const calls: { table: string; ops: [string, unknown[]][] }[] = []
  let index = 0

  const client = {
    from(table: string) {
      const entry = { table, ops: [] as [string, unknown[]][] }
      calls.push(entry)
      const proxy: unknown = new Proxy(
        {},
        {
          get(_target, prop: string) {
            if (prop === 'then') {
              const result = results[index++] ?? { data: null, error: null }
              return (resolve: (value: Result) => void) =>
                resolve({ data: result.data ?? null, error: result.error ?? null, count: result.count ?? null })
            }
            return (...args: unknown[]) => {
              entry.ops.push([prop, args])
              return proxy
            }
          },
        }
      )
      return proxy
    },
  }
  return { repo: new SupabaseTimeEntriesRepository(client as unknown as SupabaseClient), calls }
}

async function failure(promise: Promise<unknown>) {
  try {
    await promise
  } catch (error) {
    return error instanceof TimeEntryError ? error.kind : 'other'
  }
  return undefined
}

const row = (overrides = {}) => ({
  id: 'e1',
  project_id: 'p1',
  entry_date: '2026-11-13',
  duration_minutes: 90,
  billable_minutes: 60,
  start_time: '08:30:00',
  end_time: '10:00:00',
  description: 'Konzept',
  created_at: '2026-11-13T08:00:00Z',
  project: { id: 'p1', name: 'Allgemein', customer: { id: 'c1', code: 'MUS', name: 'Muster AG' } },
  ...overrides,
})

const input = {
  projectId: 'p1',
  date: '2026-11-13',
  durationMinutes: 90,
  billableMinutes: 60,
  startTime: '08:30',
  endTime: '10:00',
  description: 'Konzept',
}

describe('SupabaseTimeEntriesRepository', () => {
  it('übersetzt Zeilen in Einträge (Uhrzeiten ohne Sekunden, Kunde und Projekt)', async () => {
    const { repo } = fakeClient([{ data: row() }])
    expect(await repo.createEntry(input)).toEqual({
      id: 'e1',
      projectId: 'p1',
      customerId: 'c1',
      customerCode: 'MUS',
      customerName: 'Muster AG',
      projectName: 'Allgemein',
      date: '2026-11-13',
      durationMinutes: 90,
      billableMinutes: 60,
      startTime: '08:30',
      endTime: '10:00',
      description: 'Konzept',
      createdAt: '2026-11-13T08:00:00Z',
    })
  })

  it('sendet beim Anlegen nur die Felder der Eingabe (kein Besitzer)', async () => {
    const { repo, calls } = fakeClient([{ data: row() }])
    await repo.createEntry(input)
    const insert = calls[0].ops.find(([name]) => name === 'insert')
    expect(insert?.[1][0]).toEqual({
      project_id: 'p1',
      entry_date: '2026-11-13',
      duration_minutes: 90,
      billable_minutes: 60,
      start_time: '08:30',
      end_time: '10:00',
      description: 'Konzept',
    })
  })

  it('behandelt Einträge ohne Uhrzeit und Beschreibung', async () => {
    const { repo } = fakeClient([{ data: row({ start_time: null, end_time: null, description: null }) }])
    expect(await repo.createEntry(input)).toMatchObject({ startTime: null, endTime: null, description: null })
  })

  it('sortiert die Liste eines Tages: mit Uhrzeit nach Start, ohne danach nach Anlegezeit', async () => {
    const { repo } = fakeClient([
      {
        data: [
          row({ id: 'a', start_time: null, end_time: null, created_at: '2026-11-13T09:00:00Z' }),
          row({ id: 'b', start_time: '10:00:00', end_time: '11:00:00' }),
          row({ id: 'c', start_time: '08:00:00', end_time: '09:00:00' }),
          row({ id: 'd', start_time: null, end_time: null, created_at: '2026-11-13T07:00:00Z' }),
        ],
      },
    ])
    expect((await repo.listEntries('2026-11-13')).map((entry) => entry.id)).toEqual(['c', 'b', 'd', 'a'])
  })

  it('liefert aktive Kunden mit Projekten: «Allgemein» zuerst, Kunden nach Kürzel, leere weg', async () => {
    const { repo } = fakeClient([
      {
        data: [
          { id: 'c2', code: 'ZZZ', name: 'Zett', projects: [{ id: 'p3', name: 'Beta' }, { id: 'p2', name: 'Allgemein' }, { id: 'p4', name: 'Alpha' }] },
          { id: 'c1', code: 'AAA', name: 'Aaa', projects: [{ id: 'p1', name: 'Allgemein' }] },
          { id: 'c3', code: 'LEER', name: 'Leer', projects: [] },
        ],
      },
    ])
    const targets = await repo.listTargets()
    expect(targets.map((target) => target.code)).toEqual(['AAA', 'ZZZ'])
    expect(targets[1].projects.map((project) => project.name)).toEqual(['Allgemein', 'Alpha', 'Beta'])
  })

  it('ermittelt das zuletzt benutzte Ziel oder null', async () => {
    const found = fakeClient([{ data: [{ project_id: 'p1', project: { customer_id: 'c1' } }] }])
    expect(await found.repo.getLastTarget()).toEqual({ customerId: 'c1', projectId: 'p1' })
    const none = fakeClient([{ data: [] }])
    expect(await none.repo.getLastTarget()).toBeNull()
  })

  it('übersetzt Regelverstösse der Datenbank in Fehlerarten', async () => {
    const archived = fakeClient([{ error: { code: '23514', message: 'target_archived' } }])
    expect(await failure(archived.repo.createEntry(input))).toBe('target-archived')

    const missing = fakeClient([{ error: { code: '23503', message: 'target_not_found' } }])
    expect(await failure(missing.repo.createEntry(input))).toBe('target-not-found')

    const fk = fakeClient([{ error: { code: '23503', message: 'violates foreign key constraint' } }])
    expect(await failure(fk.repo.createEntry(input))).toBe('target-not-found')

    const future = fakeClient([{ error: { code: '23514', message: 'date_in_future' } }])
    expect(await failure(future.repo.createEntry(input))).toBe('date-in-future')

    const other = fakeClient([{ error: { code: '23514', message: 'time_entries_duration_range' } }])
    expect(await failure(other.repo.createEntry(input))).toBe('unknown')
  })

  it('unterscheidet Sitzung und Netzwerk beim Lesen und Schreiben', async () => {
    const session = fakeClient([{ error: { status: 401, message: 'JWT expired' } }])
    expect(await failure(session.repo.listEntries('2026-11-13'))).toBe('session')

    const offline = fakeClient([{ error: { status: 0, message: 'TypeError: Failed to fetch' } }])
    expect(await failure(offline.repo.createEntry(input))).toBe('unreachable')

    const down = fakeClient([{ error: { status: 503, message: 'Service Unavailable' } }])
    expect(await failure(down.repo.listTargets())).toBe('unreachable')
  })

  it('listMonth fragt den Monat ab, sortiert neueste Tage zuerst und meldet eine abgeschnittene Liste nicht', async () => {
    const { repo, calls } = fakeClient([
      {
        data: [
          row({ id: 'a', entry_date: '2026-11-09', start_time: '08:00:00', end_time: '09:00:00' }),
          row({ id: 'b', entry_date: '2026-11-10', start_time: null, end_time: null, created_at: '2026-11-10T09:00:00Z' }),
          row({ id: 'c', entry_date: '2026-11-10', start_time: '10:00:00', end_time: '11:00:00' }),
          row({ id: 'd', entry_date: '2026-11-10', start_time: null, end_time: null, created_at: '2026-11-10T07:00:00Z' }),
        ],
      },
    ])
    const result = await repo.listMonth({ month: '2026-11' })
    expect(result.truncated).toBe(false)
    expect(result.entries.map((e) => e.id)).toEqual(['c', 'd', 'b', 'a'])
    const ops = calls[0].ops
    expect(ops.find(([name]) => name === 'gte')?.[1]).toEqual(['entry_date', '2026-11-01'])
    expect(ops.find(([name]) => name === 'lt')?.[1]).toEqual(['entry_date', '2026-12-01'])
    expect(ops.find(([name]) => name === 'limit')?.[1]).toEqual([1000])
    expect(ops.find(([name]) => name === 'select')?.[1][1]).toEqual({ count: 'exact' })
    // Ohne Filter keine Kunden- und Beschreibungsbedingung
    expect(ops.some(([name]) => name === 'eq')).toBe(false)
    expect(ops.some(([name]) => name === 'is')).toBe(false)
  })

  it('listMonth wendet Kunden- und Beschreibungsfilter in der Abfrage an (innere Verknüpfung)', async () => {
    const { repo, calls } = fakeClient([{ data: [] }])
    await repo.listMonth({ month: '2026-12', customerId: 'c1', withoutDescription: true })
    const ops = calls[0].ops
    expect(ops.find(([name]) => name === 'select')?.[1][0]).toContain('!inner')
    expect(ops.find(([name]) => name === 'eq')?.[1]).toEqual(['project.customer_id', 'c1'])
    expect(ops.find(([name]) => name === 'is')?.[1]).toEqual(['description', null])
    expect(ops.find(([name]) => name === 'gte')?.[1]).toEqual(['entry_date', '2026-12-01'])
    expect(ops.find(([name]) => name === 'lt')?.[1]).toEqual(['entry_date', '2027-01-01'])
  })

  it('listMonth schneidet bei mehr als 1000 Einträgen ab und meldet es', async () => {
    // Die Datenbank liefert nie mehr als 1000 Zeilen, die Gesamtzahl kommt aus dem Zähler
    const many = Array.from({ length: 1000 }, (_, i) => row({ id: `e${i}` }))
    const { repo } = fakeClient([{ data: many, count: 1001 }])
    const result = await repo.listMonth({ month: '2026-11' })
    expect(result.truncated).toBe(true)
    expect(result.entries).toHaveLength(1000)

    const exact = fakeClient([{ data: many, count: 1000 }])
    const full = await exact.repo.listMonth({ month: '2026-11' })
    expect(full.truncated).toBe(false)
    expect(full.entries).toHaveLength(1000)
  })

  it('listWeek fragt Montag bis vor dem Folgemontag ab, aufsteigend, mit Archiv-Hinweisen und Zähler', async () => {
    const archivedProject = { id: 'p1', name: 'Allgemein', archived: true, customer: { id: 'c1', code: 'MUS', name: 'Muster AG', archived: false } }
    const { repo, calls } = fakeClient([
      {
        data: [
          row({ id: 'b', entry_date: '2026-11-10', start_time: null, end_time: null, created_at: '2026-11-10T09:00:00Z' }),
          row({ id: 'a', entry_date: '2026-11-09', project: archivedProject }),
          row({ id: 'c', entry_date: '2026-11-10', start_time: '07:00:00', end_time: '08:00:00' }),
        ],
        count: 3,
      },
    ])
    const result = await repo.listWeek('2026-W46')
    expect(result.truncated).toBe(false)
    expect(result.entries.map((e) => e.id)).toEqual(['a', 'c', 'b'])
    expect(result.entries[0]).toMatchObject({ projectArchived: true, customerArchived: false })
    const ops = calls[0].ops
    expect(ops.find(([name]) => name === 'select')?.[1][0]).toContain('archived')
    expect(ops.find(([name]) => name === 'select')?.[1][1]).toEqual({ count: 'exact' })
    expect(ops.find(([name]) => name === 'gte')?.[1]).toEqual(['entry_date', '2026-11-09'])
    expect(ops.find(([name]) => name === 'lt')?.[1]).toEqual(['entry_date', '2026-11-16'])
    expect(ops.find(([name]) => name === 'order')?.[1]).toEqual(['entry_date', { ascending: true }])
    expect(ops.find(([name]) => name === 'limit')?.[1]).toEqual([1000])
    // Keine Kunden- oder Beschreibungsbedingung
    expect(ops.some(([name]) => name === 'eq')).toBe(false)
    expect(ops.some(([name]) => name === 'is')).toBe(false)
  })

  it('listEntriesPage fragt alle Einträge fest sortiert in einem Bereich ab und liefert die Gesamtzahl', async () => {
    const { repo, calls } = fakeClient([
      { data: [row({ id: 'a' }), row({ id: 'b', start_time: null, end_time: null })], count: 2500 },
    ])
    const page = await repo.listEntriesPage(1000)
    expect(page.total).toBe(2500)
    expect(page.entries.map((e) => e.id)).toEqual(['a', 'b'])
    const ops = calls[0].ops
    expect(ops.find(([name]) => name === 'select')?.[1][1]).toEqual({ count: 'exact' })
    expect(ops.filter(([name]) => name === 'order').map(([, args]) => args)).toEqual([
      ['entry_date', { ascending: true }],
      ['start_time', { ascending: true, nullsFirst: false }],
      ['created_at', { ascending: true }],
      ['id', { ascending: true }],
    ])
    expect(ops.find(([name]) => name === 'range')?.[1]).toEqual([1000, 1999])
    // Kein Datums-, Kunden- oder Beschreibungsfilter
    expect(ops.some(([name]) => ['gte', 'lt', 'eq', 'is'].includes(name))).toBe(false)
  })

  it('listEntriesPage trägt Archiv-Hinweise und übersetzt Fehler', async () => {
    const archived = {
      id: 'p1',
      name: 'Allgemein',
      archived: true,
      customer: { id: 'c1', code: 'MUS', name: 'Muster AG', archived: true },
    }
    const { repo } = fakeClient([{ data: [row({ project: archived })], count: 1 }])
    expect((await repo.listEntriesPage(0)).entries[0]).toMatchObject({ projectArchived: true, customerArchived: true })
    const offline = fakeClient([{ error: { message: 'TypeError: Failed to fetch' } }])
    expect(await failure(offline.repo.listEntriesPage(0))).toBe('unreachable')
    const session = fakeClient([{ error: { status: 401, message: 'JWT expired' } }])
    expect(await failure(session.repo.listEntriesPage(0))).toBe('session')
  })

  it('listWeek über den Jahreswechsel fragt den richtigen Bereich ab und meldet mehr als 1000 Einträge', async () => {
    const many = Array.from({ length: 1000 }, (_, i) => row({ id: `e${i}`, entry_date: '2025-12-30' }))
    const { repo, calls } = fakeClient([{ data: many, count: 1001 }])
    const result = await repo.listWeek('2026-W01')
    expect(result.truncated).toBe(true)
    expect(result.entries).toHaveLength(1000)
    const ops = calls[0].ops
    expect(ops.find(([name]) => name === 'gte')?.[1]).toEqual(['entry_date', '2025-12-29'])
    expect(ops.find(([name]) => name === 'lt')?.[1]).toEqual(['entry_date', '2026-01-05'])
  })

  it('listMonthReport fragt den Monat aufsteigend ab, mit Archiv-Hinweisen, ohne Filter, und zählt mit', async () => {
    const archivedProject = { id: 'p1', name: 'Allgemein', archived: true, customer: { id: 'c1', code: 'MUS', name: 'Muster AG', archived: true } }
    const { repo, calls } = fakeClient([
      {
        data: [
          row({ id: 'b', entry_date: '2026-11-20' }),
          row({ id: 'a', entry_date: '2026-11-02', project: archivedProject }),
        ],
        count: 2,
      },
    ])
    const result = await repo.listMonthReport('2026-11')
    expect(result.truncated).toBe(false)
    expect(result.entries.map((e) => e.id)).toEqual(['a', 'b'])
    expect(result.entries[0]).toMatchObject({ projectArchived: true, customerArchived: true })
    const ops = calls[0].ops
    expect(ops.find(([name]) => name === 'select')?.[1][0]).toContain('archived')
    expect(ops.find(([name]) => name === 'select')?.[1][1]).toEqual({ count: 'exact' })
    expect(ops.find(([name]) => name === 'gte')?.[1]).toEqual(['entry_date', '2026-11-01'])
    expect(ops.find(([name]) => name === 'lt')?.[1]).toEqual(['entry_date', '2026-12-01'])
    expect(ops.find(([name]) => name === 'order')?.[1]).toEqual(['entry_date', { ascending: true }])
    expect(ops.find(([name]) => name === 'limit')?.[1]).toEqual([1000])
    expect(ops.some(([name]) => name === 'eq')).toBe(false)
    expect(ops.some(([name]) => name === 'is')).toBe(false)
  })

  it('listMonthReport über den Jahreswechsel, mehr als 1000 Einträge und Fehler', async () => {
    const many = Array.from({ length: 1000 }, (_, i) => row({ id: `e${i}`, entry_date: '2026-12-15' }))
    const { repo, calls } = fakeClient([{ data: many, count: 1001 }])
    const result = await repo.listMonthReport('2026-12')
    expect(result.truncated).toBe(true)
    expect(result.entries).toHaveLength(1000)
    const ops = calls[0].ops
    expect(ops.find(([name]) => name === 'gte')?.[1]).toEqual(['entry_date', '2026-12-01'])
    expect(ops.find(([name]) => name === 'lt')?.[1]).toEqual(['entry_date', '2027-01-01'])
    const broken = fakeClient([{ error: { message: 'Failed to fetch' } }])
    expect(await failure(broken.repo.listMonthReport('2026-11'))).toBe('unreachable')
  })

  it('listWeek: Fehler der Datenbank werden zu TimeEntryError', async () => {
    const { repo } = fakeClient([{ error: { message: 'Failed to fetch' } }])
    expect(await failure(repo.listWeek('2026-W46'))).toBe('unreachable')
  })

  it('updateEntry schickt alle Felder (ohne Besitzer und Anlegezeitpunkt) für genau diesen Eintrag', async () => {
    const { repo, calls } = fakeClient([{ data: row({ description: 'Neu' }) }])
    const result = await repo.updateEntry('e1', { ...input, description: 'Neu' })
    expect(result.description).toBe('Neu')
    const ops = calls[0].ops
    expect(ops.find(([name]) => name === 'update')?.[1][0]).toEqual({
      project_id: 'p1',
      entry_date: '2026-11-13',
      duration_minutes: 90,
      billable_minutes: 60,
      start_time: '08:30',
      end_time: '10:00',
      description: 'Neu',
    })
    expect(ops.find(([name]) => name === 'eq')?.[1]).toEqual(['id', 'e1'])
  })

  it('updateEntry meldet fehlende Einträge, archivierte Ziele und Datum in der Zukunft', async () => {
    const gone = fakeClient([{ error: { code: 'PGRST116', message: 'JSON object requested, multiple (or no) rows returned' } }])
    expect(await failure(gone.repo.updateEntry('e1', input))).toBe('entry-not-found')
    const archived = fakeClient([{ error: { code: '23514', message: 'target_archived' } }])
    expect(await failure(archived.repo.updateEntry('e1', input))).toBe('target-archived')
    const future = fakeClient([{ error: { code: '23514', message: 'date_in_future' } }])
    expect(await failure(future.repo.updateEntry('e1', input))).toBe('date-in-future')
  })

  it('deleteEntry löscht genau einen Eintrag über seine Kennung und meldet fehlende', async () => {
    const ok = fakeClient([{ data: [{ id: 'e1' }] }])
    await ok.repo.deleteEntry('e1')
    expect(ok.calls[0].ops.find(([name]) => name === 'delete')).toBeDefined()
    expect(ok.calls[0].ops.find(([name]) => name === 'eq')?.[1]).toEqual(['id', 'e1'])

    const none = fakeClient([{ data: [] }])
    expect(await failure(none.repo.deleteEntry('e1'))).toBe('entry-not-found')
    const offline = fakeClient([{ error: { status: 0, message: 'TypeError: Failed to fetch' } }])
    expect(await failure(offline.repo.deleteEntry('e1'))).toBe('unreachable')
    const session = fakeClient([{ error: { status: 401, message: 'JWT expired' } }])
    expect(await failure(session.repo.deleteEntry('e1'))).toBe('session')
  })
})
