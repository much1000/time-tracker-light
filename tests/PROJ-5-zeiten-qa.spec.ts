import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { expect, test, type Page } from '@playwright/test'
import { hasTestUser, NO_LOGIN, SKIP_REASON } from './helpers/env'
import { findLeaks } from './helpers/leaks'

// PROJ-5 QA: Seite «Zeiten» (Liste, Monat, Filter), Bearbeiten, Löschen, «Heute», Layout, Zugänglichkeit, Sicherheit.
// Die Tests legen eigene Testkunden «T-Z…» und Einträge direkt in der Datenbank an (mit der Sitzung des Testkontos),
// arbeiten in festen Monaten der Vergangenheit (März 2025) und räumen am Ende auf: Einträge werden gelöscht
// (seit PROJ-5 möglich), die Testkunden archiviert.

try {
  ;(process as unknown as { loadEnvFile: (path: string) => void }).loadEnvFile(
    resolve(process.cwd(), '.env.local')
  )
} catch {
  // Datei fehlt: Die Tests werden übersprungen.
}

const base = process.env.NEXT_PUBLIC_SUPABASE_URL as string
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string
const AXE = readFileSync(resolve(process.cwd(), 'node_modules/axe-core/axe.min.js'), 'utf8')

const run = Date.now().toString(36).slice(-5).toUpperCase()
// Sehr langer Name ohne Leerzeichen (100 Zeichen, je Lauf eindeutig)
const LONG_WORD = `Wortlos${run}${'x'.repeat(88)}`

test.skip(!hasTestUser || !base || !anon, SKIP_REASON)
test.describe.configure({ mode: 'serial' })
test.use({ viewport: { width: 1280, height: 900 } })

interface Seed {
  id: string
  created_at: string
}
interface Cust {
  id: string
  code: string
  name: string
}

let client: SupabaseClient
let A: Cust
let B: Cust
let C: Cust
let pa = ''
let pz = ''
let pb = ''
let pc = ''
// Einträge (Kennungen)
const E: Record<string, Seed> = {}

// ----- Hilfen -----

const zurich = (offsetMs = 0) =>
  new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Zurich' }).format(new Date(Date.now() + offsetMs))
const today = () => zurich()
const tomorrow = () => zurich(26 * 3600 * 1000)
const currentMonth = () => today().slice(0, 7)
function shiftMonth(key: string, delta: number) {
  const [year, month] = key.split('-').map(Number)
  const index = year * 12 + (month - 1) + delta
  return `${Math.floor(index / 12)}-${String((index % 12) + 1).padStart(2, '0')}`
}
const monthLabel = (key: string) =>
  new Intl.DateTimeFormat('de-CH', { timeZone: 'UTC', month: 'long', year: 'numeric' }).format(
    new Date(Date.UTC(Number(key.slice(0, 4)), Number(key.slice(5, 7)) - 1, 1))
  )

const listUrl = (customer: Cust, extra = '') => `/zeiten?monat=2025-03&kunde=${customer.id}${extra}`

// Name der Aktionen eines Eintrags: «Eintrag von 12.03., T-ZA… · Allgemein, 1:30 bearbeiten»
function label(date: string, customer: Cust, project: string, duration: string, action: 'bearbeiten' | 'löschen') {
  return `Eintrag von ${date.slice(8)}.${date.slice(5, 7)}., ${customer.code} · ${project}, ${duration} ${action}`
}

async function addEntry(row: {
  project: string
  date: string
  minutes: number
  billable?: number
  start?: string
  end?: string
  description?: string | null
}): Promise<Seed> {
  const { data, error } = await client
    .from('time_entries')
    .insert({
      project_id: row.project,
      entry_date: row.date,
      duration_minutes: row.minutes,
      billable_minutes: row.billable ?? row.minutes,
      start_time: row.start ?? null,
      end_time: row.end ?? null,
      description: row.description ?? null,
    })
    .select('id,created_at')
    .single()
  expect(error).toBeNull()
  return data as Seed
}

async function dbEntry(id: string) {
  const { data } = await client.from('time_entries').select('*').eq('id', id).maybeSingle()
  return data as Record<string, unknown> | null
}

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

async function axeViolations(page: Page) {
  await page.evaluate(AXE)
  return page.evaluate(async () => {
    // @ts-expect-error axe wird per Skript eingebunden
    const result = await window.axe.run(document, { runOnly: ['wcag2a', 'wcag2aa', 'wcag21aa'] })
    return result.violations.map((v: { id: string; nodes: { html: string }[] }) => ({
      id: v.id,
      nodes: v.nodes.slice(0, 3).map((n) => n.html.slice(0, 140)),
    }))
  })
}

const noHorizontalScroll = (page: Page) =>
  page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)

// Bedienelemente unter 44 px Höhe (Seiteninhalt und offener Dialog)
const smallTargets = (page: Page) =>
  page.evaluate(() => {
    const out: string[] = []
    document
      .querySelectorAll(
        '[role="dialog"] button, [role="dialog"] input, [role="dialog"] textarea, [role="alertdialog"] button, main button, main a[href], main [role="switch"], main [role="combobox"]'
      )
      .forEach((el) => {
        const r = (el as HTMLElement).getBoundingClientRect()
        if (r.width === 0 || r.height === 0) return
        if (r.height < 43.5) out.push(`${el.tagName} «${(el.textContent ?? '').trim().slice(0, 25)}» ${Math.round(r.height)}px`)
      })
    return out.filter((entry) => !entry.startsWith('BUTTON «Close'))
  })

const rows = (page: Page) => page.locator('li[data-entry-id]')
const dialog = (page: Page) => page.getByRole('dialog')
const toast = (page: Page, text: string | RegExp) => page.locator('[data-sonner-toast]').filter({ hasText: text }).first()

async function openList(page: Page, url: string) {
  await page.goto(url)
  await expect(rows(page).first()).toBeVisible()
}

// «h:mm» -> Minuten
const minutes = (text: string) => {
  const [h, m] = text.split(':').map(Number)
  return h * 60 + m
}
const monthSums = async (page: Page) => (await page.locator('p.text-2xl').allInnerTexts()).map((text) => text.trim())

async function openEdit(page: Page, name: string, index = 0) {
  await page.getByRole('button', { name }).nth(index).click()
  await expect(dialog(page)).toBeVisible()
  await expect(dialog(page).getByLabel('Datum')).toBeVisible()
}

// ----- Vorbereitung -----

