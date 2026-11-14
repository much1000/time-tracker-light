import { resolve } from 'node:path'
import { expect, test, type Page } from '@playwright/test'
import { hasTestUser, SKIP_REASON } from './helpers/env'
import { findLeaks } from './helpers/leaks'

// PROJ-4 QA: Randfälle, Zeitzone (Zürcher Uhr), Fehlerzustände, Sicherheit.
// Alle Tests sind unabhängig vom Inhalt der Tabelle (keine Annahme «Heute ist leer»), weil es kein
// Löschen gibt und Testeinträge bleiben. Testkunden tragen das Präfix «T-» und werden archiviert.

try {
  ;(process as unknown as { loadEnvFile: (path: string) => void }).loadEnvFile(
    resolve(process.cwd(), '.env.local')
  )
} catch {
  // Datei fehlt
}

const run = Date.now().toString(36).slice(-5).toUpperCase()
const CODE_A = `T-QA${run}`
const NAME_A = `QA Zeit A ${run}`
const CODE_B = `T-QB${run}`
const NAME_B = `QA Zeit B ${run}`

test.skip(!hasTestUser, SKIP_REASON)
test.describe.configure({ mode: 'serial' })
test.use({ viewport: { width: 1280, height: 900 } })

async function createCustomer(page: Page, code: string, name: string) {
  await page.goto('/kunden')
  await page.getByRole('button', { name: 'Neuer Kunde' }).first().click()
  await page.getByLabel('Kürzel').fill(code)
  await page.getByLabel('Name').fill(name)
  await page.getByRole('button', { name: 'Speichern' }).click()
  await expect(page.getByRole('link', { name: new RegExp(name) })).toBeVisible()
}

async function archiveCustomer(page: Page, name: string) {
  await page.goto('/kunden')
  await page.getByRole('link', { name: new RegExp(name) }).first().click()
  await page.getByRole('button', { name: 'Archivieren', exact: true }).click()
  await page.getByRole('alertdialog').getByRole('button', { name: 'Archivieren' }).click()
  await expect(page.getByText('Dieser Kunde ist archiviert')).toBeVisible()
}

async function openForm(page: Page) {
  await page.getByRole('button', { name: 'Zeit erfassen' }).first().click()
  await expect(page.getByRole('dialog')).toBeVisible()
  await expect(page.getByRole('dialog').getByRole('status')).toHaveCount(0)
  await expect(page.getByLabel('Datum')).toBeVisible()
}

async function pick(page: Page, code: string) {
  await page.getByLabel('Kunde').click()
  await page.getByRole('option', { name: new RegExp(code) }).click()
}

async function accessToken(page: Page): Promise<string> {
  const cookies = await page.context().cookies()
  const raw = cookies
    .filter((c) => /auth-token/.test(c.name))
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((c) => c.value)
    .join('')
  return JSON.parse(Buffer.from(decodeURIComponent(raw).replace(/^base64-/, ''), 'base64url').toString()).access_token
}

test('Vorbereitung: zwei Testkunden anlegen', async ({ page }) => {
  await createCustomer(page, CODE_A, NAME_A)
  await createCustomer(page, CODE_B, NAME_B)
})

