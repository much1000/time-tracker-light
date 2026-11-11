import { expect, test, type Page } from '@playwright/test'
import { hasTestUser, SKIP_REASON } from './helpers/env'

// PROJ-11: Design-System-Basis
// Seit PROJ-2 sind alle Seiten geschützt: Die Tests laufen mit der gespeicherten Anmeldung des Testkontos.
test.skip(!hasTestUser, SKIP_REASON)
// Voraussetzung: .env.local ist gesetzt (die Seite /status prüft die Datenbank).

const MOBILE = { width: 375, height: 740 }
const TABLET = { width: 768, height: 1024 }
const DESKTOP = { width: 1440, height: 900 }

// ---------- Hilfsfunktionen für Kontrastberechnung ----------
// Prüft, ob ein Service-Role-Schlüssel oder ein Token ausgeliefert wird. Der Variablenname
// NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY darf vorkommen (die Konfigurationsprüfung lehnt ihn ab),
// ein Schlüssel mit Rolle «service_role» nicht. Der öffentliche anon-Schlüssel ist erlaubt.
function findLeaks(text: string): string[] {
  const leaks: string[] = []
  if (/service_role/i.test(text.replaceAll('NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY', ''))) {
    leaks.push('Text «service_role» ausserhalb des Variablennamens')
  }
  if (/sbp_[A-Za-z0-9]{20,}/.test(text)) leaks.push('Zugriffstoken sbp_…')
  if (/sb_secret_[A-Za-z0-9_-]{16,}/.test(text)) leaks.push('Schlüssel sb_secret_…')
  for (const match of text.matchAll(/eyJ[A-Za-z0-9_-]{10,}\.([A-Za-z0-9_-]{10,})\./g)) {
    try {
      const payload = JSON.parse(Buffer.from(match[1], 'base64url').toString())
      if (payload.role && payload.role !== 'anon') leaks.push(`JWT mit Rolle ${payload.role}`)
    } catch {
      // kein JWT
    }
  }
  return leaks
}


function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  s /= 100
  l /= 100
  const k = (n: number) => (n + h / 30) % 12
  const a = s * Math.min(l, 1 - l)
  const f = (n: number) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)))
  return [f(0) * 255, f(8) * 255, f(4) * 255]
}

function luminance([r, g, b]: [number, number, number]) {
  const lin = (v: number) => {
    const c = v / 255
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  }
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b)
}

function contrast(a: [number, number, number], b: [number, number, number]) {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x)
  return (hi + 0.05) / (lo + 0.05)
}

async function readTokens(page: Page) {
  return page.evaluate(() => {
    const style = getComputedStyle(document.documentElement)
    const names = [
      'background', 'foreground', 'card', 'muted', 'muted-foreground',
      'primary', 'primary-foreground', 'brand-text', 'destructive',
      'success', 'input',
    ]
    return Object.fromEntries(names.map((n) => [n, style.getPropertyValue(`--${n}`).trim()]))
  })
}

function rgbOf(token: string): [number, number, number] {
  const [h, s, l] = token.replace(/%/g, '').split(/\s+/).map(Number)
  return hslToRgb(h, s, l)
}

// Erwartet einen RGB-Wert mit höchstens 2 Stufen Abweichung je Kanal (HSL-Rundung der Farbvariablen).
function expectRgbNear(actual: string, expected: [number, number, number]) {
  const got = (actual.match(/\d+/g) ?? []).map(Number)
  expect(got.length, actual).toBeGreaterThanOrEqual(3)
  expected.forEach((v, i) => expect(Math.abs(got[i] - v), `${actual} statt rgb(${expected})`).toBeLessThanOrEqual(2))
}

async function htmlClass(page: Page) {
  return page.evaluate(() => document.documentElement.className)
}

// ---------- Navigation und Layout ----------

