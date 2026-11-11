import { expect, test } from '@playwright/test'
import { uiLogin } from './helpers/auth'
import { hasTestUser, NO_LOGIN, SKIP_REASON } from './helpers/env'

// PROJ-2: Abmelden
// Läuft als eigenes Projekt «logout» zuletzt: Abmelden beendet derzeit ALLE Sitzungen des Kontos
// (siehe BUG-1 in der Spec) und würde sonst die gespeicherte Anmeldung der anderen Tests entwerten.

test.describe.configure({ mode: 'serial' })
test.skip(!hasTestUser, SKIP_REASON)
test.use({ storageState: NO_LOGIN })

const DESKTOP = { width: 1440, height: 900 }
const MOBILE = { width: 375, height: 740 }

test('AC: Abmelden in der Seitenleiste führt auf die Anmeldeseite, danach ist alles wieder geschützt', async ({ page, context }) => {
  await page.setViewportSize(DESKTOP)
  await page.goto('/login')
  await uiLogin(page)
  await expect(page).toHaveURL(/\/$/)

  await page.locator('div.bg-sidebar').getByRole('button', { name: 'Abmelden' }).click()

  await expect(page).toHaveURL(/\/login$/)
  await expect(page.getByRole('heading', { level: 1, name: 'Anmelden' })).toBeVisible()

  // Die Zurück-Taste zeigt keinen geschützten Inhalt mehr.
  await page.goBack()
  await expect(page.getByRole('heading', { level: 1, name: 'Anmelden' })).toBeVisible()
  await expect(page.locator('body')).not.toContainText('Willkommen bei Time Tracker Light')

  // Geschützte Adressen führen wieder auf die Anmeldung.
  await page.goto('/status')
  await expect(page).toHaveURL(/\/login\?next=%2Fstatus$/)

  // Die Anmeldung ist auf diesem Gerät beendet.
  const cookies = await context.cookies()
  expect(cookies.filter((cookie) => cookie.name.startsWith('sb-') && cookie.value.length > 0 && /auth-token/.test(cookie.name))).toEqual([])
})

test('AC: Abmelden in der Kopfzeile am Handy führt auf die Anmeldeseite', async ({ page }) => {
  await page.setViewportSize(MOBILE)
  await page.goto('/login')
  await uiLogin(page)
  await expect(page).toHaveURL(/\/$/)

  await page.locator('header').getByRole('button', { name: 'Abmelden' }).click()

  await expect(page).toHaveURL(/\/login$/)
  await page.goto('/')
  await expect(page).toHaveURL(/\/login$/)
})

// Spec: «Die Anmeldung ist auf diesem Gerät beendet.» und «Auf allen Geräten abmelden» ist ausdrücklich
// NICHT Teil von PROJ-2 (Out of Scope, nur im Dashboard).
// BUG-1 in PROJ-2 (behoben): signOut() beendete standardmässig ALLE Sitzungen des Kontos, jetzt nur noch
// die eigene (scope «local»). Das zweite Gerät merkt eine Beendigung erst, wenn sein Zugriffsschlüssel
// abläuft (bis zu 1 Stunde), deshalb prüft der Test, ob sein Erneuerungsschlüssel noch gilt.
test('AC: Abmelden beendet nur das eigene Gerät, ein zweites Gerät bleibt angemeldet', async ({ browser }) => {
  const first = await browser.newContext({ storageState: NO_LOGIN, viewport: DESKTOP })
  const second = await browser.newContext({ storageState: NO_LOGIN, viewport: DESKTOP })
  const a = await first.newPage()
  const b = await second.newPage()
  let api: { url: string; key: string } | null = null
  b.on('request', (request) => {
    if (request.url().includes('/auth/v1/token')) {
      api = { url: request.url().split('/auth/v1')[0], key: request.headers()['apikey'] }
    }
  })
  for (const page of [a, b]) {
    await page.goto('/login')
    await uiLogin(page)
    await expect(page).toHaveURL(/\/$/)
  }

  // Erneuerungsschlüssel des zweiten Geräts aus seinem Cookie lesen.
  const cookies = (await second.cookies()).filter((cookie) => /auth-token/.test(cookie.name))
  let raw = cookies.map((cookie) => cookie.value).join('')
  if (raw.startsWith('base64-')) raw = Buffer.from(raw.slice(7), 'base64').toString()
  const refreshToken = JSON.parse(decodeURIComponent(raw)).refresh_token as string

  await a.locator('div.bg-sidebar').getByRole('button', { name: 'Abmelden' }).click()
  await expect(a).toHaveURL(/\/login$/)

  const response = await b.request.post(`${api!.url}/auth/v1/token?grant_type=refresh_token`, {
    headers: { apikey: api!.key },
    data: { refresh_token: refreshToken },
  })
  expect(response.status(), 'Das zweite Gerät sollte angemeldet bleiben (Erneuerungsschlüssel gültig)').toBe(200)
  await first.close()
  await second.close()
})
