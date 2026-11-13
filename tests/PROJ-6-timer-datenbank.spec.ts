import { resolve } from 'node:path'
import { expect, test, type APIRequestContext, type Page } from '@playwright/test'
import { hasTestUser, SKIP_REASON } from './helpers/env'

// PROJ-6 (Backend): Timer gegen die echte Datenbank, über REST mit der Sitzung des Testkontos.
// Prüft die Funktionen get/start/stop/discard_timer und die Zugriffsregeln. Die Zeitlogik
// (Aufteilung über Mitternacht usw.) prüft supabase/tests/PROJ-6-timer-rules.sql.
// Testkunden tragen das Präfix «T-»; der echte Stopp legt einen Zeiteintrag an (kein Löschen möglich).

try {
  ;(process as unknown as { loadEnvFile: (path: string) => void }).loadEnvFile(
    resolve(process.cwd(), '.env.local')
  )
} catch {
  // Datei fehlt: Die Tests werden übersprungen.
}

const run = Date.now().toString(36).slice(-5).toUpperCase()
const CODE = `T-TD${run}`
const base = process.env.NEXT_PUBLIC_SUPABASE_URL as string
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string

test.skip(!hasTestUser || !base || !anon, SKIP_REASON)
test.describe.configure({ mode: 'serial' })

let headers: Record<string, string>
let projectA = ''
let projectB = ''
let customerId = ''

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

const rpc = (request: APIRequestContext, name: string, data: unknown = {}, h = headers) =>
  request.post(`${base}/rest/v1/rpc/${name}`, { headers: h, data })

test('Vorbereitung: Testkunde mit zwei Projekten, kein Timer läuft', async ({ page, request }) => {
  headers = {
    apikey: anon,
    Authorization: `Bearer ${await accessToken(page)}`,
    'Content-Type': 'application/json',
    Prefer: 'return=representation',
  }
  await rpc(request, 'discard_timer')
  const created = await rpc(request, 'create_customer', { p_code: CODE, p_name: `Timer DB ${run}` })
  expect(created.ok()).toBe(true)
  customerId = (await created.json()).id
  const projects = await (await request.get(`${base}/rest/v1/projects?select=id,name&customer_id=eq.${customerId}`, { headers })).json()
  projectA = projects[0].id
  const second = await request.post(`${base}/rest/v1/projects`, { headers, data: { customer_id: customerId, name: 'Zweit' } })
  expect(second.status()).toBe(201)
  projectB = (await second.json())[0].id
})

test('get_timer: ohne Timer null, mit Serverzeit', async ({ request }) => {
  const result = await (await rpc(request, 'get_timer')).json()
  expect(result.timer).toBeNull()
  expect(Date.parse(result.server_now)).not.toBeNaN()
})

test('start_timer: startet mit Serverzeit; derselbe Start ist idempotent', async ({ request }) => {
  const first = await (await rpc(request, 'start_timer', { p_project_id: projectA })).json()
  expect(first.already_running).toBe(false)
  expect(first.finished).toBeNull()
  expect(first.timer.customer_code).toBe(CODE)
  expect(first.timer.project_name).toBe('Allgemein')
  // Startzeit ist die Serverzeit, nicht in der Zukunft
  expect(Date.parse(first.timer.started_at)).toBeLessThanOrEqual(Date.parse(first.server_now))
  const again = await (await rpc(request, 'start_timer', { p_project_id: projectA })).json()
  expect(again.already_running).toBe(true)
  expect(again.timer.id).toBe(first.timer.id)
  const rows = await (await request.get(`${base}/rest/v1/running_timers?select=id`, { headers })).json()
  expect(rows).toHaveLength(1)
})

test('Beschreibung des laufenden Timers: speichern, lesen, Grenzen', async ({ request }) => {
  const ok = await request.patch(`${base}/rest/v1/running_timers?owner_id=not.is.null`, { headers, data: { description: 'Live Text' } })
  expect(ok.status()).toBe(200)
  const timer = (await (await rpc(request, 'get_timer')).json()).timer
  expect(timer.description).toBe('Live Text')
  for (const bad of ['x'.repeat(1001), ' Rand ', '']) {
    const response = await request.patch(`${base}/rest/v1/running_timers?owner_id=not.is.null`, { headers, data: { description: bad } })
    expect(response.status(), JSON.stringify(bad.slice(0, 10))).toBeGreaterThanOrEqual(400)
  }
})

