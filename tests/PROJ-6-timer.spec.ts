import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { expect, test, type APIRequestContext, type Page } from '@playwright/test'
import { hasTestUser, SKIP_REASON } from './helpers/env'

// PROJ-6: Timer gegen die echte Datenbank, über REST mit der Sitzung des Testkontos und über die Oberfläche.
// Läuft als eigenes Projekt «timer» nach allen anderen Tests (der Timer ist pro Konto nur einmal da).
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

const AXE = readFileSync(resolve(process.cwd(), 'node_modules/axe-core/axe.min.js'), 'utf8')
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

// ---------- Oberfläche (Startseite, Leiste, Kundenseite) ----------

const START_ALLGEMEIN = () => new RegExp(`Timer starten: ${CODE} · Allgemein`)
const START_ZWEIT = () => new RegExp(`Timer starten: ${CODE} · Zweit`)
const timerRegion = (page: Page) => page.getByRole('region', { name: 'Laufender Timer' })

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

test.describe('Oberfläche', () => {
  test.use({ viewport: { width: 1280, height: 900 } })

  test('Startseite: Liste «Projekt starten» mit Start-Knopf je Projekt; Start zeigt die Timer-Karte und «Läuft»', async ({ page, request }) => {
    await rpc(request, 'discard_timer')
    await page.goto('/')
    await expect(page.getByRole('heading', { level: 3, name: 'Projekt starten' })).toBeVisible()
    await expect(timerRegion(page)).toHaveCount(0)
    await page.getByRole('button', { name: START_ALLGEMEIN() }).click()

    const card = timerRegion(page)
    await expect(card).toBeVisible()
    await expect(card).toContainText(CODE)
    await expect(card).toContainText('Allgemein')
    await expect(card.getByRole('timer')).toHaveText(/^0:00:\d\d$/)
    await expect(card.getByRole('button', { name: 'Stopp' })).toBeVisible()
    await expect(page.getByRole('button', { name: START_ALLGEMEIN() })).toHaveCount(0)
    await expect(page.getByRole('button', { name: START_ZWEIT() })).toBeEnabled()
    // Die Zeit läuft weiter
    const first = await card.getByRole('timer').textContent()
    await expect.poll(async () => card.getByRole('timer').textContent()).not.toBe(first)
  })

  test('Doppelklick auf «Start» (anderes Projekt) legt nur einen Timer an', async ({ page, request }) => {
    await page.goto('/')
    await page.getByRole('button', { name: START_ZWEIT() }).dblclick()
    await expect(timerRegion(page)).toContainText('Zweit')
    const rows = await (await request.get(`${base}/rest/v1/running_timers?select=id`, { headers })).json()
    expect(rows).toHaveLength(1)
  })

  test('Beschreibung wird gespeichert, bleibt nach dem Neuladen und erscheint auf einem zweiten Gerät', async ({ page, browser }) => {
    await page.goto('/')
    await page.getByLabel('Beschreibung (optional)').fill(`Konzept ${run}`)
    await page.waitForTimeout(2200) // Pause von 1,5 s, dann wird gespeichert
    await page.reload()
    await expect(page.getByLabel('Beschreibung (optional)')).toHaveValue(`Konzept ${run}`)

    const context = await browser.newContext({ storageState: 'tests/.auth/user.json', viewport: { width: 1280, height: 900 } })
    const second = await context.newPage()
    await second.goto('/')
    await expect(timerRegion(second)).toBeVisible()
    await expect(second.getByLabel('Beschreibung (optional)')).toHaveValue(`Konzept ${run}`)
    await context.close()
  })

  test('Leiste auf anderen Seiten, Tab-Titel mit Zeit und Kürzel, «Läuft» auf der Kundenseite', async ({ page }) => {
    await page.goto('/kunden')
    const bar = timerRegion(page).first()
    await expect(bar).toBeVisible()
    await expect(bar).toContainText('Zweit')
    await expect(bar.getByRole('button', { name: 'Stopp' })).toBeVisible()
    await expect(page).toHaveTitle(new RegExp(`^\\d+:\\d{2} · ${CODE} · `))

    await page.goto(`/kunden/${customerId}`)
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Timer DB')
    await expect(page.getByText('Läuft', { exact: true })).toBeVisible()
    await expect(page.getByRole('button', { name: START_ALLGEMEIN() })).toBeVisible()
    await expect(page).toHaveTitle(new RegExp(`^\\d+:\\d{2} · ${CODE} · ${CODE}`))

    // Ein Klick auf die Leiste führt zur Startseite
    await page.goto('/kunden')
    await timerRegion(page).first().getByRole('link').click()
    await expect(page).toHaveURL(/\/$/)
    await expect(page.getByRole('heading', { level: 1, name: 'Heute' })).toBeVisible()
  })

  test('Wechsel per Start bei einem anderen Projekt: Meldung nennt beides, nur ein Timer läuft', async ({ page, request }) => {
    await page.goto('/')
    await page.getByRole('button', { name: START_ALLGEMEIN() }).click()
    // Unter einer Minute: nicht gespeichert (selten, bei Minutengrenze: gespeichert)
    await expect(page.getByText(new RegExp(`Timer für ${CODE} · Allgemein gestartet`))).toBeVisible()
    await expect(timerRegion(page)).toContainText('Allgemein')
    const rows = await (await request.get(`${base}/rest/v1/running_timers?select=id`, { headers })).json()
    expect(rows).toHaveLength(1)
  })

  test('Verwerfen: Rückfrage, Abbrechen lässt den Timer laufen, Bestätigen beendet ihn ohne Eintrag', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('button', { name: 'Verwerfen' }).click()
    const dialog = page.getByRole('alertdialog')
    await expect(dialog).toContainText('Timer verwerfen?')
    await expect(dialog).toContainText('wird nicht gespeichert')
    await dialog.getByRole('button', { name: 'Abbrechen' }).click()
    await expect(timerRegion(page)).toBeVisible()
    await expect(page.getByRole('button', { name: 'Verwerfen' })).toBeFocused()

    await page.getByRole('button', { name: 'Verwerfen' }).click()
    await page.getByRole('alertdialog').getByRole('button', { name: 'Verwerfen' }).click()
    await expect(timerRegion(page)).toHaveCount(0)
    await expect(page.getByText('Timer verworfen.')).toBeVisible()
    await expect(page.getByRole('button', { name: START_ALLGEMEIN() })).toBeEnabled()
  })

  test('Fehler beim Start (kein Netz): Meldung, kein Timer, Knopf bleibt benutzbar', async ({ page, request }) => {
    await page.goto('/')
    await page.route('**/rest/v1/rpc/start_timer', (route) => route.abort('failed'))
    await page.getByRole('button', { name: START_ALLGEMEIN() }).click()
    await expect(page.getByText(/Keine Verbindung/).first()).toBeVisible()
    await expect(timerRegion(page)).toHaveCount(0)
    await expect(page.getByRole('button', { name: START_ALLGEMEIN() })).toBeEnabled()
    await page.unroute('**/rest/v1/rpc/start_timer')
    const rows = await (await request.get(`${base}/rest/v1/running_timers?select=id`, { headers })).json()
    expect(rows).toHaveLength(0)
  })

  for (const width of [320, 375, 768, 1440]) {
    test(`Layout bei ${width} px mit laufendem Timer: nichts läuft über, Ziele mindestens 44 px, die Leiste verdeckt die Tab-Leiste nicht`, async ({ page, request }) => {
      await page.setViewportSize({ width, height: 800 })
      await rpc(request, 'start_timer', { p_project_id: projectA })
      const noScroll = () => page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)
      const small = () =>
        page.evaluate(() => {
          const out: string[] = []
          document.querySelectorAll('main button, main a[href], [role="region"][aria-label="Laufender Timer"] button, [role="region"][aria-label="Laufender Timer"] a').forEach((el) => {
            const r = (el as HTMLElement).getBoundingClientRect()
            if (r.width === 0 || r.height === 0) return
            if (r.height < 43.5) out.push(`${el.tagName} «${(el.textContent ?? '').trim().slice(0, 25)}» ${Math.round(r.height)}px`)
          })
          return out
        })

      await page.goto('/')
      await expect(timerRegion(page)).toBeVisible()
      expect(await noScroll(), 'Startseite').toBe(true)
      expect(await small(), 'Startseite').toEqual([])

      await page.goto('/kunden')
      await expect(timerRegion(page).first()).toBeVisible()
      expect(await noScroll(), 'Kundenliste').toBe(true)
      expect(await small(), 'Kundenliste').toEqual([])
      if (width < 768) {
        // Leiste liegt über der Tab-Leiste, überdeckt sie nicht
        const bar = await page.locator('[role="region"][aria-label="Laufender Timer"]:visible').first().boundingBox()
        const tabs = await page.getByRole('navigation', { name: 'Hauptnavigation' }).boundingBox()
        expect(bar!.y + bar!.height).toBeLessThanOrEqual(tabs!.y + 1)
        // Das Seitenende bleibt erreichbar: Der letzte Kunde liegt nach dem Scrollen über der Leiste
        await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
        const last = await page.locator('main ul > li').last().boundingBox()
        expect(last!.y + last!.height).toBeLessThanOrEqual(bar!.y + 1)
      }

      await page.goto(`/kunden/${customerId}`)
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
      expect(await noScroll(), 'Kundenseite').toBe(true)
      expect(await small(), 'Kundenseite').toEqual([])
      await rpc(request, 'discard_timer')
    })
  }

  test('Lange Namen bei 320 px: Karte, Leiste und Liste laufen nicht über', async ({ page, request }) => {
    const longName = `Wortlos${run}${'x'.repeat(80)}`
    const code = `T-TL${run}`
    await page.setViewportSize({ width: 320, height: 800 })
    const created = await rpc(request, 'create_customer', { p_code: code, p_name: longName })
    const long = (await created.json()).id
    const projects = await (await request.get(`${base}/rest/v1/projects?select=id&customer_id=eq.${long}`, { headers })).json()
    await rpc(request, 'start_timer', { p_project_id: projects[0].id })
    const noScroll = () => page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)
    for (const path of ['/', '/kunden']) {
      await page.goto(path)
      await expect(timerRegion(page).first()).toBeVisible()
      expect(await noScroll(), path).toBe(true)
    }
    await rpc(request, 'discard_timer')
    await rpc(request, 'archive_customer', { p_id: long })
  })

  for (const scheme of ['light', 'dark'] as const) {
    test(`Barrierefreiheit (axe, WCAG AA) im ${scheme === 'dark' ? 'Dunkel' : 'Hell'}modus: Startseite mit Karte, Leiste, Verwerfen-Rückfrage`, async ({ page, request }) => {
      await page.addInitScript((value) => localStorage.setItem('theme', value), scheme)
      await page.emulateMedia({ colorScheme: scheme })
      await rpc(request, 'start_timer', { p_project_id: projectA })
      await page.goto('/')
      await expect(timerRegion(page)).toBeVisible()
      expect(await page.evaluate(() => document.documentElement.classList.contains('dark'))).toBe(scheme === 'dark')
      expect(await axeViolations(page), 'Startseite').toEqual([])
      await page.getByRole('button', { name: 'Verwerfen' }).click()
      await expect(page.getByRole('alertdialog')).toBeVisible()
      expect(await axeViolations(page), 'Rückfrage').toEqual([])
      await page.keyboard.press('Escape')
      await expect(page.getByRole('button', { name: 'Verwerfen' })).toBeFocused()
      await page.goto('/kunden')
      await expect(timerRegion(page).first()).toBeVisible()
      expect(await axeViolations(page), 'Kundenliste mit Leiste').toEqual([])
      await rpc(request, 'discard_timer')
    })
  }

  test('Sitzung abgelaufen beim Stopp: Hinweis, der Timer läuft weiter (Server)', async ({ page, context, request }) => {
    await rpc(request, 'start_timer', { p_project_id: projectA })
    await page.goto('/')
    await expect(timerRegion(page)).toBeVisible()
    await context.clearCookies()
    await page.getByRole('button', { name: 'Stopp' }).click()
    await expect(page.getByText(/Anmeldung|nicht geklappt/).first()).toBeVisible()
    const rows = await (await request.get(`${base}/rest/v1/running_timers?select=id`, { headers })).json()
    expect(rows).toHaveLength(1)
    await rpc(request, 'discard_timer')
  })
})