test('Vorbereitung: Testkunden und Einträge in der Datenbank anlegen', async ({ page }) => {
  const token = await accessToken(page)
  client = createClient(base, anon, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  })

  async function customer(code: string, name: string): Promise<Cust> {
    const { data, error } = await client.rpc('create_customer', { p_code: code, p_name: name })
    expect(error).toBeNull()
    return { id: (data as { id: string }).id, code, name }
  }
  async function firstProject(customerId: string) {
    const { data } = await client.from('projects').select('id').eq('customer_id', customerId)
    return (data as { id: string }[])[0].id
  }

  A = await customer(`T-ZA${run}`, `Zeiten QA A ${run}`)
  B = await customer(`T-ZB${run}`, `Zeiten QA B ${run}`)
  C = await customer(`T-ZC${run}`, LONG_WORD)
  pa = await firstProject(A.id)
  pb = await firstProject(B.id)
  pc = await firstProject(C.id)
  const zweit = await client.from('projects').insert({ customer_id: A.id, name: 'Zweit' }).select('id').single()
  expect(zweit.error).toBeNull()
  pz = (zweit.data as { id: string }).id

  E.e1 = await addEntry({
    project: pa, date: '2025-03-12', minutes: 90, billable: 60, start: '08:00', end: '09:30',
    description: `Konzept <img src=x onerror=alert(1)> ' OR 1=1 --`,
  })
  E.e2 = await addEntry({ project: pa, date: '2025-03-12', minutes: 30 })
  E.e3 = await addEntry({ project: pa, date: '2025-03-11', minutes: 60, start: '09:00', end: '10:00', description: 'Überlapp eins' })
  E.e4 = await addEntry({ project: pa, date: '2025-03-11', minutes: 60, start: '09:30', end: '10:30', description: 'Überlapp zwei' })
  E.e5 = await addEntry({ project: pa, date: '2025-03-10', minutes: 120, start: '22:00', end: '24:00', description: 'Nachtschicht' })
  E.e6 = await addEntry({ project: pz, date: '2025-03-09', minutes: 45, description: 'Zweitprojekt' })
  E.b1 = await addEntry({ project: pb, date: '2025-03-10', minutes: 120, description: 'B Arbeit' })
  E.feb = await addEntry({ project: pa, date: '2025-02-28', minutes: 60, description: 'Februar' })
  E.cLong = await addEntry({ project: pc, date: '2025-03-08', minutes: 30, description: `L${'o'.repeat(120)}ng` })
  E.cEdit = await addEntry({ project: pc, date: '2025-03-08', minutes: 15, description: 'Archiv bearbeiten' })

  // Archiviertes Projekt (nur dieses) und archivierter Kunde C
  const archived = await client
    .from('projects')
    .update({ archived: true, archived_at: new Date().toISOString(), archived_with_customer: false })
    .eq('id', pz)
  expect(archived.error).toBeNull()
  expect((await client.rpc('archive_customer', { p_id: C.id })).error).toBeNull()
})

test.afterAll(async () => {
  if (!client) return
  for (const project of [pa, pz, pb, pc].filter(Boolean)) {
    await client.from('time_entries').delete().eq('project_id', project)
  }
  for (const customer of [A, B].filter(Boolean)) {
    await client.rpc('archive_customer', { p_id: customer.id })
  }
})

// ----- Navigation und Seitenschutz -----

test.describe('Navigation und Seitenschutz', () => {
  test('AC: «Zeiten» steht zwischen Start und Kunden, ist auf /zeiten aktiv, Seitentitel stimmt', async ({ page }) => {
    await page.goto('/')
    const nav = page.locator('div.bg-sidebar').getByRole('navigation', { name: 'Hauptnavigation' })
    expect((await nav.getByRole('link').allInnerTexts()).map((text) => text.trim())).toEqual(['Start', 'Zeiten', 'Kunden', 'Status'])
    await nav.getByRole('link', { name: 'Zeiten' }).click()
    await expect(page).toHaveURL(/\/zeiten$/)
    await expect(nav.getByRole('link', { name: 'Zeiten' })).toHaveAttribute('aria-current', 'page')
    await expect(nav.getByRole('link', { name: 'Start' })).not.toHaveAttribute('aria-current', 'page')
    await expect(page).toHaveTitle('Zeiten · Time Tracker Light')
  })

  test('AC: Tab-Leiste am Handy hat vier Einträge in derselben Reihenfolge, bei 320 px nichts abgeschnitten', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 640 })
    await page.goto('/zeiten')
    const tabBar = page.getByRole('navigation', { name: 'Hauptnavigation' })
    expect((await tabBar.getByRole('link').allInnerTexts()).map((text) => text.trim())).toEqual(['Start', 'Zeiten', 'Kunden', 'Status'])
    await expect(tabBar.getByRole('link', { name: 'Zeiten' })).toHaveAttribute('aria-current', 'page')
    for (const el of await tabBar.locator('span').all()) {
      expect(await el.evaluate((node) => node.scrollWidth <= node.clientWidth)).toBe(true)
    }
    for (const link of await tabBar.getByRole('link').all()) {
      expect((await link.boundingBox())!.height).toBeGreaterThanOrEqual(43.5)
    }
  })

  test.describe('ohne Anmeldung', () => {
    test.use({ storageState: NO_LOGIN })
    test('AC: /zeiten führt zur Anmeldung und zeigt keine Daten', async ({ page }) => {
      await page.goto('/zeiten')
      await expect(page).toHaveURL(/\/login/)
      await expect(page.getByRole('heading', { name: 'Zeiten', exact: true })).toHaveCount(0)
      await expect(page.locator('li[data-entry-id]')).toHaveCount(0)
    })
  })
})

// ----- Liste und Monatsnavigation -----

