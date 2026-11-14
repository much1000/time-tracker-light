import { resolve } from 'node:path'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { expect, test, type Page } from '@playwright/test'
import { SupabaseTimeEntriesRepository } from '../src/lib/time-entries/supabase-repository'
import type { TimeEntryInput } from '../src/lib/time-entries/types'
import { TimeEntryError } from '../src/lib/time-entries/errors'
import { hasTestUser, SKIP_REASON } from './helpers/env'

// PROJ-5 (Backend): Monatsliste, Ändern und Löschen gegen die echte Datenbank. Die Tests nutzen die echte
// Datenschicht (SupabaseTimeEntriesRepository) mit der Sitzung des Testkontos und räumen ihre Einträge
// selbst wieder auf (Löschen ist seit PROJ-5 möglich). Der Testkunde «T-…» bleibt archiviert zurück.

try {
  ;(process as unknown as { loadEnvFile: (path: string) => void }).loadEnvFile(
    resolve(process.cwd(), '.env.local')
  )
} catch {
  // Datei fehlt: Die Tests werden übersprungen.
}

const run = Date.now().toString(36).slice(-5).toUpperCase()
const CODE = `T-ZD${run}`
const base = process.env.NEXT_PUBLIC_SUPABASE_URL as string
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string

test.skip(!hasTestUser || !base || !anon, SKIP_REASON)
test.describe.configure({ mode: 'serial' })

let client: SupabaseClient
let repo: SupabaseTimeEntriesRepository
let token = ''
let customerId = ''
let projectA = ''
let projectB = ''
const created: string[] = []

async function accessToken(page: Page): Promise<string> {
  await page.goto('/')
  const cookies = await page.context().cookies()
  const raw = cookies
    .filter((c) => /auth-token/.test(c.name))
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((c) => c.value)
    .join('')
  return JSON.parse(Buffer.from(decodeURIComponent(raw).replace(/^base64-/, ''), 'base64url').toString()).access_token
}

const input = (overrides: Partial<TimeEntryInput> = {}): TimeEntryInput => ({
  projectId: projectA,
  date: '2025-03-10',
  durationMinutes: 60,
  billableMinutes: 60,
  startTime: '08:00',
  endTime: '09:00',
  description: null,
  ...overrides,
})

async function kind(promise: Promise<unknown>) {
  try {
    await promise
  } catch (error) {
    return error instanceof TimeEntryError ? error.kind : 'other'
  }
  return undefined
}

test('Vorbereitung: Testkunde mit zwei Projekten, Einträge im März 2025', async ({ page }) => {
  token = await accessToken(page)
  client = createClient(base, anon, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  })
  repo = new SupabaseTimeEntriesRepository(client)

  const customer = await client.rpc('create_customer', { p_code: CODE, p_name: `Zeiten DB ${run}` })
  expect(customer.error).toBeNull()
  customerId = (customer.data as { id: string }).id
  const projects = await client.from('projects').select('id').eq('customer_id', customerId)
  projectA = (projects.data as { id: string }[])[0].id
  const second = await client.from('projects').insert({ customer_id: customerId, name: 'Zweit' }).select('id').single()
  projectB = (second.data as { id: string }).id

  const seeds: TimeEntryInput[] = [
    input({ description: 'A früh' }),
    input({ startTime: null, endTime: null, description: null, durationMinutes: 30, billableMinutes: 30 }),
    input({ date: '2025-03-11', startTime: '10:00', endTime: '11:30', durationMinutes: 90, billableMinutes: 60, description: 'C spät' }),
    input({ date: '2025-03-09', startTime: '22:00', endTime: '24:00', durationMinutes: 120, billableMinutes: 120, description: null }),
    input({ projectId: projectB, date: '2025-03-10', startTime: '07:00', endTime: '07:30', durationMinutes: 30, billableMinutes: 30, description: 'Zweites Projekt' }),
  ]
  for (const seed of seeds) created.push((await repo.createEntry(seed)).id)
  expect(created).toHaveLength(5)
})

