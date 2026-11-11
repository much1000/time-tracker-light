import type { Page } from '@playwright/test'
import { TEST_USER_EMAIL, TEST_USER_PASSWORD } from './env'

export interface Counter {
  count: number
}

type MockResponse = { status: number; body: unknown } | 'abort'

const CORS = {
  'access-control-allow-origin': '*',
  'access-control-allow-headers': '*',
  'access-control-allow-methods': '*',
}

// Ersetzt Antworten von Supabase im Browser (zum Beispiel «zu viele Versuche» oder «Netzwerk weg»),
// ohne den echten Dienst zu belasten. Zählt die Anfragen (ohne Vorabfragen des Browsers).
export async function mockSupabase(
  page: Page,
  pattern: string,
  response: MockResponse,
  options: { delayMs?: number } = {}
): Promise<Counter> {
  const counter: Counter = { count: 0 }
  await page.route(pattern, async (route) => {
    if (route.request().method() === 'OPTIONS') {
      await route.fulfill({ status: 204, headers: CORS })
      return
    }
    counter.count += 1
    if (options.delayMs) await new Promise((resolve) => setTimeout(resolve, options.delayMs))
    if (response === 'abort') {
      await route.abort('failed')
      return
    }
    await route.fulfill({
      status: response.status,
      headers: { ...CORS, 'content-type': 'application/json' },
      body: JSON.stringify(response.body),
    })
  })
  return counter
}

// Zählt Anfragen an Supabase, ohne sie zu verändern.
export async function countRequests(page: Page, pattern: RegExp): Promise<Counter> {
  const counter: Counter = { count: 0 }
  page.on('request', (request) => {
    if (request.method() !== 'OPTIONS' && pattern.test(request.url())) counter.count += 1
  })
  return counter
}

// Meldet über die Anmeldeseite an (wie ein Nutzer).
export async function uiLogin(
  page: Page,
  credentials: { email: string; password: string } = {
    email: TEST_USER_EMAIL,
    password: TEST_USER_PASSWORD,
  }
) {
  await page.getByLabel('E-Mail').fill(credentials.email)
  await page.getByLabel('Passwort', { exact: true }).fill(credentials.password)
  await page.getByRole('button', { name: 'Anmelden' }).click()
}