test.describe('Liste und Monatsnavigation', () => {
  test('AC: ohne Adresse der aktuelle Monat (Zürcher Uhr), «Nächster Monat» deaktiviert', async ({ page }) => {
    await page.goto('/zeiten')
    await expect(page.locator('h2[aria-live="polite"]')).toHaveText(monthLabel(currentMonth()))
    await expect(page.getByRole('button', { name: 'Nächster Monat' })).toBeDisabled()
    await expect(page.getByRole('button', { name: 'Vorheriger Monat' })).toBeEnabled()
  })

  test('AC: ungültiger oder zukünftiger Monat führt zum aktuellen Monat', async ({ page }) => {
    for (const bad of ['2099-01', 'abc', '2025-13', shiftMonth(currentMonth(), 1)]) {
      await page.goto(`/zeiten?monat=${bad}`)
      await expect(page.locator('h2[aria-live="polite"]'), bad).toHaveText(monthLabel(currentMonth()))
      await expect(page.getByRole('button', { name: 'Nächster Monat' }), bad).toBeDisabled()
    }
  })

  test('AC: Blättern schreibt den Monat in die Adresse, Zurück-Taste und Neuladen führen zum selben Monat', async ({ page }) => {
    await page.goto('/zeiten')
    await page.getByRole('button', { name: 'Vorheriger Monat' }).click()
    const previous = shiftMonth(currentMonth(), -1)
    await expect(page).toHaveURL(new RegExp(`monat=${previous}`))
    await expect(page.locator('h2[aria-live="polite"]')).toHaveText(monthLabel(previous))
    await expect(page.getByRole('button', { name: 'Nächster Monat' })).toBeEnabled()
    await page.reload()
    await expect(page.locator('h2[aria-live="polite"]')).toHaveText(monthLabel(previous))
    await page.goBack()
    await expect(page.locator('h2[aria-live="polite"]')).toHaveText(monthLabel(currentMonth()))
    await page.goForward()
    await expect(page.locator('h2[aria-live="polite"]')).toHaveText(monthLabel(previous))
  })

  test('AC: Einträge nach Tag gruppiert (neuester zuerst) mit Tagessummen, Monatssumme, Inhalt und «Keine Beschreibung»', async ({ page }) => {
    await openList(page, listUrl(A))
    const days = (await page.getByRole('heading', { level: 3 }).allInnerTexts()).map((text) => text.trim())
    expect(days.map((day) => day.match(/(\d+)\. März 2025/)?.[1])).toEqual(['12', '11', '10', '9'])
    await expect(page.locator('h2[aria-live="polite"]')).toHaveText('März 2025')

    // Monatssumme folgt dem Kundenfilter: 90+30+60+60+120+45 = 6:45 gearbeitet, 60+30+60+60+120+45 = 6:15 verrechenbar
    expect(await monthSums(page)).toEqual(['6:45', '6:15'])
    const day12 = page.getByRole('region', { name: /12\. März 2025/ })
    await expect(day12).toContainText('2:00 gearbeitet · 1:30 verrechenbar')
    await expect(page.getByRole('region', { name: /11\. März 2025/ })).toContainText('2:00 gearbeitet · 2:00 verrechenbar')

    // Einträge eines Tages nach Startzeit, Einträge ohne Uhrzeit danach
    const items12 = await day12.locator('li[data-entry-id]').allInnerTexts()
    expect(items12[0]).toContain('08:00–09:30')
    expect(items12[1]).toContain('Keine Beschreibung')
    // Inhalt eines Eintrags: Kürzel, Projekt, Dauer, verrechenbar, Uhrzeiten (auch 24:00), Aktionen
    expect(items12[0]).toContain(`${A.code} · Allgemein`)
    expect(items12[0]).toContain('1:30')
    expect(items12[0]).toContain('verrechenbar 1:00')
    await expect(page.getByRole('region', { name: /10\. März 2025/ })).toContainText('22:00–24:00')
    await expect(page.getByText('Keine Beschreibung')).toHaveCount(1)
    await expect(page.getByRole('button', { name: label('2025-03-12', A, 'Allgemein', '1:30', 'bearbeiten') })).toBeVisible()
    await expect(page.getByRole('button', { name: label('2025-03-12', A, 'Allgemein', '1:30', 'löschen') })).toBeVisible()
  })

  test('AC: Leerzustand mit «Zeit erfassen»; Ladefehler mit «Erneut versuchen»', async ({ page }) => {
    // Weit zurückliegender Monat ohne Filter: sicher leer
    await page.goto('/zeiten?monat=2001-01')
    await expect(page.getByRole('heading', { name: /Keine Einträge im Januar 2001/ })).toBeVisible()
    await expect(page.getByRole('main').getByRole('button', { name: 'Zeit erfassen' }).last()).toBeVisible()

    let fail = true
    await page.route('**/rest/v1/time_entries*', (route) => (fail ? route.abort() : route.continue()))
    await page.goto(listUrl(A))
    await expect(page.locator('#main-content').getByRole('alert')).toContainText('konnten nicht geladen werden', { timeout: 20000 })
    await expect(rows(page)).toHaveCount(0)
    fail = false
    await page.getByRole('button', { name: 'Erneut versuchen' }).click()
    await expect(rows(page).first()).toBeVisible()
  })

  test('AC: beim Monatswechsel bleiben keine Daten des alten Monats stehen', async ({ page }) => {
    await openList(page, listUrl(A))
    await expect(page.getByText('Nachtschicht')).toBeVisible()
    await page.getByRole('button', { name: 'Vorheriger Monat' }).click()
    await expect(page.locator('h2[aria-live="polite"]')).toHaveText('Februar 2025')
    await expect(page.getByText('Februar', { exact: true })).toBeVisible()
    await expect(page.getByText('Nachtschicht')).toHaveCount(0)
  })

  test('Edge: mehr als 1000 Einträge: Hinweis, nur 1000 angezeigt, Summe unvollständig', async ({ page }) => {
    // BUG-1 (behoben): Supabase liefert höchstens 1000 Zeilen pro Antwort; die Datenschicht zählt daher mit (count: 'exact').
    test.setTimeout(120000)
    const batch = (count: number) =>
      Array.from({ length: count }, () => ({
        project_id: pa, entry_date: '2024-01-15', duration_minutes: 1, billable_minutes: 0, description: null,
      }))
    expect((await client.from('time_entries').insert(batch(500))).error).toBeNull()
    expect((await client.from('time_entries').insert(batch(501))).error).toBeNull()
    try {
      await page.goto(`/zeiten?monat=2024-01&kunde=${A.id}`)
      await expect(rows(page)).toHaveCount(1000, { timeout: 30000 })
      await expect(page.getByText(/Es werden nicht alle Einträge angezeigt, bitte Filter nutzen/)).toBeVisible({ timeout: 3000 })
      expect(await monthSums(page)).toEqual(['16:40', '0:00'])
    } finally {
      await client.from('time_entries').delete().eq('project_id', pa).gte('entry_date', '2024-01-01').lt('entry_date', '2024-02-01')
    }
  })
})

// ----- Filter -----