test('listMonth: nur der Monat, neueste Tage zuerst, mit Uhrzeit vor ohne, 24:00 bleibt «24:00»', async () => {
  const { entries, truncated } = await repo.listMonth({ month: '2025-03', customerId })
  expect(truncated).toBe(false)
  expect(entries.map((e) => `${e.date} ${e.startTime ?? '-'} ${e.description ?? '·'}`)).toEqual([
    '2025-03-11 10:00 C spät',
    '2025-03-10 07:00 Zweites Projekt',
    '2025-03-10 08:00 A früh',
    '2025-03-10 - ·',
    '2025-03-09 22:00 ·',
  ])
  const midnight = entries.find((e) => e.date === '2025-03-09')
  expect(midnight).toMatchObject({ startTime: '22:00', endTime: '24:00', durationMinutes: 120 })
  expect(entries[0]).toMatchObject({ customerCode: CODE, projectName: 'Allgemein' })

  expect((await repo.listMonth({ month: '2025-02', customerId })).entries).toEqual([])
  expect((await repo.listMonth({ month: '2025-04', customerId })).entries).toEqual([])
})

test('listMonth: Filter «ohne Beschreibung» und Kunde, auch kombiniert; ohne Kundenfilter enthält der Monat die Einträge', async () => {
  const without = await repo.listMonth({ month: '2025-03', customerId, withoutDescription: true })
  expect(without.entries.map((e) => e.date)).toEqual(['2025-03-10', '2025-03-09'])
  for (const entry of without.entries) expect(entry.description).toBeNull()

  const all = await repo.listMonth({ month: '2025-03' })
  const ids = new Set(all.entries.map((e) => e.id))
  for (const id of created) expect(ids.has(id)).toBe(true)

  const otherCustomer = await repo.listMonth({ month: '2025-03', customerId: '00000000-0000-4000-8000-000000000000' })
  expect(otherCustomer.entries).toEqual([])
})

test('updateEntry: ändert alle Felder, der Anlegezeitpunkt bleibt, der Eintrag wechselt den Monat', async () => {
  const target = (await repo.listMonth({ month: '2025-03', customerId })).entries.find((e) => e.description === 'A früh')!
  const updated = await repo.updateEntry(
    target.id,
    input({
      projectId: projectB,
      date: '2025-04-02',
      startTime: null,
      endTime: null,
      durationMinutes: 45,
      billableMinutes: 15,
      description: 'Geändert <b>fett</b>',
    })
  )
  expect(updated).toMatchObject({
    id: target.id,
    projectName: 'Zweit',
    date: '2025-04-02',
    durationMinutes: 45,
    billableMinutes: 15,
    startTime: null,
    endTime: null,
    description: 'Geändert <b>fett</b>',
  })
  expect(updated.createdAt).toBe(target.createdAt)

  expect((await repo.listMonth({ month: '2025-03', customerId })).entries.some((e) => e.id === target.id)).toBe(false)
  expect((await repo.listMonth({ month: '2025-04', customerId })).entries.map((e) => e.id)).toEqual([target.id])
})

test('updateEntry: Regeln der Datenbank gelten auch beim Ändern, nicht vorhandene Einträge werden gemeldet', async () => {
  const target = (await repo.listMonth({ month: '2025-03', customerId })).entries[0]
  const today = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Zurich' }).format(new Date())
  const tomorrow = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Zurich' }).format(new Date(Date.now() + 26 * 3600 * 1000))

  expect(await kind(repo.updateEntry(target.id, input({ date: tomorrow })))).toBe('date-in-future')
  expect(await kind(repo.updateEntry(target.id, input({ billableMinutes: 61 })))).toBe('unknown')
  expect(await kind(repo.updateEntry(target.id, input({ durationMinutes: 0, billableMinutes: 0, startTime: null, endTime: null })))).toBe('unknown')
  expect(await kind(repo.updateEntry(target.id, input({ startTime: '10:00', endTime: '09:00' })))).toBe('unknown')
  expect(await kind(repo.updateEntry(target.id, input({ description: 'x'.repeat(1001) })))).toBe('unknown')
  expect(await kind(repo.updateEntry(target.id, input({ description: ' Rand ' })))).toBe('unknown')
  expect(await kind(repo.updateEntry(target.id, input({ projectId: '00000000-0000-4000-8000-000000000000' })))).toBe('target-not-found')
  expect(await kind(repo.updateEntry('00000000-0000-4000-8000-000000000000', input()))).toBe('entry-not-found')
  // Der Eintrag ist unverändert
  const again = (await repo.listMonth({ month: '2025-03', customerId })).entries.find((e) => e.id === target.id)
  expect(again).toMatchObject({ date: target.date, durationMinutes: target.durationMinutes, description: target.description })
  expect(today).toMatch(/^\d{4}-\d{2}-\d{2}$/)
})

