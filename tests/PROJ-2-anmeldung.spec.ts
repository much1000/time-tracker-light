import { expect, test, type Page } from '@playwright/test'
import { countRequests, mockSupabase, uiLogin } from './helpers/auth'
import {
  hasTestUser,
  NO_LOGIN,
  SKIP_REASON,
  TEST_USER_EMAIL,
} from './helpers/env'
import { findLeaks } from './helpers/leaks'

// PROJ-2: Anmeldung
// Tests ohne Anmeldung laufen immer. Tests mit Anmeldung brauchen das Testkonto (.env.test.local).
// Abmelden steht in PROJ-2-logout.spec.ts, weil es derzeit alle Sitzungen des Kontos beendet.

const LOGIN_TOKEN = '**/auth/v1/token*'
const RECOVER = '**/auth/v1/recover*'
const SENT = 'Falls ein Konto existiert, haben wir eine E-Mail gesendet.'
const MOBILE = { width: 375, height: 740 }
const DESKTOP = { width: 1440, height: 900 }

async function submitLogin(page: Page, email = 'jemand@example.invalid', password = 'irgendein-passwort') {
  await uiLogin(page, { email, password })
}

// ---------- Seitenschutz ohne Anmeldung ----------

test.describe('PROJ-2: Seitenschutz (ohne Anmeldung)', () => {
  test.use({ storageState: NO_LOGIN })

  test('AC: Die Startseite führt auf die Anmeldeseite, ohne Inhalt und ohne Navigation', async ({ page }) => {
    await page.goto('/')

    await expect(page).toHaveURL(/\/login$/)
    await expect(page.getByRole('heading', { level: 1, name: 'Anmelden' })).toBeVisible()
    await expect(page.locator('body')).not.toContainText('Zeit erfassen')
    await expect(page.locator('nav')).toHaveCount(0)
    await expect(page.locator('header')).toHaveCount(0)
    await expect(page.locator('div.bg-sidebar')).toHaveCount(0)
  })

  test('AC: Geschützte Adressen führen auf die Anmeldung und merken die Zieladresse', async ({ page }) => {
    await page.goto('/status')
    await expect(page).toHaveURL(/\/login\?next=%2Fstatus$/)
    await expect(page.locator('body')).not.toContainText('Systemstatus')
    await expect(page.locator('body')).not.toContainText('Datenbank erreichbar')

    await page.goto('/woche?tag=2026-11-10')
    await expect(page).toHaveURL(/\/login\?next=%2Fwoche%3Ftag%3D2026-11-10$/)
  })

  test('AC: Unbekannte Adressen führen ebenfalls auf die Anmeldung (verrät nichts über die App)', async ({ page }) => {
    await page.goto('/gibt-es-nicht')
    await expect(page).toHaveURL(/\/login\?next=%2Fgibt-es-nicht$/)
    await expect(page.locator('body')).not.toContainText('could not be found')
  })

  test('AC: Die Umleitung ist temporär, ohne Zwischenspeicher und trägt die Sicherheits-Header', async ({ request }) => {
    const response = await request.get('/status', { maxRedirects: 0 })

    expect(response.status()).toBe(307)
    expect(response.headers()['location']).toMatch(/\/login\?next=%2Fstatus$/)
    expect(response.headers()['cache-control']).toBe('private, no-store')
    expect(response.headers()['x-frame-options']).toBe('DENY')
    expect(response.headers()['x-content-type-options']).toBe('nosniff')
  })

  test('AC: /status löst ohne Anmeldung keine Datenbankanfrage aus (BUG-6 aus PROJ-1)', async ({ request }) => {
    // Der Türsteher leitet um, bevor die Seite entsteht: Es gibt keinen Inhalt der Seite.
    const response = await request.get('/status', { maxRedirects: 0 })
    const body = await response.text()

    expect(response.status()).toBe(307)
    expect(body).not.toContain('Datenbank erreichbar')
    expect(body).not.toContain('Systemstatus')
  })

  test('Icons bleiben auch ohne Anmeldung erreichbar (Tab-Symbol der Anmeldeseite)', async ({ request }) => {
    for (const path of ['/icon.png', '/apple-icon.png']) {
      const response = await request.get(path, { maxRedirects: 0 })
      expect(response.status(), path).toBe(200)
    }
  })

  test('AC: «Neues Passwort» ohne Sitzung führt auf «Link nicht mehr gültig»', async ({ page }) => {
    await page.goto('/passwort-neu')

    await expect(page).toHaveURL(/\/passwort-vergessen\?fehler=link$/)
    await expect(page.locator('main').getByRole('alert')).toContainText('Dieser Link ist nicht mehr gültig')
    await expect(page.getByRole('button', { name: 'Link senden' })).toBeVisible()
  })

  test('AC: Ungültige oder unpassende Links führen auf «Link nicht mehr gültig»', async ({ page }) => {
    for (const query of [
      '',
      '?code=abc',
      '?code=abc&next=https://evil.example',
      '?token_hash=abc&type=recovery',
      '?token_hash=abc&type=magiclink',
      '?token_hash=abc&type=signup',
      `?code=${'a'.repeat(600)}`,
      '?error=access_denied&error_code=otp_expired',
    ]) {
      await page.goto(`/auth/bestaetigen${query}`)
      await expect(page, query).toHaveURL(/\/passwort-vergessen\?fehler=link$/)
      await expect(page.locator('main').getByRole('alert'), query).toContainText('nicht mehr gültig')
    }
  })

  test('Security: Der Türsteher lässt sich nicht über Adress-Tricks oder Header umgehen', async ({ request, baseURL }) => {
    const paths = [
      '/status/',
      `${baseURL}//status`,
      '/status.png',
      '/STATUS',
      '/status%2f',
      '/%73tatus',
      '/status;x=1',
      '/.%2e/status',
      '/_next/data/x/status.json',
      '/status?.png',
    ]
    for (const path of paths) {
      const response = await request.get(path, { maxRedirects: 0 })
      const body = await response.text()
      expect(body, path).not.toContain('Datenbank erreichbar')
      expect(body, path).not.toContain('Systemstatus')
      expect(body, path).not.toContain('Zeit erfassen')
    }
    // Bekannter Umgehungsversuch gegen Middleware (CVE-2025-29927): interner Header von aussen.
    for (const value of [
      'middleware',
      'src/middleware',
      'proxy',
      'src/proxy',
      'middleware:middleware:middleware:middleware:middleware',
      'proxy:proxy:proxy:proxy:proxy',
    ]) {
      const response = await request.get('/status', {
        maxRedirects: 0,
        headers: { 'x-middleware-subrequest': value },
      })
      expect(response.status(), value).toBe(307)
      expect(response.headers()['location'], value).toContain('/login')
    }
  })

  test('Security: Manipulierte Adressparameter führen weder zu Skriptausführung noch zu fremden Zielen', async ({ page }) => {
    for (const url of [
      '/login?next=<script>window.__xss=1</script>',
      '/login?next=%22%3E%3Cimg%20src%3Dx%20onerror%3Dwindow.__xss%3D1%3E',
      '/passwort-vergessen?fehler=<img src=x onerror=window.__xss=1>',
    ]) {
      await page.goto(url)
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
      expect(await page.evaluate(() => (window as unknown as { __xss?: number }).__xss), url).toBeUndefined()
      await expect(page.locator('body')).not.toContainText('window.__xss')
    }
  })

  test('Security: Die Anmeldeseite liefert weder Service-Role-Schlüssel noch Tokens aus', async ({ page }) => {
    const bodies: string[] = []
    page.on('response', async (response) => {
      const type = response.request().resourceType()
      if (type === 'script' || type === 'document') bodies.push(await response.text().catch(() => ''))
    })
    await page.goto('/login')
    await page.waitForLoadState('networkidle')

    expect(bodies.join('\n').length).toBeGreaterThan(0)
    expect(findLeaks(bodies.join('\n'))).toEqual([])
  })
})