test.describe('PROJ-11: Navigation und Layout', () => {
  test('AC: Handy zeigt Tab-Leiste unten und Kopfzeile mit Logo und Theme-Schalter, keine Seitenleiste', async ({ page }) => {
    await page.setViewportSize(MOBILE)
    await page.goto('/')

    const tabBar = page.getByRole('navigation', { name: 'Hauptnavigation' })
    await expect(tabBar).toBeVisible()
    await expect(tabBar.getByRole('link', { name: 'Start' })).toBeVisible()
    await expect(tabBar.getByRole('link', { name: 'Status' })).toBeVisible()

    const header = page.locator('header')
    await expect(header).toBeVisible()
    await expect(header.getByText('Time Tracker Light')).toBeVisible()
    await expect(header.getByRole('button', { name: 'Darstellung wählen' })).toBeVisible()

    await expect(page.locator('div.bg-sidebar')).toBeHidden()
    const box = await tabBar.boundingBox()
    expect(Math.round(box!.y + box!.height)).toBe(MOBILE.height)
  })

  for (const [name, size] of [['Tablet 768 px', TABLET], ['Desktop 1440 px', DESKTOP]] as const) {
    test(`AC: ${name} zeigt Seitenleiste mit Logo, Einträgen und Theme-Schalter, keine Tab-Leiste und keine Kopfzeile`, async ({ page }) => {
      await page.setViewportSize(size)
      await page.goto('/')

      const sidebar = page.locator('div.bg-sidebar')
      await expect(sidebar).toBeVisible()
      await expect(sidebar.getByText('Time Tracker Light')).toBeVisible()
      await expect(sidebar.getByRole('link', { name: 'Start' })).toBeVisible()
      await expect(sidebar.getByRole('link', { name: 'Status' })).toBeVisible()
      await expect(sidebar.getByRole('button', { name: 'Darstellung' })).toBeVisible()

      await expect(page.locator('header')).toBeHidden()
      // Es existiert nur eine sichtbare Hauptnavigation (die der Seitenleiste).
      await expect(page.getByRole('navigation', { name: 'Hauptnavigation' })).toHaveCount(1)
    })
  }

  test('AC: Klick auf «Status» öffnet die Seite, die Navigation bleibt stehen', async ({ page }) => {
    await page.setViewportSize(DESKTOP)
    await page.goto('/')
    const sidebar = page.locator('div.bg-sidebar')
    // Marker am Rahmen: Wird er bei einer Client-Navigation ersetzt, ginge er verloren.
    await sidebar.evaluate((el) => el.setAttribute('data-qa-marker', 'bleibt'))

    await sidebar.getByRole('link', { name: 'Status' }).click()

    await expect(page).toHaveURL(/\/status$/)
    await expect(page.getByRole('heading', { name: 'Systemstatus' })).toBeVisible()
    await expect(sidebar).toHaveAttribute('data-qa-marker', 'bleibt')
  })

  test('AC: Aktiver Eintrag ist per aria-current, Fettschrift und Balken erkennbar (Seitenleiste)', async ({ page }) => {
    await page.setViewportSize(DESKTOP)
    await page.goto('/status')
    const sidebar = page.locator('div.bg-sidebar')
    const active = sidebar.getByRole('link', { name: 'Status' })
    const inactive = sidebar.getByRole('link', { name: 'Start' })

    await expect(active).toHaveAttribute('aria-current', 'page')
    await expect(inactive).not.toHaveAttribute('aria-current', 'page')
    const weight = (l: typeof active) => l.evaluate((el) => Number(getComputedStyle(el).fontWeight))
    expect(await weight(active)).toBeGreaterThanOrEqual(700)
    expect(await weight(inactive)).toBeLessThan(700)
    const bar = await active.evaluate((el) => {
      const s = getComputedStyle(el, '::before')
      return { content: s.content, width: s.width }
    })
    expect(bar.content).not.toBe('none')
    expect(parseFloat(bar.width)).toBeGreaterThan(0)
  })

  test('AC: Aktiver Eintrag ist per aria-current, Fettschrift und Balken erkennbar (Tab-Leiste)', async ({ page }) => {
    await page.setViewportSize(MOBILE)
    await page.goto('/status')
    const tabBar = page.getByRole('navigation', { name: 'Hauptnavigation' })
    const active = tabBar.getByRole('link', { name: 'Status' })
    const inactive = tabBar.getByRole('link', { name: 'Start' })

    await expect(active).toHaveAttribute('aria-current', 'page')
    expect(await active.evaluate((el) => Number(getComputedStyle(el).fontWeight))).toBeGreaterThanOrEqual(700)
    expect(await inactive.evaluate((el) => Number(getComputedStyle(el).fontWeight))).toBeLessThan(700)
    const bar = await active.evaluate((el) => getComputedStyle(el, '::before').content)
    expect(bar).not.toBe('none')
  })

  test('AC: Navigationsflächen sind mindestens 44 × 44 px gross', async ({ page }) => {
    for (const [size, scope] of [
      [MOBILE, () => page.getByRole('navigation', { name: 'Hauptnavigation' })],
      [DESKTOP, () => page.locator('div.bg-sidebar')],
    ] as const) {
      await page.setViewportSize(size)
      await page.goto('/')
      for (const label of ['Start', 'Status']) {
        const box = await scope().getByRole('link', { name: label }).boundingBox()
        expect(box!.width).toBeGreaterThanOrEqual(44)
        expect(box!.height).toBeGreaterThanOrEqual(44)
      }
    }
    // Theme-Knöpfe
    await page.setViewportSize(MOBILE)
    const icon = await page.getByRole('button', { name: 'Darstellung wählen' }).boundingBox()
    expect(icon!.width).toBeGreaterThanOrEqual(44)
    expect(icon!.height).toBeGreaterThanOrEqual(44)
    await page.setViewportSize(DESKTOP)
    const labeled = await page.getByRole('button', { name: 'Darstellung', exact: true }).boundingBox()
    expect(labeled!.height).toBeGreaterThanOrEqual(44)
  })

  test('AC: Tab-Leiste bleibt beim Scrollen unten und verdeckt am Seitenende nichts', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 320 }) // Niedrig, damit die Seite scrollt
    await page.goto('/')
    const tabBar = page.getByRole('navigation', { name: 'Hauptnavigation' })

    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
    const bar = await tabBar.boundingBox()
    expect(Math.round(bar!.y + bar!.height)).toBe(320)
    expect(await tabBar.evaluate((el) => getComputedStyle(el).position)).toBe('fixed')

    const cardBottom = await page.locator('#main-content').getByRole('link', { name: 'Systemstatus ansehen' }).evaluate((el) => el.getBoundingClientRect().bottom)
    expect(cardBottom).toBeLessThanOrEqual(bar!.y)
  })

  test('AC: Tastatur: «Zum Inhalt springen» ist erstes Tab-Ziel, Navigation hat sichtbaren Fokus', async ({ page }) => {
    await page.setViewportSize(DESKTOP)
    await page.goto('/')

    await page.keyboard.press('Tab')
    const skip = page.getByRole('link', { name: 'Zum Inhalt springen' })
    await expect(skip).toBeFocused()
    await expect(skip).toBeVisible()

    await page.keyboard.press('Enter')
    await expect(page.locator('#main-content')).toBeFocused()

    await page.goto('/')
    await page.keyboard.press('Tab') // Skip-Link
    await page.keyboard.press('Tab') // Logo
    await page.keyboard.press('Tab') // Start
    const focused = page.locator(':focus')
    await expect(focused).toHaveText('Start')
    const ring = await focused.evaluate((el) => {
      const s = getComputedStyle(el)
      return { shadow: s.boxShadow, outline: s.outlineStyle }
    })
    expect(ring.shadow !== 'none' || ring.outline !== 'none').toBe(true)
  })
})

