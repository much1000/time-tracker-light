import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { expect, test, type Locator, type Page } from '@playwright/test'
import { hasTestUser, NO_LOGIN, SKIP_REASON } from './helpers/env'

// PROJ-8 QA: Seite «Monat» (Navigation, Monatsnavigation, Summen und Rundung, Einträge, Aktualität, Zeit, Layout, Zugänglichkeit, Sicherheit).
// Die Tests legen eigene Testkunden «T-M…» und Einträge direkt in der Datenbank an (mit der Sitzung des Testkontos),
// arbeiten in festen Monaten des Jahres 2012 (andere Testdateien nutzen 2013 bis 2026) und räumen am Ende auf
// (Einträge löschen, Testkunden archivieren).
//
//   2012-05: Haupt-Monat (Lese-Tests, Daten bleiben unverändert), erster und letzter Tag, Nachbarmonate mit Einträgen
//   2012-02 (Schaltjahr), 2012-03 und 2012-10 (Zeitumstellung 25. März bzw. 28. Oktober): Monatsgrenzen
//   2012-07: leer
//   2012-08: mehr als 1000 Einträge
//   aktueller Monat: Aktualität

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
const LONG_WORD = `Wortlos${run}${'x'.repeat(88)}`
const XSS = `Konzept <img src=x onerror=alert(1)> ' OR 1=1 --`

test.skip(!hasTestUser || !base || !anon, SKIP_REASON)
test.describe.configure({ mode: 'serial' })
test.use({ viewport: { width: 1280, height: 900 } })

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

// ----- Hilfen -----

const zurich = (offsetMs = 0) =>
  new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Zurich' }).format(new Date(Date.now() + offsetMs))
const today = () => zurich()
const monthUrl = (month: string) => `/monat?monat=${month}`
const MAI = monthUrl('2012-05')
const MONTH_NAME = new Intl.DateTimeFormat('de-CH', { timeZone: 'UTC', month: 'long', year: 'numeric' })
const monthLabel = (month: string) => {
  const [y, m] = month.split('-').map(Number)
  return MONTH_NAME.format(new Date(Date.UTC(y, m - 1, 1)))
}
const currentMonthKey = () => today().slice(0, 7)

