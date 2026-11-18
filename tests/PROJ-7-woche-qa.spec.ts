import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { expect, test, type Page } from '@playwright/test'
import { hasTestUser, NO_LOGIN, SKIP_REASON } from './helpers/env'
import { findLeaks } from './helpers/leaks'

// PROJ-7 QA: Seite «Woche» (Raster, Tageskarten, Detail, Bearbeiten, Löschen, Navigation, Layout, Zugänglichkeit, Sicherheit).
// Die Tests legen eigene Testkunden «T-W…» und Einträge direkt in der Datenbank an (mit der Sitzung des Testkontos),
// arbeiten in festen Wochen der Vergangenheit und räumen am Ende auf (Einträge löschen, Testkunden archivieren).
//
// Feste Wochen (Jahr 2014 hat denselben Kalender wie 2025; andere Testdateien nutzen 2025 im selben Konto):
//   2014-W11 (10.–16. März 2014): Lese-Tests (Daten bleiben unverändert)
//   2014-W15 (7.–13. April 2014): Bearbeiten und Löschen (jeder Test benutzt eigene Tage)
//   2014-W16 (14.–20. April 2014): einziger Eintrag, wird gelöscht (Leerzustand)
//   2014-W01 (30. Dez. 2013 – 5. Jan. 2014): Jahreswechsel
//   2014-W13 (24.–30. März 2014) und 2014-W43 (20.–26. Okt. 2014): Sommer-/Winterzeitwechsel
//   2014-W03: mehr als 1000 Einträge

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

