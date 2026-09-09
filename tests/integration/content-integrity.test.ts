import { describe, it, expect } from 'vitest'
import { createClient } from 'next-sanity'
import { SPEC_9_PLACEHOLDERS } from '../shared/placeholders'
// Plain ESM data module, shared with scripts/migrate-content.mjs and the unit suite.
import { shadowingSeedDrafts } from '../../scripts/content/em8-content.mjs'
import { REQUIRED_SITE_SETTINGS, missingLeaves } from '@/lib/requiredContent'
import { SITE_SETTINGS_QUERY } from '@/sanity/queries'

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

const CONTENT_TYPES =
  '["property","post","teamMember","focusCard","testimonial","heroStat","siteSettings",' +
  '"homePage","aboutPage","partnersPage","investorsPage","portfolioPage","insightsPage",' +
  '"trackRecordPage","strategyPage"]'

/** Every page singleton, each of which must carry a complete `seo` block. */
const PAGE_IDS =
  '["homePage","aboutPage","partnersPage","investorsPage","portfolioPage","insightsPage",' +
  '"trackRecordPage","strategyPage"]'

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

  /**
   * The one draft that is never legitimate: the seed's own scaffolding on top of a
   * published testimonial.
   *
   * This is the only automated detection for the fault reported on 2026-09-03, and it is
   * the only check in this file that looks at drafts at all — every other one is scoped to
   * `PUBLISHED`, because failing a release while somebody is mid-edit would be wrong.
   *
   * The fault it catches is invisible from every other direction. The published document
   * is untouched, so the site renders correctly and `next build`, the unit suite, ESLint,
   * Lighthouse and the deployed pages are all unaffected and all green. Only the Studio
   * shows it, and only to whoever opens that document. It sat in this dataset from
   * 2026-08-31 to 2026-09-03 and was found by a person, not by a test.
   *
   * The matching logic is a pure function in the content module, unit-tested there for the
   * false-positive case that matters: an editor genuinely rewriting a live testimonial
   * must not trip this.
   */
  it('has no seed scaffolding shadowing a published testimonial', async () => {
    const [publishedIds, drafts] = await Promise.all([
      client.fetch<string[]>(`*[_type == "testimonial" && ${PUBLISHED}]._id`),
      client.fetch<{ _id: string; attribution?: string }[]>(
        `*[_type == "testimonial" && _id in path("drafts.**")]{ _id, attribution }`,
      ),
    ])

    const shadowed = shadowingSeedDrafts(publishedIds, drafts) as string[]
    expect(
      shadowed,
      'a sample draft is sitting on top of a real testimonial — the Studio is showing ' +
        'placeholder text for it while the site renders the real thing. Discard these ' +
        `drafts: ${shadowed.join(', ')}`,
    ).toEqual([])
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

  it('publishes a siteSettings document with every leaf the site cannot render without', async () => {
    /*
     * The same array the layout throws on, so the gate and the build can no longer
     * disagree. They did: this file checked four leaves and the layout threw on seven, so
     * a document missing contactEmail, ctaBand.heading.title or ctaBand.submitLabel passed
     * here and failed `next build` at deploy time instead.
     *
     * Projected by alias so a nested leaf arrives flat, then rebuilt into the nested shape
     * and checked with the same predicate the layout uses — including the empty-string
     * case, which `required()` permits and `setIfMissing` will not repair.
     */
    const projection = REQUIRED_SITE_SETTINGS.map((leaf) => leaf.groq).join(', ')
    const rows = await client.fetch<Record<string, unknown>[]>(
      `*[_type == "siteSettings" && ${PUBLISHED}]{ ${projection} }`,
    )
    expect(rows.length, 'no published siteSettings document').toBe(1)

    const flat = rows[0]!
    const settings: Record<string, unknown> = {}
    for (const leaf of REQUIRED_SITE_SETTINGS) {
      // '"headerCtaLabel": headerCta.label' -> 'headerCtaLabel'; 'disclaimer' -> itself.
      const alias = leaf.groq.includes(':') ? leaf.groq.split('"')[1]! : leaf.path
      const keys = leaf.path.split('.')
      let cursor = settings
      for (const key of keys.slice(0, -1)) {
        cursor[key] = (cursor[key] as Record<string, unknown>) ?? {}
        cursor = cursor[key] as Record<string, unknown>
      }
      cursor[keys.at(-1)!] = flat[alias]
    }

    const missing = missingLeaves(settings)
    expect(
      missing,
      `siteSettings leaves that will fail next build:\n  ${missing
        .map((leaf) => leaf.describe)
        .join('\n  ')}`,
    ).toEqual([])
  })

  /**
   * The test above proves the gate and the layout agree about the LIST of required
   * leaves — both walk `REQUIRED_SITE_SETTINGS`. It does not prove they agree about the
   * QUERY, because it builds its own projection from `leaf.groq` rather than fetching
   * with `SITE_SETTINGS_QUERY` itself. A leaf added to the array without a matching edit
   * to the query would still pass that test — the array's own projection fetches
   * whatever the array says to fetch — while `(site)/layout.tsx`, which fetches with the
   * real query, would see the leaf as always missing and fail `next build` on every page.
   *
   * This closes that gap by fetching with the exact query the layout runs, so what this
   * test sees is exactly what the build will see: gate-red and build-red become the same
   * condition.
   */
  it('checks what next build will actually see: missingLeaves against a real SITE_SETTINGS_QUERY fetch', async () => {
    const settings = await client.fetch(SITE_SETTINGS_QUERY)
    const missing = missingLeaves(settings)
    expect(
      missing,
      `SITE_SETTINGS_QUERY does not project leaves that next build requires:\n  ${missing
        .map((leaf) => leaf.describe)
        .join('\n  ')}`,
    ).toEqual([])
  })

  /**
   * Split out from the required-content test above, which used to end on this same
   * check. Three reasons, each enough on its own:
   *
   * - that test's name and its `expect` are about required content, and a document
   *   missing a required leaf short-circuits before this length check ever runs — the
   *   site renders fine with a 25-character label, so this isn't the same failure;
   * - the folded version read a hard-coded `flat.headerCtaLabel`, an alias generated in
   *   REQUIRED_SITE_SETTINGS from `leaf.groq.split('"')[1]`. Rename that alias and this
   *   silently degrades to checking `''.length <= 20` — a vacuous pass with no failing
   *   test anywhere to catch it.
   *
   * The schema caps this at 20, but Sanity's validation is Studio-side only: it gates the
   * Publish button and nothing written through Vision, the CLI or a script. The cap is a
   * design guardrail rather than a correctness one — a long label wraps the header
   * rather than breaking it — so it belongs on the release gate, not in a throw.
   */
  it('keeps the header button label short enough not to wrap the header', async () => {
    const rows = await client.fetch<{ label?: string }[]>(
      `*[_type == "siteSettings" && ${PUBLISHED}]{ "label": headerCta.label }`,
    )
    expect(rows.length, 'no published siteSettings document').toBe(1)
    expect(
      (rows[0]!.label ?? '').length,
      'headerCta.label is longer than 20 characters — it will wrap the header on a tablet',
    ).toBeLessThanOrEqual(20)
  })

  /**
   * Every page singleton needs a complete `seo` block, because `seoMetadata` throws
   * without one — and that throw happens during `next build`, so a single cleared field
   * in the Studio takes down the whole site's build, not just that route.
   *
   * The unit tests check the *seed constants* fit the schema. This checks the dataset,
   * which is the thing the build actually reads. It moves the failure from deploy time to
   * the release gate, which is where you want to meet it.
   */
  it('has a complete seo block on every page singleton', async () => {
    const ids = JSON.parse(PAGE_IDS) as string[]

    const pages = await client.fetch<{ _id: string; title?: string; description?: string }[]>(
      `*[_id in ${PAGE_IDS} && ${PUBLISHED}]{ _id, "title": seo.title, "description": seo.description }`,
    )

    expect(
      pages.map((p) => p._id).sort(),
      'a page singleton the build requires is missing entirely',
    ).toEqual([...ids].sort())

    for (const page of pages) {
      expect(page.title, `${page._id} has no seo.title — next build will fail`).toBeTruthy()
      expect(
        page.description,
        `${page._id} has no seo.description — next build will fail`,
      ).toBeTruthy()
    }
  })

  /**
   * The same gate for `heading`, on the four pages whose components throw without one.
   *
   * /portfolio, /insights, /track-record and /strategy render their title from the CMS
   * now. Each one throws when `heading.title` is empty, and because that throw happens
   * during `next build` it takes the whole deploy down rather than one route — the same
   * blast radius as the `seo` case above, and the reason that check exists.
   *
   * Checked per leaf, because a `heading` object with null fields is still an object: the
   * shallow version of this would pass while the page threw. `eyebrow` and `intro` are
   * asserted too — they do not throw, but `PageHero` renders both, so an empty one is a
   * silently degraded page rather than a loud failure, which is worse to discover late.
   */
  it('has a complete heading on the four pages that render one from the CMS', async () => {
    const ids = ['portfolioPage', 'insightsPage', 'trackRecordPage', 'strategyPage']

    const pages = await client.fetch<
      { _id: string; eyebrow?: string; title?: string; intro?: string }[]
    >(
      `*[_id in ${JSON.stringify(ids)} && ${PUBLISHED}]{ _id, "eyebrow": heading.eyebrow, "title": heading.title, "intro": heading.intro }`,
    )

    expect(
      pages.map((p) => p._id).sort(),
      'a page whose component throws without a heading is missing entirely',
    ).toEqual([...ids].sort())

    for (const page of pages) {
      expect(
        page.title,
        `${page._id} has no heading.title — that page throws and next build fails`,
      ).toBeTruthy()
      expect(page.eyebrow, `${page._id} has no heading.eyebrow`).toBeTruthy()
      expect(page.intro, `${page._id} has no heading.intro`).toBeTruthy()
    }
  })
})