test('Ganzer Ablauf: Timer läuft, der Kunde wird archiviert, Stopp nach über einer Minute speichert Einträge mit Uhrzeiten und Beschreibung', async ({ page, request }) => {
  test.setTimeout(150000)
  await page.setViewportSize({ width: 1280, height: 900 })
  await rpc(request, 'discard_timer')
  await page.goto('/')
  await page.getByRole('button', { name: START_ALLGEMEIN() }).click()
  await expect(timerRegion(page)).toBeVisible()
  await page.getByLabel('Beschreibung (optional)').fill(`Echter Ablauf ${run}`)

  // «Anderes Gerät»: Der Kunde wird archiviert, der Timer läuft weiter (Spec PROJ-3)
  const archived = await rpc(request, 'archive_customer', { p_id: customerId })
  expect(archived.ok()).toBe(true)
  await new Promise((resolveWait) => setTimeout(resolveWait, 62000))
  await page.reload()
  await expect(timerRegion(page)).toBeVisible()
  await expect(page.getByLabel('Beschreibung (optional)')).toHaveValue(`Echter Ablauf ${run}`)
  await expect(page.getByRole('button', { name: START_ALLGEMEIN() })).toHaveCount(0)

  await page.getByRole('button', { name: 'Stopp' }).click()
  await expect(page.getByText(new RegExp(`${CODE} · Allgemein: 0:0[1-3] gespeichert`))).toBeVisible()
  await expect(timerRegion(page)).toHaveCount(0)
  // Der Eintrag erscheint unter «Heute» (ohne Neuladen), mit Uhrzeiten und Beschreibung
  const row = page.getByRole('listitem').filter({ hasText: `Echter Ablauf ${run}` }).first()
  await expect(row).toBeVisible()
  await expect(row).toContainText(/\d\d:\d\d–\d\d:\d\d/)
  await expect(row).toContainText('verrechenbar')
  // In der Datenbank: verrechenbar = Dauer, Uhrzeiten gesetzt
  const entries = await (await request.get(`${base}/rest/v1/time_entries?select=*&description=eq.Echter Ablauf ${run}`, { headers })).json()
  expect(entries.length).toBeGreaterThanOrEqual(1)
  for (const entry of entries) {
    expect(entry.billable_minutes).toBe(entry.duration_minutes)
    expect(entry.start_time).not.toBeNull()
    expect(entry.end_time).not.toBeNull()
  }
  expect((await (await rpc(request, 'get_timer')).json()).timer).toBeNull()
})

test('Archivierte Projekte: Start abgelehnt', async ({ request }) => {
  await rpc(request, 'archive_customer', { p_id: customerId }) // schon archiviert: ohne Wirkung
  const response = await rpc(request, 'start_timer', { p_project_id: projectA })
  expect(response.status()).toBe(400)
  expect(await response.text()).toContain('target_archived')
})
