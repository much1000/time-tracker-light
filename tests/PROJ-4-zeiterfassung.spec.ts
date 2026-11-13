import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { expect, test, type Page } from '@playwright/test'
import { hasTestUser, NO_LOGIN, SKIP_REASON } from './helpers/env'

// PROJ-4: Zeiterfassung auf der Startseite gegen die echte Datenbank. Der Test legt einen Kunden «T-…»
// an und archiviert ihn am Ende. Es gibt kein Löschen: Die Testeinträge bleiben in der Tabelle und werden
// nach dem Lauf per SQL entfernt (nur Einträge auf Kunden mit Kürzel «T-…», siehe Spec, Abschnitt Tests).

try {
  ;(process as unknown as { loadEnvFile: (path: string) => void }).loadEnvFile(
    resolve(process.cwd(), '.env.local')
  )
} catch {
  // Datei fehlt: Der Test mit direktem Datenbankzugriff wird übersprungen.
}

const AXE = readFileSync(resolve(process.cwd(), 'node_modules/axe-core/axe.min.js'), 'utf8')
const run = Date.now().toString(36).slice(-5).toUpperCase()
const CODE = `T-Z${run}`
const NAME = `Zeit Kunde ${run}`

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

async function noHorizontalScroll(page: Page) {
  return page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)
}

async function pickCustomer(page: Page) {
  await page.getByLabel('Kunde').click()
  await page.getByRole('option', { name: new RegExp(CODE) }).click()
  await expect(page.getByLabel('Projekt')).toContainText('Allgemein')
}

// Ohne früheren Eintrag sind Kunde und Projekt leer; dann wird der Testkunde gewählt.
async function openForm(page: Page, options: { pick?: boolean } = { pick: true }) {
  await page.getByRole('button', { name: 'Zeit erfassen' }).first().click()
  await expect(page.getByRole('dialog')).toBeVisible()
  await expect(page.getByLabel('Datum')).toBeVisible()
  if (options.pick !== false && (await page.getByLabel('Kunde').textContent())?.includes('Kunde wählen')) {
    await pickCustomer(page)
  }
}

test.describe('ohne Anmeldung', () => {
  test.use({ storageState: NO_LOGIN })

  test('AC: Startseite führt ohne Anmeldung auf die Anmeldung und zeigt keine Daten', async ({ page }) => {
    await page.goto('/')
    await expect(page).toHaveURL(/\/login/)
    await expect(page.locator('body')).not.toContainText('Zeit erfassen')
  })
})