test.describe('Filter', () => {
  test('AC: Kundenfilter nennt alle Kunden (auch archivierte), «ohne Beschreibung» und Monatswechsel behalten den Filter', async ({ page }) => {
    await openList(page, '/zeiten?monat=2025-03')
    await page.getByLabel('Kunde').click()
    await expect(page.getByRole('option', { name: 'Alle Kunden' })).toBeVisible()
    await expect(page.getByRole('option', { name: new RegExp(`${B.code}`) })).toBeVisible()
    await expect(page.getByRole('option', { name: new RegExp(`${C.code}.*\\(archiviert\\)`) })).toBeVisible()
    await page.getByRole('option', { name: new RegExp(`${A.code}`) }).click()
    await expect(page).toHaveURL(new RegExp(`kunde=${A.id}`))
    await expect(page.getByText('B Arbeit')).toHaveCount(0)
    await expect(page.getByText('Nachtschicht')).toBeVisible()
    expect(await monthSums(page)).toEqual(['6:45', '6:15'])

    await page.getByRole('switch', { name: 'Nur ohne Beschreibung' }).click()
    await expect(page).toHaveURL(/ohne-beschreibung=1/)
    await expect(rows(page)).toHaveCount(1)
    await expect(page.getByText('Keine Beschreibung')).toBeVisible()
    expect(await monthSums(page)).toEqual(['0:30', '0:30'])

    // Monatswechsel und Neuladen: Filter bleibt
    await page.getByRole('button', { name: 'Vorheriger Monat' }).click()
    await expect(page).toHaveURL(/monat=2025-02/)
    await expect(page).toHaveURL(new RegExp(`kunde=${A.id}`))
    await expect(page).toHaveURL(/ohne-beschreibung=1/)
    await page.reload()
    await expect(page.getByRole('switch', { name: 'Nur ohne Beschreibung' })).toBeChecked()
    await expect(page.getByLabel('Kunde')).toContainText(A.code)

    // Filter ohne Treffer und Zurücksetzen
    await expect(page.getByRole('heading', { name: 'Keine Einträge für diesen Filter' })).toBeVisible()
    await page.getByRole('main').getByRole('button', { name: 'Filter zurücksetzen' }).last().click()
    await expect(page).not.toHaveURL(/kunde=/)
    await expect(page).not.toHaveURL(/ohne-beschreibung/)
    await expect(page.getByRole('switch', { name: 'Nur ohne Beschreibung' })).not.toBeChecked()
  })

  test('AC: Kundenfilter und «ohne Beschreibung» kombiniert, Kunde B zeigt nur seine Einträge', async ({ page }) => {
    await openList(page, listUrl(B))
    await expect(rows(page)).toHaveCount(1)
    await expect(page.getByText('B Arbeit')).toBeVisible()
    await page.getByRole('switch', { name: 'Nur ohne Beschreibung' }).click()
    await expect(page.getByRole('heading', { name: 'Keine Einträge für diesen Filter' })).toBeVisible()
  })

  test('Edge: ungültige Kunden-Kennung in der Adresse wird ignoriert (kein Fehler)', async ({ page }) => {
    await page.goto("/zeiten?monat=2025-03&kunde=1';drop table")
    await expect(page.locator('#main-content').getByRole('alert')).toHaveCount(0)
    await expect(page.getByLabel('Kunde')).toContainText('Alle Kunden')
  })
})

// ----- Bearbeiten -----

