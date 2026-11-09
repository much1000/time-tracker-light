import { expect, test } from '@playwright/test'

// PROJ-1: Supabase Infrastructure Setup
// Voraussetzung: .env.local ist gesetzt und das Supabase-Projekt ist aktiv.

test.describe('PROJ-1: Seite /status', () => {
  test('AC-1: Bei gültiger Konfiguration meldet die Seite «Datenbank erreichbar»', async ({ page }) => {
    await page.goto('/status')

    await expect(page.getByRole('heading', { name: 'Systemstatus' })).toBeVisible()
    await expect(page.getByRole('status')).toContainText('Datenbank erreichbar')
    // Auf <main> beschränkt: Die Dev-Umgebung von Next.js fügt außerhalb einen eigenen Routen-Ankündiger mit role="alert" ein.
    await expect(page.locator('main').getByRole('alert')).toHaveCount(0)
  })

  test('Die Seite ist deutsch ausgezeichnet und hat einen Titel', async ({ page }) => {
    await page.goto('/status')

    await expect(page.locator('html')).toHaveAttribute('lang', 'de')
    await expect(page).toHaveTitle(/Status/)
  })

  test('AC-4/AC-5: Weder HTML noch Skripte enthalten Service-Role-Schlüssel oder Tokens', async ({ page }) => {
    const bodies: string[] = []
    page.on('response', async (response) => {
      const type = response.request().resourceType()
      if (type === 'script' || type === 'document') {
        bodies.push(await response.text().catch(() => ''))
      }
    })

    await page.goto('/status')
    await page.waitForLoadState('networkidle')

    const all = bodies.join('\n')
    expect(all.length).toBeGreaterThan(0)
    expect(all).not.toMatch(/service_role/i)
    expect(all).not.toMatch(/sbp_[A-Za-z0-9]{20,}/)
    expect(all).not.toMatch(/sb_secret_/)
  })

  test('Konsole zeigt keine Fehler beim Laden', async ({ page }) => {
    const errors: string[] = []
    page.on('console', (message) => {
      if (message.type() !== 'error') return
      errors.push(message.text())
    })
    page.on('pageerror', (error) => errors.push(error.message))

    await page.goto('/status')
    await page.waitForLoadState('networkidle')

    expect(errors).toEqual([])
  })

  for (const { name, width, height } of [
    { name: 'Mobil 375 px', width: 375, height: 812 },
    { name: 'Tablet 768 px', width: 768, height: 1024 },
    { name: 'Desktop 1440 px', width: 1440, height: 900 },
  ]) {
    test(`Responsive (${name}): Inhalt sichtbar, kein horizontales Scrollen`, async ({ page }) => {
      await page.setViewportSize({ width, height })
      await page.goto('/status')

      await expect(page.getByRole('status')).toBeVisible()
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth
      )
      expect(overflow).toBeLessThanOrEqual(0)
    })
  }
})
