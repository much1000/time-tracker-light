import type { SupabaseClient } from '@supabase/supabase-js'
import { describe, expect, it } from 'vitest'
import { TimeEntryError } from './errors'
import { SupabaseTimeEntriesRepository } from './supabase-repository'

// Ein Ergebnis pro Aufruf (in Reihenfolge); jede Methode der Abfragekette gibt dieselbe Kette
// zurück, `await` liefert das nächste Ergebnis.
type Result = { data?: unknown; error?: Record<string, unknown> | null }

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
                resolve({ data: result.data ?? null, error: result.error ?? null })
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
})