test.describe('Bearbeiten', () => {
  test('AC: Formular vorausgefüllt, Fokus in der leeren Beschreibung, Speichern ändert Liste und Summen, Anlegezeitpunkt bleibt', async ({ page }) => {
    await openList(page, listUrl(A))
    await openEdit(page, label('2025-03-12', A, 'Allgemein', '0:30', 'bearbeiten'))
    const form = dialog(page)
    await expect(form.getByRole('heading', { name: 'Zeit bearbeiten' })).toBeVisible()
    await expect(form.getByLabel('Datum')).toHaveValue('2025-03-12')
    await expect(form.getByLabel('Kunde')).toContainText(A.code)
    await expect(form.getByLabel('Projekt')).toContainText('Allgemein')
    await expect(form.getByRole('tab', { name: 'Nur Dauer' })).toHaveAttribute('aria-selected', 'true')
    await expect(form.getByLabel('Dauer', { exact: true })).toHaveValue('0:30')
    await expect(form.getByLabel('Verrechenbar')).toHaveValue('0:30')
    await expect(form.getByLabel('Beschreibung (optional)')).toBeFocused()

    await form.getByLabel('Dauer', { exact: true }).fill('0:45')
    // Die verrechenbare Dauer folgt beim Bearbeiten nicht von selbst
    await expect(form.getByLabel('Verrechenbar')).toHaveValue('0:30')
    await form.getByLabel('Beschreibung (optional)').fill('Nachgetragen')
    await form.getByRole('button', { name: 'Speichern' }).click()

    await expect(dialog(page)).toHaveCount(0)
    await expect(toast(page, 'Änderung gespeichert.')).toBeVisible()
    await expect(page.getByText('Nachgetragen')).toBeVisible()
    await expect(page.getByText('Keine Beschreibung')).toHaveCount(0)
    await expect(page.getByRole('region', { name: /12\. März 2025/ })).toContainText('2:15 gearbeitet · 1:30 verrechenbar')
    const saved = await dbEntry(E.e2.id)
    expect(saved).toMatchObject({ duration_minutes: 45, billable_minutes: 30, description: 'Nachgetragen' })
    expect(saved!.created_at).toBe(E.e2.created_at)
  })

  test('AC: gleiche Prüfregeln, Fehler am Feld, nichts gespeichert; Überschneidung ohne den eigenen Eintrag; Abbrechen verwirft', async ({ page }) => {
    await openList(page, listUrl(A))
    const trigger = page.getByRole('button', { name: label('2025-03-11', A, 'Allgemein', '1:00', 'bearbeiten') }).first()
    await trigger.click()
    const form = dialog(page)
    await expect(form.getByLabel('Datum')).toBeVisible()
    await expect(form.getByRole('tab', { name: 'Von–bis' })).toHaveAttribute('aria-selected', 'true')
    await expect(form.getByLabel('Von', { exact: true })).toHaveValue('09:00')
    await expect(form.getByLabel('Bis', { exact: true })).toHaveValue('10:00')
    // Hinweis nennt nur den anderen Eintrag (09:30–10:30), nicht den bearbeiteten selbst
    await expect(form.getByText(/Überschneidung mit/)).toContainText('09:30–10:30')
    await expect(form.getByText(/Überschneidung mit/)).not.toContainText('09:00–10:00')

    await form.getByRole('tab', { name: 'Nur Dauer' }).click()
    await form.getByLabel('Dauer', { exact: true }).fill('0')
    await form.getByRole('button', { name: 'Speichern' }).click()
    await expect(form.getByText('Die Dauer muss mindestens 1 Minute sein.')).toBeVisible()
    await form.getByLabel('Dauer', { exact: true }).fill('1:00')
    await form.getByLabel('Verrechenbar').fill('5:00')
    await form.getByLabel('Datum').fill(tomorrow())
    await form.getByLabel('Beschreibung (optional)').fill('x'.repeat(1001))
    await form.getByRole('button', { name: 'Speichern' }).click()
    await expect(form.getByText(/Die verrechenbare Dauer darf nicht grösser/)).toBeVisible()
    await expect(form.getByText('Das Datum darf nicht in der Zukunft liegen.')).toBeVisible()
    await expect(form.getByText(/höchstens 1000 Zeichen/)).toBeVisible()
    await expect(form).toBeVisible()
    expect(await dbEntry(E.e3.id)).toMatchObject({ duration_minutes: 60, entry_date: '2025-03-11', description: 'Überlapp eins' })

    await form.getByRole('button', { name: 'Abbrechen' }).click()
    await expect(dialog(page)).toHaveCount(0)
    expect(await dbEntry(E.e3.id)).toMatchObject({ duration_minutes: 60, description: 'Überlapp eins' })
  })

  test('AC: Eintrag bis 24:00 lässt sich speichern, ohne dass das Ende ändert; Änderung des Endes prüft die verrechenbare Dauer', async ({ page }) => {
    await openList(page, listUrl(A))
    await openEdit(page, label('2025-03-10', A, 'Allgemein', '2:00', 'bearbeiten'))
    const form = dialog(page)
    await expect(form.getByRole('switch', { name: 'Bis Mitternacht (24:00)' })).toBeChecked()
    await expect(form.getByLabel('Bis', { exact: true })).toBeDisabled()
    await expect(form.getByText('Dauer: 2:00')).toBeVisible()
    await expect(form.getByText(/Überschneidung mit/)).toHaveCount(0)
    await form.getByLabel('Beschreibung (optional)').fill('Nachtschicht korrigiert')
    await form.getByRole('button', { name: 'Speichern' }).click()
    await expect(dialog(page)).toHaveCount(0)
    await expect(page.getByText('Nachtschicht korrigiert')).toBeVisible()
    await expect(page.getByRole('region', { name: /10\. März 2025/ })).toContainText('22:00–24:00')
    expect(await dbEntry(E.e5.id)).toMatchObject({ start_time: '22:00:00', duration_minutes: 120, description: 'Nachtschicht korrigiert' })
    expect(String((await dbEntry(E.e5.id))!.end_time)).toMatch(/^24:00/)

    // Schalter aus, Ende 23:30: Dauer 1:30, die verrechenbare Dauer (2:00) wäre zu gross
    await openEdit(page, label('2025-03-10', A, 'Allgemein', '2:00', 'bearbeiten'))
    await form.getByRole('switch', { name: 'Bis Mitternacht (24:00)' }).click()
    await form.getByLabel('Bis', { exact: true }).fill('23:30')
    await expect(form.getByText('Dauer: 1:30')).toBeVisible()
    await form.getByRole('button', { name: 'Speichern' }).click()
    await expect(form.getByText(/Die verrechenbare Dauer darf nicht grösser/)).toBeVisible()
    await form.getByRole('button', { name: 'Abbrechen' }).click()
    expect(String((await dbEntry(E.e5.id))!.end_time)).toMatch(/^24:00/)
  })

  test('AC: Datum in einen anderen Monat verschieben: Eintrag verschwindet, Bestätigung nennt das neue Datum, Fokus nicht verloren', async ({ page }) => {
    await openList(page, listUrl(A))
    await openEdit(page, label('2025-03-11', A, 'Allgemein', '1:00', 'bearbeiten'), 1)
    const form = dialog(page)
    await expect(form.getByLabel('Beschreibung (optional)')).toHaveValue('Überlapp zwei')
    await form.getByLabel('Datum').fill('2025-02-20')
    await form.getByRole('button', { name: 'Speichern' }).click()
    await expect(dialog(page)).toHaveCount(0)
    await expect(toast(page, 'Gespeichert am 20.02.2025.')).toBeVisible()
    await expect(page.getByText('Überlapp zwei')).toHaveCount(0)
    expect(await dbEntry(E.e4.id)).toMatchObject({ entry_date: '2025-02-20' })
    // Der Fokus liegt auf einem Element der Seite, nicht verloren auf dem Dokument
    await expect.poll(() => page.evaluate(() => document.activeElement === document.body)).toBe(false)
  })

  test('AC: archiviertes Projekt und archivierter Kunde: Wert bleibt sichtbar und speicherbar, Verschieben nur auf aktive Ziele', async ({ page }) => {
    await openList(page, listUrl(A))
    await openEdit(page, label('2025-03-09', A, 'Zweit', '0:45', 'bearbeiten'))
    const form = dialog(page)
    await expect(form.getByLabel('Projekt')).toContainText('Zweit (archiviert)')
    await form.getByLabel('Projekt').click()
    await expect(page.getByRole('option', { name: 'Allgemein' })).toBeVisible()
    await expect(page.getByRole('option', { name: 'Zweit (archiviert)' })).toBeVisible()
    await page.keyboard.press('Escape')
    await form.getByLabel('Beschreibung (optional)').fill('Zweit korrigiert')
    await form.getByRole('button', { name: 'Speichern' }).click()
    await expect(dialog(page)).toHaveCount(0)
    await expect(page.getByText('Zweit korrigiert')).toBeVisible()
    expect(await dbEntry(E.e6.id)).toMatchObject({ project_id: pz, description: 'Zweit korrigiert' })

    // Archivierter Kunde C: Eintrag bleibt sichtbar und bearbeitbar
    await openList(page, listUrl(C))
    await openEdit(page, label('2025-03-08', C, 'Allgemein', '0:15', 'bearbeiten'))
    await expect(form.getByLabel('Kunde')).toContainText('(archiviert)')
    await expect(form.getByLabel('Projekt')).toContainText('Allgemein (archiviert)')
    await form.getByLabel('Beschreibung (optional)').fill('Archiv korrigiert')
    await form.getByRole('button', { name: 'Speichern' }).click()
    await expect(dialog(page)).toHaveCount(0)
    expect(await dbEntry(E.cEdit.id)).toMatchObject({ project_id: pc, description: 'Archiv korrigiert' })
  })

  test('Edge: Eintrag auf einem anderen Gerät gelöscht, während das Formular offen ist: Hinweis, Eingaben bleiben, Liste lädt neu', async ({ page }) => {
    const gone = await addEntry({ project: pa, date: '2025-03-07', minutes: 20, description: 'Konkurrent' })
    await openList(page, listUrl(A))
    await openEdit(page, label('2025-03-07', A, 'Allgemein', '0:20', 'bearbeiten'))
    const form = dialog(page)
    await client.from('time_entries').delete().eq('id', gone.id)
    await form.getByLabel('Beschreibung (optional)').fill('Neu geschrieben')
    await form.getByRole('button', { name: 'Speichern' }).click()
    await expect(form.getByRole('alert')).toContainText('Dieser Eintrag existiert nicht mehr')
    await expect(form.getByLabel('Beschreibung (optional)')).toHaveValue('Neu geschrieben')
    await form.getByRole('button', { name: 'Abbrechen' }).click()
    await expect(page.getByText('Konkurrent')).toHaveCount(0)
  })

  test('Edge: Sitzung abgelaufen beim Speichern: Hinweis, Eingabe bleibt, nichts gespeichert', async ({ page, context }) => {
    await openList(page, listUrl(A))
    await openEdit(page, label('2025-03-12', A, 'Allgemein', '1:30', 'bearbeiten'))
    const form = dialog(page)
    await form.getByLabel('Beschreibung (optional)').fill('Nie gespeichert')
    await context.clearCookies()
    await form.getByRole('button', { name: 'Speichern' }).click()
    await expect(form.getByRole('alert')).toContainText(/Anmeldung|nicht geklappt/)
    await expect(form.getByLabel('Beschreibung (optional)')).toHaveValue('Nie gespeichert')
    expect(await dbEntry(E.e1.id)).toMatchObject({ description: `Konzept <img src=x onerror=alert(1)> ' OR 1=1 --` })
  })

  // Beobachtung: Zwei künstliche Klicks im selben Takt (gleiche Millisekunde) senden zweimal, ein echter Doppelklick nicht.
  test('Edge: Doppelklick auf «Speichern» speichert nur einmal, der Knopf zeigt «Wird gespeichert …»', async ({ page }) => {
    const updates: string[] = []
    await page.route('**/rest/v1/time_entries*', async (route) => {
      if (route.request().method() === 'PATCH') {
        updates.push(route.request().url())
        await new Promise((r) => setTimeout(r, 600))
      }
      await route.continue()
    })
    await openList(page, listUrl(A))
    await openEdit(page, label('2025-03-12', A, 'Allgemein', '1:30', 'bearbeiten'))
    await dialog(page).getByRole('button', { name: 'Speichern' }).dblclick()
    await expect(dialog(page)).toHaveCount(0)
    expect(updates).toHaveLength(1)
  })

  test('AC: Tastatur: Enter öffnet das Formular, Tab bleibt im Dialog, Escape schliesst und gibt den Fokus zurück', async ({ page }) => {
    await openList(page, listUrl(A))
    const trigger = page.getByRole('button', { name: label('2025-03-12', A, 'Allgemein', '1:30', 'bearbeiten') })
    await trigger.focus()
    await page.keyboard.press('Enter')
    await expect(dialog(page)).toBeVisible()
    for (let step = 0; step < 14; step++) {
      await page.keyboard.press('Tab')
      expect(await page.evaluate(() => Boolean(document.activeElement?.closest('[role="dialog"]'))), `Tab ${step}`).toBe(true)
    }
    await page.keyboard.press('Escape')
    await expect(dialog(page)).toHaveCount(0)
  })

  test('AC: Fokus kehrt nach Abbrechen, Escape und Speichern zum auslösenden Knopf zurück (Bearbeiten und Löschen)', async ({ page }) => {
    // BUG-2 (behoben): use-entry-actions merkt sich den Auslöser beim Öffnen und gibt den Fokus dorthin zurück.
    await openList(page, listUrl(A))
    const edit = page.getByRole('button', { name: label('2025-03-12', A, 'Allgemein', '1:30', 'bearbeiten') })
    await edit.click()
    await dialog(page).getByRole('button', { name: 'Abbrechen' }).click()
    await expect(dialog(page)).toHaveCount(0)
    await expect(edit).toBeFocused({ timeout: 3000 })

    await edit.click()
    await page.keyboard.press('Escape')
    await expect(dialog(page)).toHaveCount(0)
    await expect(edit).toBeFocused({ timeout: 3000 })

    const remove = page.getByRole('button', { name: label('2025-03-12', A, 'Allgemein', '1:30', 'löschen') })
    await remove.click()
    await page.keyboard.press('Escape')
    await expect(page.getByRole('alertdialog')).toHaveCount(0)
    await expect(remove).toBeFocused({ timeout: 3000 })
  })
})