test.describe('Zeitzone: «heute» nach der Zürcher Uhr', () => {
  test('AC: kurz nach Mitternacht in Zürich zeigt die Startseite schon den neuen Tag (Winterzeit)', async ({ page }) => {
    // 23:30 UTC am 13.11. = 00:30 am 14.11. in Zürich
    await page.clock.setFixedTime(new Date('2026-11-13T23:30:00Z'))
    await page.goto('/')
    await expect(page.getByRole('heading', { level: 1, name: 'Heute' })).toBeVisible()
    await expect(page.getByText(/14\. November 2026/)).toBeVisible()
    await openForm(page)
    await expect(page.getByLabel('Datum')).toHaveValue('2026-11-14')
    await page.keyboard.press('Escape')
  })

  test('AC: kurz vor Mitternacht in Zürich gilt noch der alte Tag, Sommerzeit wird berücksichtigt', async ({ page }) => {
    await page.clock.setFixedTime(new Date('2026-11-13T22:30:00Z')) // 23:30 in Zürich
    await page.goto('/')
    await expect(page.getByText(/13\. November 2026/)).toBeVisible()
    await page.clock.setFixedTime(new Date('2026-07-15T22:30:00Z')) // Sommer: 00:30 am 16.7.
    await page.reload()
    await expect(page.getByText(/16\. Juli 2026/)).toBeVisible()
  })

  test('AC: Endzeit in der Zukunft und Datum in der Zukunft werden abgelehnt (feste Uhr 10:00 Zürich)', async ({ page }) => {
    await page.clock.setFixedTime(new Date('2026-11-13T09:00:00Z')) // 10:00 in Zürich
    await page.goto('/')
    await openForm(page)
    await pick(page, CODE_A)
    await page.getByRole('tab', { name: 'Von–bis' }).click()
    await page.getByLabel('Von', { exact: true }).fill('09:00')
    await page.getByLabel('Bis', { exact: true }).fill('10:30')
    await page.getByRole('button', { name: 'Speichern' }).click()
    await expect(page.getByText('Die Endzeit liegt in der Zukunft.')).toBeVisible()
    await page.getByLabel('Datum').fill('2026-11-14')
    await page.getByRole('button', { name: 'Speichern' }).click()
    await expect(page.getByText('Das Datum darf nicht in der Zukunft liegen.')).toBeVisible()
    await expect(page.getByRole('dialog')).toBeVisible()
  })
})