// ---------- Anmeldeformular ohne Anmeldung ----------

test.describe('PROJ-2: Anmeldeformular', () => {
  test.use({ storageState: NO_LOGIN })

  test('AC: Anmeldeseite zeigt Logo, Überschrift, Felder, Knopf und Link, ohne Navigation', async ({ page }) => {
    await page.goto('/login')

    await expect(page).toHaveTitle('Anmelden · Time Tracker Light')
    await expect(page.locator('main img').first()).toBeVisible()
    await expect(page.getByRole('heading', { level: 1, name: 'Anmelden' })).toBeVisible()
    await expect(page.getByLabel('E-Mail')).toBeVisible()
    await expect(page.getByLabel('Passwort', { exact: true })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Anmelden' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Passwort vergessen?' })).toHaveAttribute('href', '/passwort-vergessen')
    await expect(page.locator('main')).toHaveCount(1)
    await expect(page.locator('nav, header, div.bg-sidebar')).toHaveCount(0)
  })

  test('AC: Felder sind für Browser, Passwortmanager und Handy-Tastatur ausgezeichnet', async ({ page }) => {
    await page.goto('/login')
    const email = page.getByLabel('E-Mail')
    const password = page.getByLabel('Passwort', { exact: true })

    await expect(email).toHaveAttribute('type', 'email')
    await expect(email).toHaveAttribute('inputmode', 'email')
    await expect(email).toHaveAttribute('autocomplete', 'username')
    await expect(email).toHaveAttribute('autocapitalize', 'none')
    await expect(email).toHaveAttribute('autocorrect', 'off')
    await expect(password).toHaveAttribute('type', 'password')
    await expect(password).toHaveAttribute('autocomplete', 'current-password')
    await expect(password).toHaveAttribute('autocapitalize', 'none')
  })

  test('AC: Leere Pflichtfelder werden am Feld gemeldet, es geht keine Anfrage raus', async ({ page }) => {
    const requests = await countRequests(page, /\/auth\/v1\/token/)
    await page.goto('/login')
    await page.getByRole('button', { name: 'Anmelden' }).click()

    await expect(page.getByText('Bitte gib deine E-Mail-Adresse ein.')).toBeVisible()
    await expect(page.getByText('Bitte gib dein Passwort ein.')).toBeVisible()
    expect(requests.count).toBe(0)
    // Barrierefreiheit: Der erste fehlerhafte Wert hat den Fokus und ist als ungültig markiert.
    await expect(page.getByLabel('E-Mail')).toBeFocused()
    await expect(page.getByLabel('E-Mail')).toHaveAttribute('aria-invalid', 'true')
    await expect(page.getByLabel('Passwort', { exact: true })).toHaveAttribute('aria-invalid', 'true')
  })

  test('AC: Eine ungültige E-Mail-Adresse wird am Feld gemeldet, es geht keine Anfrage raus', async ({ page }) => {
    const requests = await countRequests(page, /\/auth\/v1\/token/)
    await page.goto('/login')
    await submitLogin(page, 'keine-adresse', 'x')

    await expect(page.getByText('Bitte gib eine gültige E-Mail-Adresse ein.')).toBeVisible()
    expect(requests.count).toBe(0)
  })

  test('AC: Falsche Daten: allgemeine Meldung, E-Mail bleibt, Passwort wird geleert, Fokus im Passwortfeld', async ({ page }) => {
    await page.goto('/login')
    await submitLogin(page, 'qa-unbekannt@example.invalid', 'falsches-passwort-123')

    const alert = page.locator('main').getByRole('alert')
    await expect(alert).toContainText('E-Mail oder Passwort stimmt nicht.')
    await expect(page.getByLabel('E-Mail')).toHaveValue('qa-unbekannt@example.invalid')
    await expect(page.getByLabel('Passwort', { exact: true })).toHaveValue('')
    await expect(page.getByLabel('Passwort', { exact: true })).toBeFocused()
    await expect(page.getByRole('button', { name: 'Anmelden' })).toBeEnabled()
    await expect(page).toHaveURL(/\/login$/)
  })

  test('AC: Die Fehlermeldung verrät nicht, ob die E-Mail-Adresse existiert', async ({ page }) => {
    test.skip(!hasTestUser, SKIP_REASON)
    await page.goto('/login')

    await submitLogin(page, 'qa-unbekannt@example.invalid', 'falsches-passwort-123')
    const unknown = await page.locator('main').getByRole('alert').innerText()

    await page.reload()
    await submitLogin(page, TEST_USER_EMAIL, 'falsches-passwort-123')
    await expect(page.locator('main').getByRole('alert')).toBeVisible()
    const known = await page.locator('main').getByRole('alert').innerText()

    expect(known).toBe(unknown)
  })

  test('AC: Zu viele Versuche zeigen den Hinweis zum Warten', async ({ page }) => {
    await mockSupabase(page, LOGIN_TOKEN, {
      status: 429,
      body: { code: 429, error_code: 'over_request_rate_limit', msg: 'Request rate limit reached' },
    })
    await page.goto('/login')
    await submitLogin(page)

    await expect(page.locator('main').getByRole('alert')).toContainText('Zu viele Versuche. Bitte warte ein paar Minuten.')
  })

  test('AC: Netzwerkfehler zeigen «nicht erreichbar», die Eingabe bleibt erhalten', async ({ page }) => {
    await mockSupabase(page, LOGIN_TOKEN, 'abort')
    await page.goto('/login')
    await submitLogin(page, 'jemand@example.invalid', 'mein-passwort')

    await expect(page.locator('main').getByRole('alert')).toContainText(
      'Die Anmeldung ist gerade nicht erreichbar. Bitte versuche es später erneut.'
    )
    await expect(page.getByLabel('E-Mail')).toHaveValue('jemand@example.invalid')
    await expect(page.getByRole('button', { name: 'Anmelden' })).toBeEnabled()
  })

  test('AC: Ein Serverfehler von Supabase zeigt ebenfalls «nicht erreichbar»', async ({ page }) => {
    await mockSupabase(page, LOGIN_TOKEN, { status: 500, body: { code: 500, error_code: 'unexpected_failure', msg: 'Fehler' } })
    await page.goto('/login')
    await submitLogin(page)

    await expect(page.locator('main').getByRole('alert')).toContainText('nicht erreichbar')
  })

  test('Edge: Doppelklick auf «Anmelden» sendet nur eine Anfrage und sperrt den Knopf', async ({ page }) => {
    const requests = await mockSupabase(
      page,
      LOGIN_TOKEN,
      { status: 400, body: { code: 400, error_code: 'invalid_credentials', msg: 'Invalid login credentials' } },
      { delayMs: 800 }
    )
    await page.goto('/login')
    await page.getByLabel('E-Mail').fill('jemand@example.invalid')
    await page.getByLabel('Passwort', { exact: true }).fill('mein-passwort')

    await page.getByRole('button', { name: 'Anmelden' }).dblclick()

    await expect(page.getByRole('button', { name: /Anmelden …/ })).toBeDisabled()
    await expect(page.locator('main').getByRole('alert')).toContainText('E-Mail oder Passwort stimmt nicht.')
    expect(requests.count).toBe(1)
  })

  test('Edge: Sehr langes Passwort mit Sonderzeichen wird ohne Absturz abgelehnt', async ({ page }) => {
    await page.goto('/login')
    await submitLogin(page, 'qa-unbekannt@example.invalid', 'äöü!§$%&/()=?`´' + 'x'.repeat(200))

    await expect(page.locator('main').getByRole('alert')).toContainText('E-Mail oder Passwort stimmt nicht.')
  })

  test('AC: Passwort lässt sich anzeigen und verbergen und ist nach dem Absenden wieder verdeckt', async ({ page }) => {
    await mockSupabase(page, LOGIN_TOKEN, 'abort')
    await page.goto('/login')
    const password = page.getByLabel('Passwort', { exact: true })
    await password.fill('geheim-1234')

    await expect(password).toHaveAttribute('type', 'password')
    await page.getByRole('button', { name: 'Passwort anzeigen' }).click()
    await expect(password).toHaveAttribute('type', 'text')
    await expect(page.getByRole('button', { name: 'Passwort verbergen' })).toBeVisible()

    await page.getByLabel('E-Mail').fill('jemand@example.invalid')
    await page.getByRole('button', { name: 'Anmelden' }).click()
    await expect(page.getByLabel('Passwort', { exact: true })).toHaveAttribute('type', 'password')
    await expect(page.getByRole('button', { name: 'Passwort anzeigen' })).toBeVisible()
  })

  test('AC: Der Anzeigen-Schalter ist per Tastatur bedienbar', async ({ page }) => {
    await page.goto('/login')
    await page.getByLabel('Passwort', { exact: true }).focus()
    await page.keyboard.press('Tab')
    await expect(page.getByRole('button', { name: 'Passwort anzeigen' })).toBeFocused()
    await page.keyboard.press('Enter')
    await expect(page.getByLabel('Passwort', { exact: true })).toHaveAttribute('type', 'text')
  })

  test('AC: Alle Elemente der Anmeldeseite sind mindestens 44 px hoch', async ({ page }) => {
    await page.setViewportSize(MOBILE)
    await page.goto('/login')
    for (const locator of [
      page.getByLabel('E-Mail'),
      page.getByLabel('Passwort', { exact: true }),
      page.getByRole('button', { name: 'Passwort anzeigen' }),
      page.getByRole('button', { name: 'Anmelden' }),
      page.getByRole('link', { name: 'Passwort vergessen?' }),
    ]) {
      const box = await locator.boundingBox()
      expect(box!.height).toBeGreaterThanOrEqual(44)
    }
    const eye = await page.getByRole('button', { name: 'Passwort anzeigen' }).boundingBox()
    expect(eye!.width).toBeGreaterThanOrEqual(44)
  })

  for (const [name, size] of [
    ['320 px', { width: 320, height: 640 }],
    ['375 px', MOBILE],
    ['768 px', { width: 768, height: 1024 }],
    ['1440 px', DESKTOP],
  ] as const) {
    test(`Responsive (${name}): kein horizontales Scrollen auf allen Anmeldeseiten`, async ({ page }) => {
      await page.setViewportSize(size)
      for (const path of ['/login', '/passwort-vergessen', '/passwort-vergessen?fehler=link']) {
        await page.goto(path)
        await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
        const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
        expect(overflow, path).toBeLessThanOrEqual(0)
      }
    })
  }

  test('AC: Die Anmeldeseite folgt dem dunklen Theme und bleibt lesbar', async ({ browser }) => {
    const context = await browser.newContext({ colorScheme: 'dark', storageState: NO_LOGIN })
    const page = await context.newPage()
    await page.goto('/login')

    expect(await page.evaluate(() => document.documentElement.className)).toContain('dark')
    const bg = await page.evaluate(() => getComputedStyle(document.body).backgroundColor)
    const rgb = (bg.match(/\d+/g) ?? []).map(Number)
    expect(Math.abs(rgb[0] - 22)).toBeLessThanOrEqual(2)
    expect(Math.abs(rgb[2] - 27)).toBeLessThanOrEqual(2)
    await expect(page.getByRole('button', { name: 'Anmelden' })).toBeVisible()
    await context.close()
  })

  test('AC: «Passwort vergessen?» führt zur Seite zum Zurücksetzen', async ({ page }) => {
    await page.goto('/login')
    await page.getByRole('link', { name: 'Passwort vergessen?' }).click()

    await expect(page).toHaveURL(/\/passwort-vergessen$/)
    await expect(page).toHaveTitle('Passwort zurücksetzen · Time Tracker Light')
  })
})

