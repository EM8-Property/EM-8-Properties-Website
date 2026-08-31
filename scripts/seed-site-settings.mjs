/**
 * Creates or updates the `siteSettings` singleton.
 *
 * A fallback for when the Studio cannot be used. The Studio remains the normal way to
 * edit this — everything written here is editable there afterwards, and the document id
 * is pinned to `siteSettings` so it lands on the singleton the Studio structure shows,
 * not a second orphan document the site would never read.
 *
 * Usage:
 *   node --env-file=.env.local scripts/seed-site-settings.mjs "<agora-portal-url>"
 *
 * Idempotent: uses createOrReplace, so re-running it overwrites rather than duplicating.
 */
import { readFileSync } from 'node:fs'

const agoraPortalUrl = process.argv[2]
if (!agoraPortalUrl) {
  console.error('usage: node --env-file=.env.local scripts/seed-site-settings.mjs "<agora-portal-url>"')
  process.exit(1)
}
try {
  const u = new URL(agoraPortalUrl)
  if (u.protocol !== 'https:') throw new Error('must be https')
} catch (e) {
  console.error(`Not a valid https URL: ${agoraPortalUrl} (${e.message})`)
  process.exit(1)
}

const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID
const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET
const token = process.env.SANITY_API_WRITE_TOKEN
if (!projectId || !dataset || !token) {
  console.error('Missing NEXT_PUBLIC_SANITY_PROJECT_ID, NEXT_PUBLIC_SANITY_DATASET, or SANITY_API_WRITE_TOKEN')
  process.exit(1)
}

// The disclaimer is lifted from docs/disclaimer-draft.md so there is exactly one copy of
// this text in the repo. It is a DRAFT pending securities-counsel review; the draft file
// says so at the top, and this is a placeholder for the reviewed version.
const draft = readFileSync('docs/disclaimer-draft.md', 'utf8')
const start = draft.indexOf('## Draft text')
const end = draft.indexOf('## Questions worth asking counsel')
if (start === -1 || end === -1) {
  console.error('Could not locate the draft text section in docs/disclaimer-draft.md')
  process.exit(1)
}
const disclaimer = draft
  .slice(start + '## Draft text'.length, end)
  .trim()
  .split(/\n\s*\n/)
  .map((p) => p.replace(/\s*\n\s*/g, ' ').trim())
  .join('\n\n')

const doc = {
  _id: 'siteSettings',
  _type: 'siteSettings',
  agoraPortalUrl,
  contactEmail: 'hunter@em-8.com',
  disclaimer,
}

const res = await fetch(
  `https://${projectId}.api.sanity.io/v2026-01-01/data/mutate/${dataset}?returnDocuments=true`,
  {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ mutations: [{ createOrReplace: doc }] }),
  },
)

const body = await res.json()
if (!res.ok) {
  console.error('Mutation failed:', res.status, JSON.stringify(body).slice(0, 600))
  process.exit(1)
}

console.log('siteSettings published.')
console.log('  agoraPortalUrl :', agoraPortalUrl)
console.log('  contactEmail   : hunter@em-8.com')
console.log('  disclaimer     :', disclaimer.length, 'chars (DRAFT — pending counsel review)')
console.log('')
console.log('Edit any of it at https://em-8-properties.sanity.studio')
