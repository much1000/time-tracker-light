import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { expect, test, type Page } from '@playwright/test'
import { hasTestUser, NO_LOGIN, SKIP_REASON } from './helpers/env'
import { findLeaks } from './helpers/leaks'

// PROJ-3 QA: Zugriffsschutz, Layout, Barrierefreiheit, Tastatur, Eingaben, direkter Datenbankzugriff.
// Testkunden tragen das Präfix «T-» und werden am Ende archiviert (es gibt kein Löschen).

try {
  ;(process as unknown as { loadEnvFile: (path: string) => void }).loadEnvFile(
    resolve(process.cwd(), '.env.local')
  )
} catch {
  // Datei fehlt
}

const AXE = readFileSync(resolve(process.cwd(), 'node_modules/axe-core/axe.min.js'), 'utf8')
const run = Date.now().toString(36).slice(-5).toUpperCase()
const CODE = `T-Q${run}`
const NAME = `QA Kunde ${run}`

async function createCustomer(page: Page, code: string, name: string) {
  await page.goto('/kunden')
  await page.getByRole('button', { name: 'Neuer Kunde' }).click()
  await page.getByLabel('Kürzel').fill(code)
  await page.getByLabel('Name').fill(name)
  await page.getByRole('button', { name: 'Speichern' }).click()
  await expect(page.getByRole('dialog')).toHaveCount(0)
}