// ----- Löschen -----

test.describe('Löschen', () => {
  test('AC: Rückfrage mit Angaben, Fokus auf «Abbrechen», Escape lässt alles unverändert; Bestätigen löscht genau einen Eintrag, einmal, Fokus beim Nachbarn', async ({ page }) => {
    const victim = await addEntry({ project: pa, date: '2025-03-06', minutes: 25, description: 'Zu löschen' })
    const neighbour = await addEntry({ project: pa, date: '2025-03-05', minutes: 15, description: 'Nachbar' })
    let deletes = 0
    await page.route('**/rest/v1/time_entries*', async (route) => {
      if (route.request().method() === 'DELETE') {
        deletes++
        await new Promise((r) => setTimeout(r, 500))
      }
      await route.continue()
    })
    await openList(page, listUrl(A))
    const before = minutes((await monthSums(page))[0])
    const trigger = page.getByRole('button', { name: label('2025-03-06', A, 'Allgemein', '0:25', 'löschen') })
    await trigger.click()
    const ask = page.getByRole('alertdialog')
    await expect(ask).toContainText('Eintrag löschen?')
    for (const part of [A.code, 'Allgemein', '06.03.2025', '0:25', 'Zu löschen', 'endgültig']) await expect(ask).toContainText(part)
    await expect(ask.getByRole('button', { name: 'Abbrechen' })).toBeFocused()

    // Escape: alles unverändert, Fokus zurück beim Auslöser
    await page.keyboard.press('Escape')
    await expect(ask).toHaveCount(0)
    expect(await dbEntry(victim.id)).not.toBeNull()

    await trigger.click()
    const confirm = page.getByRole('alertdialog').getByRole('button', { name: 'Löschen', exact: true })
    await confirm.dblclick()
    await expect(toast(page, 'Eintrag gelöscht.')).toBeVisible()
    await expect(page.getByText('Zu löschen')).toHaveCount(0)
    // Letzter Eintrag des Tages: die Tagesgruppe verschwindet; Summe sinkt um 25 Minuten
    await expect(page.getByRole('region', { name: /6\. März 2025/ })).toHaveCount(0)
    expect(minutes((await monthSums(page))[0])).toBe(before - 25)
    expect(deletes).toBe(1)
    expect(await dbEntry(victim.id)).toBeNull()
    expect(await dbEntry(neighbour.id)).not.toBeNull()
    await expect(page.locator('li[data-entry-id]', { hasText: 'Nachbar' }).getByRole('button').first()).toBeFocused()
  })

  test('Edge: Fehler beim Löschen (Netzwerk): Meldung, Eintrag bleibt, Rückfrage bleibt offen', async ({ page }) => {
    await openList(page, listUrl(A))
    let fail = true
    await page.route('**/rest/v1/time_entries*', (route) =>
      fail && route.request().method() === 'DELETE' ? route.abort() : route.continue()
    )
    await page.getByRole('button', { name: label('2025-03-05', A, 'Allgemein', '0:15', 'löschen') }).click()
    await page.getByRole('alertdialog').getByRole('button', { name: 'Löschen', exact: true }).click()
    await expect(toast(page, /nicht erreichbar|nicht geklappt/)).toBeVisible()
    await expect(page.getByRole('alertdialog')).toBeVisible()
    await expect(page.getByRole('alertdialog').getByRole('button', { name: 'Löschen', exact: true })).toBeEnabled()
    await expect(page.locator('li[data-entry-id]', { hasText: 'Nachbar' })).toBeVisible()
    fail = false
    await page.getByRole('alertdialog').getByRole('button', { name: 'Abbrechen' }).click()
  })

  test('Edge: Eintrag schon auf einem anderen Gerät gelöscht: «existiert nicht mehr», Liste lädt neu', async ({ page }) => {
    const gone = await addEntry({ project: pa, date: '2025-03-04', minutes: 10, description: 'Weg' })
    await openList(page, listUrl(A))
    await page.getByRole('button', { name: label('2025-03-04', A, 'Allgemein', '0:10', 'löschen') }).click()
    await client.from('time_entries').delete().eq('id', gone.id)
    await page.getByRole('alertdialog').getByRole('button', { name: 'Löschen', exact: true }).click()
    await expect(toast(page, /existiert nicht mehr/)).toBeVisible()
    await expect(page.getByText('Weg', { exact: true })).toHaveCount(0)
    await expect(page.getByRole('alertdialog')).toHaveCount(0)
  })
})

