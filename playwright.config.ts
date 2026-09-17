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
    /**
     * Geometry, not taste.
     *
     * Most of this suite measures where things are: the eyebrow's `y` against the bottom
     * of the header, the hero's height against the fold, the painted width of a crop. The
     * hero copy now enters with a 1s fade up from 48px (`animate-hero-rise`), and a
     * transform moves the box `boundingBox()` reports — so every one of those assertions
     * would be reading a position the copy is only passing through. Playwright waits for
     * an element to be stable before acting, but these tests *measure* rather than act,
     * and a measurement has nothing to wait for.
     *
     * `reduce` is honoured by `motion-reduce:animate-none` on the overlay, so the copy
     * renders at its resting position on the first frame and the numbers mean what they
     * did before the animation existed.
     *
     * The cost is that the default run never sees the animation, so the test that proves
     * it exists opts back out with `test.use({ reducedMotion: 'no-preference' })`. That
     * one test is also the only place the *end* of the animation is checked — that it
     * settles exactly where the reduced-motion tests assert the copy sits.
     *
     * Nothing else in the suite depends on motion. The hero carousel's auto-advance is
     * suppressed by this too, and no test asserts on it; the slide dots are driven by
     * clicks, which are unaffected.
     *
     * Under `contextOptions` rather than as a top-level `use` key, which is what every
     * example on the web shows and what `tsc` rejects here: Playwright 1.62 has no
     * `reducedMotion` on `UseOptions`, only on `BrowserContextOptions`. Its own config
     * docstring in `node_modules/playwright/types/test.d.ts` nests it the same way.
     */
    contextOptions: { reducedMotion: 'reduce' },
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