async function archiveByUi(page: Page, name: string) {
  await page.goto('/kunden')
  await page.getByRole('link', { name: new RegExp(name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')) }).first().click()
  await page.getByRole('button', { name: 'Archivieren', exact: true }).click()
  await page.getByRole('alertdialog').getByRole('button', { name: 'Archivieren' }).click()
  await expect(page.getByText('Dieser Kunde ist archiviert')).toBeVisible()
}

async function axeViolations(page: Page) {
  await page.evaluate(AXE)
  return page.evaluate(async () => {
    // @ts-expect-error axe wird per Skript eingebunden
    const result = await window.axe.run(document, { runOnly: ['wcag2a', 'wcag2aa', 'wcag21aa'] })
    return result.violations.map((v: { id: string; nodes: { html: string }[] }) => ({
      id: v.id,
      nodes: v.nodes.slice(0, 3).map((n) => n.html.slice(0, 120)),
    }))
  })
}

async function noHorizontalScroll(page: Page) {
  return page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)
}

test.describe('ohne Anmeldung', () => {
  test.use({ storageState: NO_LOGIN })

  test('AC: /kunden und Kundenseiten führen auf die Anmeldung und zeigen keine Daten', async ({ page }) => {
    await page.goto('/kunden')
    await expect(page).toHaveURL(/\/login\?next=%2Fkunden$/)
    await expect(page.locator('body')).not.toContainText('Neuer Kunde')
    await page.goto('/kunden/11111111-1111-4111-8111-111111111111')
    await expect(page).toHaveURL(/\/login\?next=/)
  })
})

test.describe('mit Anmeldung', () => {
  test.skip(!hasTestUser, SKIP_REASON)
  test.describe.configure({ mode: 'serial' })

  test('AC: Kunde existiert nicht oder ungültige Kennung: Hinweisseite statt Fehler', async ({ page }) => {
    for (const id of ['11111111-1111-4111-8111-111111111111', 'kein-gueltiges-format', "1'; drop table customers;--"]) {
      await page.goto(`/kunden/${encodeURIComponent(id)}`)
      await expect(page.getByRole('heading', { name: 'Kunde nicht gefunden' })).toBeVisible()
      await expect(page.getByRole('link', { name: 'Alle Kunden' })).toBeVisible()
    }
  })

  test('AC: Navigation «Kunden» ist aktiv auf /kunden und darunter; Seitentitel stimmen', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 })
    await page.goto('/kunden')
    await expect(page).toHaveTitle('Kunden · Time Tracker Light')
    await expect(page.locator('div.bg-sidebar').getByRole('link', { name: 'Kunden' })).toHaveAttribute('aria-current', 'page')
    await createCustomer(page, CODE, NAME)
    await page.getByRole('link', { name: new RegExp(NAME) }).click()
    await expect(page).toHaveTitle(`${CODE} · Time Tracker Light`)
    await expect(page.locator('div.bg-sidebar').getByRole('link', { name: 'Kunden' })).toHaveAttribute('aria-current', 'page')
  })

  test('AC: Prüfregeln am Feld (Pflicht, Zeichen, Länge) und nichts wird gespeichert', async ({ page }) => {
    await page.goto('/kunden')
    await page.getByRole('button', { name: 'Neuer Kunde' }).click()
    await page.getByRole('button', { name: 'Speichern' }).click()
    await expect(page.getByLabel('Kürzel')).toHaveAttribute('aria-invalid', 'true')
    await expect(page.getByText('Bitte gib ein Kürzel ein.')).toBeVisible()
    await expect(page.getByLabel('Kürzel')).toBeFocused()

    for (const bad of ['A', 'ÄÖ', 'AB CD', 'A_B', 'ABCDEFGHIJK']) {
      await page.getByLabel('Kürzel').fill(bad)
      await page.getByLabel('Name').fill('Gültiger Name')
      await page.getByRole('button', { name: 'Speichern' }).click()
      await expect(page.getByRole('dialog')).toBeVisible()
      await expect(page.getByRole('dialog').locator('[aria-invalid="true"]').first()).toBeVisible()
    }
    await page.getByLabel('Kürzel').fill('T-LONG')
    await page.getByLabel('Name').fill('x'.repeat(101))
    await page.getByRole('button', { name: 'Speichern' }).click()
    await expect(page.getByRole('dialog')).toBeVisible()
    await expect(page.getByRole('dialog').locator('[aria-invalid="true"]').first()).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(page.getByText('T-LONG')).toHaveCount(0)
  })

  test('AC: Tastatur: Dialog fokusgefangen, Fokus im ersten Feld, Escape schliesst, Enter speichert', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 })
    await page.goto('/kunden')
    const open = page.getByRole('button', { name: 'Neuer Kunde' })
    await open.focus()
    await page.keyboard.press('Enter')
    await expect(page.getByLabel('Kürzel')).toBeFocused()
    for (let i = 0; i < 12; i++) {
      await page.keyboard.press('Tab')
      const inside = await page.evaluate(() => !!document.activeElement?.closest('[role="dialog"]'))
      expect(inside).toBe(true)
    }
    await page.keyboard.press('Escape')
    await expect(page.getByRole('dialog')).toHaveCount(0)
  })

  // BUG-1 (behoben): Nach dem Schliessen eines Formulars kehrt der Fokus zum auslösenden Knopf zurück.
  test('BUG-1: Fokus kehrt nach dem Schliessen des Formulars zum Knopf «Neuer Kunde» zurück', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 })
    await page.goto('/kunden')
    const open = page.getByRole('button', { name: 'Neuer Kunde' })
    await open.focus()
    await page.keyboard.press('Enter')
    await expect(page.getByLabel('Kürzel')).toBeFocused()
    await page.keyboard.press('Escape')
    await expect(page.getByRole('dialog')).toHaveCount(0)
    await expect(open).toBeFocused({ timeout: 2000 })
  })

  test('AC: Doppelklick auf Speichern legt nur einen Kunden an', async ({ page }) => {
    const code = `T-D${run}`
    const name = `Doppel ${run}`
    await page.goto('/kunden')
    await page.getByRole('button', { name: 'Neuer Kunde' }).click()
    await page.getByLabel('Kürzel').fill(code)
    await page.getByLabel('Name').fill(name)
    await page.getByRole('button', { name: 'Speichern' }).dblclick()
    await expect(page.getByRole('dialog')).toHaveCount(0)
    await expect(page.getByRole('link', { name: new RegExp(name) })).toHaveCount(1)
    await archiveByUi(page, name)
  })

  test('Sicherheit: HTML, Skript, SQL und Emojis werden als Text gespeichert und angezeigt', async ({ page }) => {
    const dialogs: string[] = []
    page.on('dialog', (d) => {
      dialogs.push(d.message())
      void d.dismiss()
    })
    const evil = `<img src=x onerror=alert(1)> '; drop table customers;-- 😀 ${run}`
    await createCustomer(page, `T-X${run}`, evil)
    await expect(page.getByText(evil, { exact: false }).first()).toBeVisible()
    await page.reload()
    await expect(page.getByText(evil, { exact: false }).first()).toBeVisible()
    expect(await page.locator('img[src="x"]').count()).toBe(0)
    expect(dialogs).toEqual([])
    await archiveByUi(page, evil)
  })

  for (const width of [320, 375, 768, 1440]) {
    test(`AC: Layout bei ${width} px: kein horizontales Scrollen, Bedienelemente mindestens 44 px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 })
      await page.goto('/kunden')
      await expect(page.getByRole('link', { name: new RegExp(NAME) })).toBeVisible()
      expect(await noHorizontalScroll(page)).toBe(true)
      await page.getByRole('link', { name: new RegExp(NAME) }).click()
      await expect(page.getByRole('heading', { level: 1, name: NAME })).toBeVisible()
      expect(await noHorizontalScroll(page)).toBe(true)

      const small = await page.evaluate(() => {
        const out: string[] = []
        document.querySelectorAll('main button, main a[href], main [role="button"]').forEach((el) => {
          const r = (el as HTMLElement).getBoundingClientRect()
          if (r.width === 0 || r.height === 0) return
          if (r.height < 43.5) out.push(`${el.tagName} «${(el.textContent ?? '').trim().slice(0, 30)}» ${Math.round(r.height)}px`)
        })
        return out
      })
      expect(small, `zu kleine Ziele: ${small.join(' | ')}`).toEqual([])

      await page.getByRole('button', { name: 'Neues Projekt' }).first().click()
      expect(await noHorizontalScroll(page)).toBe(true)
      await page.keyboard.press('Escape')
    })
  }

  const LONG_NAME = `Wortlos${run}${'x'.repeat(85)}`
  const overflowing = (page: Page) =>
    page.evaluate(() => {
      const width = document.documentElement.clientWidth
      return [
        ...[...document.querySelectorAll('body *')]
          .filter((el) => el.getBoundingClientRect().right > width + 1)
          .map((el) => `${el.tagName}.${(el as HTMLElement).className.toString().slice(0, 40)}`)
          .slice(0, 4),
      ]
    })

  test('Edge: sehr langer Name (ohne Leerzeichen) wird bei 320 px angelegt', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 800 })
    await createCustomer(page, `T-L${run}`, LONG_NAME)
    await expect(page.getByRole('link', { name: new RegExp(LONG_NAME) })).toBeVisible()
  })

  // BUG-2 (behoben): Ein sehr langer Name ohne Leerzeichen sprengt die Kundenkarte bei 320 px nicht mehr.
  test('BUG-2: Kundenliste bei 320 px: langer Name sprengt die Karte nicht', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 800 })
    await page.goto('/kunden')
    await expect(page.getByRole('link', { name: new RegExp(LONG_NAME) })).toBeVisible()
    expect(await overflowing(page)).toEqual([])
    expect(await noHorizontalScroll(page)).toBe(true)
  })

  test('AC: Kundenseite bei 320 px: sehr langer Name bricht um, nichts läuft über', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 800 })
    await page.goto('/kunden')
    await page.getByRole('link', { name: new RegExp(LONG_NAME) }).click()
    await expect(page.getByRole('heading', { level: 1 })).toContainText(LONG_NAME)
    expect(await overflowing(page)).toEqual([])
    expect(await noHorizontalScroll(page)).toBe(true)
    await archiveByUi(page, LONG_NAME)
  })

  for (const scheme of ['light', 'dark'] as const) {
    test(`AC: Barrierefreiheit (axe, WCAG AA) im ${scheme === 'dark' ? 'Dunkel' : 'Hell'}modus: Liste, Kundenseite, Formular`, async ({ page }) => {
      await page.addInitScript((value) => localStorage.setItem('theme', value), scheme)
      await page.emulateMedia({ colorScheme: scheme })
      await page.setViewportSize({ width: 1440, height: 900 })
      await page.goto('/kunden')
      await expect(page.getByRole('link', { name: new RegExp(NAME) })).toBeVisible()
      expect(await page.evaluate(() => document.documentElement.classList.contains('dark'))).toBe(scheme === 'dark')
      expect(await axeViolations(page), 'Liste').toEqual([])

      await page.getByRole('link', { name: new RegExp(NAME) }).click()
      await expect(page.getByRole('heading', { level: 1, name: NAME })).toBeVisible()
      expect(await axeViolations(page), 'Kundenseite').toEqual([])

      await page.getByRole('button', { name: 'Neues Projekt' }).first().click()
      await page.getByRole('button', { name: 'Speichern' }).click()
      await expect(page.getByRole('dialog').locator('[aria-invalid="true"]').first()).toBeVisible()
      expect(await axeViolations(page), 'Formular mit Fehler').toEqual([])
    })
  }

  test('Sicherheit: direkter Zugriff auf die Datenbank mit eigener Sitzung umgeht die Regeln nicht', async ({ page, request }) => {
    await page.goto('/kunden')
    const cookies = await page.context().cookies()
    const raw = cookies.filter((c) => /auth-token/.test(c.name)).sort((a, b) => a.name.localeCompare(b.name)).map((c) => c.value).join('')
    const json = JSON.parse(Buffer.from(decodeURIComponent(raw).replace(/^base64-/, ''), 'base64url').toString())
    const token: string = json.access_token
    const base = process.env.NEXT_PUBLIC_SUPABASE_URL as string
    const headers = {
      apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string,
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
    }
    const rest = `${base}/rest/v1`

    // Eigenen Kunden finden
    const own = await request.get(`${rest}/customers?select=id,owner_id&code=eq.${CODE}`, { headers })
    expect(own.ok()).toBe(true)
    const [mine] = await own.json()
    expect(mine?.id).toBeTruthy()

    // Löschen verweigert (Recht fehlt), Daten bleiben
    const del = await request.delete(`${rest}/customers?id=eq.${mine.id}`, { headers })
    expect([401, 403]).toContain(del.status())
    const delProject = await request.delete(`${rest}/projects?customer_id=eq.${mine.id}`, { headers })
    expect([401, 403]).toContain(delProject.status())

    // Besitzer fälschen beim Anlegen: wird überschrieben, nicht übernommen
    const spoof = await request.post(`${rest}/customers`, {
      headers,
      data: { code: `T-S${run}`, name: `Spoof ${run}`, owner_id: '17bb69ca-f2e7-4b05-9ee4-e08c3ac67263' },
    })
    if (spoof.ok()) {
      const [row] = await spoof.json()
      expect(row.owner_id).toBe(mine.owner_id)
      await request.patch(`${rest}/customers?id=eq.${row.id}`, {
        headers,
        data: { archived: true, archived_at: new Date().toISOString() },
      })
    } else {
      expect([401, 403]).toContain(spoof.status())
    }

    // Besitzer ändern: wirkungslos
    const patch = await request.patch(`${rest}/customers?id=eq.${mine.id}`, {
      headers,
      data: { owner_id: '17bb69ca-f2e7-4b05-9ee4-e08c3ac67263' },
    })
    if (patch.ok()) {
      const rows = await patch.json()
      expect(rows[0]?.owner_id ?? mine.owner_id).toBe(mine.owner_id)
    }

    // Ungültige Werte direkt an die Datenbank: abgelehnt
    for (const body of [
      { code: 'a', name: 'x' },
      { code: 'T-OK1', name: '' },
      { code: 'T-OK2', name: ' x ' },
      { code: 'T-OK3', name: 'y'.repeat(101) },
      { code: 'lower', name: 'x' },
    ]) {
      const bad = await request.post(`${rest}/customers`, { headers, data: body })
      expect(bad.status(), JSON.stringify(body)).toBe(400)
    }
    const badProject = await request.post(`${rest}/projects`, {
      headers,
      data: { customer_id: mine.id, name: 'ok', number: 'n'.repeat(31) },
    })
    expect(badProject.status()).toBe(400)

    // Pflichtfeld Name fehlt
    const missing = await request.post(`${rest}/customers`, { headers, data: { code: 'T-NN1' } })
    expect(missing.status()).toBe(400)
  })

  test('Sicherheit: keine Geheimnisse in der ausgelieferten Seite, keine Konsolenfehler', async ({ page }) => {
    const errors: string[] = []
    page.on('console', (m) => m.type() === 'error' && errors.push(m.text()))
    page.on('pageerror', (e) => errors.push(e.message))
    const bodies: string[] = []
    page.on('response', async (r) => {
      const type = r.headers()['content-type'] ?? ''
      if (/json|html|javascript/.test(type) && r.url().includes('/')) {
        try {
          bodies.push(await r.text())
        } catch {
          // nicht lesbar
        }
      }
    })
    await page.goto('/kunden')
    await expect(page.getByRole('link', { name: new RegExp(NAME) })).toBeVisible()
    await page.getByRole('link', { name: new RegExp(NAME) }).click()
    await expect(page.getByRole('heading', { level: 1, name: NAME })).toBeVisible()
    expect(bodies.flatMap(findLeaks)).toEqual([])
    expect(errors).toEqual([])
  })

  test('AC: Bearbeiten: Werte vorausgefüllt, Enter speichert, eigener Eintrag zählt nicht als Duplikat, Abbrechen verwirft', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 })
    await page.goto('/kunden')
    await page.getByRole('link', { name: new RegExp(NAME) }).click()

    await page.getByRole('button', { name: 'Bearbeiten', exact: true }).click()
    await expect(page.getByLabel('Kürzel')).toHaveValue(CODE)
    await expect(page.getByLabel('Name')).toHaveValue(NAME)
    // Abbrechen verwirft Änderungen
    await page.getByLabel('Name').fill('Wird verworfen')
    await page.getByRole('button', { name: 'Abbrechen' }).click()
    await expect(page.getByRole('heading', { level: 1, name: NAME })).toBeVisible()
    await page.getByRole('button', { name: 'Bearbeiten', exact: true }).click()
    await expect(page.getByLabel('Name')).toHaveValue(NAME)
    // Speichern mit unverändertem Kürzel: kein Duplikat; Enter speichert
    await page.getByLabel('Name').fill(`${NAME} neu`)
    await page.getByLabel('Name').press('Enter')
    await expect(page.getByRole('heading', { level: 1, name: `${NAME} neu` })).toBeVisible()
    await page.reload()
    await expect(page.getByRole('heading', { level: 1, name: `${NAME} neu` })).toBeVisible()

    // Projekt bearbeiten (Allgemein umbenennen, Nummer setzen), Anzeige ohne Neuladen aktuell
    await page.getByRole('button', { name: 'Allgemein bearbeiten' }).click()
    await expect(page.getByLabel('Name')).toHaveValue('Allgemein')
    await page.getByLabel('Name').fill('Basis')
    await page.getByLabel('Projektnummer (optional)').fill('N-1')
    await page.getByRole('button', { name: 'Speichern' }).click()
    await expect(page.getByText('Nr. N-1')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Basis bearbeiten' })).toBeVisible()

    // Kunde archivieren: Projekte lassen sich nicht einzeln reaktivieren, Hinweis sichtbar
    await page.getByRole('button', { name: 'Archivieren', exact: true }).click()
    await page.getByRole('alertdialog').getByRole('button', { name: 'Archivieren' }).click()
    await expect(page.getByText('Dieser Kunde ist archiviert')).toBeVisible()
    await page.getByRole('button', { name: /Archiv \(/ }).click()
    await expect(page.getByRole('button', { name: 'Basis reaktivieren' })).toBeDisabled()
    await expect(page.getByText('Reaktiviere zuerst den Kunden')).toBeVisible()
    await expect(page.getByRole('button', { name: /löschen/i })).toHaveCount(0)
    // wieder aktiv schalten für den nächsten Schritt
    await page.getByRole('button', { name: 'Reaktivieren', exact: true }).first().click()
    await expect(page.getByRole('button', { name: 'Basis archivieren' })).toBeVisible()
  })

  test('Aufräumen: QA-Kunde archivieren', async ({ page }) => {
    await archiveByUi(page, `${NAME} neu`)
  })
})