async function addEntry(row: {
  project: string
  date: string
  minutes: number
  billable?: number
  start?: string
  end?: string
  description?: string | null
}) {
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
    .select('id')
    .single()
  expect(error).toBeNull()
  return data as { id: string }
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

const smallTargets = (page: Page) =>
  page.evaluate(() => {
    const out: string[] = []
    document
      .querySelectorAll('[role="dialog"] button, main button, main a[href], main [role="combobox"]')
      .forEach((el) => {
        const r = (el as HTMLElement).getBoundingClientRect()
        if (r.width === 0 || r.height === 0) return
        if (r.height < 43.5 || r.width < 43.5) {
          out.push(`${el.tagName} «${(el.textContent ?? '').trim().slice(0, 25)}» ${Math.round(r.width)}×${Math.round(r.height)}px`)
        }
      })
    return out.filter((entry) => !entry.startsWith('BUTTON «Close'))
  })

const dialog = (page: Page) => page.getByRole('dialog')
const toast = (page: Page, text: string | RegExp) => page.locator('[data-sonner-toast]').filter({ hasText: text }).first()
const monthHeading = (page: Page) => page.locator('h2[aria-live="polite"]')
const customerSection = (page: Page, customer: Cust) =>
  page.locator('section[aria-labelledby^="month-customer-"]').filter({ hasText: customer.code })
const projectNumbers = (section: Locator, project: string) => numbers(section.locator(`dl[aria-label="Summe ${project}"]`))
const customerNumbers = (section: Locator, customer: Cust) => numbers(section.locator(`dl[aria-label="Summe ${customer.name}"]`))
const totalNumbers = (page: Page) => numbers(page.locator('dl[aria-label="Summe des Monats"]'))
const projectButton = (section: Locator, project: string) => section.getByRole('button', { name: new RegExp(`^${project}`) })

async function numbers(dl: Locator): Promise<string[]> {
  return (await dl.locator('dd').allInnerTexts()).map((text) => text.trim())
}

async function openMonth(page: Page, url: string) {
  await page.goto(url)
  await expect(page.getByRole('status', { name: 'Wird geladen' })).toHaveCount(0)
  await expect(page.getByRole('heading', { level: 1, name: 'Monat' })).toBeVisible()
}

async function expandAll(page: Page) {
  await page.getByRole('button', { name: 'Alle aufklappen' }).click()
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

  A = await customer(`T-MA${run}`, `Monat QA A ${run}`)
  B = await customer(`T-MB${run}`, `Monat QA B ${run}`)
  C = await customer(`T-MC${run}`, LONG_WORD)
  pa = await firstProject(A.id)
  pb = await firstProject(B.id)
  pc = await firstProject(C.id)
  const zweit = await client.from('projects').insert({ customer_id: A.id, name: 'Zweit' }).select('id').single()
  expect(zweit.error).toBeNull()
  pz = (zweit.data as { id: string }).id

  // Mai 2012: A/Allgemein 2:30 gearbeitet, 2:10 verrechenbar (gerundet 2:15); A/Zweit 0:05 (gerundet 0:15);
  // B: zehn Einträge zu 3 Minuten (0:30, gerundet 0:30); C: 0:20 (gerundet 0:30)
  await addEntry({ project: pa, date: '2012-05-01', minutes: 50, billable: 40, start: '08:00', end: '08:50', description: XSS })
  await addEntry({ project: pa, date: '2012-05-31', minutes: 90, start: '22:30', end: '24:00', description: 'Nachtschicht' })
  await addEntry({ project: pa, date: '2012-05-15', minutes: 10, billable: 0 })
  await addEntry({ project: pz, date: '2012-05-02', minutes: 5, description: 'Zweitprojekt' })
  await addEntry({ project: pb, date: '2012-05-10', minutes: 3, description: 'Zeile eins\nZeile zwei' })
  for (let i = 0; i < 9; i++) await addEntry({ project: pb, date: '2012-05-10', minutes: 3 })
  await addEntry({ project: pc, date: '2012-05-20', minutes: 20, description: `L${'o'.repeat(200)}ng` })
  // Nachbarmonate: dürfen im Mai nicht zählen
  await addEntry({ project: pa, date: '2012-04-30', minutes: 20, description: 'Letzter April' })
  await addEntry({ project: pa, date: '2012-06-01', minutes: 20, description: 'Erster Juni' })

  // Schaltjahr und Zeitumstellung (je Monat: zwei Einträge innen, Nachbareinträge aussen)
  await addEntry({ project: pa, date: '2012-02-01', minutes: 15 })
  await addEntry({ project: pa, date: '2012-02-29', minutes: 60 })
  await addEntry({ project: pa, date: '2012-03-01', minutes: 5 })
  await addEntry({ project: pa, date: '2012-03-25', minutes: 30 })
  await addEntry({ project: pa, date: '2012-03-31', minutes: 60 })
  await addEntry({ project: pa, date: '2012-04-01', minutes: 45 })
  await addEntry({ project: pa, date: '2012-09-30', minutes: 25 })
  await addEntry({ project: pa, date: '2012-10-01', minutes: 10 })
  await addEntry({ project: pa, date: '2012-10-28', minutes: 50 })
  await addEntry({ project: pa, date: '2012-11-01', minutes: 5 })

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
  test('AC: «Monat» steht zwischen Woche und Zeiten, ist auf /monat aktiv, Seitentitel stimmt', async ({ page }) => {
    await page.goto('/')
    const nav = page.locator('div.bg-sidebar').getByRole('navigation', { name: 'Hauptnavigation' })
    expect((await nav.getByRole('link').allInnerTexts()).map((text) => text.trim())).toEqual(['Start', 'Woche', 'Monat', 'Zeiten', 'Kunden', 'Status'])
    await nav.getByRole('link', { name: 'Monat' }).click()
    await expect(page).toHaveURL(/\/monat$/)
    await expect(nav.getByRole('link', { name: 'Monat' })).toHaveAttribute('aria-current', 'page')
    await expect(nav.getByRole('link', { name: 'Woche' })).not.toHaveAttribute('aria-current', 'page')
    await expect(page).toHaveTitle('Monat · Time Tracker Light')
  })

  for (const width of [320, 375]) {
    test(`AC: Tab-Leiste am Handy bei ${width} px auf /monat: sechs Einträge, «Monat» aktiv, jeder mindestens 44 px, nichts abgeschnitten`, async ({ page }) => {
      await page.setViewportSize({ width, height: 640 })
      await page.goto('/monat')
      const tabBar = page.getByRole('navigation', { name: 'Hauptnavigation' })
      expect((await tabBar.getByRole('link').allInnerTexts()).map((text) => text.trim())).toEqual(['Start', 'Woche', 'Monat', 'Zeiten', 'Kunden', 'Status'])
      await expect(tabBar.getByRole('link', { name: 'Monat' })).toHaveAttribute('aria-current', 'page')
      for (const el of await tabBar.locator('span').all()) {
        expect(await el.evaluate((node) => node.scrollWidth <= node.clientWidth)).toBe(true)
      }
      for (const link of await tabBar.getByRole('link').all()) {
        const box = (await link.boundingBox())!
        expect(box.height).toBeGreaterThanOrEqual(43.5)
        expect(box.width).toBeGreaterThanOrEqual(43.5)
      }
    })
  }

  test.describe('ohne Anmeldung', () => {
    test.use({ storageState: NO_LOGIN })
    test('AC: /monat führt zur Anmeldung und zeigt keine Daten (auch mit Monatsadresse)', async ({ page }) => {
      for (const url of ['/monat', MAI]) {
        await page.goto(url)
        await expect(page).toHaveURL(/\/login/)
        await expect(page.getByRole('heading', { name: 'Monat', exact: true })).toHaveCount(0)
        await expect(page.locator('dl[aria-label="Summe des Monats"]')).toHaveCount(0)
        await expect(page.getByText('Nachtschicht')).toHaveCount(0)
      }
    })
  })

  test('Security: ohne Sitzung (nur öffentlicher Schlüssel) liefert die Datenbank keine Einträge', async () => {
    const anonymous = createClient(base, anon, { auth: { persistSession: false, autoRefreshToken: false } })
    const { data } = await anonymous.from('time_entries').select('id').in('project_id', [pa, pb, pc, pz])
    expect(data ?? []).toEqual([])
  })
})

