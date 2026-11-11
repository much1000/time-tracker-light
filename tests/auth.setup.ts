import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname } from 'node:path'
import { expect, test as setup } from '@playwright/test'
import {
  hasTestUser,
  NO_LOGIN,
  STORAGE_STATE,
  TEST_USER_EMAIL,
  TEST_USER_PASSWORD,
} from './helpers/env'

// Meldet das Testkonto einmal an und speichert die Anmeldung für alle Tests mit Anmeldung.
setup('Mit dem Testkonto anmelden', async ({ page }) => {
  mkdirSync(dirname(STORAGE_STATE), { recursive: true })

  if (!hasTestUser) {
    // Ohne Zugangsdaten: leere Anmeldung, die Tests mit Anmeldung überspringen sich selbst.
    writeFileSync(STORAGE_STATE, JSON.stringify(NO_LOGIN))
    return
  }

  await page.goto('/login')
  await page.getByLabel('E-Mail').fill(TEST_USER_EMAIL)
  await page.getByLabel('Passwort', { exact: true }).fill(TEST_USER_PASSWORD)
  await page.getByRole('button', { name: 'Anmelden' }).click()

  // Bei falschen Zugangsdaten bleibt die Seite auf /login und zeigt eine Meldung.
  await expect(
    page,
    'Anmeldung mit dem Testkonto fehlgeschlagen. Gibt es das Konto in Supabase (Authentication → Users), ist es bestätigt, und stimmen E-Mail und Passwort in .env.test.local?'
  ).not.toHaveURL(/\/login/, { timeout: 20_000 })
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()

  await page.context().storageState({ path: STORAGE_STATE })
})
