import { existsSync } from 'node:fs'
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
          // Skip the rebuild only when a build actually exists — CI builds in its own
          // step, and repeating it here would double the slowest part of the run.
          // Conditioning on the artefact rather than on CI alone keeps this correct if
          // that step is ever reordered or removed: a checkout with no .next builds
          // rather than serving nothing. CI always starts from a fresh clone, so this
          // can never reuse a stale build from a previous commit.
          command: existsSync('.next/BUILD_ID')
            ? 'npm start'
            : 'npm run build && npm start',
          url: 'http://localhost:3000',
          reuseExistingServer: !process.env.CI,
          timeout: 180_000,
        },
      }),
})
