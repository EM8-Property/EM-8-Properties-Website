import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'node:path'

// Unit suite only. It must never touch the network: Task 15's content-integrity suite
// runs against the live dataset and gets its own config and script.
export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    include: ['tests/unit/**/*.test.{ts,tsx}'],
    setupFiles: ['./tests/setup.ts'],
    // `createClient` throws "Configuration must contain `projectId`" when these are unset,
    // which kills any test importing a module that builds the Sanity client at module
    // scope. These are dummies — no unit test may reach the network.
    env: {
      NEXT_PUBLIC_SANITY_PROJECT_ID: 'test-project',
      NEXT_PUBLIC_SANITY_DATASET: 'test',
    },
  },
  resolve: { alias: { '@': path.resolve(import.meta.dirname, './src') } },
})