test.describe('Formular: Randfälle', () => {
  test('AC: ungültiges oder leeres Datum wird am Feld gemeldet', async ({ page }) => {
    await page.goto('/')
    await openForm(page)
    await pick(page, CODE_A)
    await page.getByLabel('Dauer', { exact: true }).fill('1:00')
    await page.getByLabel('Datum').fill('')
    await page.getByRole('button', { name: 'Speichern' }).click()
    await expect(page.getByText('Bitte gib ein gültiges Datum ein.')).toBeVisible()
    await expect(page.getByRole('dialog')).toBeVisible()
  })

  test('AC: Beschreibung bis 1000 Zeichen wird gespeichert, 1001 abgelehnt; verrechenbar 0 wird gespeichert', async ({ page }) => {
    await page.goto('/')
    await openForm(page)
    await pick(page, CODE_A)
    await page.getByLabel('Dauer', { exact: true }).fill('0:05')
    await page.getByLabel('Beschreibung (optional)').fill('y'.repeat(1001))
    await page.getByRole('button', { name: 'Speichern' }).click()
    await expect(page.getByText('Die Beschreibung darf höchstens 1000 Zeichen haben.')).toBeVisible()
    await page.getByLabel('Beschreibung (optional)').fill(`Tausend ${run} ` + 'y'.repeat(980))
    await page.getByLabel('Verrechenbar').fill('0')
    await page.getByRole('button', { name: 'Speichern' }).click()
    await expect(page.getByRole('dialog')).toHaveCount(0)
    const row = page.getByRole('listitem').filter({ hasText: `Tausend ${run}` })
    await expect(row).toContainText('0:05')
    await expect(row).toContainText('verrechenbar 0:00')
  })

  test('AC: Von–bis wird mit Uhrzeiten gespeichert und in «Heute» angezeigt; Dauer 1 Minute ist erlaubt', async ({ page }) => {
    await page.goto('/')
    await openForm(page)
    await pick(page, CODE_A)
    await page.getByRole('tab', { name: 'Von–bis' }).click()
    await page.getByLabel('Von', { exact: true }).fill('00:00')
    await page.getByLabel('Bis', { exact: true }).fill('00:01')
    await page.getByLabel('Beschreibung (optional)').fill(`Minute ${run}`)
    await expect(page.getByText('Dauer: 0:01')).toBeVisible()
    await page.getByRole('button', { name: 'Speichern' }).click()
    await expect(page.getByRole('dialog')).toHaveCount(0)
    const row = page.getByRole('listitem').filter({ hasText: `Minute ${run}` })
    await expect(row).toContainText('00:00–00:01')
    await expect(row).toContainText('0:01')
  })

  test('AC: Kundenwechsel setzt das Projekt auf «Allgemein» des neuen Kunden', async ({ page }) => {
    await page.goto('/')
    await openForm(page)
    await pick(page, CODE_A)
    await expect(page.getByLabel('Projekt')).toContainText('Allgemein')
    await pick(page, CODE_B)
    await expect(page.getByLabel('Kunde')).toContainText(CODE_B)
    await expect(page.getByLabel('Projekt')).toContainText('Allgemein')
    // Projektliste zeigt nur Projekte des gewählten Kunden
    await page.getByLabel('Projekt').click()
    await expect(page.getByRole('option')).toHaveCount(1)
    await page.keyboard.press('Escape')
    await page.keyboard.press('Escape')
  })

  test('AC: Tastatur: Fokus bleibt im Formular, Umschalter per Pfeiltasten, Kunde per Tastatur wählbar', async ({ page }) => {
    await page.goto('/')
    const open = page.getByRole('button', { name: 'Zeit erfassen' }).first()
    await open.focus()
    await page.keyboard.press('Enter')
    await expect(page.getByRole('dialog')).toBeVisible()
    await expect(page.getByRole('dialog').getByRole('status')).toHaveCount(0)
    for (let i = 0; i < 25; i++) {
      await page.keyboard.press('Tab')
      expect(await page.evaluate(() => !!document.activeElement?.closest('[role="dialog"]'))).toBe(true)
    }
    // Kunde per Tastatur: Auswahl öffnen, Eintrag wählen
    await page.getByLabel('Kunde').focus()
    await page.keyboard.press('Enter')
    await page.getByRole('option', { name: new RegExp(CODE_A) }).focus()
    await page.keyboard.press('Enter')
    await expect(page.getByLabel('Kunde')).toContainText(CODE_A)
    // Umschalter mit Pfeiltasten
    await page.getByRole('tab', { name: 'Nur Dauer' }).focus()
    await expect(page.getByRole('tab', { name: 'Nur Dauer' })).toBeFocused()
    await page.keyboard.press('ArrowRight')
    await expect(page.getByRole('tab', { name: 'Von–bis' })).toHaveAttribute('aria-selected', 'true')
    await page.keyboard.press('Escape')
    await expect(page.getByRole('dialog')).toHaveCount(0)
    await expect(open).toBeFocused()
  })

  test('AC: Doppelklick auf «Speichern» legt nur einen Eintrag an', async ({ page }) => {
    await page.goto('/')
    await openForm(page)
    await pick(page, CODE_A)
    await page.getByLabel('Dauer', { exact: true }).fill('0:07')
    await page.getByLabel('Beschreibung (optional)').fill(`Doppel ${run}`)
    await page.getByRole('button', { name: 'Speichern' }).dblclick()
    await expect(page.getByRole('dialog')).toHaveCount(0)
    await expect(page.getByRole('listitem').filter({ hasText: `Doppel ${run}` })).toHaveCount(1)
    await page.reload()
    await expect(page.getByRole('listitem').filter({ hasText: `Doppel ${run}` })).toHaveCount(1)
  })

  test('AC: Mehrere Einträge: Tagessumme stimmt mit der Summe der Zeilen überein', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByRole('heading', { level: 2, name: 'Einträge' })).toBeVisible()
    const result = await page.evaluate(() => {
      const toMinutes = (text: string) => {
        const [h, m] = text.split(':').map(Number)
        return h * 60 + m
      }
      const rows = [...document.querySelectorAll('section[aria-labelledby="today-entries"] ul > li')]
      let worked = 0
      let billable = 0
      for (const row of rows) {
        const worked_text = row.querySelector('p.font-semibold')?.textContent ?? '0:00'
        const billable_text = (row.querySelector('p.text-xs')?.textContent ?? 'verrechenbar 0:00').replace('verrechenbar', '').trim()
        worked += toMinutes(worked_text)
        billable += toMinutes(billable_text)
      }
      const cards = [...document.querySelectorAll('p.text-2xl')].map((el) => toMinutes(el.textContent ?? '0:00'))
      return { worked, billable, cards, count: rows.length }
    })
    expect(result.count).toBeGreaterThan(2)
    expect(result.cards).toEqual([result.worked, result.billable])
  })
})

