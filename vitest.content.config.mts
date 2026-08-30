import { defineConfig } from 'vitest/config'
import { loadEnv } from 'vite'
import path from 'node:path'

// Real credentials, loaded from .env.local the same way `next dev` would.
const env = loadEnv('development', process.cwd(), '')

/**
 * Content-integrity suite. Separate from vitest.config.mts because this one talks to the
 * live Sanity dataset: it needs real credentials, it must never run in the default
 * `npm test`, and it is run deliberately before a content release.
 *
 * Env comes from .env.local via `node --env-file`, wired up in the test:content script.
 */
export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    include: ['tests/integration/**/*.test.ts'],
    env: {
      NEXT_PUBLIC_SANITY_PROJECT_ID: env.NEXT_PUBLIC_SANITY_PROJECT_ID,
      NEXT_PUBLIC_SANITY_DATASET: env.NEXT_PUBLIC_SANITY_DATASET,
    },
  },
  resolve: { alias: { '@': path.resolve(import.meta.dirname, './src') } },
})