test('AC: Jede Seite hat genau einen Hauptbereich (<main>)', async ({ page }) => {
  await page.goto('/')
  await expect(page.locator('main')).toHaveCount(1)
})

// ---------- Startseite ----------

test.describe('PROJ-11: Startseite', () => {
  test('AC: «/» zeigt Logo, Willkommenstext und Link zum Status, keine Starter-Seite mehr', async ({ page }) => {
    await page.setViewportSize(DESKTOP)
    await page.goto('/')

    const main = page.locator('#main-content')
    await expect(main.getByRole('heading', { level: 1, name: /Willkommen/ })).toBeVisible()
    await expect(main.locator('img').first()).toBeVisible()
    await main.getByRole('link', { name: 'Systemstatus ansehen' }).click()
    await expect(page).toHaveURL(/\/status$/)

    await page.goto('/')
    await expect(page.locator('body')).not.toContainText('Next.js')
    await expect(page.locator('img[src*="next.svg"], img[src*="vercel.svg"]')).toHaveCount(0)
  })
})

// ---------- Theme ----------

test.describe('PROJ-11: Theme', () => {
  test('AC: Standard «System» folgt der Geräteeinstellung (dunkel und hell)', async ({ browser }) => {
    for (const scheme of ['dark', 'light'] as const) {
      const context = await browser.newContext({ colorScheme: scheme })
      const page = await context.newPage()
      await page.goto('/')
      expect(await htmlClass(page)).toContain(scheme)
      await context.close()
    }
  })

  test('AC: Theme-Schalter bietet System, Hell, Dunkel und markiert die aktuelle Wahl', async ({ page }) => {
    await page.setViewportSize(DESKTOP)
    await page.goto('/')
    await page.getByRole('button', { name: 'Darstellung', exact: true }).click()

    const items = page.getByRole('menuitemradio')
    await expect(items).toHaveText(['System', 'Hell', 'Dunkel'])
    await expect(page.getByRole('menuitemradio', { name: 'System' })).toHaveAttribute('aria-checked', 'true')
    await page.keyboard.press('Escape')

    await page.getByRole('menuitemradio', { name: 'Hell' }).waitFor({ state: 'detached' })
    await page.getByRole('button', { name: 'Darstellung', exact: true }).click()
    await page.getByRole('menuitemradio', { name: 'Hell' }).click()
    await expect.poll(() => page.evaluate(() => localStorage.getItem('theme'))).toBe('light')
    await page.getByRole('button', { name: 'Darstellung', exact: true }).click()
    await expect(page.getByRole('menuitemradio', { name: 'Hell' })).toHaveAttribute('aria-checked', 'true')
  })

  test('AC: Theme-Schalter ist per Tastatur bedienbar', async ({ page }) => {
    await page.setViewportSize(DESKTOP)
    await page.goto('/')
    await page.getByRole('button', { name: 'Darstellung', exact: true }).focus()
    await page.keyboard.press('Enter')
    await expect(page.getByRole('menu')).toBeVisible()
    // Je nach Zeitpunkt hat beim Öffnen schon die erste Option den Fokus; daher bis «Hell» weiterschalten.
    for (let i = 0; i < 4; i++) {
      const text = await page.locator(':focus').innerText().catch(() => '')
      if (text.includes('Hell')) break
      await page.keyboard.press('ArrowDown')
      await page.waitForTimeout(150) // Fokuswechsel abwarten, sonst wird eine Option übersprungen
    }
    await expect(page.locator(':focus')).toContainText('Hell')
    await page.keyboard.press('Enter')
    await expect.poll(() => page.evaluate(() => localStorage.getItem('theme'))).toBe('light')
  })

  test('AC: Wahl «Dunkel» bleibt nach Neuladen erhalten, auch wenn das Gerät auf hell steht', async ({ browser }) => {
    const context = await browser.newContext({ colorScheme: 'light', viewport: DESKTOP })
    const page = await context.newPage()
    await page.goto('/')
    expect(await htmlClass(page)).toContain('light')

    await page.getByRole('button', { name: 'Darstellung', exact: true }).click()
    await page.getByRole('menuitemradio', { name: 'Dunkel' }).click()
    await expect.poll(() => htmlClass(page)).toContain('dark')

    await page.reload()
    expect(await htmlClass(page)).toContain('dark')
    await page.goto('/status')
    expect(await htmlClass(page)).toContain('dark')
    await context.close()
  })

  test('AC: Gewähltes Theme steht schon beim Laden fest (kein Aufblitzen des falschen)', async ({ browser }) => {
    const context = await browser.newContext({ colorScheme: 'light' })
    await context.addInitScript(() => {
      localStorage.setItem('theme', 'dark')
      // Merkt, in welchem Ladezustand das Dokument beim Setzen der Klasse war.
      ;(window as unknown as { __themeSeen: string[] }).__themeSeen = []
      new MutationObserver(() => {
        const w = window as unknown as { __themeSeen: string[] }
        w.__themeSeen.push(`${document.readyState}:${document.documentElement.className}`)
      }).observe(document, { attributes: true, subtree: true, attributeFilter: ['class'] })
    })
    const page = await context.newPage()
    await page.goto('/')

    const seen = await page.evaluate(() => (window as unknown as { __themeSeen: string[] }).__themeSeen)
    expect(seen.length).toBeGreaterThan(0)
    // Die erste gesetzte Klasse ist «dark» und gelangt vor dem Rendern, nie «light».
    expect(seen[0]).toMatch(/^loading:.*dark/)
    expect(seen.join('|')).not.toMatch(/light/)
    await context.close()
  })

  test('AC: Auf «System» wechselt die App mit der Geräteeinstellung ohne Neuladen', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'light' })
    await page.goto('/')
    expect(await htmlClass(page)).toContain('light')

    await page.emulateMedia({ colorScheme: 'dark' })
    await expect.poll(() => htmlClass(page)).toContain('dark')
  })

  test('AC: /status ist im dunklen Theme dunkel (BUG-5 aus PROJ-1)', async ({ browser }) => {
    const context = await browser.newContext({ colorScheme: 'dark' })
    const page = await context.newPage()
    await page.goto('/status')

    expect(await htmlClass(page)).toContain('dark')
    const bg = await page.evaluate(() => getComputedStyle(document.body).backgroundColor)
    expectRgbNear(bg, [22, 24, 27]) // #16181B
    await context.close()
  })

  test('Edge: gelöschter Browserspeicher fällt auf «System» zurück', async ({ browser }) => {
    const context = await browser.newContext({ colorScheme: 'dark', viewport: DESKTOP })
    const page = await context.newPage()
    await page.goto('/')
    await page.getByRole('button', { name: 'Darstellung', exact: true }).click()
    await page.getByRole('menuitemradio', { name: 'Hell' }).click()
    await expect.poll(() => htmlClass(page)).toContain('light')

    await page.evaluate(() => localStorage.clear())
    await page.reload()
    expect(await htmlClass(page)).toContain('dark')
    await context.close()
  })
})