interface Seed {
  id: string
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
const E: Record<string, Seed> = {}

// ----- Hilfen -----

const zurich = (offsetMs = 0) =>
  new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Zurich' }).format(new Date(Date.now() + offsetMs))
const today = () => zurich()
const weekUrl = (week: string) => `/woche?woche=${week}`
const W11 = weekUrl('2014-W11')

const LONG_DATE = new Intl.DateTimeFormat('de-CH', { timeZone: 'UTC', weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
const longDate = (date: string) => {
  const [y, m, d] = date.split('-').map(Number)
  return LONG_DATE.format(new Date(Date.UTC(y, m - 1, d)))
}

// ISO-Woche und Montag zu einem Datum (nur Kalenderrechnung, wie die App)
function isoWeekOf(date: string) {
  const [y, m, d] = date.split('-').map(Number)
  const t = new Date(Date.UTC(y, m - 1, d))
  const dow = (t.getUTCDay() + 6) % 7
  const monday = new Date(t.getTime() - dow * 86400000)
  const thursday = new Date(monday.getTime() + 3 * 86400000)
  const yearStart = Date.UTC(thursday.getUTCFullYear(), 0, 1)
  return { week: Math.floor((thursday.getTime() - yearStart) / 86400000 / 7) + 1, monday: monday.getUTCDate() }
}

// Name der Aktionen eines Eintrags: «Eintrag von 12.03., T-WA…· Allgemein, 1:30 bearbeiten»
function actionName(date: string, customer: Cust, project: string, duration: string, action: 'bearbeiten' | 'löschen') {
  return `Eintrag von ${date.slice(8)}.${date.slice(5, 7)}., ${customer.code} · ${project}, ${duration} ${action}`
}

// Knopf einer Zelle bzw. Projektzeile: «Kundenname Projekt, Montag, 10. März 2014, 1 Stunde 30 Minuten»
const escapeRe = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
const cellButton = (page: Page, customer: Cust, project: string, date: string) =>
  page.getByRole('button', { name: new RegExp(`^${escapeRe(`${customer.name} ${project}, ${longDate(date)}, `)}`) })

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
    .select('id')
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

const smallTargets = (page: Page) =>
  page.evaluate(() => {
    const out: string[] = []
    document
      .querySelectorAll(
        '[role="dialog"] button, [role="alertdialog"] button, main button, main a[href], main [role="combobox"]'
      )
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
const weekHeading = (page: Page) => page.locator('h2[aria-live="polite"]')
const grid = (page: Page) => page.getByTestId('week-grid')
const cards = (page: Page) => page.getByTestId('week-day-cards')
const minutes = (text: string) => {
  const [h, m] = text.split(':').map(Number)
  return h * 60 + m
}

async function openWeek(page: Page, url: string) {
  await page.goto(url)
  await expect(page.getByRole('status', { name: 'Wird geladen' })).toHaveCount(0)
  await expect(page.getByRole('heading', { level: 1, name: 'Woche' })).toBeVisible()
}

async function weekTotals(page: Page) {
  const texts = await page.locator('p.text-2xl').allInnerTexts()
  return texts.map((text) => text.trim())
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

  A = await customer(`T-WA${run}`, `Woche QA A ${run}`)
  B = await customer(`T-WB${run}`, `Woche QA B ${run}`)
  C = await customer(`T-WC${run}`, LONG_WORD)
  pa = await firstProject(A.id)
  pb = await firstProject(B.id)
  pc = await firstProject(C.id)
  const zweit = await client.from('projects').insert({ customer_id: A.id, name: 'Zweit' }).select('id').single()
  expect(zweit.error).toBeNull()
  pz = (zweit.data as { id: string }).id

  // Woche 2014-W11 (Mo 10.3. bis So 16.3.)
  E.e1 = await addEntry({ project: pa, date: '2014-03-10', minutes: 90, billable: 60, start: '08:00', end: '09:30', description: XSS })
  E.e2 = await addEntry({ project: pa, date: '2014-03-10', minutes: 30 })
  E.e3 = await addEntry({ project: pa, date: '2014-03-12', minutes: 120, start: '22:00', end: '24:00', description: 'Nachtschicht' })
  E.e4 = await addEntry({ project: pa, date: '2014-03-16', minutes: 45, description: 'Sonntag' })
  E.b1 = await addEntry({ project: pb, date: '2014-03-10', minutes: 60, description: 'B Arbeit' })
  E.b2 = await addEntry({ project: pb, date: '2014-03-14', minutes: 40, description: 'Zeile eins\nZeile zwei' })
  E.z1 = await addEntry({ project: pz, date: '2014-03-11', minutes: 45, description: 'Zweitprojekt' })
  E.c1 = await addEntry({ project: pc, date: '2014-03-13', minutes: 30, description: `L${'o'.repeat(200)}ng` })
  // Nachbarwochen: dürfen in 2014-W11 nicht erscheinen
  await addEntry({ project: pa, date: '2014-03-09', minutes: 20, description: 'Sonntag davor' })
  await addEntry({ project: pa, date: '2014-03-17', minutes: 20, description: 'Montag danach' })

  // Jahreswechsel 2014-W01, Zeitumstellung 2014-W13 und 2014-W43
  await addEntry({ project: pa, date: '2013-12-31', minutes: 30, description: 'Silvester' })
  await addEntry({ project: pa, date: '2014-01-01', minutes: 45, description: 'Neujahr' })
  await addEntry({ project: pa, date: '2014-03-24', minutes: 30, description: 'Vor Umstellung' })
  await addEntry({ project: pa, date: '2014-03-30', minutes: 60, description: 'Umstellung Sommerzeit' })
  await addEntry({ project: pa, date: '2014-10-20', minutes: 10, description: 'Vor Winterzeit' })
  await addEntry({ project: pa, date: '2014-10-26', minutes: 50, description: 'Umstellung Winterzeit' })

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
  test('AC: «Woche» steht zwischen Start und Zeiten, ist auf /woche aktiv, Seitentitel stimmt', async ({ page }) => {
    await page.goto('/')
    const nav = page.locator('div.bg-sidebar').getByRole('navigation', { name: 'Hauptnavigation' })
    expect((await nav.getByRole('link').allInnerTexts()).map((text) => text.trim())).toEqual(['Start', 'Woche', 'Monat', 'Zeiten', 'Kunden', 'Status'])
    await nav.getByRole('link', { name: 'Woche' }).click()
    await expect(page).toHaveURL(/\/woche$/)
    await expect(nav.getByRole('link', { name: 'Woche' })).toHaveAttribute('aria-current', 'page')
    await expect(nav.getByRole('link', { name: 'Start' })).not.toHaveAttribute('aria-current', 'page')
    await expect(page).toHaveTitle('Woche · Time Tracker Light')
  })

  for (const width of [320, 375]) {
    test(`AC: Tab-Leiste am Handy bei ${width} px: sechs Einträge, jeder mindestens 44 px hoch und breit, nichts abgeschnitten`, async ({ page }) => {
      await page.setViewportSize({ width, height: 640 })
      await page.goto('/woche')
      const tabBar = page.getByRole('navigation', { name: 'Hauptnavigation' })
      expect((await tabBar.getByRole('link').allInnerTexts()).map((text) => text.trim())).toEqual(['Start', 'Woche', 'Monat', 'Zeiten', 'Kunden', 'Status'])
      await expect(tabBar.getByRole('link', { name: 'Woche' })).toHaveAttribute('aria-current', 'page')
      for (const el of await tabBar.locator('span').all()) {
        expect(await el.evaluate((node) => node.scrollWidth <= node.clientWidth)).toBe(true)
      }
      for (const link of await tabBar.getByRole('link').all()) {
        const box = (await link.boundingBox())!
        expect(box.height).toBeGreaterThanOrEqual(43.5)
        expect(box.width).toBeGreaterThanOrEqual(43.5)
      }
      expect(await noHorizontalScroll(page)).toBe(true)
    })
  }

  test.describe('ohne Anmeldung', () => {
    test.use({ storageState: NO_LOGIN })
    test('AC: /woche führt zur Anmeldung und zeigt keine Daten (auch mit Wochenadresse)', async ({ page }) => {
      for (const url of ['/woche', W11]) {
        await page.goto(url)
        await expect(page).toHaveURL(/\/login/)
        await expect(page.getByRole('heading', { name: 'Woche', exact: true })).toHaveCount(0)
        await expect(page.getByTestId('week-grid')).toHaveCount(0)
        await expect(page.getByText(XSS, { exact: false })).toHaveCount(0)
      }
    })
  })
})

// ----- Wochennavigation -----

test.describe('Wochennavigation', () => {
  test('AC: ohne Adresse die aktuelle Woche (Zürcher Uhr), «Nächste Woche» und «Diese Woche» deaktiviert', async ({ page }) => {
    await openWeek(page, '/woche')
    const { week, monday } = isoWeekOf(today())
    await expect(weekHeading(page)).toHaveText(new RegExp(`^KW ${week} · ${monday}\\.`))
    await expect(weekHeading(page)).toContainText(today().slice(0, 4))
    await expect(page.getByRole('button', { name: 'Nächste Woche' })).toBeDisabled()
    await expect(page.getByRole('button', { name: 'Diese Woche' })).toBeDisabled()
    await expect(page.getByRole('button', { name: 'Vorherige Woche' })).toBeEnabled()
  })

  test('AC: bekannte Woche zeigt Überschrift mit Datumsbereich; Monats- und Jahresgrenzen mit beiden Monaten', async ({ page }) => {
    const cases: [string, string][] = [
      ['2014-W11', 'KW 11 · 10.–16. März 2014'],
      ['2014-W01', 'KW 1 · 30. Dez. 2013 – 5. Jan. 2014'],
      ['2026-W01', 'KW 1 · 29. Dez. 2025 – 4. Jan. 2026'],
      ['2020-W53', 'KW 53 · 28. Dez. 2020 – 3. Jan. 2021'],
      ['2014-W14', 'KW 14 · 31. März – 6. Apr. 2014'],
    ]
    for (const [week, label] of cases) {
      await page.goto(weekUrl(week))
      await expect(weekHeading(page), week).toHaveText(label)
    }
  })

  test('AC: ungültige oder zukünftige Woche führt zur aktuellen Woche', async ({ page }) => {
    const { week } = isoWeekOf(today())
    for (const bad of ['2099-W01', 'abc', '2014-W54', '2014-W00', '2014-11', '1999-W52', `${today().slice(0, 4)}-W${String(week + 1).padStart(2, '0')}`]) {
      await page.goto(weekUrl(bad))
      await expect(weekHeading(page), bad).toHaveText(new RegExp(`^KW ${week} · `))
      await expect(page.getByRole('button', { name: 'Nächste Woche' }), bad).toBeDisabled()
    }
  })

  test('AC: Blättern schreibt die Woche in die Adresse; Zurück-Taste, Neuladen und «Diese Woche» stimmen', async ({ page }) => {
    await openWeek(page, W11)
    await page.getByRole('button', { name: 'Nächste Woche' }).click()
    await expect(page).toHaveURL(/woche=2014-W12$/)
    await expect(weekHeading(page)).toHaveText('KW 12 · 17.–23. März 2014')
    await page.getByRole('button', { name: 'Vorherige Woche' }).click()
    await page.getByRole('button', { name: 'Vorherige Woche' }).click()
    await expect(page).toHaveURL(/woche=2014-W10$/)
    await page.reload()
    await expect(weekHeading(page)).toHaveText('KW 10 · 3.–9. März 2014')
    await page.goBack()
    await expect(weekHeading(page)).toHaveText('KW 11 · 10.–16. März 2014')
    await page.getByRole('button', { name: 'Diese Woche' }).click()
    await expect(page).toHaveURL(/\/woche$/)
    await expect(page.getByRole('button', { name: 'Diese Woche' })).toBeDisabled()
    await expect(weekHeading(page)).toHaveText(new RegExp(`^KW ${isoWeekOf(today()).week} · `))
  })

  test('AC: Blättern über den Jahreswechsel (KW 52 → KW 1 → KW 2)', async ({ page }) => {
    await openWeek(page, weekUrl('2013-W52'))
    await expect(weekHeading(page)).toHaveText('KW 52 · 23.–29. Dez. 2013')
    await page.getByRole('button', { name: 'Nächste Woche' }).click()
    await expect(weekHeading(page)).toHaveText('KW 1 · 30. Dez. 2013 – 5. Jan. 2014')
    await expect(page).toHaveURL(/woche=2014-W01$/)
    await page.getByRole('button', { name: 'Nächste Woche' }).click()
    await expect(weekHeading(page)).toHaveText('KW 2 · 6.–12. Jan. 2014')
  })

  test('AC: beim Wochenwechsel bleiben keine Zahlen der alten Woche stehen; Ladefehler mit «Erneut versuchen»', async ({ page }) => {
    await openWeek(page, W11)
    await expect(page.getByText('Nachtschicht')).toHaveCount(0) // Details erst nach dem Antippen
    await expect(grid(page).getByRole('rowheader').first()).toBeVisible()
    await page.getByRole('button', { name: 'Vorherige Woche' }).click()
    await expect(weekHeading(page)).toHaveText('KW 10 · 3.–9. März 2014')
    // Andere Testdateien können im selben Konto ebenfalls Einträge in dieser Woche haben: nur eigene Zeilen prüfen
    await expect(grid(page).getByRole('columnheader', { name: /So 9\./ })).toBeVisible()
    await expect(grid(page).getByRole('rowheader').filter({ hasText: A.code })).toHaveCount(1) // nur «Sonntag davor»
    await expect(grid(page).getByRole('rowheader').filter({ hasText: B.code })).toHaveCount(0)
    await expect(cellButton(page, A, 'Allgemein', '2014-03-09')).toHaveAccessibleName(/20 Minuten$/)
    await expect(cellButton(page, A, 'Allgemein', '2014-03-10')).toHaveCount(0)
    expect(await weekTotals(page)).not.toEqual(['7:40', '7:10'])

    let fail = true
    await page.route('**/rest/v1/time_entries*', (route) => (fail ? route.abort() : route.continue()))
    await page.goto(W11)
    await expect(page.locator('#main-content').getByRole('alert')).toContainText('konnten nicht geladen werden', { timeout: 20000 })
    await expect(grid(page)).toHaveCount(0)
    await expect(page.getByText('Keine Einträge in dieser Woche')).toHaveCount(0)
    fail = false
    await page.getByRole('button', { name: 'Erneut versuchen' }).click()
    await expect(grid(page).getByRole('rowheader').first()).toBeVisible()
  })
})

// ----- Raster -----

test.describe('Raster (1280 px)', () => {
  test('AC: Zeilen je Kunde · Projekt nach Kürzel und Name, auch archivierte mit Hinweis; sieben Tagesspalten Mo–So', async ({ page }) => {
    await openWeek(page, W11)
    const g = grid(page)
    await expect(g.getByRole('columnheader')).toHaveText(
      [/Projekt/, /Mo 10\./, /Di 11\./, /Mi 12\./, /Do 13\./, /Fr 14\./, /Sa 15\./, /So 16\./, /Summe/]
    )
    const rowHeaders = await g.locator('tbody').getByRole('rowheader').allInnerTexts()
    expect(rowHeaders).toHaveLength(4)
    expect(rowHeaders[0]).toContain(`${A.code} · Allgemein`)
    expect(rowHeaders[1]).toContain(`${A.code} · Zweit`)
    expect(rowHeaders[1]).toContain('archiviert')
    expect(rowHeaders[2]).toContain(`${B.code} · Allgemein`)
    expect(rowHeaders[2]).not.toContain('archiviert')
    expect(rowHeaders[3]).toContain(`${C.code} · Allgemein`)
    expect(rowHeaders[3]).toContain('archiviert')
    // Nichts aus den Nachbarwochen
    await expect(page.getByText('Sonntag davor')).toHaveCount(0)
    await expect(page.getByText('Montag danach')).toHaveCount(0)
  })

  test('AC: Zellen zeigen h:mm oder «–»; Zeilen-, Tages- und Wochensummen (gearbeitet und verrechenbar) stimmen minutengenau', async ({ page }) => {
    await openWeek(page, W11)
    const g = grid(page)
    const rowA = g.locator('tbody tr').nth(0)
    // Mo 2:00 (90+30), Mi 2:00, So 0:45, sonst «–»
    await expect(rowA.locator('td')).toHaveText([/2:00/, /–/, /2:00/, /–/, /–/, /–/, /0:45/, /4:45 gearbeitet[\s\S]*4:15 verrechenbar/])
    // Fusszeile: gearbeitet / verrechenbar je Tag, Wochensumme
    const worked = g.locator('tfoot tr').nth(0)
    const billable = g.locator('tfoot tr').nth(1)
    await expect(worked.getByRole('rowheader')).toHaveText('Gearbeitet')
    await expect(billable.getByRole('rowheader')).toHaveText('Verrechenbar')
    // Mo 90+30+60=180, Di 45, Mi 120, Do 30, Fr 40, Sa –, So 45; Summe 460
    await expect(worked.locator('td')).toHaveText(['3:00', '0:45', '2:00', '0:30', '0:40', '–', '0:45', '7:40'])
    await expect(billable.locator('td')).toHaveText(['2:30', '0:45', '2:00', '0:30', '0:40', '–', '0:45', '7:10'])
    expect(await weekTotals(page)).toEqual(['7:40', '7:10'])
  })

  test('AC: Beschreibung der Zelle, leere Zellen sind keine Knöpfe; Name der Zelle für Screenreader', async ({ page }) => {
    await openWeek(page, W11)
    const g = grid(page)
    expect(await g.locator('tbody button').count()).toBe(7) // A Allgemein Mo, Mi, So; Zweit Di; B Mo, Fr; C Do
    const mo = cellButton(page, A, 'Allgemein', '2014-03-10')
    await expect(mo).toHaveAccessibleName(`${A.name} Allgemein, Montag, 10. März 2014, 2 Stunden`)
    await expect(cellButton(page, A, 'Allgemein', '2014-03-12')).toHaveAccessibleName(`${A.name} Allgemein, Mittwoch, 12. März 2014, 2 Stunden`)
    await expect(cellButton(page, A, 'Allgemein', '2014-03-16')).toHaveAccessibleName(`${A.name} Allgemein, Sonntag, 16. März 2014, 45 Minuten`)
    // Leere Zelle: Text «Keine Einträge» für Screenreader, kein Knopf
    await expect(cellButton(page, A, 'Allgemein', '2014-03-11')).toHaveCount(0)
    await expect(g.locator('tbody tr').nth(0).locator('td').nth(1)).toContainText('Keine Einträge')
    await expect(g.locator('tbody tr').nth(0).locator('td').nth(1).getByRole('button')).toHaveCount(0)
    // Tabellenstruktur
    await expect(g.getByRole('table')).toHaveCount(1)
    await expect(g.locator('caption')).toContainText('KW 11')
    expect(await g.locator('th[scope="col"]').count()).toBe(9)
  })

  test('AC: der heutige Tag ist mit Text «Heute» markiert (nur in der aktuellen Woche)', async ({ page }) => {
    await openWeek(page, '/woche')
    await expect(grid(page).getByRole('columnheader', { name: /Heute/ })).toHaveCount(1)
    await openWeek(page, W11)
    await expect(page.getByText('Heute', { exact: true })).toHaveCount(0)
  })

  test('AC: Leerzustand mit Erklärung und «Zeit erfassen», Wochennavigation bleibt bedienbar', async ({ page }) => {
    await openWeek(page, weekUrl('2014-W06'))
    await expect(page.getByRole('heading', { name: 'Keine Einträge in dieser Woche' })).toBeVisible()
    await expect(page.getByRole('main').getByRole('button', { name: 'Zeit erfassen' }).last()).toBeVisible()
    await expect(page.getByRole('button', { name: 'Nächste Woche' })).toBeEnabled()
    await page.getByRole('main').getByRole('button', { name: 'Zeit erfassen' }).last().click()
    await expect(dialog(page).getByLabel('Datum')).toBeVisible()
    await page.keyboard.press('Escape')
    await page.getByRole('button', { name: 'Nächste Woche' }).click()
    await expect(weekHeading(page)).toHaveText('KW 7 · 10.–16. Feb. 2014')
    await expect(page.getByRole('heading', { name: 'Keine Einträge in dieser Woche' })).toBeVisible()
  })

  test('Edge: Wochen über Jahreswechsel und Zeitumstellung legen Einträge in die richtigen Spalten', async ({ page }) => {
    // KW 1: Silvester (Di 31.) und Neujahr (Mi 1.)
    await openWeek(page, weekUrl('2014-W01'))
    const row = grid(page).locator('tbody tr').nth(0)
    await expect(row.locator('td')).toHaveText([/–/, /0:30/, /0:45/, /–/, /–/, /–/, /–/, /1:15/])
    await expect(grid(page).getByRole('columnheader')).toHaveText([/Projekt/, /Mo 30\./, /Di 31\./, /Mi 1\./, /Do 2\./, /Fr 3\./, /Sa 4\./, /So 5\./, /Summe/])
    // Sommerzeit: Sonntag 30.3.2014 liegt in der Spalte «So 30.»
    await openWeek(page, weekUrl('2014-W13'))
    await expect(weekHeading(page)).toHaveText('KW 13 · 24.–30. März 2014')
    await expect(grid(page).locator('tbody tr').nth(0).locator('td')).toHaveText([/0:30/, /–/, /–/, /–/, /–/, /–/, /1:00/, /1:30/])
    // Winterzeit: Sonntag 26.10.2014
    await openWeek(page, weekUrl('2014-W43'))
    await expect(weekHeading(page)).toHaveText('KW 43 · 20.–26. Okt. 2014')
    await expect(grid(page).locator('tbody tr').nth(0).locator('td')).toHaveText([/0:10/, /–/, /–/, /–/, /–/, /–/, /0:50/, /1:00/])
  })

  test('AC: Zeilensumme stimmt minutengenau mit der Summe der Einträge in der Datenbank überein', async ({ page }) => {
    // Seite «Zeiten» für Kunde A im März 2014: 10. + 12. + 16. + 11. (Zweit) … die Zeilensummen der Woche müssen zu den Einträgen passen
    await openWeek(page, W11)
    const sumsA = (await grid(page).locator('tbody tr').nth(0).locator('td').last().innerText()).replace(/\s+/g, ' ')
    expect(sumsA).toContain('4:45 gearbeitet')
    const { data } = await client
      .from('time_entries')
      .select('duration_minutes,billable_minutes')
      .eq('project_id', pa)
      .gte('entry_date', '2014-03-10')
      .lt('entry_date', '2014-03-17')
    const rowsDb = data as { duration_minutes: number; billable_minutes: number }[]
    expect(rowsDb.reduce((sum, r) => sum + r.duration_minutes, 0)).toBe(minutes('4:45'))
    expect(rowsDb.reduce((sum, r) => sum + r.billable_minutes, 0)).toBe(minutes('4:15'))
  })
})

// ----- Tageskarten -----

test.describe('Tageskarten (375 px)', () => {
  test.use({ viewport: { width: 375, height: 800 } })

  test('AC: oben die Wochensummen, darunter sieben Tageskarten Mo–So mit Datum und Tagessumme; Raster nicht erreichbar', async ({ page }) => {
    await openWeek(page, W11)
    expect(await weekTotals(page)).toEqual(['7:40', '7:10'])
    await expect(grid(page).getByRole('table')).toHaveCount(0) // ausgeblendet, nicht im Accessibility-Baum
    const days = cards(page).getByRole('heading', { level: 3 })
    await expect(days).toHaveCount(7)
    await expect(days).toHaveText([
      'Montag, 10. März 2014', 'Dienstag, 11. März 2014', 'Mittwoch, 12. März 2014', 'Donnerstag, 13. März 2014',
      'Freitag, 14. März 2014', 'Samstag, 15. März 2014', 'Sonntag, 16. März 2014',
    ])
    const monday = cards(page).getByRole('region', { name: /Montag, 10\. März 2014/ })
    await expect(monday).toContainText('3:00 gearbeitet · 2:30 verrechenbar')
    await expect(monday.getByRole('button')).toHaveCount(2) // A Allgemein + B Allgemein
    const saturday = cards(page).getByRole('region', { name: /Samstag/ })
    await expect(saturday.getByRole('button')).toHaveCount(0)
    await expect(saturday).toContainText('Keine Einträge')
  })

  test('AC: Projektzeile antippen öffnet das Blatt mit Titel, Summe und allen Einträgen; Fokus kehrt zurück', async ({ page }) => {
    await openWeek(page, W11)
    const row = cellButton(page, A, 'Allgemein', '2014-03-10')
    await row.click()
    const sheet = dialog(page)
    await expect(sheet).toBeVisible()
    await expect(sheet).toHaveAccessibleName(`${A.code} · Allgemein, Montag, 10. März 2014`)
    await expect(sheet).toContainText('2:00 gearbeitet · 1:30 verrechenbar')
    await expect(sheet.locator('li[data-entry-id]')).toHaveCount(2)
    // Blatt von unten: am unteren Rand verankert
    const box = (await sheet.boundingBox())!
    expect(box.y + box.height).toBeGreaterThan(780)
    await page.keyboard.press('Escape')
    await expect(sheet).toHaveCount(0)
    await expect(row).toBeFocused()
  })
})

// ----- Detail -----

test.describe('Detail (1280 px)', () => {
  test('AC: Titel, Summe, Einträge mit Beschreibung, Uhrzeiten (auch 24:00), verrechenbar, «Keine Beschreibung», Zeilenumbrüche', async ({ page }) => {
    await openWeek(page, W11)
    await cellButton(page, A, 'Allgemein', '2014-03-10').click()
    const d = dialog(page)
    await expect(d).toHaveAccessibleName(`${A.code} · Allgemein, Montag, 10. März 2014`)
    await expect(d).toContainText('2:00 gearbeitet · 1:30 verrechenbar')
    const first = d.locator('li[data-entry-id]').filter({ hasText: '08:00–09:30' })
    await expect(first).toContainText('1:30')
    await expect(first).toContainText('verrechenbar 1:00')
    await expect(first.getByRole('button', { name: 'Bearbeiten' })).toBeVisible()
    await expect(first.getByRole('button', { name: 'Löschen' })).toBeVisible()
    await expect(d.locator('li[data-entry-id]').filter({ hasText: 'Keine Beschreibung' })).toHaveCount(1)
    await page.keyboard.press('Escape')

    await cellButton(page, A, 'Allgemein', '2014-03-12').click()
    await expect(dialog(page)).toContainText('22:00–24:00')
    await page.keyboard.press('Escape')

    await cellButton(page, B, 'Allgemein', '2014-03-14').click()
    const text = dialog(page).getByText('Zeile eins')
    expect(await text.evaluate((node) => getComputedStyle(node).whiteSpace)).toMatch(/pre/)
    await page.keyboard.press('Escape')

    // Lange Beschreibung (200 Zeichen am Stück, archivierter Kunde): kein Überlauf, aufklappbar
    await cellButton(page, C, 'Allgemein', '2014-03-13').click()
    const long = dialog(page)
    await expect(long.getByRole('button', { name: 'Mehr anzeigen' })).toBeVisible()
    await long.getByRole('button', { name: 'Mehr anzeigen' }).click()
    await expect(long.getByText(`L${'o'.repeat(200)}ng`)).toBeVisible()
    expect(await noHorizontalScroll(page)).toBe(true)
  })

  test('AC: Schliessen mit Escape, Schliessen-Knopf und Tippen daneben gibt den Fokus an die Zelle zurück; Tastatur öffnet das Detail', async ({ page }) => {
    await openWeek(page, W11)
    const cell = cellButton(page, B, 'Allgemein', '2014-03-10')
    await cell.focus()
    await page.keyboard.press('Enter')
    await expect(dialog(page)).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(dialog(page)).toHaveCount(0)
    await expect(cell).toBeFocused()

    await cell.click()
    await dialog(page).getByRole('button', { name: 'Close' }).click()
    await expect(dialog(page)).toHaveCount(0)
    await expect(cell).toBeFocused()

    await cell.press('Space')
    await expect(dialog(page)).toBeVisible()
    await page.mouse.click(5, 5)
    await expect(dialog(page)).toHaveCount(0)
    await expect(cell).toBeFocused()
  })

  test('Edge: Tab bleibt im Detail (Fokusfalle), Seite dahinter nicht erreichbar', async ({ page }) => {
    await openWeek(page, W11)
    await cellButton(page, B, 'Allgemein', '2014-03-10').click()
    for (let i = 0; i < 8; i++) {
      await page.keyboard.press('Tab')
      expect(await page.evaluate(() => !!document.activeElement?.closest('[role="dialog"]'))).toBe(true)
    }
  })

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
    await openWeek(page, W11)
    await cellButton(page, A, 'Allgemein', '2014-03-10').click()
    await expect(dialog(page).getByText(XSS, { exact: false })).toBeVisible()
    expect(await page.locator('main img, [role="dialog"] img').count()).toBe(0)
    expect(alerted).toBe(false)
    expect(findLeaks(await page.content())).toEqual([])
    expect(problems).toEqual([])
  })

  test('Sicherheit: nur eigene Daten: Zugriff nur mit dem öffentlichen Schlüssel sieht und löscht nichts', async ({ request }) => {
    const headers = { apikey: anon, 'Content-Type': 'application/json' }
    const rest = `${base}/rest/v1`
    expect([401, 403]).toContain((await request.get(`${rest}/time_entries?select=id,project:projects(archived)&limit=1`, { headers })).status())
    expect([401, 403]).toContain((await request.delete(`${rest}/time_entries?id=eq.${E.e1.id}`, { headers })).status())
    expect(await dbEntry(E.e1.id)).not.toBeNull()
  })
})

// ----- Bearbeiten und Löschen im Detail (Woche 2014-W15, 7.–13. April 2014) -----

test.describe('Bearbeiten und Löschen im Detail (1280 px)', () => {
  test('AC: Bearbeiten: Formular aus PROJ-5, nach dem Speichern stimmen Detail, Raster und Summen; Fokus bleibt im Detail', async ({ page }) => {
    const entry = await addEntry({ project: pa, date: '2014-04-09', minutes: 30, description: null })
    await addEntry({ project: pa, date: '2014-04-09', minutes: 20, description: 'Nachbar im Detail' })
    await openWeek(page, weekUrl('2014-W15'))
    const before = minutes((await weekTotals(page))[0])
    await cellButton(page, A, 'Allgemein', '2014-04-09').click()
    await page.getByRole('button', { name: actionName('2014-04-09', A, 'Allgemein', '0:30', 'bearbeiten') }).click()
    const form = dialog(page).last()
    await expect(form.getByLabel('Datum')).toHaveValue('2014-04-09')
    await expect(form.getByLabel('Beschreibung (optional)')).toBeFocused()
    await form.getByLabel('Dauer', { exact: true }).fill('0:45')
    await form.getByLabel('Verrechenbar').fill('0:45')
    await form.getByLabel('Beschreibung (optional)').fill('Nachgetragen im Detail')
    await form.getByRole('button', { name: 'Speichern' }).click()
    await expect(toast(page, 'Änderung gespeichert.')).toBeVisible()
    // Detail bleibt offen und zeigt die neuen Werte
    await expect(dialog(page)).toHaveCount(1)
    await expect(dialog(page)).toContainText('Nachgetragen im Detail')
    await expect(dialog(page)).toContainText('1:05 gearbeitet · 1:05 verrechenbar')
    expect(await page.evaluate(() => !!document.activeElement?.closest('[role="dialog"]'))).toBe(true)
    expect(await dbEntry(entry.id)).toMatchObject({ duration_minutes: 45, description: 'Nachgetragen im Detail' })
    // Dahinter (Raster und Summen) ohne Neuladen aktualisiert
    expect(minutes((await weekTotals(page))[0])).toBe(before + 15)
    await page.keyboard.press('Escape')
    await expect(cellButton(page, A, 'Allgemein', '2014-04-09')).toHaveAccessibleName(/1 Stunde 5 Minuten$/)
  })

  test('AC: Eintrag in eine andere Woche verschieben: verschwindet aus Detail und Raster, Hinweis nennt das Datum, Detail schliesst bei leerer Zelle', async ({ page }) => {
    const entry = await addEntry({ project: pa, date: '2014-04-10', minutes: 25, description: 'Wandert' })
    await openWeek(page, weekUrl('2014-W15'))
    const before = minutes((await weekTotals(page))[0])
    await cellButton(page, A, 'Allgemein', '2014-04-10').click()
    await page.getByRole('button', { name: actionName('2014-04-10', A, 'Allgemein', '0:25', 'bearbeiten') }).click()
    const form = dialog(page).last()
    await form.getByLabel('Datum').fill('2014-04-04')
    await form.getByRole('button', { name: 'Speichern' }).click()
    await expect(toast(page, 'Gespeichert am 04.04.2014.')).toBeVisible()
    await expect(dialog(page)).toHaveCount(0)
    await expect(cellButton(page, A, 'Allgemein', '2014-04-10')).toHaveCount(0)
    expect(minutes((await weekTotals(page))[0])).toBe(before - 25)
    // Fokus nicht verloren: auf der Wochenüberschrift
    await expect(page.getByRole('heading', { level: 1, name: 'Woche' })).toBeFocused()
    expect(await dbEntry(entry.id)).toMatchObject({ entry_date: '2014-04-04' })
  })

  test('AC: Löschen: Rückfrage mit Angaben, Escape lässt alles unverändert und gibt den Fokus an den Knopf im Detail zurück', async ({ page }) => {
    const victim = await addEntry({ project: pa, date: '2014-04-07', minutes: 25, description: 'Zu löschen' })
    await openWeek(page, weekUrl('2014-W15'))
    await cellButton(page, A, 'Allgemein', '2014-04-07').click()
    const trigger = page.getByRole('button', { name: actionName('2014-04-07', A, 'Allgemein', '0:25', 'löschen') })
    await trigger.click()
    const ask = page.getByRole('alertdialog')
    for (const part of ['Eintrag löschen?', A.code, 'Allgemein', '07.04.2014', '0:25', 'Zu löschen', 'endgültig']) await expect(ask).toContainText(part)
    await expect(ask.getByRole('button', { name: 'Abbrechen' })).toBeFocused()
    await page.keyboard.press('Escape')
    await expect(ask).toHaveCount(0)
    await expect(dialog(page)).toHaveCount(1)
    await expect(trigger).toBeFocused()
    expect(await dbEntry(victim.id)).not.toBeNull()
  })

  test('AC: Löschen des letzten Eintrags einer Zelle: Detail schliesst, Raster und Summen aktualisiert, Fokus auf der Wochenüberschrift', async ({ page }) => {
    const only = await addEntry({ project: pa, date: '2014-04-08', minutes: 25, description: 'Einziger' })
    let deletes = 0
    await page.route('**/rest/v1/time_entries*', async (route) => {
      if (route.request().method() === 'DELETE') {
        deletes++
        await new Promise((r) => setTimeout(r, 400))
      }
      await route.continue()
    })
    await openWeek(page, weekUrl('2014-W15'))
    const before = minutes((await weekTotals(page))[0])
    await cellButton(page, A, 'Allgemein', '2014-04-08').click()
    await page.getByRole('button', { name: actionName('2014-04-08', A, 'Allgemein', '0:25', 'löschen') }).click()
    await page.getByRole('alertdialog').getByRole('button', { name: 'Löschen', exact: true }).dblclick()
    await expect(toast(page, 'Eintrag gelöscht.')).toBeVisible()
    await expect(page.getByRole('alertdialog')).toHaveCount(0)
    await expect(dialog(page)).toHaveCount(0)
    await expect(cellButton(page, A, 'Allgemein', '2014-04-08')).toHaveCount(0)
    expect(minutes((await weekTotals(page))[0])).toBe(before - 25)
    await expect(page.getByRole('heading', { level: 1, name: 'Woche' })).toBeFocused()
    expect(deletes).toBe(1)
    expect(await dbEntry(only.id)).toBeNull()
  })

  test('AC: Löschen eines von zwei Einträgen: Detail bleibt, Fokus beim Nachbar-Eintrag, Summe der Zelle sinkt', async ({ page }) => {
    const gone = await addEntry({ project: pa, date: '2014-04-11', minutes: 15, description: 'Weg damit' })
    const stay = await addEntry({ project: pa, date: '2014-04-11', minutes: 35, description: 'Bleibt' })
    await openWeek(page, weekUrl('2014-W15'))
    await cellButton(page, A, 'Allgemein', '2014-04-11').click()
    await expect(dialog(page)).toContainText('0:50 gearbeitet')
    await page.getByRole('button', { name: actionName('2014-04-11', A, 'Allgemein', '0:15', 'löschen') }).click()
    await page.getByRole('alertdialog').getByRole('button', { name: 'Löschen', exact: true }).click()
    await expect(toast(page, 'Eintrag gelöscht.')).toBeVisible()
    await expect(dialog(page)).toHaveCount(1)
    await expect(dialog(page)).toContainText('0:35 gearbeitet')
    await expect(dialog(page).getByText('Weg damit')).toHaveCount(0)
    await expect(dialog(page).locator('li[data-entry-id]').getByRole('button').first()).toBeFocused()
    expect(await dbEntry(gone.id)).toBeNull()
    expect(await dbEntry(stay.id)).not.toBeNull()
    await page.keyboard.press('Escape')
    await expect(cellButton(page, A, 'Allgemein', '2014-04-11')).toBeFocused()
  })

  test('Edge: letzter Eintrag der Woche gelöscht: Detail schliesst, Leerzustand, Fokus auf der Überschrift', async ({ page }) => {
    const only = await addEntry({ project: pb, date: '2014-04-16', minutes: 20, description: 'Einzige der Woche' })
    await openWeek(page, weekUrl('2014-W16'))
    await cellButton(page, B, 'Allgemein', '2014-04-16').click()
    await page.getByRole('button', { name: actionName('2014-04-16', B, 'Allgemein', '0:20', 'löschen') }).click()
    await page.getByRole('alertdialog').getByRole('button', { name: 'Löschen', exact: true }).click()
    await expect(page.getByRole('heading', { name: 'Keine Einträge in dieser Woche' })).toBeVisible()
    await expect(dialog(page)).toHaveCount(0)
    await expect(grid(page)).toHaveCount(0)
    await expect(page.getByRole('heading', { level: 1, name: 'Woche' })).toBeFocused()
    await expect(page.getByRole('button', { name: 'Nächste Woche' })).toBeEnabled()
    expect(await dbEntry(only.id)).toBeNull()
  })

  test('Edge: Eintrag auf einem anderen Gerät gelöscht: «existiert nicht mehr» beim Löschen und beim Speichern, Woche lädt neu', async ({ page }) => {
    const g1 = await addEntry({ project: pa, date: '2014-04-12', minutes: 10, description: 'Konkurrent eins' })
    const g2 = await addEntry({ project: pa, date: '2014-04-12', minutes: 20, description: 'Konkurrent zwei' })
    await addEntry({ project: pa, date: '2014-04-12', minutes: 30, description: 'Bleibt stehen' })
    await openWeek(page, weekUrl('2014-W15'))
    await cellButton(page, A, 'Allgemein', '2014-04-12').click()
    // Löschen
    await page.getByRole('button', { name: actionName('2014-04-12', A, 'Allgemein', '0:10', 'löschen') }).click()
    await client.from('time_entries').delete().eq('id', g1.id)
    await page.getByRole('alertdialog').getByRole('button', { name: 'Löschen', exact: true }).click()
    await expect(toast(page, /existiert nicht mehr/)).toBeVisible()
    await expect(dialog(page)).toContainText('Bleibt stehen')
    await expect(dialog(page).getByText('Konkurrent eins')).toHaveCount(0)
    // Bearbeiten
    await page.getByRole('button', { name: actionName('2014-04-12', A, 'Allgemein', '0:20', 'bearbeiten') }).click()
    const form = dialog(page).last()
    await client.from('time_entries').delete().eq('id', g2.id)
    await form.getByLabel('Beschreibung (optional)').fill('Neu geschrieben')
    await form.getByRole('button', { name: 'Speichern' }).click()
    await expect(form.getByRole('alert')).toContainText('Dieser Eintrag existiert nicht mehr')
    await expect(form.getByLabel('Beschreibung (optional)')).toHaveValue('Neu geschrieben')
    await form.getByRole('button', { name: 'Abbrechen' }).click()
    await expect(dialog(page).getByText('Konkurrent zwei')).toHaveCount(0)
  })

  test('Edge: Sitzung abgelaufen beim Speichern: Hinweis, Eingabe bleibt, nichts gespeichert', async ({ page, context }) => {
    await openWeek(page, W11)
    await cellButton(page, B, 'Allgemein', '2014-03-10').click()
    await page.getByRole('button', { name: actionName('2014-03-10', B, 'Allgemein', '1:00', 'bearbeiten') }).click()
    const form = dialog(page).last()
    await form.getByLabel('Beschreibung (optional)').fill('Nie gespeichert')
    await context.clearCookies()
    await form.getByRole('button', { name: 'Speichern' }).click()
    await expect(form.getByRole('alert')).toContainText(/Anmeldung|nicht geklappt/)
    await expect(form.getByLabel('Beschreibung (optional)')).toHaveValue('Nie gespeichert')
    expect(await dbEntry(E.b1.id)).toMatchObject({ description: 'B Arbeit' })
  })

  test('Edge: Fehler beim Löschen (Netzwerk): Meldung, Eintrag bleibt, Rückfrage bleibt offen', async ({ page }) => {
    await openWeek(page, W11)
    await cellButton(page, B, 'Allgemein', '2014-03-10').click()
    let fail = true
    await page.route('**/rest/v1/time_entries*', (route) =>
      fail && route.request().method() === 'DELETE' ? route.abort() : route.continue()
    )
    await page.getByRole('button', { name: actionName('2014-03-10', B, 'Allgemein', '1:00', 'löschen') }).click()
    await page.getByRole('alertdialog').getByRole('button', { name: 'Löschen', exact: true }).click()
    await expect(toast(page, /nicht erreichbar|nicht geklappt/)).toBeVisible()
    await expect(page.getByRole('alertdialog')).toBeVisible()
    fail = false
    await page.getByRole('alertdialog').getByRole('button', { name: 'Abbrechen' }).click()
    expect(await dbEntry(E.b1.id)).not.toBeNull()
  })
})

// ----- Aktualität -----

test.describe('Aktualität (1280 px)', () => {
  test('AC: «Zeit erfassen» auf der Seite: neuer Eintrag erscheint in der aktuellen Woche ohne Neuladen', async ({ page }) => {
    const description = `Woche-QA-${run}`
    try {
      await openWeek(page, '/woche')
      await page.getByRole('main').getByRole('button', { name: 'Zeit erfassen' }).first().click()
      const form = dialog(page)
      await form.getByRole('tab', { name: 'Nur Dauer' }).click()
      await form.getByLabel('Kunde').click()
      await page.getByRole('option', { name: new RegExp(A.code) }).click()
      await form.getByLabel('Dauer', { exact: true }).fill('0:20')
      await form.getByLabel('Beschreibung (optional)').fill(description)
      await form.getByRole('button', { name: 'Speichern' }).click()
      await expect(toast(page, /Eintrag gespeichert|Gespeichert am/)).toBeVisible()
      const cell = cellButton(page, A, 'Allgemein', today())
      await expect(cell).toBeVisible()
      await cell.click()
      await expect(dialog(page)).toContainText(description)
    } finally {
      await client.from('time_entries').delete().eq('description', description)
    }
  })

  test('AC: nach dem Wechsel zu «Zeiten» und zurück stehen aktuelle Zahlen da', async ({ page }) => {
    const description = `Woche-QA-Rueckkehr-${run}`
    try {
      await openWeek(page, '/woche')
      const nav = page.locator('div.bg-sidebar').getByRole('navigation', { name: 'Hauptnavigation' })
      await nav.getByRole('link', { name: 'Zeiten' }).click()
      await expect(page).toHaveURL(/\/zeiten/)
      await addEntry({ project: pa, date: today(), minutes: 12, description })
      await nav.getByRole('link', { name: 'Woche' }).click()
      await expect(cellButton(page, A, 'Allgemein', today())).toBeVisible()
      await cellButton(page, A, 'Allgemein', today()).click()
      await expect(dialog(page)).toContainText(description)
    } finally {
      await client.from('time_entries').delete().eq('description', description)
    }
  })
})

// ----- Viele Einträge -----

test.describe('Viele Einträge', () => {
  test('Edge: mehr als 1000 Einträge in einer Woche: sichtbarer Hinweis «Zahlen unvollständig», nichts still falsch', async ({ page }) => {
    test.setTimeout(120000)
    const batch = (count: number) =>
      Array.from({ length: count }, () => ({
        project_id: pa, entry_date: '2014-01-14', duration_minutes: 1, billable_minutes: 0, description: null,
      }))
    expect((await client.from('time_entries').insert(batch(500))).error).toBeNull()
    expect((await client.from('time_entries').insert(batch(501))).error).toBeNull()
    try {
      await page.goto(weekUrl('2014-W03'))
      await expect(page.getByText(/Es werden nicht alle Einträge angezeigt\. Die Zahlen dieser Woche sind unvollständig/)).toBeVisible({ timeout: 30000 })
      expect(await weekTotals(page)).toEqual(['16:40', '0:00'])
    } finally {
      await client.from('time_entries').delete().eq('project_id', pa).gte('entry_date', '2014-01-13').lt('entry_date', '2014-01-20')
    }
  })

  test('Edge: viele Projekte (20) in einer Woche: Raster wird länger, kein seitliches Scrollen', async ({ page }) => {
    const ids: string[] = []
    for (let i = 0; i < 20; i++) {
      const { data, error } = await client.from('projects').insert({ customer_id: B.id, name: `Massen ${String(i).padStart(2, '0')}` }).select('id').single()
      expect(error).toBeNull()
      ids.push((data as { id: string }).id)
      await addEntry({ project: ids[i], date: '2014-05-07', minutes: 10 + i })
    }
    try {
      for (const width of [375, 1280]) {
        await page.setViewportSize({ width, height: 900 })
        await openWeek(page, weekUrl('2014-W19'))
        if (width === 1280) await expect(grid(page).locator('tbody tr')).toHaveCount(20)
        expect(await noHorizontalScroll(page), `${width}`).toBe(true)
      }
    } finally {
      for (const id of ids) await client.from('time_entries').delete().eq('project_id', id)
    }
  })
})

// ----- Layout und Barrierefreiheit -----

test.describe('Layout und Barrierefreiheit', () => {
  for (const width of [320, 375, 768, 1023, 1024, 1440]) {
    test(`AC: Layout bei ${width} px: kein horizontales Scrollen, alle Bedienelemente mindestens 44 px, auch Detail und Rückfrage`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 })
      const shot = (name: string) =>
        process.env.PW_SHOTS ? page.screenshot({ path: `test-results/shots/woche-${width}-${name}.png`, fullPage: name === 'woche' }) : undefined
      await openWeek(page, W11)
      expect(await noHorizontalScroll(page), 'Woche').toBe(true)
      expect(await smallTargets(page), 'Woche').toEqual([])
      await shot('woche')
      // Raster ab 1024 px, darunter Tageskarten
      await expect(grid(page).getByRole('table')).toHaveCount(width >= 1024 ? 1 : 0)
      await expect(cards(page).getByRole('heading', { level: 3 })).toHaveCount(width >= 1024 ? 0 : 7)

      await cellButton(page, A, 'Allgemein', '2014-03-10').click()
      await expect(dialog(page)).toBeVisible()
      expect(await noHorizontalScroll(page), 'Detail').toBe(true)
      expect(await smallTargets(page), 'Detail').toEqual([])
      await shot('detail')
      await dialog(page).getByRole('button', { name: actionName('2014-03-10', A, 'Allgemein', '0:30', 'löschen') }).click()
      await expect(page.getByRole('alertdialog')).toBeVisible()
      expect(await noHorizontalScroll(page), 'Rückfrage').toBe(true)
      expect(await smallTargets(page), 'Rückfrage').toEqual([])
      await page.keyboard.press('Escape')
      await page.keyboard.press('Escape')

      // Sehr langer Kundenname ohne Leerzeichen (archivierter Kunde)
      await cellButton(page, C, 'Allgemein', '2014-03-13').click()
      expect(await noHorizontalScroll(page), 'Detail mit langem Namen').toBe(true)
      await page.keyboard.press('Escape')
      expect(await noHorizontalScroll(page), 'lange Namen').toBe(true)
      await openWeek(page, weekUrl('2014-W06'))
      expect(await noHorizontalScroll(page), 'Leerzustand').toBe(true)
      expect(await smallTargets(page), 'Leerzustand').toEqual([])
    })
  }

