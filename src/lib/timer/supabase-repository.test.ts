import type { SupabaseClient } from '@supabase/supabase-js'
import { describe, expect, it } from 'vitest'
import { describeTimerError, TimerError } from './errors'
import { SupabaseTimerRepository } from './supabase-repository'

// Ein Ergebnis pro Aufruf (in Reihenfolge); `await` auf rpc() und auf die Abfragekette liefert es.
type Result = { data?: unknown; error?: Record<string, unknown> | null }

function fakeClient(results: Result[]) {
  const calls: { kind: 'rpc' | 'from'; name: string; args: unknown; ops: [string, unknown[]][] }[] = []
  let index = 0

  function chain(entry: (typeof calls)[number]) {
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
  }

  const client = {
    rpc(name: string, args?: unknown) {
      const entry = { kind: 'rpc' as const, name, args, ops: [] }
      calls.push(entry)
      return chain(entry)
    },
    from(name: string) {
      const entry = { kind: 'from' as const, name, args: undefined, ops: [] as [string, unknown[]][] }
      calls.push(entry)
      return chain(entry)
    },
  }
  return { repo: new SupabaseTimerRepository(client as unknown as SupabaseClient), calls }
}

async function failure(promise: Promise<unknown>) {
  try {
    await promise
  } catch (error) {
    return error instanceof TimerError ? error.kind : 'other'
  }
  return undefined
}

const timerJson = {
  id: 't1',
  project_id: 'p1',
  project_name: 'Allgemein',
  customer_id: 'c1',
  customer_code: 'MUS',
  customer_name: 'Muster AG',
  started_at: '2026-11-13T09:00:12.345+00:00',
  description: 'Konzept',
}

const finishedJson = {
  project_id: 'p0',
  project_name: 'Relaunch',
  customer_code: 'ABC',
  customer_name: 'Abc GmbH',
  too_short: false,
  total_minutes: 70,
  entries: [
    { id: 'e1', entry_date: '2026-11-13', duration_minutes: 30, start_time: '23:30:00', end_time: '24:00:00' },
    { id: 'e2', entry_date: '2026-11-14', duration_minutes: 40, start_time: '00:00:00', end_time: '00:40:00' },
  ],
}