// ----- Monatsnavigation -----

test.describe('Monatsnavigation', () => {
  test('AC: ohne Adresse der aktuelle Monat (Zürcher Uhr) mit Hinweis «Laufender Monat», «Nächster Monat» und «Dieser Monat» deaktiviert', async ({ page }) => {
    await openMonth(page, '/monat')
    await expect(monthHeading(page)).toHaveText(monthLabel(currentMonthKey()))
    await expect(page.getByText('Laufender Monat, noch nicht abgeschlossen')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Nächster Monat' })).toBeDisabled()
    await expect(page.getByRole('button', { name: 'Dieser Monat' })).toBeDisabled()
    await expect(page.getByRole('button', { name: 'Vorheriger Monat' })).toBeEnabled()
  })

  test('AC: vergangener Monat zeigt Überschrift ohne Hinweis «Laufender Monat»', async ({ page }) => {
    await openMonth(page, MAI)
    await expect(monthHeading(page)).toHaveText('Mai 2012')
    await expect(page.getByText('Laufender Monat, noch nicht abgeschlossen')).toHaveCount(0)
    await expect(page.getByRole('button', { name: 'Nächster Monat' })).toBeEnabled()
    await expect(page.getByRole('button', { name: 'Dieser Monat' })).toBeEnabled()
  })

  test('AC: ungültiger oder zukünftiger Monat führt zum aktuellen Monat', async ({ page }) => {
    const next = Number(currentMonthKey().slice(5)) === 12 ? `${Number(currentMonthKey().slice(0, 4)) + 1}-01` : `${currentMonthKey().slice(0, 5)}${String(Number(currentMonthKey().slice(5)) + 1).padStart(2, '0')}`
    for (const bad of ['2099-01', 'abc', '2012-13', '2012-00', '2012-5', '2012-W11', '1999-12', next, '']) {
      await page.goto(monthUrl(bad))
      await expect(monthHeading(page), bad).toHaveText(monthLabel(currentMonthKey()))
      await expect(page.getByRole('button', { name: 'Nächster Monat' }), bad).toBeDisabled()
    }
  })

  test('AC: Blättern schreibt den Monat in die Adresse; Zurück-Taste, Neuladen und «Dieser Monat» stimmen', async ({ page }) => {
    await openMonth(page, MAI)
    await page.getByRole('button', { name: 'Nächster Monat' }).click()
    await expect(page).toHaveURL(/monat=2012-06$/)
    await expect(monthHeading(page)).toHaveText('Juni 2012')
    await page.getByRole('button', { name: 'Vorheriger Monat' }).click()
    await page.getByRole('button', { name: 'Vorheriger Monat' }).click()
    await expect(page).toHaveURL(/monat=2012-04$/)
    await page.reload()
    await expect(monthHeading(page)).toHaveText('April 2012')
    await page.goBack()
    await expect(monthHeading(page)).toHaveText('Mai 2012')
    await page.getByRole('button', { name: 'Dieser Monat' }).click()
    await expect(page).toHaveURL(/\/monat$/)
    await expect(page.getByRole('button', { name: 'Dieser Monat' })).toBeDisabled()
    await expect(monthHeading(page)).toHaveText(monthLabel(currentMonthKey()))
  })

  test('AC: Blättern über den Jahreswechsel (Januar 2012 ↔ Dezember 2011)', async ({ page }) => {
    await openMonth(page, monthUrl('2012-01'))
    await expect(monthHeading(page)).toHaveText('Januar 2012')
    await page.getByRole('button', { name: 'Vorheriger Monat' }).click()
    await expect(monthHeading(page)).toHaveText('Dezember 2011')
    await expect(page).toHaveURL(/monat=2011-12$/)
    await page.getByRole('button', { name: 'Nächster Monat' }).click()
    await expect(monthHeading(page)).toHaveText('Januar 2012')
  })

  test('AC: beim Monatswechsel bleiben keine Zahlen des alten Monats stehen; Ladefehler mit «Erneut versuchen»', async ({ page }) => {
    await openMonth(page, MAI)
    await expect(customerSection(page, B)).toHaveCount(1)
    await page.getByRole('button', { name: 'Vorheriger Monat' }).click()
    await expect(monthHeading(page)).toHaveText('April 2012')
    // Nur «Letzter April» und «1. April» von Kunde A; nichts von Kunde B oder C aus dem Mai
    await expect(customerSection(page, A)).toHaveCount(1)
    await expect(customerSection(page, B)).toHaveCount(0)
    await expect(customerSection(page, C)).toHaveCount(0)
    expect(await customerNumbers(customerSection(page, A), A)).toEqual(['1:05', '1:05', '1:15'])

    let fail = true
    await page.route('**/rest/v1/time_entries*', (route) => (fail ? route.abort() : route.continue()))
    await page.goto(MAI)
    await expect(page.locator('#main-content').getByRole('alert')).toContainText('konnten nicht geladen werden', { timeout: 20000 })
    await expect(page.locator('dl[aria-label="Summe des Monats"]')).toHaveCount(0)
    await expect(page.getByText('Keine Einträge in diesem Monat')).toHaveCount(0)
    fail = false
    await page.getByRole('button', { name: 'Erneut versuchen' }).click()
    await expect(customerSection(page, B)).toHaveCount(1)
  })
})

// ----- Summen und Rundung -----

test.describe('Summen und Rundung (Mai 2012)', () => {
  test('AC: Gesamtzeile und Kunden nach Kürzel, auch archivierte mit Hinweis; Beschriftungen und Erklärung', async ({ page }) => {
    await openMonth(page, MAI)
    const sections = page.locator('section[aria-labelledby^="month-customer-"]')
    await expect(sections).toHaveCount(3)
    const headings = await sections.locator('h3').allInnerTexts()
    expect(headings[0]).toContain(`${A.code} · ${A.name}`)
    expect(headings[0]).not.toContain('archiviert')
    expect(headings[1]).toContain(`${B.code} · ${B.name}`)
    expect(headings[2]).toContain(`${C.code} · `)
    expect(headings[2]).toContain('archiviert')
    // Beschriftungen aller drei Zahlen
    const total = page.locator('dl[aria-label="Summe des Monats"]')
    await expect(total.locator('dt')).toHaveText(['Gearbeitet', 'Verrechenbar', 'Verrechenbar gerundet auf 15 Min.'])
    await expect(page.getByText('Pro Projekt aufgerundet auf 15 Minuten.')).toBeVisible()
    // «Verrechenbar gerundet» ist hervorgehoben (Fettschrift)
    const weights = await total.locator('dd').evaluateAll((els) => els.map((el) => Number(getComputedStyle(el).fontWeight)))
    expect(weights[2]).toBeGreaterThan(weights[1])
  })

  test('AC: Rundung pro Projekt auf 15 Minuten, Kunden- und Monatssumme addieren die gerundeten Projekte (nie pro Eintrag)', async ({ page }) => {
    await openMonth(page, MAI)
    // Format: gearbeitet, verrechenbar exakt, verrechenbar gerundet
    const a = customerSection(page, A)
    expect(await projectNumbers(a, 'Allgemein')).toEqual(['2:30', '2:10', '2:15']) // 130 → 135
    expect(await projectNumbers(a, 'Zweit')).toEqual(['0:05', '0:05', '0:15']) // 5 → 15
    expect(await customerNumbers(a, A)).toEqual(['2:35', '2:15', '2:30']) // 135 + 15, nicht erneut gerundet
    const b = customerSection(page, B)
    expect(await projectNumbers(b, 'Allgemein')).toEqual(['0:30', '0:30', '0:30']) // zehn mal 3 Min. = 30 Min., nicht 2:30
    expect(await customerNumbers(b, B)).toEqual(['0:30', '0:30', '0:30'])
    const c = customerSection(page, C)
    expect(await customerNumbers(c, C)).toEqual(['0:20', '0:20', '0:30'])
    expect(await totalNumbers(page)).toEqual(['3:25', '3:05', '3:30'])
  })

  test('AC: Projekt ohne verrechenbare Zeit erscheint mit 0:00 verrechenbar und gerundet; Zeilen und Zahlen stehen gruppiert', async ({ page }) => {
    // Zwei Einträge nur mit Dauer, nichts verrechenbar: eigener Monat 2012-09 (Nachbartag 30.9. hat 25 Minuten)
    const id = await addEntry({ project: pb, date: '2012-09-05', minutes: 45, billable: 0 })
    try {
      await openMonth(page, monthUrl('2012-09'))
      const b = customerSection(page, B)
      expect(await projectNumbers(b, 'Allgemein')).toEqual(['0:45', '0:00', '0:00'])
      expect(await customerNumbers(b, B)).toEqual(['0:45', '0:00', '0:00'])
    } finally {
      await client.from('time_entries').delete().eq('id', id.id)
    }
  })

  test('AC: Summen stimmen minutengenau mit den Einträgen der Datenbank überein; gerundet ≥ exakt und Unterschied je Projekt < 15 Minuten', async ({ page }) => {
    const { data, error } = await client
      .from('time_entries')
      .select('project_id, duration_minutes, billable_minutes')
      .gte('entry_date', '2012-05-01')
      .lte('entry_date', '2012-05-31')
      .in('project_id', [pa, pz, pb, pc])
    expect(error).toBeNull()
    const rows = data as { project_id: string; duration_minutes: number; billable_minutes: number }[]
    const worked = rows.reduce((sum, r) => sum + r.duration_minutes, 0)
    const billable = rows.reduce((sum, r) => sum + r.billable_minutes, 0)
    const fmt = (min: number) => `${Math.floor(min / 60)}:${String(min % 60).padStart(2, '0')}`
    const byProject = new Map<string, number>()
    for (const r of rows) byProject.set(r.project_id, (byProject.get(r.project_id) ?? 0) + r.billable_minutes)
    let rounded = 0
    for (const sum of byProject.values()) {
      const r = Math.ceil(sum / 15) * 15
      expect(r - sum).toBeLessThan(15)
      rounded += r
    }
    await openMonth(page, MAI)
    expect(await totalNumbers(page)).toEqual([fmt(worked), fmt(billable), fmt(rounded)])
    const shown = await totalNumbers(page)
    expect(rounded).toBeGreaterThanOrEqual(billable)
    expect(shown[2]).toBe('3:30')
  })

  test('AC: Leerzustand mit Erklärung und «Zeit erfassen»; Navigation bleibt bedienbar', async ({ page }) => {
    await openMonth(page, monthUrl('2012-07'))
    await expect(page.getByRole('heading', { name: 'Keine Einträge in diesem Monat' })).toBeVisible()
    await expect(page.getByText('Erfasse Zeit mit dem Timer oder trage sie nach.')).toBeVisible()
    await expect(page.locator('dl[aria-label="Summe des Monats"]')).toHaveCount(0)
    await page.getByRole('main').getByRole('button', { name: 'Zeit erfassen' }).last().click()
    await expect(dialog(page)).toBeVisible()
    await expect(page.getByLabel('Datum')).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(dialog(page)).toHaveCount(0)
    await page.getByRole('button', { name: 'Nächster Monat' }).click()
    await expect(monthHeading(page)).toHaveText('August 2012')
  })
})

// ----- Tätigkeitstexte -----

test.describe('Einträge pro Projekt (Mai 2012)', () => {
  test('AC: Projekte sind zunächst zugeklappt; Aufklappen zeigt Einträge nach Datum, Beschreibung, Uhrzeiten, Dauer und verrechenbar', async ({ page }) => {
    await openMonth(page, MAI)
    await expect(page.locator('li[data-entry-id]')).toHaveCount(0)
    const a = customerSection(page, A)
    const toggle = projectButton(a, 'Allgemein')
    await expect(toggle).toHaveAttribute('aria-expanded', 'false')
    await expect(toggle).toContainText('3 Einträge')
    await toggle.click()
    await expect(toggle).toHaveAttribute('aria-expanded', 'true')
    const rows = a.locator('li[data-entry-id]')
    await expect(rows).toHaveCount(3)
    // Älteste zuerst: 1. Mai (Di), 15. Mai (Di), 31. Mai (Do)
    await expect(rows.nth(0)).toContainText('Di 1.5.')
    await expect(rows.nth(0)).toContainText('08:00–08:50')
    await expect(rows.nth(0)).toContainText('0:50')
    await expect(rows.nth(0)).toContainText('verrechenbar 0:40')
    await expect(rows.nth(1)).toContainText('Di 15.5.')
    await expect(rows.nth(1)).toContainText('Keine Beschreibung')
    await expect(rows.nth(1)).toContainText('verrechenbar 0:00')
    await expect(rows.nth(2)).toContainText('Do 31.5.')
    await expect(rows.nth(2)).toContainText('22:30–24:00')
    await expect(rows.nth(2)).toContainText('Nachtschicht')
    // Nichts aus den Nachbarmonaten
    await expect(page.getByText('Letzter April')).toHaveCount(0)
    await expect(page.getByText('Erster Juni')).toHaveCount(0)
  })

  test('AC: Texte erscheinen als Text (kein HTML), Zeilenumbrüche bleiben, lange Texte vollständig, Eintrag ohne Aktionen und mit Link zu «Zeiten»', async ({ page }) => {
    let dialogs = 0
    page.on('dialog', async (d) => {
      dialogs += 1
      await d.dismiss()
    })
    await openMonth(page, MAI)
    await expandAll(page)
    await expect(page.getByText(XSS, { exact: true })).toBeVisible()
    await expect(page.locator('main img[src="x"]')).toHaveCount(0)
    expect(dialogs).toBe(0)
    const multi = page.getByText('Zeile eins', { exact: false })
    await expect(multi).toContainText('Zeile zwei')
    expect(await multi.evaluate((el) => getComputedStyle(el).whiteSpace)).toBe('pre-line')
    await expect(page.getByText(`L${'o'.repeat(200)}ng`)).toBeVisible()
    // keine Aktionen «Bearbeiten»/«Löschen», aber Link zu «Zeiten» im gleichen Monat
    await expect(page.getByRole('main').getByRole('button', { name: /bearbeiten|löschen/i })).toHaveCount(0)
    const links = page.getByRole('link', { name: /^In Zeiten ansehen/ })
    await expect(links).toHaveCount(15)
    await expect(links.first()).toHaveAttribute('href', '/zeiten?monat=2012-05')
  })

  test('AC: «Alle aufklappen» und «Alle zuklappen»; beim Monatswechsel sind alle Projekte wieder zugeklappt', async ({ page }) => {
    await openMonth(page, MAI)
    await expandAll(page)
    await expect(page.locator('li[data-entry-id]')).toHaveCount(15)
    for (const button of await page.getByRole('button', { expanded: true }).all()) {
      await expect(button).toHaveAttribute('aria-expanded', 'true')
    }
    await page.getByRole('button', { name: 'Alle zuklappen' }).click()
    await expect(page.locator('li[data-entry-id]')).toHaveCount(0)
    await expandAll(page)
    await page.getByRole('button', { name: 'Vorheriger Monat' }).click()
    await expect(monthHeading(page)).toHaveText('April 2012')
    await expect(page.locator('li[data-entry-id]')).toHaveCount(0)
    await expect(projectButton(customerSection(page, A), 'Allgemein')).toHaveAttribute('aria-expanded', 'false')
  })

  test('BUG-2 (Low, bekannt): Zurück in den Monat, in dem aufgeklappt wurde, sind die Projekte wieder zugeklappt', async ({ page }) => {
    test.fail(true, 'BUG-2: Der Aufklapp-Zustand merkt sich den Monat und gilt beim Zurückblättern wieder (Spec: im neuen Monat zugeklappt)')
    await openMonth(page, MAI)
    await expandAll(page)
    await page.getByRole('button', { name: 'Vorheriger Monat' }).click()
    await expect(monthHeading(page)).toHaveText('April 2012')
    await page.getByRole('button', { name: 'Nächster Monat' }).click()
    await expect(monthHeading(page)).toHaveText('Mai 2012')
    await expect(customerSection(page, A)).toHaveCount(1) // Daten sind geladen
    await expect(page.locator('li[data-entry-id]')).toHaveCount(0)
  })

  test('AC: Projektzeile per Tastatur (Enter, Leertaste) auf- und zuklappen, Zustand per aria-expanded', async ({ page }) => {
    await openMonth(page, MAI)
    const toggle = projectButton(customerSection(page, A), 'Zweit')
    await toggle.focus()
    await page.keyboard.press('Enter')
    await expect(toggle).toHaveAttribute('aria-expanded', 'true')
    await expect(customerSection(page, A).getByText('Zweitprojekt')).toBeVisible()
    await page.keyboard.press('Space')
    await expect(toggle).toHaveAttribute('aria-expanded', 'false')
    await expect(customerSection(page, A).getByText('Zweitprojekt')).toHaveCount(0)
    // Die Projektzeile steckt in einer Überschrift (Ebene 4) und hat sichtbaren Fokus
    await expect(page.getByRole('heading', { level: 4, name: /^Zweit/ })).toHaveCount(1)
    await toggle.focus()
    const outline = await toggle.evaluate((el) => {
      const s = getComputedStyle(el)
      return `${s.outlineStyle}|${s.boxShadow}`
    })
    expect(outline).not.toBe('none|none')
  })

  test('AC: «archiviert»-Hinweis bei archiviertem Projekt (Zweit) und archiviertem Kunden (C, samt seinem Projekt)', async ({ page }) => {
    await openMonth(page, MAI)
    await expect(projectButton(customerSection(page, A), 'Zweit')).toContainText('archiviert')
    await expect(projectButton(customerSection(page, A), 'Allgemein')).not.toContainText('archiviert')
    await expect(customerSection(page, C).locator('h3')).toContainText('archiviert')
    await expect(projectButton(customerSection(page, C), 'Allgemein')).toContainText('archiviert')
    await expect(customerSection(page, B).getByText('archiviert')).toHaveCount(0)
  })

  test('Edge: Link «In Zeiten ansehen» öffnet «Zeiten» im gleichen Monat', async ({ page }) => {
    await openMonth(page, MAI)
    await projectButton(customerSection(page, B), 'Allgemein').click()
    await page.getByRole('link', { name: /^In Zeiten ansehen/ }).first().click()
    await expect(page).toHaveURL(/\/zeiten\?monat=2012-05$/)
    await expect(page.getByRole('heading', { level: 1, name: 'Zeiten' })).toBeVisible()
  })
})

// ----- Zeit: Monatsgrenzen -----

test.describe('Monatsgrenzen und Zeitumstellung', () => {
  const cases: [string, string, string[]][] = [
    // Monat, Überschrift, Summen für Kunde A (gearbeitet, verrechenbar, gerundet)
    ['2012-02', 'Februar 2012', ['1:15', '1:15', '1:15']], // Schaltjahr: 29.2. zählt, 1.3. nicht
    ['2012-03', 'März 2012', ['1:35', '1:35', '1:45']], // 1.3., 25.3. (Sommerzeit), 31.3.; nicht 29.2. und 1.4.
    ['2012-10', 'Oktober 2012', ['1:00', '1:00', '1:00']], // 1.10., 28.10. (Winterzeit); nicht 30.9. und 1.11.
  ]
  for (const [month, label, expected] of cases) {
    test(`AC: ${label}: Grenzen nach Kalenderdatum, keine Einträge der Nachbarmonate`, async ({ page }) => {
      await openMonth(page, monthUrl(month))
      await expect(monthHeading(page)).toHaveText(label)
      expect(await customerNumbers(customerSection(page, A), A)).toEqual(expected)
    })
  }

  test('AC: Eintrag mit Ende 24:00 am letzten Tag zählt zum Mai, nicht zum Juni', async ({ page }) => {
    await openMonth(page, monthUrl('2012-06'))
    // Juni: nur «Erster Juni» (0:20) von Kunde A
    expect(await customerNumbers(customerSection(page, A), A)).toEqual(['0:20', '0:20', '0:30'])
    await expect(customerSection(page, A).getByText('Nachtschicht')).toHaveCount(0)
  })
})

// ----- Aktualität -----

test.describe('Aktualität (aktueller Monat)', () => {
  test('AC: «Zeit erfassen» auf der Seite: Summen, Rundung und Liste aktualisieren sich ohne Neuladen', async ({ page }) => {
    const description = `Monat-QA-${run}`
    try {
      await openMonth(page, '/monat')
      await expect(customerSection(page, A)).toHaveCount(0)
      await page.getByRole('main').getByRole('button', { name: 'Zeit erfassen' }).first().click()
      const form = dialog(page)
      await form.getByRole('tab', { name: 'Nur Dauer' }).click()
      await form.getByLabel('Kunde').click()
      await page.getByRole('option', { name: new RegExp(A.code) }).click()
      await form.getByLabel('Dauer', { exact: true }).fill('0:20')
      await form.getByLabel('Beschreibung (optional)').fill(description)
      await form.getByRole('button', { name: 'Speichern' }).click()
      await expect(toast(page, /Eintrag gespeichert|Gespeichert am/)).toBeVisible()
      const a = customerSection(page, A)
      await expect(a).toHaveCount(1)
      expect(await customerNumbers(a, A)).toEqual(['0:20', '0:20', '0:30'])
      await projectButton(a, 'Allgemein').click()
      await expect(a.getByText(description)).toBeVisible()
    } finally {
      await client.from('time_entries').delete().eq('description', description)
    }
  })

  test('AC: Zurückkehren von «Zeiten» zeigt aktuelle Zahlen (Eintrag dazwischen entstanden)', async ({ page }) => {
    const description = `Zurueck-${run}`
    let id = ''
    try {
      await openMonth(page, '/monat')
      await expect(customerSection(page, A)).toHaveCount(0)
      const nav = page.locator('div.bg-sidebar').getByRole('navigation', { name: 'Hauptnavigation' })
      await nav.getByRole('link', { name: 'Zeiten' }).click()
      await expect(page).toHaveURL(/\/zeiten/)
      id = (await addEntry({ project: pa, date: today(), minutes: 7, description })).id
      await nav.getByRole('link', { name: 'Monat' }).click()
      await expect(page.getByRole('heading', { level: 1, name: 'Monat' })).toBeVisible()
      const a = customerSection(page, A)
      await expect(a).toHaveCount(1)
      expect(await customerNumbers(a, A)).toEqual(['0:07', '0:07', '0:15'])
      // Eintrag wieder löschen und zurückkehren: Kunde verschwindet
      await nav.getByRole('link', { name: 'Zeiten' }).click()
      await client.from('time_entries').delete().eq('id', id)
      id = ''
      await nav.getByRole('link', { name: 'Monat' }).click()
      await expect(page.getByRole('heading', { level: 1, name: 'Monat' })).toBeVisible()
      await expect(customerSection(page, A)).toHaveCount(0)
    } finally {
      if (id) await client.from('time_entries').delete().eq('id', id)
    }
  })
})

// ----- Viele Einträge -----

test.describe('Viele Einträge', () => {
  test('Edge: mehr als 1000 Einträge in einem Monat: sichtbarer Hinweis «Zahlen unvollständig», nichts still falsch', async ({ page }) => {
    test.setTimeout(120000)
    const batch = (count: number) =>
      Array.from({ length: count }, () => ({
        project_id: pa, entry_date: '2012-08-14', duration_minutes: 1, billable_minutes: 0, description: null,
      }))
    expect((await client.from('time_entries').insert(batch(500))).error).toBeNull()
    expect((await client.from('time_entries').insert(batch(501))).error).toBeNull()
    try {
      await page.goto(monthUrl('2012-08'))
      await expect(page.getByText(/Es werden nicht alle Einträge angezeigt\. Die Zahlen dieses Monats sind unvollständig/)).toBeVisible({ timeout: 30000 })
      expect(await totalNumbers(page)).toEqual(['16:40', '0:00', '0:00'])
    } finally {
      await client.from('time_entries').delete().eq('project_id', pa).gte('entry_date', '2012-08-01').lte('entry_date', '2012-08-31')
    }
  })
})

// ----- Layout und Barrierefreiheit -----

test.describe('Layout und Barrierefreiheit', () => {
  for (const width of [320, 375, 768, 1440]) {
    test(`AC: Layout bei ${width} px: kein horizontales Scrollen, alle Bedienelemente mindestens 44 px, Zahlen nicht abgeschnitten`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 })
      const shot = (name: string) =>
        process.env.PW_SHOTS ? page.screenshot({ path: `test-results/shots/monat-${width}-${name}.png`, fullPage: true }) : undefined
      await openMonth(page, MAI)
      // Der Kunde mit dem sehr langen Namen ohne Leerzeichen wird getrennt geprüft (BUG-1)
      await customerSection(page, C).evaluate((el) => ((el as HTMLElement).style.display = 'none'))
      expect(await noHorizontalScroll(page), 'zugeklappt').toBe(true)
      expect(await smallTargets(page), 'zugeklappt').toEqual([])
      await shot('zu')
      // Alle Zahlen vollständig sichtbar (nichts abgeschnitten)
      for (const el of await page.locator('main dd, main dt').all()) {
        expect(await el.evaluate((node) => node.scrollWidth <= node.clientWidth + 1)).toBe(true)
      }
      // Am Handy stehen die drei Zahlen untereinander, ab 640 px nebeneinander
      const pos = await page.locator('dl[aria-label="Summe des Monats"] dd').evaluateAll((els) =>
        els.map((el) => ({ left: Math.round(el.getBoundingClientRect().left), top: Math.round(el.getBoundingClientRect().top) }))
      )
      if (width < 640) expect(new Set(pos.map((p) => p.top)).size).toBe(3)
      else expect(new Set(pos.map((p) => p.left)).size).toBe(3)
      await expandAll(page)
      expect(await noHorizontalScroll(page), 'aufgeklappt').toBe(true)
      expect(await smallTargets(page), 'aufgeklappt').toEqual([])
      await shot('auf')
      await openMonth(page, monthUrl('2012-07'))
      expect(await noHorizontalScroll(page), 'Leerzustand').toBe(true)
      expect(await smallTargets(page), 'Leerzustand').toEqual([])
    })
  }

  for (const width of [320, 375, 768]) {
    test(`BUG-1 (Medium, bekannt): sehr langer Kundenname ohne Leerzeichen bricht bei ${width} px um, kein horizontales Scrollen`, async ({ page }) => {
      test.fail(true, 'BUG-1: Der Kundenname im Abschnittskopf bricht nicht um und verbreitert die Seite')
      await page.setViewportSize({ width, height: 900 })
      await openMonth(page, MAI)
      await expect(customerSection(page, C)).toBeVisible()
      expect(await noHorizontalScroll(page)).toBe(true)
    })
  }

  for (const scheme of ['light', 'dark'] as const) {
    for (const width of [375, 1280]) {
      test(`AC: Barrierefreiheit (axe, WCAG AA) im ${scheme === 'dark' ? 'Dunkel' : 'Hell'}modus bei ${width} px: Monat zugeklappt und aufgeklappt, Leerzustand, Formular`, async ({ page }) => {
        await page.setViewportSize({ width, height: 900 })
        await page.addInitScript((value) => localStorage.setItem('theme', value), scheme)
        await page.emulateMedia({ colorScheme: scheme })
        await openMonth(page, MAI)
        expect(await page.evaluate(() => document.documentElement.classList.contains('dark'))).toBe(scheme === 'dark')
        expect(await axeViolations(page), 'zugeklappt').toEqual([])
        await expandAll(page)
        expect(await axeViolations(page), 'aufgeklappt').toEqual([])

        await openMonth(page, '/monat')
        expect(await axeViolations(page), 'aktueller Monat (Hinweis «Laufender Monat»)').toEqual([])

        await openMonth(page, monthUrl('2012-07'))
        expect(await axeViolations(page), 'Leerzustand').toEqual([])
        await page.getByRole('main').getByRole('button', { name: 'Zeit erfassen' }).first().click()
        await expect(dialog(page).getByLabel('Datum')).toBeVisible()
        expect(await axeViolations(page), 'Formular').toEqual([])
      })
    }
  }
})
