import { describe, it, expect } from 'vitest'
import { createClient } from 'next-sanity'
import { SPEC_9_PLACEHOLDERS } from './placeholders'

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
})

const CONTENT_TYPES = '["property","post","teamMember","focusCard","testimonial","heroStat","siteSettings"]'

describe('published content', () => {
  it('has no lorem-ipsum style scaffolding', async () => {
    const docs = await client.fetch<unknown[]>(`*[_type in ${CONTENT_TYPES}]`)
    const blob = JSON.stringify(docs)
    for (const p of ['Lorem', 'TODO', 'TBD', 'placeholder', 'example.com', 'Fill in']) {
      expect(blob, `found scaffolding text "${p}"`).not.toContain(p)
    }
  })

  it('ships none of the figures spec §9 invented during design', async () => {
    // The original gate searched only for words like "Lorem" and would have passed with
    // every one of these live on the site.
    const docs = await client.fetch<unknown[]>(`*[_type in ${CONTENT_TYPES}]`)
    const blob = JSON.stringify(docs)

    const found = SPEC_9_PLACEHOLDERS.filter(({ pattern }) => pattern.test(blob)).map(
      ({ note }) => note,
    )
    expect(found, `placeholder figures still present:\n  ${found.join('\n  ')}`).toEqual([])
  })

  it('gives every property a slug and coordinates', async () => {
    const broken = await client.fetch<{ title?: string }[]>(
      `*[_type == "property" && (!defined(slug.current) || !defined(coordinates))]{ title }`,
    )
    expect(broken, `properties missing slug or coordinates: ${JSON.stringify(broken)}`).toHaveLength(0)
  })

  it('gives every property a real Metra walk time or none at all', async () => {
    // Spec §9 lists the walk times as invented. A station named without a time — or a
    // time without a station — is a half-migrated record, not a real fact.
    const half = await client.fetch<{ title?: string }[]>(
      `*[_type == "property" && (
          (defined(metraStation) && !defined(walkMinutes)) ||
          (defined(walkMinutes) && !defined(metraStation))
        )]{ title }`,
    )
    expect(half, `properties with a half-filled Metra fact: ${JSON.stringify(half)}`).toHaveLength(0)
  })

  it('publishes no testimonial without recorded consent', async () => {
    const unconsented = await client.fetch<unknown[]>(
      `*[_type == "testimonial" && consentOnRecord != true]`,
    )
    expect(unconsented).toHaveLength(0)
  })

  it('uses no promissory return language in any document', async () => {
    // Broadened from the plan's property-and-post-only check: a disclaimer, a focus card,
    // or a testimonial quote can carry the same compliance problem.
    const docs = await client.fetch<unknown[]>(`*[_type in ${CONTENT_TYPES}]`)
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

  it('has the siteSettings singleton the build requires', async () => {
    const settings = await client.fetch<{ agoraPortalUrl?: string; disclaimer?: string }[]>(
      `*[_type == "siteSettings"]{ agoraPortalUrl, disclaimer }`,
    )
    expect(settings, 'siteSettings must exist exactly once').toHaveLength(1)
    expect(settings[0]?.agoraPortalUrl).toBeTruthy()
    expect(settings[0]?.disclaimer).toBeTruthy()
  })
})