test('Sicherheit: Browser darf Timer nicht anlegen, löschen oder Projekt, Startzeit, Besitzer ändern', async ({ request }) => {
  const insert = await request.post(`${base}/rest/v1/running_timers`, { headers, data: { project_id: projectB } })
  expect([401, 403]).toContain(insert.status())
  const del = await request.delete(`${base}/rest/v1/running_timers?owner_id=not.is.null`, { headers })
  expect([401, 403]).toContain(del.status())
  for (const body of [{ project_id: projectB }, { started_at: '2020-01-01T00:00:00Z' }, { owner_id: '17bb69ca-f2e7-4b05-9ee4-e08c3ac67263' }]) {
    const response = await request.patch(`${base}/rest/v1/running_timers?owner_id=not.is.null`, { headers, data: body })
    expect([401, 403], JSON.stringify(body)).toContain(response.status())
  }
  // Interne Hilfsfunktionen sind von aussen nicht aufrufbar
  for (const name of ['finish_timer_internal', 'timer_json']) {
    const response = await rpc(request, name, {})
    expect(response.status(), name).toBeGreaterThanOrEqual(400)
  }
  // Der Timer ist unverändert
  const timer = (await (await rpc(request, 'get_timer')).json()).timer
  expect(timer.project_id).toBe(projectA)
})

test('Sicherheit: ohne Anmeldung (nur öffentlicher Schlüssel) ist nichts erreichbar', async ({ request }) => {
  const anonHeaders = { apikey: anon, 'Content-Type': 'application/json' }
  for (const [name, data] of [['get_timer', {}], ['start_timer', { p_project_id: projectA }], ['stop_timer', {}], ['discard_timer', {}]] as const) {
    const response = await rpc(request, name, data, anonHeaders)
    expect([401, 403], name).toContain(response.status())
  }
  const read = await request.get(`${base}/rest/v1/running_timers?select=id`, { headers: anonHeaders })
  expect([401, 403]).toContain(read.status())
})

test('Wechsel: Start bei einem anderen Projekt beendet den laufenden Timer (unter einer Minute ohne Eintrag)', async ({ request }) => {
  const switched = await (await rpc(request, 'start_timer', { p_project_id: projectB })).json()
  expect(switched.already_running).toBe(false)
  expect(switched.timer.project_name).toBe('Zweit')
  expect(switched.finished.project_name).toBe('Allgemein')
  // Unter einer Minute: kein Eintrag (selten: Minutengrenze dazwischen, dann genau einer)
  expect(switched.finished.entries.length).toBeLessThanOrEqual(1)
  const rows = await (await request.get(`${base}/rest/v1/running_timers?select=id,project_id`, { headers })).json()
  expect(rows).toHaveLength(1)
  expect(rows[0].project_id).toBe(projectB)
})

test('Verwerfen: löscht nur den Timer, ein zweites Mal meldet «kein Timer»', async ({ request }) => {
  const first = await (await rpc(request, 'discard_timer')).json()
  expect(first.discarded).toBe(true)
  const second = await (await rpc(request, 'discard_timer')).json()
  expect(second.discarded).toBe(false)
  expect((await (await rpc(request, 'get_timer')).json()).timer).toBeNull()
  const stop = await rpc(request, 'stop_timer', {})
  expect(stop.status()).toBeGreaterThanOrEqual(400)
  expect(await stop.text()).toContain('no_timer')
})

test('Start bei fremdem oder unbekanntem Projekt wird abgelehnt', async ({ request }) => {
  const missing = await rpc(request, 'start_timer', { p_project_id: '00000000-0000-4000-8000-000000000000' })
  expect(missing.status()).toBe(409)
  expect(await missing.text()).toContain('target_not_found')
})

test('Echter Stopp nach über einer Minute: ein Eintrag mit Uhrzeiten, verrechenbar gleich Dauer, Beschreibung', async ({ request }) => {
  test.setTimeout(120000)
  await rpc(request, 'start_timer', { p_project_id: projectA })
  await new Promise((resolveWait) => setTimeout(resolveWait, 62000))
  const stopped = await (await rpc(request, 'stop_timer', { p_description: `Echter Stopp ${run}` })).json()
  const finished = stopped.finished
  expect(finished.too_short).toBe(false)
  expect(finished.total_minutes).toBeGreaterThanOrEqual(1)
  expect(finished.total_minutes).toBeLessThanOrEqual(3)
  // Bei einem Lauf um Mitternacht in Zürich wären es zwei Einträge
  expect(finished.entries.length).toBeGreaterThanOrEqual(1)
  const ids = finished.entries.map((e: { id: string }) => e.id).join(',')
  const entries = await (await request.get(`${base}/rest/v1/time_entries?select=*&id=in.(${ids})`, { headers })).json()
  for (const entry of entries) {
    expect(entry.description).toBe(`Echter Stopp ${run}`)
    expect(entry.billable_minutes).toBe(entry.duration_minutes)
    expect(entry.start_time).not.toBeNull()
    expect(entry.end_time).not.toBeNull()
  }
  expect((await (await rpc(request, 'get_timer')).json()).timer).toBeNull()
})

test('Archivierte Projekte: Start abgelehnt', async ({ request }) => {
  await rpc(request, 'archive_customer', { p_id: customerId })
  const response = await rpc(request, 'start_timer', { p_project_id: projectA })
  expect(response.status()).toBe(400)
  expect(await response.text()).toContain('target_archived')
})
