import { defineConfig, devices } from '@playwright/test'
import { STORAGE_STATE } from './tests/helpers/env'

// Umgebungsvariablen (optional), z. B. für einen Lauf gegen einen Produktionsbuild:
//   PW_BASE_URL=http://localhost:3100 PW_SERVER_COMMAND="npx next start -p 3100" PW_CHANNEL=chrome
const baseURL = process.env.PW_BASE_URL ?? 'http://localhost:3000'
const channel = process.env.PW_CHANNEL || undefined

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.PW_REPORTER ?? 'html',
  use: {
    baseURL,
    trace: 'on-first-retry',
  },
  projects: [
    // Meldet das Testkonto einmal an (Zugangsdaten aus .env.test.local).
    { name: 'setup', testMatch: /auth\.setup\.ts/, use: { channel } },
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'], channel, storageState: STORAGE_STATE },
      dependencies: ['setup'],
      testIgnore: /(auth\.setup|logout\.spec|PROJ-6-timer\.spec)\.ts/,
    },
    // Der Timer ist pro Konto nur einmal da (und die Leiste erscheint auf jeder Seite): Die Timer-Tests
    // laufen allein, nachdem alle anderen fertig sind.
    {
      name: 'timer',
      testMatch: /PROJ-6-timer\.spec\.ts/,
      use: { ...devices['Desktop Chrome'], channel, storageState: STORAGE_STATE },
      dependencies: ['chromium'],
    },
    {
      name: 'Mobile Safari',
      use: { ...devices['iPhone 13'], storageState: STORAGE_STATE },
      dependencies: ['setup'],
      testIgnore: /(auth\.setup|logout\.spec|PROJ-6-timer\.spec)\.ts/,
    },
    // Optional (PW_FIREFOX=1): dieselben Tests in Firefox, z. B. nur den Timer: --grep Timer
    ...(process.env.PW_FIREFOX
      ? [
          {
            name: 'firefox',
            use: { ...devices['Desktop Firefox'], storageState: STORAGE_STATE },
            dependencies: ['setup'],
            testIgnore: /(auth\.setup|logout\.spec|PROJ-6-timer\.spec)\.ts/,
          },
          {
            name: 'firefox-timer',
            testMatch: /PROJ-6-timer\.spec\.ts/,
            use: { ...devices['Desktop Firefox'], storageState: STORAGE_STATE },
            dependencies: ['setup'],
          },
        ]
      : []),
    // Abmelden beendet derzeit alle Sitzungen des Kontos und läuft deshalb zuletzt,
    // nachdem alle anderen Tests mit der gespeicherten Anmeldung fertig sind.
    {
      name: 'logout',
      testMatch: /logout\.spec\.ts/,
      use: { ...devices['Desktop Chrome'], channel },
      dependencies: ['chromium', 'timer'],
    },
  ],
  webServer: {
    command: process.env.PW_SERVER_COMMAND ?? 'npm run dev',
    url: baseURL,
    reuseExistingServer: !process.env.CI,
  },
})