// ---------- Farben, Schrift, Kontrast ----------

test.describe('PROJ-11: Farben, Schrift, Kontrast', () => {
  for (const scheme of ['light', 'dark'] as const) {
    test(`AC: Kontrast der Farbpaare im Theme «${scheme}» erfüllt WCAG AA`, async ({ browser }) => {
      const context = await browser.newContext({ colorScheme: scheme })
      const page = await context.newPage()
      await page.goto('/')
      const t = await readTokens(page)
      const c = (a: string, b: string) => contrast(rgbOf(t[a]), rgbOf(t[b]))

      // Text: mindestens 4.5 : 1
      expect(c('foreground', 'background'), 'Text auf Hintergrund').toBeGreaterThanOrEqual(4.5)
      expect(c('card', 'foreground'), 'Text auf Fläche').toBeGreaterThanOrEqual(4.5)
      expect(c('muted-foreground', 'background'), 'gedämpft auf Hintergrund').toBeGreaterThanOrEqual(4.5)
      expect(c('muted-foreground', 'card'), 'gedämpft auf Fläche').toBeGreaterThanOrEqual(4.5)
      expect(c('muted-foreground', 'muted'), 'gedämpft auf muted').toBeGreaterThanOrEqual(4.5)
      expect(c('primary', 'primary-foreground'), 'Text auf Primär').toBeGreaterThanOrEqual(4.5)
      expect(c('brand-text', 'background'), 'Link/Akzenttext').toBeGreaterThanOrEqual(4.5)
      expect(c('destructive', 'background'), 'Fehler auf Hintergrund').toBeGreaterThanOrEqual(4.5)
      expect(c('destructive', 'card'), 'Fehler auf Fläche').toBeGreaterThanOrEqual(4.5)
      expect(c('success', 'background'), 'Erfolg auf Hintergrund').toBeGreaterThanOrEqual(4.5)
      // UI-Elemente: mindestens 3 : 1
      expect(c('input', 'background'), 'Rand von Eingabefeldern').toBeGreaterThanOrEqual(3)
      await context.close()
    })
  }

  test('AC: Farbwerte stimmen mit dem Design-System überein', async ({ browser }) => {
    const hex = (t: string) => '#' + rgbOf(t).map((v) => Math.round(v).toString(16).padStart(2, '0')).join('').toUpperCase()
    const expected = {
      light: { background: '#FFFFFF', foreground: '#1F2328', primary: '#F1C232', 'brand-text': '#7A5C00', destructive: '#C62828', success: '#1B7F3B' },
      dark: { background: '#16181B', foreground: '#F2F3F5', primary: '#F1C232', 'brand-text': '#FFD966', destructive: '#FF8A80', success: '#4ADE80' },
    }
    for (const scheme of ['light', 'dark'] as const) {
      const context = await browser.newContext({ colorScheme: scheme })
      const page = await context.newPage()
      await page.goto('/')
      const t = await readTokens(page)
      for (const [name, value] of Object.entries(expected[scheme])) {
        // Rundung HSL → RGB: höchstens 1 Stufe Abweichung je Kanal.
        const got = rgbOf(t[name])
        const want = [1, 3, 5].map((i) => parseInt(value.slice(i, i + 2), 16))
        got.forEach((v, i) => expect(Math.abs(v - want[i]), `${scheme} ${name} ${hex(t[name])} statt ${value}`).toBeLessThanOrEqual(2))
      }
      await context.close()
    }
  })

  test('AC: Schrift ist Inter mit system-ui als Ausweichschrift und tabellarischen Ziffern', async ({ page }) => {
    await page.goto('/')
    const style = await page.evaluate(() => {
      const s = getComputedStyle(document.body)
      return { family: s.fontFamily, numeric: s.fontVariantNumeric }
    })
    expect(style.family).toMatch(/^Inter/)
    expect(style.family).toContain('system-ui')
    expect(style.numeric).toContain('tabular-nums')
    await expect.poll(() => page.evaluate(() => document.fonts.check('16px Inter'))).toBe(true)
  })

  test('AC: Keine Anfragen an Schriftdienste Dritter', async ({ page }) => {
    const external: string[] = []
    page.on('request', (r) => {
      const host = new URL(r.url()).hostname
      if (!['localhost', '127.0.0.1'].includes(host)) external.push(r.url())
    })
    await page.goto('/')
    await page.goto('/status')
    await page.waitForLoadState('networkidle')
    // Erlaubt ist nur die Datenbank-Gesundheitsprüfung (läuft serverseitig, nicht im Browser).
    expect(external.filter((u) => /fonts\.(googleapis|gstatic)\.com/.test(u))).toEqual([])
    expect(external).toEqual([])
  })
})

