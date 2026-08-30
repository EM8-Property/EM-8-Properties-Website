import 'server-only'
import { createClient } from 'next-sanity'

/**
 * Server-only. `import 'server-only'` makes it a build error to pull this into a client
 * component, which is what keeps the write token off the browser.
 *
 * `useCdn: false` because writes must not touch a cache, and because this client is also
 * used for the occasional authenticated read where staleness would be wrong.
 */
export const writeClient = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID!,
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET!,
  apiVersion: '2026-01-01',
  token: process.env.SANITY_API_WRITE_TOKEN,
  useCdn: false,
})