test.describe('Fehlerzustände', () => {
  test('AC: Netzwerkfehler beim Speichern: Meldung, Eingaben bleiben, danach erneut speichern klappt', async ({ page }) => {
    await page.goto('/')
    await openForm(page)
    await pick(page, CODE_A)
    await page.getByLabel('Dauer', { exact: true }).fill('0:11')
    await page.getByLabel('Beschreibung (optional)').fill(`Offline ${run}`)
    let blocked = true
    await page.route('**/rest/v1/time_entries*', (route) => {
      if (blocked && route.request().method() === 'POST') return route.abort('failed')
      return route.continue()
    })
    await page.getByRole('button', { name: 'Speichern' }).click()
    await expect(page.getByRole('dialog').getByRole('alert')).toContainText('nicht erreichbar')
    await expect(page.getByLabel('Dauer', { exact: true })).toHaveValue('0:11')
    await expect(page.getByLabel('Beschreibung (optional)')).toHaveValue(`Offline ${run}`)
    blocked = false
    await page.getByRole('button', { name: 'Speichern' }).click()
    await expect(page.getByRole('dialog')).toHaveCount(0)
    await expect(page.getByRole('listitem').filter({ hasText: `Offline ${run}` })).toHaveCount(1)
  })

  test('AC: Ladefehler der Startseite zeigt «Erneut versuchen», danach erscheinen die Einträge', async ({ page }) => {
    let fail = true
    await page.route('**/rest/v1/time_entries*', (route) => {
      if (fail && route.request().method() === 'GET') return route.abort('failed')
      return route.continue()
    })
    await page.goto('/')
    await expect(page.locator('#main-content').getByRole('alert')).toContainText('konnten nicht geladen werden', { timeout: 20000 })
    fail = false
    await page.getByRole('button', { name: 'Erneut versuchen' }).click()
    await expect(page.getByRole('heading', { level: 2, name: 'Einträge' })).toBeVisible()
  })

  test('AC: Sitzung abgelaufen beim Speichern: Hinweis, Eingabe bleibt erhalten, nichts gespeichert', async ({ page, context }) => {
    await page.goto('/')
    await openForm(page)
    await pick(page, CODE_A)
    await page.getByLabel('Dauer', { exact: true }).fill('0:13')
    await page.getByLabel('Beschreibung (optional)').fill(`Abgelaufen ${run}`)
    await context.clearCookies()
    await page.getByRole('button', { name: 'Speichern' }).click()
    await expect(page.getByRole('dialog').getByRole('alert')).toContainText(/Anmeldung|nicht geklappt/)
    await expect(page.getByLabel('Dauer', { exact: true })).toHaveValue('0:13')
  })
})

test('AC: sehr langer Kundenname ohne Leerzeichen bei 320 px: Auswahl, Formular und «Heute» laufen nicht über', async ({ page }) => {
  const longName = `Wortlos${run}${'x'.repeat(80)}`
  const code = `T-W${run}`
  await page.setViewportSize({ width: 320, height: 800 })
  await createCustomer(page, code, longName)
  const noScroll = () => page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)
  await page.goto('/')
  await openForm(page)
  await pick(page, code)
  expect(await noScroll(), 'Formular').toBe(true)
  await page.getByLabel('Dauer', { exact: true }).fill('0:03')
  await page.getByLabel('Beschreibung (optional)').fill(`Lang ${run}`)
  await page.getByLabel('Kunde').click()
  expect(await noScroll(), 'geöffnete Auswahl').toBe(true)
  await page.keyboard.press('Escape')
  await page.getByRole('button', { name: 'Speichern' }).click()
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await expect(page.getByRole('listitem').filter({ hasText: `Lang ${run}` })).toBeVisible()
  expect(await noScroll(), 'Heute').toBe(true)
  await archiveCustomer(page, longName)
})