describe('SupabaseTimerRepository', () => {
  it('liest den Timer mit Serverzeit und übersetzt die Namen', async () => {
    const { repo, calls } = fakeClient([{ data: { timer: timerJson, server_now: '2026-11-13T09:10:00+00:00' } }])
    expect(await repo.getTimer()).toEqual({
      timer: {
        id: 't1',
        projectId: 'p1',
        projectName: 'Allgemein',
        customerId: 'c1',
        customerCode: 'MUS',
        customerName: 'Muster AG',
        startedAt: '2026-11-13T09:00:12.345+00:00',
        description: 'Konzept',
      },
      serverNow: '2026-11-13T09:10:00+00:00',
    })
    expect(calls[0]).toMatchObject({ kind: 'rpc', name: 'get_timer' })
  })

  it('liefert null, wenn kein Timer läuft', async () => {
    const { repo } = fakeClient([{ data: { timer: null, server_now: '2026-11-13T09:10:00+00:00' } }])
    expect((await repo.getTimer()).timer).toBeNull()
  })

  it('startet einen Timer und meldet den beim Wechsel beendeten (Uhrzeiten ohne Sekunden)', async () => {
    const { repo, calls } = fakeClient([
      { data: { timer: timerJson, finished: finishedJson, already_running: false, server_now: '2026-11-13T09:10:00+00:00' } },
    ])
    const result = await repo.startTimer('p1')
    expect(calls[0]).toMatchObject({ name: 'start_timer', args: { p_project_id: 'p1' } })
    expect(result.alreadyRunning).toBe(false)
    expect(result.timer.projectId).toBe('p1')
    expect(result.finished).toMatchObject({ customerCode: 'ABC', tooShort: false, totalMinutes: 70 })
    expect(result.finished?.entries.map((e) => [e.date, e.startTime, e.endTime, e.durationMinutes])).toEqual([
      ['2026-11-13', '23:30', '24:00', 30],
      ['2026-11-14', '00:00', '00:40', 40],
    ])
  })

  it('erkennt «läuft schon» beim selben Projekt', async () => {
    const { repo } = fakeClient([
      { data: { timer: timerJson, finished: null, already_running: true, server_now: '2026-11-13T09:10:00+00:00' } },
    ])
    const result = await repo.startTimer('p1')
    expect(result.alreadyRunning).toBe(true)
    expect(result.finished).toBeNull()
  })

  it('stoppt mit dem letzten Stand der Beschreibung, undefined behält den gespeicherten Text', async () => {
    const json = { finished: finishedJson, server_now: '2026-11-13T09:10:00+00:00' }
    const withText = fakeClient([{ data: json }])
    await withText.repo.stopTimer('Neu')
    expect(withText.calls[0]).toMatchObject({ name: 'stop_timer', args: { p_description: 'Neu' } })
    const keep = fakeClient([{ data: json }])
    await keep.repo.stopTimer()
    expect(keep.calls[0]).toMatchObject({ args: { p_description: null } })
    const clear = fakeClient([{ data: json }])
    await clear.repo.stopTimer('')
    expect(clear.calls[0]).toMatchObject({ args: { p_description: '' } })
  })

  it('meldet bei unter einer Minute «zu kurz» ohne Einträge', async () => {
    const short = { ...finishedJson, too_short: true, total_minutes: 0, entries: [] }
    const { repo } = fakeClient([{ data: { finished: short, server_now: 'x' } }])
    expect((await repo.stopTimer()).finished).toMatchObject({ tooShort: true, entries: [] })
  })

  it('verwirft den Timer und meldet, ob einer lief', async () => {
    const ran = fakeClient([{ data: { discarded: true, server_now: 'x' } }])
    expect(await ran.repo.discardTimer()).toBe(true)
    const none = fakeClient([{ data: { discarded: false, server_now: 'x' } }])
    expect(await none.repo.discardTimer()).toBe(false)
  })

  it('speichert die Beschreibung, leer wird zu «keine», fehlender Timer wird gemeldet', async () => {
    const { repo, calls } = fakeClient([{ data: [{ id: 't1' }] }, { data: [{ id: 't1' }] }])
    await repo.saveDescription('t1', '  Text  ')
    await repo.saveDescription('t1', '   ')
    const updates = calls.map((call) => call.ops.find(([name]) => name === 'update')?.[1][0])
    expect(updates).toEqual([{ description: 'Text' }, { description: null }])

    const gone = fakeClient([{ data: [] }])
    expect(await failure(gone.repo.saveDescription('t1', 'x'))).toBe('no-timer')
  })

  it('übersetzt Regelverstösse der Datenbank in Fehlerarten', async () => {
    const archived = fakeClient([{ error: { code: '23514', message: 'target_archived' } }])
    expect(await failure(archived.repo.startTimer('p1'))).toBe('target-archived')

    const missing = fakeClient([{ error: { code: '23503', message: 'target_not_found' } }])
    expect(await failure(missing.repo.startTimer('p1'))).toBe('target-not-found')

    const none = fakeClient([{ error: { code: 'P0002', message: 'no_timer' } }])
    expect(await failure(none.repo.stopTimer())).toBe('no-timer')

    const tooLong = fakeClient([{ error: { code: '23514', message: 'description_too_long' } }])
    expect(await failure(tooLong.repo.stopTimer('x'))).toBe('description-too-long')

    const other = fakeClient([{ error: { code: 'XX000', message: 'boom' } }])
    expect(await failure(other.repo.stopTimer())).toBe('unknown')
  })

  it('unterscheidet Sitzung und Netzwerk bei allen Aufrufen', async () => {
    const session = fakeClient([{ error: { status: 401, message: 'JWT expired' } }])
    expect(await failure(session.repo.getTimer())).toBe('session')
    const offline = fakeClient([{ error: { status: 0, message: 'TypeError: Failed to fetch' } }])
    expect(await failure(offline.repo.startTimer('p1'))).toBe('unreachable')
    const down = fakeClient([{ error: { status: 503, message: 'Service Unavailable' } }])
    expect(await failure(down.repo.discardTimer())).toBe('unreachable')
  })
})

describe('describeTimerError', () => {
  it('übersetzt Fehlerarten in verständliche Meldungen', () => {
    expect(describeTimerError(new TimerError('target-archived'))).toContain('archiviert')
    expect(describeTimerError(new TimerError('no-timer'))).toContain('schon beendet')
    expect(describeTimerError(new TimerError('session'))).toContain('Anmeldung')
    expect(describeTimerError(new TimerError('unreachable'))).toContain('Keine Verbindung')
    expect(describeTimerError(new Error('boom'))).toContain('nicht geklappt')
  })
})