// ---------- Logo, Favicon, Titel ----------

test.describe('PROJ-11: Logo, Favicon, Titel', () => {
  test('AC: Favicon und Handy-Symbol sind eingebunden und erreichbar (BUG-2 behoben)', async ({ page, request }) => {
    await page.goto('/')
    const icon = await page.locator('link[rel~="icon"]').first().getAttribute('href')
    const apple = await page.locator('link[rel="apple-touch-icon"]').getAttribute('href')
    expect(icon).toBeTruthy()
    expect(apple).toBeTruthy()

    for (const href of [icon!, apple!]) {
      const response = await request.get(href)
      expect(response.status(), href).toBe(200)
      expect(response.headers()['content-type']).toContain('image/png')
    }
  })

  test('AC: Beim Laden gibt es keinen Konsolenfehler, auch kein Favicon-404', async ({ page }) => {
    const errors: string[] = []
    page.on('console', (m) => m.type() === 'error' && errors.push(`${m.text()} ${m.location().url}`))
    page.on('pageerror', (e) => errors.push(e.message))
    await page.goto('/')
    await page.goto('/status')
    await page.waitForLoadState('networkidle')
    expect(errors).toEqual([])
  })

  test('AC: Seitentitel lauten «Time Tracker Light» und «Status · Time Tracker Light»', async ({ page }) => {
    await page.goto('/')
    await expect(page).toHaveTitle('Time Tracker Light')
    await page.goto('/status')
    await expect(page).toHaveTitle('Status · Time Tracker Light')
    await expect(page).not.toHaveTitle(/Starter Kit/)
  })

  test('AC: Logo ist im dunklen Theme sichtbar und geladen', async ({ browser }) => {
    const context = await browser.newContext({ colorScheme: 'dark', viewport: DESKTOP })
    const page = await context.newPage()
    await page.goto('/')
    const logo = page.locator('div.bg-sidebar img')
    await expect(logo).toBeVisible()
    expect(await logo.evaluate((el: HTMLImageElement) => el.complete && el.naturalWidth > 0)).toBe(true)
    // Der Name steht als Text daneben, das Bild ist dekorativ (leerer Alternativtext).
    expect(await logo.getAttribute('alt')).toBe('')
    await context.close()
  })

  test('Edge: Viewport erlaubt Inhalt bis an den Rand (Home-Indikator wird berücksichtigt)', async ({ page }) => {
    await page.goto('/')
    const content = await page.locator('meta[name="viewport"]').getAttribute('content')
    expect(content).toContain('viewport-fit=cover')
    const padding = await page.locator('nav.fixed').evaluate((el) => el.className)
    expect(padding).toContain('safe-area-inset-bottom')
  })
})

