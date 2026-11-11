import { resolve } from 'node:path'

// Zugangsdaten des Testkontos aus .env.test.local (bleibt lokal, nie eingecheckt).
// Siehe .env.test.local.example. Ohne die Datei laufen nur Tests ohne Anmeldung.
try {
  ;(process as unknown as { loadEnvFile: (path: string) => void }).loadEnvFile(
    resolve(process.cwd(), '.env.test.local')
  )
} catch {
  // Datei fehlt: Die Tests mit Anmeldung werden übersprungen.
}

export const TEST_USER_EMAIL = process.env.TEST_USER_EMAIL ?? ''
export const TEST_USER_PASSWORD = process.env.TEST_USER_PASSWORD ?? ''

export const hasTestUser = Boolean(
  TEST_USER_EMAIL &&
    TEST_USER_PASSWORD &&
    // Platzhalter aus der Vorlage zählen nicht.
    !TEST_USER_EMAIL.startsWith('hier-') &&
    !TEST_USER_PASSWORD.startsWith('hier-')
)

// Gespeicherte Anmeldung, die alle Tests mit Anmeldung verwenden (siehe auth.setup.ts).
export const STORAGE_STATE = 'tests/.auth/user.json'

export const NO_LOGIN = { cookies: [], origins: [] }

export const SKIP_REASON =
  'TEST_USER_EMAIL und TEST_USER_PASSWORD fehlen in .env.test.local (Vorlage: .env.test.local.example)'
