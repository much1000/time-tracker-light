import type { SupabaseClient } from '@supabase/supabase-js'
import { describe, expect, it } from 'vitest'
import { RepositoryError } from './errors'
import { SupabaseCustomersRepository } from './supabase-repository'

// Ein Ergebnis pro Aufruf (in Reihenfolge); jede Methode der Abfragekette gibt dieselbe Kette
// zurück, `await` liefert das nächste Ergebnis.
type Result = { data?: unknown; error?: Record<string, unknown> | null }

function fakeClient(results: Result[]) {
  const calls: { table?: string; fn?: string; ops: [string, unknown[]][] }[] = []
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
    from(table: string) {
      const entry = { table, ops: [] as [string, unknown[]][] }
      calls.push(entry)
      return chain(entry)
    },
    rpc(fn: string, args: unknown) {
      const entry = { fn, ops: [['args', [args]]] as [string, unknown[]][] }
      calls.push(entry)
      return chain(entry)
    },
  }
  return { repo: new SupabaseCustomersRepository(client as unknown as SupabaseClient), calls }
}

async function kind(promise: Promise<unknown>) {
  try {
    await promise
  } catch (error) {
    return error instanceof RepositoryError ? error : new Error('other')
  }
  return undefined
}

const customerRow = {
  id: '11111111-1111-4111-8111-111111111111',
  code: 'MUS',
  name: 'Muster AG',
  archived: false,
  archived_at: null,
  created_at: '2026-11-11T10:00:00Z',
  updated_at: '2026-11-11T10:00:00Z',
}

describe('SupabaseCustomersRepository', () => {
  it('legt Kunden über die Datenbankfunktion an und übersetzt die Zeile', async () => {
    const { repo, calls } = fakeClient([{ data: customerRow }])
    const customer = await repo.createCustomer({ code: 'MUS', name: 'Muster AG' })
    expect(customer).toMatchObject({ id: customerRow.id, code: 'MUS', archived: false })
    expect(calls[0]).toMatchObject({ fn: 'create_customer' })
    expect(calls[0].ops[0][1][0]).toEqual({ p_code: 'MUS', p_name: 'Muster AG' })
  })

  it('übersetzt ein doppeltes Kürzel und erkennt Treffer im Archiv', async () => {
    const { repo } = fakeClient([
      { error: { code: '23505', message: 'duplicate key value violates unique constraint "customers_owner_code_key"' } },
      { data: [{ archived: true }] },
    ])
    const error = await kind(repo.createCustomer({ code: 'MUS', name: 'Muster AG' }))
    expect(error).toMatchObject({ kind: 'duplicate-code', inArchive: true })
  })

  it('übersetzt einen doppelten Namen (aktiver Treffer)', async () => {
    const { repo } = fakeClient([
      { error: { code: '23505', message: 'duplicate key value violates unique constraint "customers_owner_name_lower_idx"' } },
      { data: [{ archived: false }] },
    ])
    const error = await kind(repo.updateCustomer(customerRow.id, { code: 'MUS', name: 'Muster AG' }))
    expect(error).toMatchObject({ kind: 'duplicate-name', inArchive: false })
  })

  it('übersetzt ein doppeltes Projekt beim selben Kunden', async () => {
    const { repo } = fakeClient([
      { error: { code: '23505', message: 'duplicate key' } },
      { data: [{ archived: true }] },
    ])
    const error = await kind(repo.createProject(customerRow.id, { name: 'Allgemein' }))
    expect(error).toMatchObject({ kind: 'duplicate-project', inArchive: true })
  })

  it('meldet Projekte unter archivierten Kunden als «customer-archived»', async () => {
    const { repo } = fakeClient([{ error: { code: '23514', message: 'customer_archived' } }])
    const error = await kind(repo.reactivateProject('x'))
    expect(error).toMatchObject({ kind: 'customer-archived' })
  })

  it('unterscheidet Sitzung, Netzwerk und Unbekanntes', async () => {
    const session = fakeClient([{ error: { status: 401, message: 'JWT expired' } }])
    expect(await kind(session.repo.archiveCustomer('x'))).toMatchObject({ kind: 'session' })

    const offline = fakeClient([{ error: { status: 0, message: 'TypeError: Failed to fetch' } }])
    expect(await kind(offline.repo.archiveCustomer('x'))).toMatchObject({ kind: 'unreachable' })

    const other = fakeClient([{ error: { code: 'XX000', message: 'boom' } }])
    expect(await kind(other.repo.archiveCustomer('x'))).toMatchObject({ kind: 'unknown' })
  })

  it('meldet fremde oder fehlende Einträge als «nicht gefunden»', async () => {
    const { repo } = fakeClient([{ error: { code: 'P0002', message: 'not_found' } }])
    expect(await kind(repo.reactivateCustomer('x'))).toMatchObject({ kind: 'not-found' })

    const update = fakeClient([{ error: { code: 'PGRST116', message: 'no rows' } }])
    expect(await kind(update.repo.updateCustomer('x', { code: 'AB', name: 'n' }))).toMatchObject({
      kind: 'not-found',
    })
  })

  it('gibt für ungültige Kennungen null zurück, ohne die Datenbank zu fragen', async () => {
    const { repo, calls } = fakeClient([])
    expect(await repo.getCustomer('kein-uuid')).toBeNull()
    expect(calls).toHaveLength(0)
  })

  it('liefert null, wenn die Datenbank den Kunden nicht zeigt (fremd oder nicht vorhanden)', async () => {
    const { repo } = fakeClient([{ data: null }])
    expect(await repo.getCustomer(customerRow.id)).toBeNull()
  })

  it('zählt aktive Projekte pro Kunde und sortiert nach Kürzel', async () => {
    const other = { ...customerRow, id: '22222222-2222-4222-8222-222222222222', code: 'ABC', name: 'Abc' }
    const { repo } = fakeClient([
      { data: [customerRow, other] },
      { data: [{ customer_id: customerRow.id }, { customer_id: customerRow.id }] },
    ])
    const list = await repo.listCustomers()
    expect(list.map((c) => [c.code, c.activeProjectCount])).toEqual([
      ['ABC', 0],
      ['MUS', 2],
    ])
  })

  it('archiviert ein bereits archiviertes Projekt ohne Fehler, meldet aber fehlende als «nicht gefunden»', async () => {
    const already = fakeClient([{ data: [] }, { data: { id: 'p' } }])
    await expect(already.repo.archiveProject('p')).resolves.toBeUndefined()

    const missing = fakeClient([{ data: [] }, { data: null }])
    expect(await kind(missing.repo.archiveProject('p'))).toMatchObject({ kind: 'not-found' })
  })
})