// ---------- Passwort vergessen ohne Anmeldung ----------

test.describe('PROJ-2: Passwort vergessen', () => {
  test.use({ storageState: NO_LOGIN })

  test('AC: Ungültige Eingaben werden am Feld gemeldet, es geht keine Anfrage raus', async ({ page }) => {
    const requests = await countRequests(page, /\/auth\/v1\/recover/)
    await page.goto('/passwort-vergessen')

    await page.getByRole('button', { name: 'Link senden' }).click()
    await expect(page.getByText('Bitte gib deine E-Mail-Adresse ein.')).toBeVisible()
    await page.getByLabel('E-Mail').fill('keine-adresse')
    await page.getByRole('button', { name: 'Link senden' }).click()
    await expect(page.getByText('Bitte gib eine gültige E-Mail-Adresse ein.')).toBeVisible()
    expect(requests.count).toBe(0)
  })

  test('AC: Nach dem Absenden erscheint die neutrale Bestätigung und der Link zeigt auf unsere Einlöse-Seite', async ({ page }) => {
    let redirectTo: string | null = null
    await page.route(RECOVER, async (route) => {
      if (route.request().method() === 'OPTIONS') {
        await route.fulfill({ status: 204, headers: { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': '*' } })
        return
      }
      redirectTo = new URL(route.request().url()).searchParams.get('redirect_to')
      await route.fulfill({ status: 200, headers: { 'access-control-allow-origin': '*', 'content-type': 'application/json' }, body: '{}' })
    })
    await page.goto('/passwort-vergessen')
    await page.getByLabel('E-Mail').fill('jemand@example.invalid')
    await page.getByRole('button', { name: 'Link senden' }).click()

    await expect(page.locator('main').getByRole('status')).toContainText(SENT)
    await expect(page.getByText('im selben Browser')).toBeVisible()
    await expect(page.getByRole('link', { name: 'Zurück zur Anmeldung' })).toHaveAttribute('href', '/login')
    expect(redirectTo).toBe(`${new URL(page.url()).origin}/auth/bestaetigen`)
  })

  test('AC: Auch für eine unbekannte Adresse erscheint dieselbe Bestätigung (echte Anfrage)', async ({ page }) => {
    await page.goto('/passwort-vergessen')
    await page.getByLabel('E-Mail').fill('qa-unbekannt@example.invalid')
    await page.getByRole('button', { name: 'Link senden' }).click()

    await expect(page.locator('main').getByRole('status')).toContainText(SENT, { timeout: 15_000 })
  })

  test('AC: Zu viele Anfragen zeigen den Hinweis zum Warten und das Formular bleibt', async ({ page }) => {
    await mockSupabase(page, RECOVER, {
      status: 429,
      body: { code: 429, error_code: 'over_email_send_rate_limit', msg: 'rate limit' },
    })
    await page.goto('/passwort-vergessen')
    await page.getByLabel('E-Mail').fill('jemand@example.invalid')
    await page.getByRole('button', { name: 'Link senden' }).click()

    await expect(page.locator('main').getByRole('alert')).toContainText('Zu viele Versuche. Bitte warte ein paar Minuten.')
    await expect(page.getByLabel('E-Mail')).toHaveValue('jemand@example.invalid')
  })

  test('AC: Netzwerkfehler zeigen «nicht erreichbar»', async ({ page }) => {
    await mockSupabase(page, RECOVER, 'abort')
    await page.goto('/passwort-vergessen')
    await page.getByLabel('E-Mail').fill('jemand@example.invalid')
    await page.getByRole('button', { name: 'Link senden' }).click()

    await expect(page.locator('main').getByRole('alert')).toContainText('nicht erreichbar')
  })

  test('AC: Mit ungültigem Link erscheint der Hinweis zusammen mit dem Formular für einen neuen Link', async ({ page }) => {
    await page.goto('/passwort-vergessen?fehler=link')

    await expect(page.locator('main').getByRole('alert')).toContainText('Dieser Link ist nicht mehr gültig.')
    await expect(page.getByLabel('E-Mail')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Link senden' })).toBeVisible()
  })
})

// ---------- Mit Anmeldung ----------

test.describe('PROJ-2: Mit Anmeldung', () => {
  test.skip(!hasTestUser, SKIP_REASON)

  test('AC: Angemeldete werden von der Anmeldeseite und «Passwort vergessen» auf die Startseite geleitet', async ({ page }) => {
    for (const path of ['/login', '/passwort-vergessen']) {
      await page.goto(path)
      await expect(page, path).toHaveURL(/\/$/)
      await expect(page.getByRole('heading', { level: 1, name: /Heute/ })).toBeVisible()
    }
  })

  test('AC: Angemeldete sehen den Abmelden-Knopf in der Seitenleiste (Laptop) und in der Kopfzeile (Handy)', async ({ page }) => {
    await page.setViewportSize(DESKTOP)
    await page.goto('/')
    const sidebarButton = page.locator('div.bg-sidebar').getByRole('button', { name: 'Abmelden' })
    await expect(sidebarButton).toBeVisible()
    expect((await sidebarButton.boundingBox())!.height).toBeGreaterThanOrEqual(44)
    await expect(page.locator('header').getByRole('button', { name: 'Abmelden' })).toBeHidden()

    await page.setViewportSize(MOBILE)
    const headerButton = page.locator('header').getByRole('button', { name: 'Abmelden' })
    await expect(headerButton).toBeVisible()
    const box = await headerButton.boundingBox()
    expect(box!.width).toBeGreaterThanOrEqual(44)
    expect(box!.height).toBeGreaterThanOrEqual(44)
  })

  test('AC: Geschützte Seiten dürfen nicht zwischengespeichert werden (Zurück-Taste nach dem Abmelden)', async ({ page }) => {
    for (const path of ['/', '/status']) {
      const response = await page.request.get(path)
      expect(response.status(), path).toBe(200)
      expect(response.headers()['cache-control'], path).toBe('private, no-store')
    }
  })

  test('AC: Die Anmeldung bleibt nach Neuladen und in neuen Tabs bestehen, Cookies tragen die Sitzung', async ({ page, context }) => {
    await page.goto('/status')
    await page.reload()
    await expect(page).toHaveURL(/\/status$/)
    await expect(page.getByRole('heading', { name: 'Systemstatus' })).toBeVisible()

    const second = await context.newPage()
    await second.goto('/')
    await expect(second).toHaveURL(/\/$/)
    await expect(second.getByRole('heading', { level: 1, name: /Heute/ })).toBeVisible()

    const cookies = await context.cookies()
    expect(cookies.some((cookie) => cookie.name.startsWith('sb-'))).toBe(true)
  })

  test('Edge: Läuft die Sitzung ab (Cookies weg), führt die nächste Seite auf die Anmeldung mit Zieladresse', async ({ page, context }) => {
    await page.goto('/status')
    await expect(page.getByRole('heading', { name: 'Systemstatus' })).toBeVisible()

    await context.clearCookies()
    await page.goto('/status')

    await expect(page).toHaveURL(/\/login\?next=%2Fstatus$/)
    await expect(page.getByRole('heading', { level: 1, name: 'Anmelden' })).toBeVisible()
  })

  test('AC: «Neues Passwort» ist mit gewöhnlicher Anmeldung nicht erreichbar (BUG-2 behoben)', async ({ page }) => {
    await page.goto('/passwort-neu')

    // Weiter über «Link nicht mehr gültig» (nur ohne Sitzung sichtbar) auf die Startseite.
    await expect(page).toHaveURL(/\/$/)
    await expect(page.getByRole('heading', { level: 1, name: 'Neues Passwort' })).toHaveCount(0)
  })

  test('AC: «Neues Passwort» ist mit Sitzung und Reset-Marker erreichbar und verlangt mindestens 10 Zeichen', async ({
    page,
    context,
    baseURL,
  }) => {
    await context.addCookies([{ name: 'tt-recovery', value: '1', url: baseURL! }])
    const requests = await countRequests(page, /\/auth\/v1\/user/)
    await page.goto('/passwort-neu')

    await expect(page).toHaveURL(/\/passwort-neu$/)
    await expect(page.getByRole('heading', { level: 1, name: 'Neues Passwort' })).toBeVisible()
    await expect(page.getByText('Mindestens 10 Zeichen.')).toBeVisible()
    await page.getByLabel('Neues Passwort').fill('kurz')
    await page.getByRole('button', { name: 'Passwort speichern' }).click()

    await expect(page.getByText('Das Passwort braucht mindestens 10 Zeichen.')).toBeVisible()
    expect(requests.count).toBe(0)
    await expect(page).toHaveTitle('Passwort zurücksetzen · Time Tracker Light')
  })
})

// ---------- Anmelden durch einen Nutzer (frische Sitzung ohne gespeicherte Anmeldung) ----------

test.describe('PROJ-2: Anmelden mit dem Testkonto', () => {
  test.skip(!hasTestUser, SKIP_REASON)
  test.use({ storageState: NO_LOGIN, viewport: DESKTOP })

  test('AC: Erfolgreiche Anmeldung führt auf die Startseite und bleibt nach Neuladen bestehen', async ({ page }) => {
    await page.goto('/login')
    await uiLogin(page)

    await expect(page).toHaveURL(/\/$/)
    await expect(page.getByRole('heading', { level: 1, name: /Heute/ })).toBeVisible()
    await page.reload()
    await expect(page.getByRole('heading', { level: 1, name: /Heute/ })).toBeVisible()
  })

  test('AC: Nach der Umleitung führt die Anmeldung zurück auf die ursprünglich gewünschte Seite', async ({ page }) => {
    await page.goto('/status')
    await expect(page).toHaveURL(/\/login\?next=%2Fstatus$/)
    await uiLogin(page)

    await expect(page).toHaveURL(/\/status$/)
    await expect(page.getByRole('heading', { name: 'Systemstatus' })).toBeVisible()
  })

  test('Security: Fremde oder unsichere Zieladressen werden ignoriert (kein Open Redirect)', async ({ browser }) => {
    for (const next of ['https://evil.example', '//evil.example', '/\\evil.example', 'javascript:alert(1)', '/login']) {
      const context = await browser.newContext({ storageState: NO_LOGIN, viewport: DESKTOP })
      const page = await context.newPage()
      await page.goto(`/login?next=${encodeURIComponent(next)}`)
      await uiLogin(page)

      await expect(page, next).toHaveURL(/\/$/)
      expect(new URL(page.url()).hostname, next).toBe('localhost')
      await expect(page.getByRole('heading', { level: 1, name: /Heute/ }), next).toBeVisible()
      await context.close()
    }
  })

  test('Edge: E-Mail mit Gross-/Kleinbuchstaben und Leerzeichen am Rand funktioniert', async ({ page }) => {
    await page.goto('/login')
    await uiLogin(page, { email: `  ${TEST_USER_EMAIL.toUpperCase()}  `, password: process.env.TEST_USER_PASSWORD ?? '' })

    await expect(page).toHaveURL(/\/$/)
  })

  test('Edge: Die Zurück-Taste nach der Anmeldung führt nicht auf die Anmeldeseite', async ({ page }) => {
    await page.goto('/login')
    await uiLogin(page)
    await expect(page).toHaveURL(/\/$/)

    await page.goBack()

    await expect(page).toHaveURL(/\/$/)
    await expect(page.getByRole('heading', { level: 1, name: /Heute/ })).toBeVisible()
  })

  test('AC: Zwei Geräte sind unabhängig angemeldet', async ({ browser }) => {
    const contexts = await Promise.all([
      browser.newContext({ storageState: NO_LOGIN }),
      browser.newContext({ storageState: NO_LOGIN }),
    ])
    for (const context of contexts) {
      const page = await context.newPage()
      await page.goto('/login')
      await uiLogin(page)
      await expect(page).toHaveURL(/\/$/)
    }
    for (const context of contexts) {
      const page = context.pages()[0]
      await page.reload()
      await expect(page.getByRole('heading', { level: 1, name: /Heute/ })).toBeVisible()
    }
    await Promise.all(contexts.map((context) => context.close()))
  })
})
