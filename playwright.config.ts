import { defineConfig, devices } from '@playwright/test'

/**
 * `E2E_BASE_URL` lets the same suite run against a Railway deploy without editing this
 * file. When it is set, no local server is started — the plan's version hardcoded
 * localhost and still spun up a webServer, so "run it against the deployed URL" was not
 * actually possible.
 */
const baseURL = process.env.E2E_BASE_URL ?? 'http://localhost:3000'
const isRemote = Boolean(process.env.E2E_BASE_URL)

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL,
    trace: 'on-first-retry',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  ...(isRemote
    ? {}
    : {
        webServer: {
          command: 'npm run build && npm start',
          url: 'http://localhost:3000',
          reuseExistingServer: !process.env.CI,
          timeout: 180_000,
        },
      }),
})