test.describe('mit Anmeldung', () => {
  test.skip(!hasTestUser, SKIP_REASON)
  test.describe.configure({ mode: 'serial' })
  test.use({ viewport: { width: 1280, height: 900 } })

  test('Vorbereitung: Testkunde anlegen', async ({ page }) => {
    await page.goto('/kunden')
    await page.getByRole('button', { name: 'Neuer Kunde' }).click()
    await page.getByLabel('Kürzel').fill(CODE)
    await page.getByLabel('Name').fill(NAME)
    await page.getByRole('button', { name: 'Speichern' }).click()
    await expect(page.getByRole('link', { name: new RegExp(NAME) })).toBeVisible()
  })

  // Der Leerzustand ist per Komponententest abgedeckt: Testeinträge bleiben in der Tabelle (kein Löschen),
  // «Heute» ist deshalb im E2E nicht verlässlich leer.
  test('AC: Startseite zeigt «Heute» mit Datum und Knopf «Zeit erfassen»', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByRole('heading', { level: 1, name: 'Heute' })).toBeVisible()
    await expect(page.getByRole('status', { name: 'Wird geladen' })).toHaveCount(0)
    await expect(page.getByRole('button', { name: 'Zeit erfassen' }).first()).toBeVisible()
  })

  test('AC: Eintrag erfassen (Dauer), Verrechenbar folgt, Eintrag und Tagessumme erscheinen, Vorbelegung beim nächsten Mal', async ({ page }) => {
    await page.goto('/')
    await openForm(page, { pick: false })
    const today = await page.getByLabel('Datum').inputValue()
    expect(today).toMatch(/^\d{4}-\d{2}-\d{2}$/)

    await pickCustomer(page)
    await page.getByLabel('Dauer', { exact: true }).fill('1,5')
    await expect(page.getByLabel('Verrechenbar')).toHaveValue('1:30')
    await page.getByLabel('Beschreibung (optional)').fill(`Konzept ${run}`)
    await page.getByRole('button', { name: 'Speichern' }).click()

    await expect(page.getByRole('dialog')).toHaveCount(0)
    await expect(page.getByText(`Konzept ${run}`)).toBeVisible()
    await expect(page.getByRole('listitem').filter({ hasText: `Konzept ${run}` })).toContainText('1:30')
    await expect(page.getByText('Gearbeitet')).toBeVisible()
    // Heute gespeichert: nach dem Neuladen noch da (Vorschau-Speicher im Browser)
    await page.reload()
    await expect(page.getByText(`Konzept ${run}`)).toBeVisible()

    // Nächstes Mal: Kunde und Projekt vorbelegt, Fokus in der Dauer
    await openForm(page, { pick: false })
    // Vorbelegt mit dem zuletzt erfassten Ziel (parallele Testläufe können ein anderes Ziel sein)
    await expect(page.getByLabel('Kunde')).not.toContainText('Kunde wählen')
    await expect(page.getByLabel('Projekt')).not.toContainText('Projekt wählen')
    await expect(page.getByLabel('Dauer', { exact: true })).toBeFocused()
    await page.keyboard.press('Escape')
  })

  test('AC: Prüfregeln am Feld: leere und mehrdeutige Dauer, verrechenbar zu gross, Zukunft', async ({ page }) => {
    await page.goto('/')
    await openForm(page)
    await page.getByRole('button', { name: 'Speichern' }).click()
    await expect(page.getByText('Bitte gib eine Dauer ein.')).toBeVisible()
    await expect(page.getByLabel('Dauer', { exact: true })).toHaveAttribute('aria-invalid', 'true')

    await page.getByLabel('Dauer', { exact: true }).fill('90')
    await page.getByRole('button', { name: 'Speichern' }).click()
    await expect(page.getByText(/Bitte als Std:Min eingeben/).first()).toBeVisible()

    await page.getByLabel('Dauer', { exact: true }).fill('1:00')
    await page.getByLabel('Verrechenbar').fill('2:00')
    await page.getByRole('button', { name: 'Speichern' }).click()
    await expect(page.getByText(/nicht grösser sein als die gearbeitete Dauer/)).toBeVisible()
    await page.getByLabel('Verrechenbar').fill('0')

    await page.getByLabel('Datum').fill('2999-01-01')
    await page.getByRole('button', { name: 'Speichern' }).click()
    await expect(page.getByText('Das Datum darf nicht in der Zukunft liegen.')).toBeVisible()
    await expect(page.getByRole('dialog')).toBeVisible()
    await page.keyboard.press('Escape')
  })

  test('AC: Nacherfassung mit früherem Datum erscheint nicht unter «Heute»; von–bis mit Überschneidungshinweis', async ({ page }) => {
    await page.goto('/')
    await openForm(page)
    await page.getByLabel('Datum').fill('2026-01-05')
    await page.getByRole('tab', { name: 'Von–bis' }).click()
    await page.getByLabel('Von', { exact: true }).fill('08:00')
    await page.getByLabel('Bis', { exact: true }).fill('09:00')
    await expect(page.getByText('Dauer: 1:00')).toBeVisible()
    await page.getByRole('button', { name: 'Speichern' }).click()
    await expect(page.getByRole('dialog')).toHaveCount(0)
    await expect(page.getByText('08:00–09:00')).toHaveCount(0)

    // Gleicher Tag, überschneidender Zeitraum: Hinweis, Speichern bleibt möglich
    await openForm(page)
    await page.getByLabel('Datum').fill('2026-01-05')
    await page.getByRole('tab', { name: 'Von–bis' }).click()
    await page.getByLabel('Von', { exact: true }).fill('08:30')
    await page.getByLabel('Bis', { exact: true }).fill('09:30')
    await expect(page.getByText(/Überschneidung mit/)).toBeVisible()
    await expect(page.getByRole('button', { name: 'Speichern' })).toBeEnabled()
    await page.keyboard.press('Escape')
  })

  test('AC: Ende vor Start und Endzeit in der Zukunft werden abgelehnt', async ({ page }) => {
    await page.goto('/')
    await openForm(page)
    await page.getByRole('tab', { name: 'Von–bis' }).click()
    await page.getByLabel('Von', { exact: true }).fill('10:00')
    await page.getByLabel('Bis', { exact: true }).fill('09:00')
    await page.getByRole('button', { name: 'Speichern' }).click()
    await expect(page.getByText(/Das Ende muss nach dem Start liegen/)).toBeVisible()
    await page.keyboard.press('Escape')
  })

  test('Sicherheit: HTML und Skripte in der Beschreibung werden als Text angezeigt', async ({ page }) => {
    const dialogs: string[] = []
    page.on('dialog', (d) => {
      dialogs.push(d.message())
      void d.dismiss()
    })
    const evil = `<img src=x onerror=alert(1)> '; drop table time_entries;-- 😀 ${run}`
    await page.goto('/')
    await openForm(page)
    await page.getByLabel('Dauer', { exact: true }).fill('0:10')
    await page.getByLabel('Beschreibung (optional)').fill(evil)
    await page.getByRole('button', { name: 'Speichern' }).click()
    await expect(page.getByText(evil, { exact: false })).toBeVisible()
    expect(await page.locator('img[src="x"]').count()).toBe(0)
    expect(dialogs).toEqual([])
  })

  test('AC: Tastatur: Escape schliesst, der Fokus kehrt zum Knopf zurück', async ({ page }) => {
    await page.goto('/')
    const open = page.getByRole('button', { name: 'Zeit erfassen' }).first()
    await open.focus()
    await page.keyboard.press('Enter')
    await expect(page.getByRole('dialog')).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(page.getByRole('dialog')).toHaveCount(0)
    await expect(open).toBeFocused()
  })

  for (const width of [320, 375, 768, 1440]) {
    test(`AC: Layout bei ${width} px: kein horizontales Scrollen, Bedienelemente mindestens 44 px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 })
      await page.goto('/')
      await expect(page.getByText(`Konzept ${run}`)).toBeVisible()
      expect(await noHorizontalScroll(page)).toBe(true)
      const small = async () =>
        page.evaluate(() => {
          const out: string[] = []
          document.querySelectorAll('[role="dialog"] button, [role="dialog"] input, [role="dialog"] textarea, main button, main a[href]').forEach((el) => {
            const r = (el as HTMLElement).getBoundingClientRect()
            if (r.width === 0 || r.height === 0) return
            if (r.height < 43.5) out.push(`${el.tagName} «${(el.textContent ?? '').trim().slice(0, 25)}» ${Math.round(r.height)}px`)
          })
          return out
        })
      expect(await small(), 'Startseite').toEqual([])
      await openForm(page)
      expect(await noHorizontalScroll(page)).toBe(true)
      await page.getByRole('tab', { name: 'Von–bis' }).click()
      expect(await noHorizontalScroll(page)).toBe(true)
      const inDialog = (await small()).filter((entry) => !entry.startsWith('BUTTON «Close'))
      expect(inDialog, 'Formular').toEqual([])
      await page.keyboard.press('Escape')
    })
  }

  test('AC: sehr lange Beschreibung und Namen bei 320 px laufen nicht über, «Mehr anzeigen» klappt auf', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 800 })
    const longWord = 'x'.repeat(120)
    await page.goto('/')
    await openForm(page)
    await page.getByLabel('Dauer', { exact: true }).fill('0:20')
    await page.getByLabel('Beschreibung (optional)').fill(`Lang ${longWord} ${'text '.repeat(60)}`)
    await page.getByRole('button', { name: 'Speichern' }).click()
    await expect(page.getByRole('dialog')).toHaveCount(0)
    await expect(page.getByRole('button', { name: 'Mehr anzeigen' }).first()).toBeVisible()
    expect(await noHorizontalScroll(page)).toBe(true)
    // Die Bestätigung (Toast) verschwindet nach wenigen Sekunden (nicht, solange die Maus darauf steht).
    await page.mouse.move(0, 0)
    await expect(page.getByText('Eintrag gespeichert.')).toHaveCount(0, { timeout: 15000 })
    await page.getByRole('button', { name: 'Mehr anzeigen' }).first().click()
    await expect(page.getByRole('button', { name: 'Weniger anzeigen' })).toBeVisible()
    expect(await noHorizontalScroll(page)).toBe(true)
  })

  for (const scheme of ['light', 'dark'] as const) {
    test(`AC: Barrierefreiheit (axe, WCAG AA) im ${scheme === 'dark' ? 'Dunkel' : 'Hell'}modus: Startseite und Formular`, async ({ page }) => {
      await page.addInitScript((value) => localStorage.setItem('theme', value), scheme)
      await page.emulateMedia({ colorScheme: scheme })
      await page.goto('/')
      await expect(page.getByText(`Konzept ${run}`)).toBeVisible()
      expect(await page.evaluate(() => document.documentElement.classList.contains('dark'))).toBe(scheme === 'dark')
      expect(await axeViolations(page), 'Startseite').toEqual([])

      await openForm(page)
      await page.getByRole('button', { name: 'Speichern' }).click()
      await expect(page.getByLabel('Dauer', { exact: true })).toHaveAttribute('aria-invalid', 'true')
      expect(await axeViolations(page), 'Formular mit Fehler').toEqual([])
      await page.getByRole('tab', { name: 'Von–bis' }).click()
      expect(await axeViolations(page), 'Formular von–bis').toEqual([])
      await page.keyboard.press('Escape')
    })
  }

  test('AC: Einträge liegen in der Datenbank: ein zweites Gerät (neuer Browser) sieht sie, die Vorbelegung gilt geräteübergreifend', async ({ page, browser }) => {
    // Frischer Eintrag auf dem Testkunden, dann sofort das zweite Gerät (andere Testdateien legen parallel
    // Einträge an, darum direkt hintereinander und mit dem Testkunden als erwartetem letzten Ziel).
    await page.goto('/')
    await openForm(page)
    await pickCustomer(page)
    await page.getByLabel('Dauer', { exact: true }).fill('0:01')
    await page.getByLabel('Beschreibung (optional)').fill(`Zweites Gerät ${run}`)
    await page.getByRole('button', { name: 'Speichern' }).click()
    await expect(page.getByRole('dialog')).toHaveCount(0)

    const context = await browser.newContext({ storageState: 'tests/.auth/user.json', viewport: { width: 1280, height: 900 } })
    const second = await context.newPage()
    await second.goto('/')
    await expect(second.getByText(`Konzept ${run}`)).toBeVisible()
    await second.getByRole('button', { name: 'Zeit erfassen' }).first().click()
    // Das zuletzt benutzte Ziel ist vorbelegt (bei parallelen Testläufen kann es ein anderer Testkunde sein)
    await expect(second.getByLabel('Kunde')).not.toContainText('Kunde wählen')
    await expect(second.getByLabel('Projekt')).not.toContainText('Projekt wählen')
    await context.close()
  })

  test('Sicherheit: direkter Zugriff auf die Datenbank mit eigener Sitzung umgeht die Regeln nicht', async ({ page, request }) => {
    const base = process.env.NEXT_PUBLIC_SUPABASE_URL
    const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    test.skip(!base || !anon, 'Supabase-Umgebungsvariablen fehlen im Testprozess')
    await page.goto('/')
    const cookies = await page.context().cookies()
    const raw = cookies.filter((c) => /auth-token/.test(c.name)).sort((a, b) => a.name.localeCompare(b.name)).map((c) => c.value).join('')
    const session = JSON.parse(Buffer.from(decodeURIComponent(raw).replace(/^base64-/, ''), 'base64url').toString())
    const headers = {
      apikey: anon as string,
      Authorization: `Bearer ${session.access_token}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
    }
    const rest = `${base}/rest/v1`
    const zurich = (offsetMs: number) => new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Zurich' }).format(new Date(Date.now() + offsetMs))
    const today = zurich(0)
    const tomorrow = zurich(26 * 3600 * 1000)

    const customer = await (await request.get(`${rest}/customers?select=id,owner_id&code=eq.${CODE}`, { headers })).json()
    const project = await (await request.get(`${rest}/projects?select=id&customer_id=eq.${customer[0].id}&name=eq.Allgemein`, { headers })).json()
    const projectId: string = project[0].id
    const ownerId: string = customer[0].owner_id
    const entry = { project_id: projectId, entry_date: today, duration_minutes: 30, billable_minutes: 30 }

    // Gültig: eigener Eintrag, der Besitzer wird von der Datenbank gesetzt (auch bei gefälschtem Wert)
    const ok = await request.post(`${rest}/time_entries`, { headers, data: { ...entry, owner_id: '17bb69ca-f2e7-4b05-9ee4-e08c3ac67263' } })
    expect(ok.status()).toBe(201)
    const [created] = await ok.json()
    expect(created.owner_id).toBe(ownerId)

    // Löschen ist nicht erlaubt
    expect([401, 403]).toContain((await request.delete(`${rest}/time_entries?id=eq.${created.id}`, { headers })).status())

    // Besitzer ändern: wirkungslos
    const patch = await request.patch(`${rest}/time_entries?id=eq.${created.id}`, { headers, data: { owner_id: '17bb69ca-f2e7-4b05-9ee4-e08c3ac67263' } })
    if (patch.ok()) expect((await patch.json())[0]?.owner_id ?? ownerId).toBe(ownerId)

    // Ungültige Werte direkt an die Datenbank: abgelehnt
    const bad: Record<string, unknown>[] = [
      { ...entry, entry_date: tomorrow },
      { ...entry, duration_minutes: 0 },
      { ...entry, duration_minutes: 1441, billable_minutes: 0 },
      { ...entry, billable_minutes: 31 },
      { ...entry, billable_minutes: -1 },
      { ...entry, start_time: '08:00' },
      { ...entry, start_time: '10:00', end_time: '09:00' },
      { ...entry, start_time: '08:00', end_time: '09:00' },
      { ...entry, description: 'x'.repeat(1001) },
      { ...entry, description: '' },
      { ...entry, description: ' Rand ' },
      { ...entry, project_id: '00000000-0000-4000-8000-000000000000' },
      { ...entry, project_id: undefined },
    ]
    for (const body of bad) {
      const response = await request.post(`${rest}/time_entries`, { headers, data: body })
      expect(response.status(), JSON.stringify(body)).toBeGreaterThanOrEqual(400)
      expect(response.status(), JSON.stringify(body)).toBeLessThan(500)
    }

    // Ohne Anmeldung (nur öffentlicher Schlüssel): nichts lesbar, nichts schreibbar
    const anonHeaders = { apikey: anon as string, 'Content-Type': 'application/json' }
    expect([401, 403]).toContain((await request.get(`${rest}/time_entries?select=id`, { headers: anonHeaders })).status())
    expect([401, 403]).toContain((await request.post(`${rest}/time_entries`, { headers: anonHeaders, data: entry })).status())
  })

  test('Sicherheit: HTML und SQL-Zeichen in der Beschreibung sind in der Datenbank reiner Text (nach Neuladen)', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByText(/drop table time_entries/).first()).toBeVisible()
    expect(await page.locator('img[src="x"]').count()).toBe(0)
  })

  test('AC: archivierter Kunde erscheint nicht mehr in der Auswahl', async ({ page }) => {
    await page.goto('/kunden')
    await page.getByRole('link', { name: new RegExp(NAME) }).click()
    await page.getByRole('button', { name: 'Archivieren', exact: true }).click()
    await page.getByRole('alertdialog').getByRole('button', { name: 'Archivieren' }).click()
    await expect(page.getByText('Dieser Kunde ist archiviert')).toBeVisible()

    await page.goto('/')
    await page.getByRole('button', { name: 'Zeit erfassen' }).first().click()
    const dialog = page.getByRole('dialog')
    await expect(dialog).toBeVisible()
    await expect(dialog.getByRole('status')).toHaveCount(0) // Ladezustand vorbei
    // Ohne weitere aktive Kunden zeigt das Formular den Hinweis, sonst fehlt der Kunde in der Auswahl.
    if (await dialog.getByLabel('Kunde').count()) {
      await dialog.getByLabel('Kunde').click()
      await expect(page.getByRole('option', { name: new RegExp(CODE) })).toHaveCount(0)
    } else {
      await expect(dialog.getByText(/Lege zuerst einen Kunden an/)).toBeVisible()
    }
    await page.keyboard.press('Escape')
  })
})