// ---------- Edge Cases ----------

test.describe('PROJ-11: Edge Cases', () => {
  test('Edge: 320 px breit — nichts läuft über, Beschriftungen sind nicht abgeschnitten', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 640 })
    for (const path of ['/', '/status']) {
      await page.goto(path)
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
      expect(overflow, path).toBeLessThanOrEqual(0)
    }
    const labels = page.getByRole('navigation', { name: 'Hauptnavigation' }).locator('span')
    for (const el of await labels.all()) {
      expect(await el.evaluate((n) => n.scrollWidth <= n.clientWidth)).toBe(true)
    }
  })

  test('Edge: Wechsel der Fenstergrösse behält die aktive Seite und springt nicht', async ({ page }) => {
    await page.setViewportSize(DESKTOP)
    await page.goto('/status')
    await page.setViewportSize(MOBILE)
    await expect(page.getByRole('navigation', { name: 'Hauptnavigation' }).getByRole('link', { name: 'Status' })).toHaveAttribute('aria-current', 'page')
    await expect(page.getByRole('heading', { name: 'Systemstatus' })).toBeVisible()
    await page.setViewportSize(DESKTOP)
    await expect(page.locator('div.bg-sidebar').getByRole('link', { name: 'Status' })).toHaveAttribute('aria-current', 'page')
  })

  test('Edge: Doppelte Schrift (200 % Zoom entspricht 720 px Breite) — Navigation bleibt bedienbar', async ({ page }) => {
    await page.setViewportSize({ width: 720, height: 450 })
    await page.goto('/')
    const link = page.getByRole('navigation', { name: 'Hauptnavigation' }).getByRole('link', { name: 'Status' })
    await expect(link).toBeVisible()
    await link.click()
    await expect(page).toHaveURL(/\/status$/)
  })

  // Spec: «Die Standardfehlerseite erscheint im neuen Theme.»
  // Bekannte Lücke (BUG-3 in PROJ-11): Next.js zeigt seine eigene 404-Seite mit festem Schwarz bzw. Weiss.
  test.fail('Edge: Unbekannte Seite zeigt eine Fehlerseite im aktuellen Theme', async ({ browser }) => {
    const context = await browser.newContext({ colorScheme: 'dark' })
    const page = await context.newPage()
    const response = await page.goto('/gibt-es-nicht')
    expect(response!.status()).toBe(404)
    expectRgbNear(await page.evaluate(() => getComputedStyle(document.body).backgroundColor), [22, 24, 27])
    await context.close()
  })

  test('Edge: Ohne JavaScript bleiben Seite und Navigation per Link nutzbar', async ({ browser }) => {
    const context = await browser.newContext({ javaScriptEnabled: false, viewport: DESKTOP })
    const page = await context.newPage()
    await page.goto('/')
    await expect(page.locator('#main-content').getByRole('heading', { level: 1 })).toBeVisible()
    await page.locator('div.bg-sidebar').getByRole('link', { name: 'Status' }).click()
    await expect(page).toHaveURL(/\/status$/)
    await context.close()
  })

  // Spec: «JavaScript ist deaktiviert: Die Seite erscheint im Theme der Geräteeinstellung.»
  // Bekannte Lücke (BUG-1 in PROJ-11): Das Theme hängt an einer Klasse, die ein Skript setzt.
  test.fail('Edge: Ohne JavaScript folgt die Seite der Geräteeinstellung (dunkel)', async ({ browser }) => {
    const context = await browser.newContext({ javaScriptEnabled: false, colorScheme: 'dark', viewport: DESKTOP })
    const page = await context.newPage()
    await page.goto('/')
    expect(await page.evaluate(() => 1).catch(() => 1)).toBe(1)
    const bg = await page.locator('body').evaluate((el) => getComputedStyle(el).backgroundColor)
    expectRgbNear(bg, [22, 24, 27])
    await context.close()
  })
})