// ----- Startseite «Heute» und «Zeit erfassen» -----

test.describe('Startseite «Heute» und «Zeit erfassen»', () => {
  test('AC: «Heute» hat Bearbeiten und Löschen je Eintrag und den Link «Alle Zeiten»', async ({ page }) => {
    await addEntry({ project: pa, date: today(), minutes: 20, description: `Heute Test ${run}` })
    await page.goto('/')
    const row = page.locator('li[data-entry-id]', { hasText: `Heute Test ${run}` })
    await expect(row).toBeVisible()
    await expect(row.getByRole('button', { name: /bearbeiten$/ })).toBeVisible()
    await expect(row.getByRole('button', { name: /löschen$/ })).toBeVisible()

    // Der Link steht unter der Liste und erscheint nur, solange heute Einträge existieren: vor dem Löschen prüfen
    await expect(page.getByRole('link', { name: 'Alle Zeiten' })).toHaveAttribute('href', '/zeiten')
    await page.getByRole('link', { name: 'Alle Zeiten' }).click()
    await expect(page).toHaveURL(/\/zeiten$/)
    await page.goto('/')
    await expect(row).toBeVisible()

    await row.getByRole('button', { name: /bearbeiten$/ }).click()
    await dialog(page).getByLabel('Beschreibung (optional)').fill(`Heute korrigiert ${run}`)
    await dialog(page).getByRole('button', { name: 'Speichern' }).click()
    await expect(dialog(page)).toHaveCount(0)
    await expect(page.locator('li[data-entry-id]', { hasText: `Heute korrigiert ${run}` })).toBeVisible()

    await page.locator('li[data-entry-id]', { hasText: `Heute korrigiert ${run}` }).getByRole('button', { name: /löschen$/ }).click()
    await page.getByRole('alertdialog').getByRole('button', { name: 'Löschen', exact: true }).click()
    await expect(toast(page, 'Eintrag gelöscht.')).toBeVisible()
    await expect(page.getByText(`Heute korrigiert ${run}`)).toHaveCount(0)
  })

  test('AC: «Zeit erfassen» auf /zeiten: Formular wie auf der Startseite, neuer Eintrag erscheint in der Liste', async ({ page }) => {
    await page.goto('/zeiten')
    await page.getByRole('button', { name: 'Zeit erfassen' }).first().click()
    const form = dialog(page)
    await expect(form.getByRole('heading', { name: 'Zeit erfassen' })).toBeVisible()
    await expect(form.getByLabel('Datum')).toHaveValue(today())
    await form.getByLabel('Kunde').click()
    await page.getByRole('option', { name: new RegExp(A.code) }).click()
    await form.getByLabel('Dauer', { exact: true }).fill('0:15')
    await form.getByLabel('Beschreibung (optional)').fill(`Erfasst auf Zeiten ${run}`)
    await form.getByRole('button', { name: 'Speichern' }).click()
    await expect(dialog(page)).toHaveCount(0)
    await expect(toast(page, 'Eintrag gespeichert.')).toBeVisible()
    await expect(page.getByText(`Erfasst auf Zeiten ${run}`)).toBeVisible()
  })

  test('AC: «Bis Mitternacht (24:00)» beim Erfassen speichert das Ende 24:00', async ({ page }) => {
    await page.goto('/zeiten')
    await page.getByRole('button', { name: 'Zeit erfassen' }).first().click()
    const form = dialog(page)
    await form.getByLabel('Kunde').click()
    await page.getByRole('option', { name: new RegExp(A.code) }).click()
    await form.getByLabel('Datum').fill('2025-03-03')
    await form.getByRole('tab', { name: 'Von–bis' }).click()
    await form.getByLabel('Von', { exact: true }).fill('23:00')
    await form.getByRole('switch', { name: 'Bis Mitternacht (24:00)' }).click()
    await expect(form.getByText('Dauer: 1:00')).toBeVisible()
    await form.getByLabel('Beschreibung (optional)').fill(`Mitternacht ${run}`)
    await form.getByRole('button', { name: 'Speichern' }).click()
    await expect(dialog(page)).toHaveCount(0)
    const { data } = await client.from('time_entries').select('*').eq('description', `Mitternacht ${run}`).single()
    expect(data).toMatchObject({ start_time: '23:00:00', duration_minutes: 60, billable_minutes: 60, entry_date: '2025-03-03' })
    expect(String(data!.end_time)).toMatch(/^24:00/)
  })
})

