import { describe, it, expect } from 'vitest'
import { createClient } from 'next-sanity'
import { SPEC_9_PLACEHOLDERS } from '../shared/placeholders'

/**
 * Runs against the live dataset, so it is excluded from `npm test` and run with
 * `npm run test:content` before a content release.
 *
 * This is the gate that decides whether the site is allowed to go live. It is the last
 * thing standing between an invented number from a design session and an investor
 * reading it as fact.
 */
const client = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID!,
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET!,
  apiVersion: '2026-01-01',
  useCdn: false,
  token: process.env.SANITY_API_READ_TOKEN,
})

/**
 * A tokenless client cannot be constructed against a private dataset in a way that
 * proves anything, so the exposure check below uses a raw fetch instead.
 */
async function anonymousQuery(groq: string): Promise<{ status: number; count: number }> {
  const url = new URL(
    `https://${process.env.NEXT_PUBLIC_SANITY_PROJECT_ID}.api.sanity.io/v2026-01-01/data/query/${process.env.NEXT_PUBLIC_SANITY_DATASET}`,
  )
  url.searchParams.set('query', groq)
  const res = await fetch(url)
  const body = (await res.json().catch(() => ({}))) as { result?: unknown[] }
  return { status: res.status, count: Array.isArray(body.result) ? body.result.length : 0 }
}

const CONTENT_TYPES = '["property","post","teamMember","focusCard","testimonial","heroStat","siteSettings"]'

/**
 * Restricts every check below to *published* documents.
 *
 * Sanity returns drafts to a tokened client, and a draft cannot reach the site: the
 * published document is what renders. Without this, an editor part-way through writing
 * anything — a testimonial whose consent box is not yet ticked, an article still being
 * drafted — fails the release gate for content no visitor can ever see. The gate must
 * mean "what is live is clean", not "nobody is mid-edit".
 */
const PUBLISHED = '!(_id in path("drafts.**"))'

describe('published content', () => {
  it('has no lorem-ipsum style scaffolding', async () => {
    const docs = await client.fetch<unknown[]>(`*[_type in ${CONTENT_TYPES} && ${PUBLISHED}]`)
    const blob = JSON.stringify(docs)
    for (const p of ['Lorem', 'TODO', 'TBD', 'placeholder', 'example.com', 'Fill in']) {
      expect(blob, `found scaffolding text "${p}"`).not.toContain(p)
    }
  })

  it('ships none of the figures spec §9 invented during design', async () => {
    // The original gate searched only for words like "Lorem" and would have passed with
    // every one of these live on the site.
    const docs = await client.fetch<unknown[]>(`*[_type in ${CONTENT_TYPES} && ${PUBLISHED}]`)
    const blob = JSON.stringify(docs)

    const found = SPEC_9_PLACEHOLDERS.filter(({ pattern }) => pattern.test(blob)).map(
      ({ note }) => note,
    )
    expect(found, `placeholder figures still present:\n  ${found.join('\n  ')}`).toEqual([])
  })

  it('gives every property a slug and coordinates', async () => {
    const broken = await client.fetch<{ title?: string }[]>(
      `*[_type == "property" && ${PUBLISHED} && (!defined(slug.current) || !defined(coordinates))]{ title }`,
    )
    expect(broken, `properties missing slug or coordinates: ${JSON.stringify(broken)}`).toHaveLength(0)
  })

  it('gives every property a real Metra walk time or none at all', async () => {
    // Spec §9 lists the walk times as invented. A station named without a time — or a
    // time without a station — is a half-migrated record, not a real fact.
    const half = await client.fetch<{ title?: string }[]>(
      `*[_type == "property" && ${PUBLISHED} && (
          (defined(metraStation) && !defined(walkMinutes)) ||
          (defined(walkMinutes) && !defined(metraStation))
        )]{ title }`,
    )
    expect(half, `properties with a half-filled Metra fact: ${JSON.stringify(half)}`).toHaveLength(0)
  })

  it('publishes no testimonial without recorded consent', async () => {
    const unconsented = await client.fetch<unknown[]>(
      `*[_type == "testimonial" && ${PUBLISHED} && consentOnRecord != true]`,
    )
    expect(unconsented).toHaveLength(0)
  })

  it('uses no promissory return language in any document', async () => {
    // Broadened from the plan's property-and-post-only check: a disclaimer, a focus card,
    // or a testimonial quote can carry the same compliance problem.
    const docs = await client.fetch<unknown[]>(`*[_type in ${CONTENT_TYPES} && ${PUBLISHED}]`)
    const blob = JSON.stringify(docs).toLowerCase()
    for (const banned of [
      'guaranteed return',
      'guaranteed',
      'will return',
      'risk-free',
      'assured return',
      'no risk',
    ]) {
      expect(blob, `found promissory language "${banned}"`).not.toContain(banned)
    }
  })

  it('does not expose investor PII to anonymous callers', async () => {
    // Regression guard for the C1 finding: the dataset was created public, so anyone
    // holding the project id — which ships in the client bundle by design — could read
    // every lead document: names, emails, phones, check sizes, and the 506(c)
    // accreditation flag. If someone flips the dataset back to public, this fails.
    const leads = await anonymousQuery('*[_type=="lead"]')
    expect(leads.count, 'lead documents are readable without a token').toBe(0)

    // And prove the check has teeth: content that definitely exists must also be
    // invisible anonymously. Otherwise a zero above could just mean "no leads yet".
    const settings = await anonymousQuery('*[_type=="siteSettings"]')
    expect(
      settings.count,
      'the dataset is readable without a token — it is public, and leads will be exposed the moment one is submitted',
    ).toBe(0)
  })

  it('has the siteSettings singleton the build requires', async () => {
    const settings = await client.fetch<{ agoraPortalUrl?: string; disclaimer?: string }[]>(
      `*[_type == "siteSettings" && ${PUBLISHED}]{ agoraPortalUrl, disclaimer }`,
    )
    expect(settings, 'siteSettings must exist exactly once').toHaveLength(1)
    expect(settings[0]?.agoraPortalUrl).toBeTruthy()
    expect(settings[0]?.disclaimer).toBeTruthy()
  })
})