test('Archiviertes Projekt: Bearbeiten ohne Verschieben ist möglich, Verschieben auf ein archiviertes nicht', async () => {
  // Kunde A archivieren (beide Projekte), ein neues Ziel gibt es nur beim Reaktivieren
  const target = (await repo.listMonth({ month: '2025-03', customerId })).entries.find((e) => e.description === 'C spät')!
  const archive = await client.rpc('archive_customer', { p_id: customerId })
  expect(archive.error).toBeNull()

  const edited = await repo.updateEntry(target.id, input({ projectId: target.projectId, date: target.date, startTime: '10:00', endTime: '11:30', durationMinutes: 90, billableMinutes: 90, description: 'C spät, archiviert korrigiert' }))
  expect(edited.description).toBe('C spät, archiviert korrigiert')
  expect(edited.billableMinutes).toBe(90)

  expect(await kind(repo.updateEntry(target.id, input({ projectId: projectB, date: target.date })))).toBe('target-archived')
  await client.rpc('reactivate_customer', { p_id: customerId })
})

test('deleteEntry: löscht genau einen Eintrag, ein zweites Mal wird «nicht vorhanden» gemeldet', async () => {
  const before = (await repo.listMonth({ month: '2025-03', customerId })).entries
  const victim = before[before.length - 1]
  await repo.deleteEntry(victim.id)
  const after = (await repo.listMonth({ month: '2025-03', customerId })).entries
  expect(after).toHaveLength(before.length - 1)
  expect(after.some((e) => e.id === victim.id)).toBe(false)
  expect(await kind(repo.deleteEntry(victim.id))).toBe('entry-not-found')
  expect(await kind(repo.deleteEntry('00000000-0000-4000-8000-000000000000'))).toBe('entry-not-found')
})

test('Sicherheit: Löschen nur über den eigenen Eintrag; Kunden, Projekte, Timer und ohne Anmeldung nicht', async ({ request }) => {
  const headers = { apikey: anon, Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', Prefer: 'return=representation' }
  const rest = `${base}/rest/v1`

  // Kunden und Projekte lassen sich nicht löschen, auch nicht mit Bedingung auf das eigene Projekt
  expect([401, 403]).toContain((await request.delete(`${rest}/projects?id=eq.${projectA}`, { headers })).status())
  expect([401, 403]).toContain((await request.delete(`${rest}/customers?id=eq.${customerId}`, { headers })).status())
  expect([401, 403]).toContain((await request.delete(`${rest}/running_timers?owner_id=not.is.null`, { headers })).status())

  // Ohne Anmeldung (nur öffentlicher Schlüssel): nichts lesbar, nichts löschbar
  const anonHeaders = { apikey: anon, 'Content-Type': 'application/json' }
  const remaining = (await repo.listMonth({ month: '2025-03', customerId })).entries
  expect(remaining.length).toBeGreaterThan(0)
  expect([401, 403]).toContain((await request.delete(`${rest}/time_entries?id=eq.${remaining[0].id}`, { headers: anonHeaders })).status())
  expect((await repo.listMonth({ month: '2025-03', customerId })).entries).toHaveLength(remaining.length)

  // Eigener Eintrag: Löschen über die Kennung funktioniert und trifft nur diese Zeile
  const mine = await request.delete(`${rest}/time_entries?id=eq.${remaining[0].id}`, { headers })
  expect(mine.status()).toBe(200)
  expect(await mine.json()).toHaveLength(1)
})

test('Aufräumen: übrige Testeinträge löschen, Testkunde archivieren', async () => {
  for (const month of ['2025-03', '2025-04']) {
    const { entries } = await repo.listMonth({ month, customerId })
    for (const entry of entries) await repo.deleteEntry(entry.id)
    expect((await repo.listMonth({ month, customerId })).entries).toEqual([])
  }
  await client.rpc('archive_customer', { p_id: customerId })
})