  for (const scheme of ['light', 'dark'] as const) {
    for (const width of [375, 1280]) {
      test(`AC: Barrierefreiheit (axe, WCAG AA) im ${scheme === 'dark' ? 'Dunkel' : 'Hell'}modus bei ${width} px: Woche, Detail, Rückfrage, Formular, Leerzustand`, async ({ page }) => {
        await page.setViewportSize({ width, height: 900 })
        await page.addInitScript((value) => localStorage.setItem('theme', value), scheme)
        await page.emulateMedia({ colorScheme: scheme })
        await openWeek(page, W11)
        expect(await page.evaluate(() => document.documentElement.classList.contains('dark'))).toBe(scheme === 'dark')
        expect(await axeViolations(page), 'Woche').toEqual([])

        await cellButton(page, A, 'Allgemein', '2014-03-10').click()
        await expect(dialog(page)).toBeVisible()
        expect(await axeViolations(page), 'Detail').toEqual([])
        await page.getByRole('button', { name: actionName('2014-03-10', A, 'Allgemein', '0:30', 'bearbeiten') }).click()
        await expect(dialog(page).last().getByLabel('Datum')).toBeVisible()
        expect(await axeViolations(page), 'Formular über Detail').toEqual([])
        await page.keyboard.press('Escape')
        await page.getByRole('button', { name: actionName('2014-03-10', A, 'Allgemein', '0:30', 'löschen') }).click()
        await expect(page.getByRole('alertdialog')).toBeVisible()
        expect(await axeViolations(page), 'Rückfrage über Detail').toEqual([])
        await page.keyboard.press('Escape')
        await page.keyboard.press('Escape')

        await openWeek(page, weekUrl('2014-W06'))
        expect(await axeViolations(page), 'Leerzustand').toEqual([])
      })
    }
  }
})
