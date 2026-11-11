import { expect, test } from '@playwright/test'
import { resolve } from 'node:path'
import { hasTestUser, SKIP_REASON } from './helpers/env'

// Öffentliche Supabase-Werte aus .env.local (nur URL und öffentlicher Schlüssel werden gebraucht).
try {
  ;(process as unknown as { loadEnvFile: (path: string) => void }).loadEnvFile(
    resolve(process.cwd(), '.env.local')
  )
} catch {
  // Datei fehlt: Der Test ohne Anmeldung wird übersprungen.
}

// PROJ-3 (Backend): Kunden und Projekte gegen die echte Datenbank.
// Es gibt kein Löschen: Der Test legt einen Kunden mit Präfix «T-» an und archiviert ihn am Ende.
// Das Testkonto sammelt so erkennbare Testdaten im Archiv (siehe Spec, Abschnitt H).

test.describe.configure({ mode: 'serial' })
test.skip(!hasTestUser, SKIP_REASON)
test.use({ viewport: { width: 1280, height: 900 } })

const suffix = Date.now().toString(36).slice(-6).toUpperCase()
const CODE = `T-${suffix}`
const NAME = `Testkunde ${suffix}`

test('Kunde anlegen: erscheint in der Liste, hat «Allgemein» und bleibt nach dem Neuladen erhalten', async ({ page }) => {
  await page.goto('/kunden')
  await page.getByRole('button', { name: 'Neuer Kunde' }).click()
  await page.getByLabel('Kürzel').fill(CODE.toLowerCase())
  await page.getByLabel('Name').fill(NAME)
  await page.getByRole('button', { name: 'Speichern' }).click()

  await expect(page.getByRole('link', { name: new RegExp(NAME) })).toBeVisible()
  await page.reload()
  const card = page.getByRole('link', { name: new RegExp(NAME) })
  await expect(card).toContainText(CODE)
  await expect(card).toContainText('1 aktives Projekt')

  await card.click()
  await expect(page.getByRole('heading', { level: 1, name: NAME })).toBeVisible()
  await expect(page.getByText('Allgemein')).toBeVisible()
})

test('Doppelte Kürzel, Namen und Projekte werden von der Datenbank abgelehnt', async ({ page }) => {
  await page.goto('/kunden')
  await page.getByRole('button', { name: 'Neuer Kunde' }).click()
  await page.getByLabel('Kürzel').fill(CODE)
  await page.getByLabel('Name').fill('Anderer Name')
  await page.getByRole('button', { name: 'Speichern' }).click()
  await expect(page.getByText('Dieses Kürzel gibt es schon')).toBeVisible()

  await page.getByLabel('Kürzel').fill(`T-${suffix.slice(0, 5)}X`)
  await page.getByLabel('Name').fill(NAME.toUpperCase())
  await page.getByRole('button', { name: 'Speichern' }).click()
  await expect(page.getByText('Diesen Kunden gibt es schon')).toBeVisible()
  await page.keyboard.press('Escape')

  await page.getByRole('link', { name: new RegExp(NAME) }).click()
  await page.getByRole('button', { name: 'Neues Projekt' }).first().click()
  await page.getByLabel('Name').fill('allgemein')
  await page.getByRole('button', { name: 'Speichern' }).click()
  await expect(page.getByText('Dieses Projekt gibt es bei diesem Kunden schon')).toBeVisible()
})

test('Projekt mit Nummer anlegen, archivieren, reaktivieren; Kunde archivieren und reaktivieren', async ({ page }) => {
  await page.goto('/kunden')
  await page.getByRole('link', { name: new RegExp(NAME) }).click()

  await page.getByRole('button', { name: 'Neues Projekt' }).first().click()
  await page.getByLabel('Name').fill('Relaunch')
  await page.getByLabel('Projektnummer (optional)').fill('PO-42')
  await page.getByRole('button', { name: 'Speichern' }).click()
  await expect(page.getByText('Nr. PO-42')).toBeVisible()

  await page.getByRole('button', { name: 'Relaunch archivieren' }).click()
  await page.getByRole('alertdialog').getByRole('button', { name: 'Archivieren' }).click()
  await expect(page.getByRole('button', { name: 'Relaunch archivieren' })).toHaveCount(0)

  // Kunde archivieren: «Allgemein» wird mitarchiviert, «Relaunch» war schon einzeln archiviert.
  await page.getByRole('button', { name: 'Archivieren', exact: true }).click()
  await page.getByRole('alertdialog').getByRole('button', { name: 'Archivieren' }).click()
  await expect(page.getByRole('button', { name: 'Reaktivieren', exact: true })).toBeVisible()

  // Reaktivieren: nur «Allgemein» kommt zurück.
  await page.getByRole('button', { name: 'Reaktivieren', exact: true }).first().click()
  await expect(page.getByRole('button', { name: 'Allgemein archivieren' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Relaunch archivieren' })).toHaveCount(0)

  // Aufräumen: Kunde archivieren, damit er nicht in der aktiven Liste bleibt.
  await page.getByRole('button', { name: 'Archivieren', exact: true }).click()
  await page.getByRole('alertdialog').getByRole('button', { name: 'Archivieren' }).click()
  await expect(page.getByText('Dieser Kunde ist archiviert')).toBeVisible()
})

test('Anonym ist nichts lesbar: der öffentliche Schlüssel allein sieht keine Kunden', async ({ playwright }) => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  test.skip(!url || !key, 'Supabase-Umgebungsvariablen fehlen im Testprozess')
  const api = await playwright.request.newContext({
    baseURL: url,
    extraHTTPHeaders: { apikey: key as string },
  })
  const read = await api.get('/rest/v1/customers?select=id')
  expect([401, 403]).toContain(read.status())
  const write = await api.post('/rest/v1/customers', { data: { code: 'T-ANON', name: 'x' } })
  expect([401, 403]).toContain(write.status())
  await api.dispose()
})