// ---------- Sicherheit ----------

test.describe('PROJ-11: Sicherheit', () => {
  test('Manipulierter Theme-Wert im Browserspeicher führt weder zu Skriptausführung noch zu Fehlern', async ({ browser }) => {
    for (const bad of ['<script>window.__xss=1</script>', 'a'.repeat(5000)]) {
      const context = await browser.newContext({ viewport: DESKTOP })
      await context.addInitScript((value) => localStorage.setItem('theme', value), bad)
      const page = await context.newPage()
      const errors: string[] = []
      page.on('pageerror', (e) => errors.push(e.message))
      await page.goto('/')
      await expect(page.locator('#main-content').getByRole('heading', { level: 1 })).toBeVisible()
      expect(await page.evaluate(() => (window as unknown as { __xss?: number }).__xss)).toBeUndefined()
      expect(errors, `Wert «${bad.slice(0, 20)}»`).toEqual([])
      await context.close()
    }
  })

  // Bekannte Lücke (BUG-4 in PROJ-11, nur durch Eingriff in den eigenen Browserspeicher erreichbar):
  // Ein gespeicherter Theme-Wert mit Leerzeichen löst im Theme-Skript einen Fehler aus, danach fehlt der Seiteninhalt.
  test.fail('Manipulierter Theme-Wert mit Leerzeichen legt die Seite nicht lahm', async ({ browser }) => {
    const context = await browser.newContext({ viewport: DESKTOP })
    await context.addInitScript(() => localStorage.setItem('theme', 'x y'))
    const page = await context.newPage()
    await page.goto('/')
    await page.waitForTimeout(500)
    await expect(page.locator('#main-content').getByRole('heading', { level: 1 })).toBeVisible({ timeout: 2000 })
    await context.close()
  })

  test('Weder Startseite noch Statusseite enthalten Service-Role-Schlüssel oder Tokens', async ({ page }) => {
    const bodies: string[] = []
    page.on('response', async (r) => {
      const type = r.request().resourceType()
      if (type === 'script' || type === 'document') bodies.push(await r.text().catch(() => ''))
    })
    await page.goto('/')
    await page.goto('/status')
    await page.waitForLoadState('networkidle')

    const all = bodies.join('\n')
    expect(all.length).toBeGreaterThan(0)
    expect(findLeaks(all)).toEqual([])
  })

  test('Die Theme-Wahl liegt nur im Browser, es gehen keine Cookies oder Anfragen an Dritte raus', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('button', { name: 'Darstellung wählen' }).or(page.getByRole('button', { name: 'Darstellung', exact: true })).first().click()
    await page.getByRole('menuitemradio', { name: 'Dunkel' }).click()
    const cookies = await page.context().cookies()
    expect(cookies.filter((c) => /theme/i.test(c.name))).toEqual([])
  })
})