// ----- Layout, Zugänglichkeit, Sicherheit -----

test.describe('Layout, Zugänglichkeit und Sicherheit', () => {
  for (const width of [320, 375, 768, 1440]) {
    test(`AC: Layout bei ${width} px: kein horizontales Scrollen, alle Bedienelemente mindestens 44 px, auch Formular und Rückfrage`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 })
      // Mit PW_SHOTS=1 entstehen Bilder zur Sichtprüfung (test-results/shots)
      const shot = (name: string) =>
        process.env.PW_SHOTS ? page.screenshot({ path: `test-results/shots/zeiten-${width}-${name}.png`, fullPage: name === 'liste' }) : undefined
      await openList(page, listUrl(A))
      expect(await noHorizontalScroll(page), 'Liste').toBe(true)
      expect(await smallTargets(page), 'Liste').toEqual([])
      await shot('liste')

      await openEdit(page, label('2025-03-12', A, 'Allgemein', '1:30', 'bearbeiten'))
      expect(await noHorizontalScroll(page), 'Formular').toBe(true)
      expect(await smallTargets(page), 'Formular').toEqual([])
      await shot('formular')
      await page.keyboard.press('Escape')

      await page.getByRole('button', { name: label('2025-03-12', A, 'Allgemein', '1:30', 'löschen') }).click()
      await expect(page.getByRole('alertdialog')).toBeVisible()
      await shot('rueckfrage')
      expect(await noHorizontalScroll(page), 'Rückfrage').toBe(true)
      expect(await smallTargets(page), 'Rückfrage').toEqual([])
      await page.keyboard.press('Escape')

      // Sehr lange Namen und Beschreibungen ohne Leerzeichen
      await openList(page, listUrl(C))
      expect(await noHorizontalScroll(page), 'lange Namen').toBe(true)
      await openEdit(page, label('2025-03-08', C, 'Allgemein', '0:30', 'bearbeiten'))
      expect(await noHorizontalScroll(page), 'Formular mit langem Namen').toBe(true)
      await page.keyboard.press('Escape')
      await page.getByRole('button', { name: label('2025-03-08', C, 'Allgemein', '0:30', 'löschen') }).click()
      expect(await noHorizontalScroll(page), 'Rückfrage mit langem Text').toBe(true)
      await page.keyboard.press('Escape')
    })
  }

  for (const scheme of ['light', 'dark'] as const) {
    test(`AC: Barrierefreiheit (axe, WCAG AA) im ${scheme === 'dark' ? 'Dunkel' : 'Hell'}modus: Liste, Formular, Rückfrage`, async ({ page }) => {
      await page.addInitScript((value) => localStorage.setItem('theme', value), scheme)
      await page.emulateMedia({ colorScheme: scheme })
      await openList(page, listUrl(A))
      expect(await page.evaluate(() => document.documentElement.classList.contains('dark'))).toBe(scheme === 'dark')
      expect(await axeViolations(page), 'Liste').toEqual([])

      await openEdit(page, label('2025-03-12', A, 'Allgemein', '1:30', 'bearbeiten'))
      expect(await axeViolations(page), 'Formular').toEqual([])
      await dialog(page).getByRole('tab', { name: 'Nur Dauer' }).click()
      await dialog(page).getByLabel('Dauer', { exact: true }).fill('')
      await dialog(page).getByRole('button', { name: 'Speichern' }).click()
      await expect(dialog(page).getByLabel('Dauer', { exact: true })).toHaveAttribute('aria-invalid', 'true')
      expect(await axeViolations(page), 'Formular mit Fehler').toEqual([])
      await page.keyboard.press('Escape')

      await page.getByRole('button', { name: label('2025-03-12', A, 'Allgemein', '1:30', 'löschen') }).click()
      await expect(page.getByRole('alertdialog')).toBeVisible()
      expect(await axeViolations(page), 'Rückfrage').toEqual([])
      await page.keyboard.press('Escape')

      await page.goto('/zeiten?monat=2001-01')
      await expect(page.getByRole('heading', { name: /Keine Einträge im/ })).toBeVisible()
      expect(await axeViolations(page), 'Leerzustand').toEqual([])
    })
  }

  test('Sicherheit: HTML, Skripte und SQL-Zeichen in der Beschreibung erscheinen als Text; keine Geheimnisse, keine Konsolenfehler', async ({ page }) => {
    const problems: string[] = []
    page.on('console', (message) => {
      if (message.type() === 'error') problems.push(message.text())
    })
    page.on('pageerror', (error) => problems.push(error.message))
    let alerted = false
    page.on('dialog', (d) => {
      alerted = true
      void d.dismiss()
    })
    await openList(page, listUrl(A))
    await expect(page.getByText(`<img src=x onerror=alert(1)> ' OR 1=1 --`, { exact: false })).toBeVisible()
    expect(await page.locator('main img').count()).toBe(0)
    expect(alerted).toBe(false)
    expect(findLeaks(await page.content())).toEqual([])
    expect(problems).toEqual([])

    // Auch im Bearbeiten-Formular bleibt der Text Text
    await openEdit(page, label('2025-03-12', A, 'Allgemein', '1:30', 'bearbeiten'))
    await expect(dialog(page).getByLabel('Beschreibung (optional)')).toHaveValue(`Konzept <img src=x onerror=alert(1)> ' OR 1=1 --`)
    expect(alerted).toBe(false)
  })

  test('Sicherheit: nur eigene Daten: Zugriff nur mit dem öffentlichen Schlüssel sieht und löscht nichts', async ({ request }) => {
    const headers = { apikey: anon, 'Content-Type': 'application/json' }
    const rest = `${base}/rest/v1`
    expect([401, 403]).toContain((await request.get(`${rest}/time_entries?select=id&limit=1`, { headers })).status())
    expect([401, 403]).toContain((await request.delete(`${rest}/time_entries?id=eq.${E.e1.id}`, { headers })).status())
    expect([401, 403]).toContain((await request.patch(`${rest}/time_entries?id=eq.${E.e1.id}`, { headers, data: { description: 'x' } })).status())
    expect(await dbEntry(E.e1.id)).not.toBeNull()
  })
})