test('Randfall: Kunde wird archiviert, während das Formular offen ist: Datenbank lehnt ab, Hinweis am Projekt', async ({ page, request }) => {
  await page.goto('/')
  await openForm(page)
  await pick(page, CODE_B)
  await page.getByLabel('Dauer', { exact: true }).fill('0:17')
  await page.getByLabel('Beschreibung (optional)').fill(`Archiviert ${run}`)

  // «Anderes Gerät»: Kunde B wird über die Datenbankfunktion archiviert
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL as string
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string
  test.skip(!base || !anon, 'Supabase-Umgebungsvariablen fehlen im Testprozess')
  const headers = { apikey: anon, Authorization: `Bearer ${await accessToken(page)}`, 'Content-Type': 'application/json' }
  const customers = await (await request.get(`${base}/rest/v1/customers?select=id&code=eq.${CODE_B}`, { headers })).json()
  const archive = await request.post(`${base}/rest/v1/rpc/archive_customer`, { headers, data: { p_id: customers[0].id } })
  expect(archive.ok()).toBe(true)

  await page.getByRole('button', { name: 'Speichern' }).click()
  await expect(page.getByText(/archiviert/).first()).toBeVisible()
  await expect(page.getByRole('dialog')).toBeVisible()
  await expect(page.getByLabel('Dauer', { exact: true })).toHaveValue('0:17')
  await page.keyboard.press('Escape')
  await page.reload()
  await expect(page.getByText(`Archiviert ${run}`)).toHaveCount(0)
})

test('Sicherheit: Buchung auf archivierten Kunden direkt an der Datenbank abgelehnt; erfasste Zeiten bleiben', async ({ page, request }) => {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL as string
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string
  test.skip(!base || !anon, 'Supabase-Umgebungsvariablen fehlen im Testprozess')
  await page.goto('/')
  const headers = { apikey: anon, Authorization: `Bearer ${await accessToken(page)}`, 'Content-Type': 'application/json', Prefer: 'return=representation' }
  const customers = await (await request.get(`${base}/rest/v1/customers?select=id&code=eq.${CODE_B}`, { headers })).json()
  const projects = await (await request.get(`${base}/rest/v1/projects?select=id&customer_id=eq.${customers[0].id}`, { headers })).json()
  const today = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Zurich' }).format(new Date())
  const response = await request.post(`${base}/rest/v1/time_entries`, {
    headers,
    data: { project_id: projects[0].id, entry_date: today, duration_minutes: 10, billable_minutes: 10 },
  })
  expect(response.status()).toBe(400)
  expect(await response.text()).toContain('target_archived')
})

test('Sicherheit: keine Geheimnisse in Antworten der Startseite, keine Konsolenfehler, Beschreibung als Text', async ({ page }) => {
  const errors: string[] = []
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()))
  page.on('pageerror', (e) => errors.push(e.message))
  const bodies: string[] = []
  page.on('response', async (r) => {
    const type = r.headers()['content-type'] ?? ''
    if (/json|html|javascript/.test(type)) {
      try {
        bodies.push(await r.text())
      } catch {
        // nicht lesbar
      }
    }
  })
  await page.goto('/')
  await expect(page.getByRole('heading', { level: 2, name: 'Einträge' })).toBeVisible()
  expect(bodies.flatMap(findLeaks)).toEqual([])
  expect(errors).toEqual([])
})

test('Aufräumen: Testkunden archivieren', async ({ page }) => {
  await archiveCustomer(page, NAME_A)
  // Kunde B wurde im Randfall schon archiviert
  await page.goto('/kunden')
  await page.getByRole('button', { name: /Archiv \(/ }).click()
  await expect(page.getByRole('link', { name: new RegExp(CODE_B) })).toBeVisible()
})
