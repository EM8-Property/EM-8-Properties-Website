import { describe, it, expect } from 'vitest'
import { ASSET_CLASSES, STATUSES } from '@/lib/propertyTaxonomy'
import { POST_CATEGORIES } from '@/sanity/schema/post'
import { SPEC_9_PLACEHOLDERS } from '../shared/placeholders'
// Plain ESM data module, shared with scripts/migrate-content.mjs.
import {
  PROPERTIES,
  HERO_STATS,
  FOCUS_CARDS,
  TEAM,
  POSTS,
  TESTIMONIALS,
  SITE_SETTINGS,
  portable,
} from '../../scripts/content/em8-content.mjs'

/**
 * Gates the migration payload before it is written, not after.
 *
 * tests/integration/content-integrity.test.ts checks the same rules against the live
 * dataset, but only once content is already in it. By then a bad figure has been
 * published to the CMS the site builds from. This suite runs offline, in `npm test`, so a
 * placeholder or a compliance breach fails on the machine that would have uploaded it.
 */

type Property = {
  _id: string
  slug: string
  title: string
  assetClass: string
  status: string
  city: string
  state: string
  coordinates: { lat: number; lng: number }
  metraStation?: string
  walkMinutes?: number
  unitCount?: number
  retailUnitCount?: number
  cardBlurb: string
  image?: string
  alt?: string
  dealStory?: { equityMultiple?: string; exitYear?: number }
}

const properties = PROPERTIES as Property[]
const blob = JSON.stringify({ PROPERTIES, HERO_STATS, FOCUS_CARDS, TEAM, POSTS, TESTIMONIALS, SITE_SETTINGS })

describe('migration payload — structure', () => {
  it('gives every property a unique slug and document id', () => {
    const slugs = properties.map((p) => p.slug)
    const ids = properties.map((p) => p._id)
    expect(new Set(slugs).size, `duplicate slug in ${slugs.join(', ')}`).toBe(slugs.length)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('uses only slugs that survive the /portfolio/[slug] route pattern', () => {
    // The E2E suite asserts /portfolio/[a-z0-9-]+$. A slug with an underscore, a capital,
    // or an ampersand would resolve locally and 404 in the built site.
    for (const p of properties) expect(p.slug, p.title).toMatch(/^[a-z0-9-]+$/)
  })

  it('uses only asset classes and statuses the schema and chips know about', () => {
    for (const p of properties) {
      expect(ASSET_CLASSES, `${p.title} assetClass`).toContain(p.assetClass)
      expect(STATUSES, `${p.title} status`).toContain(p.status)
    }
  })

  it('places every property inside the Chicago MSA bounding box', () => {
    // Catches a transposed lat/lng, which geocodes silently and drops a pin in the
    // Indian Ocean. The map is the one place that error would be visible, and only if
    // someone happened to look.
    for (const p of properties) {
      expect(p.coordinates.lat, `${p.title} latitude`).toBeGreaterThan(41.0)
      expect(p.coordinates.lat, `${p.title} latitude`).toBeLessThan(43.0)
      expect(p.coordinates.lng, `${p.title} longitude`).toBeGreaterThan(-89.0)
      expect(p.coordinates.lng, `${p.title} longitude`).toBeLessThan(-87.0)
    }
  })

  it('keeps every card blurb inside the 180-character schema cap', () => {
    for (const p of properties) {
      expect(p.cardBlurb.length, `${p.title} blurb is ${p.cardBlurb.length} chars`).toBeLessThanOrEqual(180)
    }
  })

  it('caps every team bio at the schema limit of 200 characters', () => {
    for (const m of TEAM as { name: string; bio: string }[]) {
      expect(m.bio.length, `${m.name} bio is ${m.bio.length} chars`).toBeLessThanOrEqual(200)
    }
  })

  it('gives every image alt text, since the schema requires it', () => {
    for (const p of properties) {
      if (!p.image) continue
      expect(p.alt, `${p.title} has an image but no alt text`).toBeTruthy()
    }
  })
})

describe('portable text', () => {
  // Sanity requires _key on every array item. Without it the Studio shows a "Missing
  // keys" banner on each paragraph and refuses to reorder them until the editor clicks
  // "Add missing keys" — while the built site renders perfectly, so nothing in the build,
  // the unit suite, or Lighthouse notices. Caught only by opening the Studio.
  type Block = { _key?: string; children: { _key?: string }[] }
  const blocks: Block[] = portable(['First paragraph.', 'Second paragraph.'])

  it('gives every block a _key', () => {
    for (const b of blocks) expect(b._key, 'block is missing _key').toBeTruthy()
  })

  it('gives every span inside a block a _key', () => {
    for (const b of blocks) {
      for (const child of b.children) expect(child._key, 'span is missing _key').toBeTruthy()
    }
  })

  it('makes keys unique within the array', () => {
    const keys = blocks.map((b: Block) => b._key)
    expect(new Set(keys).size).toBe(keys.length)
  })

  it('generates the same keys every run, so re-migrating does not churn documents', () => {
    // A random key per run would make every re-run rewrite every block, producing a new
    // revision and a spurious "changed" entry in the document history each time.
    expect(portable(['First paragraph.', 'Second paragraph.'])).toEqual(blocks)
  })
})

describe('migration payload — the rules that gate launch', () => {
  it('ships none of the figures spec §9 invented during design', () => {
    const found = SPEC_9_PLACEHOLDERS.filter(({ pattern }) => pattern.test(blob)).map((p) => p.note)
    expect(found, `invented figures present:\n  ${found.join('\n  ')}`).toEqual([])
  })

  it('uses no promissory return language', () => {
    const lower = blob.toLowerCase()
    for (const banned of [
      'guaranteed',
      'will return',
      'risk-free',
      'assured return',
      'no risk',
    ]) {
      expect(lower, `found promissory language "${banned}"`).not.toContain(banned)
    }
  })

  it('carries no lorem-ipsum scaffolding', () => {
    for (const p of ['Lorem', 'TODO', 'TBD', 'placeholder', 'example.com']) {
      expect(blob, `found scaffolding "${p}"`).not.toContain(p)
    }
  })

  it('states a realized multiple and exit year for every sold property, and only those', () => {
    for (const p of properties) {
      if (p.status === 'sold') {
        expect(p.dealStory?.equityMultiple, `${p.title} is sold with no multiple`).toBeTruthy()
        expect(p.dealStory?.exitYear, `${p.title} is sold with no exit year`).toBeTruthy()
      } else {
        expect(p.dealStory, `${p.title} is not sold but carries a deal story`).toBeUndefined()
      }
    }
  })

  it('pairs every Metra walk time with a station name', () => {
    // A time without a station, or a station without a time, is a half-migrated record.
    // The live content gate enforces the same rule; this catches it before upload.
    for (const p of properties) {
      const hasTime = p.walkMinutes !== undefined && p.walkMinutes !== null
      const hasStation = Boolean(p.metraStation)
      expect(hasTime, `${p.title}: station "${p.metraStation}" with no walk time`).toBe(hasStation)
      expect(hasStation, `${p.title}: walk time ${p.walkMinutes} with no station`).toBe(hasTime)
    }
  })

  it('publishes no confidential figure from the internal portfolio sheet', () => {
    // Lender names, debt balances, promote, and EM8's own equity are in the source
    // spreadsheet and must never reach a public marketing page.
    for (const secret of [
      'Walker & Dunlop',
      'Wintrust',
      'Old National',
      'CIBC',
      'SOFR',
      'Promote',
      'Debt Balance',
      'Interest Rate',
    ]) {
      expect(blob, `confidential detail "${secret}" leaked into public content`).not.toContain(
        secret,
      )
    }
  })
})

describe('migration payload — offerings', () => {
  type Offering = {
    summary?: string
    targetIrr?: string
    targetEquityMultiple?: string
    targetHoldYears?: number
  }
  const withOffering = (PROPERTIES as (Property & { offering?: Offering })[]).filter(
    (p) => p.offering,
  )

  it('states a figure only where an offering memorandum backs it', () => {
    // Spec §9 lists Boulevard's target multiple, IRR, cash-on-cash and hold as invented.
    // No offering figures may be attached to that property until real ones are sourced —
    // this is the specific regression the §9 denylist was written for.
    const boulevard = withOffering.find((p) => p.slug === 'boulevard-at-central-station')
    expect(
      boulevard,
      'Boulevard carries offering figures, and spec §9 records its returns as invented',
    ).toBeUndefined()
  })

  it('reads returns as underwriting rather than as achieved results', () => {
    for (const p of withOffering) {
      const text = JSON.stringify(p.offering).toLowerCase()
      for (const banned of ['guaranteed', 'will return', 'risk-free', 'assured', 'no risk']) {
        expect(text, `${p.title} offering promises "${banned}"`).not.toContain(banned)
      }
    }
  })

  it('never attaches an offering to a property already sold', () => {
    for (const p of withOffering) {
      expect(p.status, `${p.title} is sold and carries a live offering`).not.toBe('sold')
    }
  })

  it('keeps the confidential parts of the memorandum off the public payload', () => {
    // The Antioch OM is marked confidential and proprietary. The headline underwriting is
    // what a 506(c) page is for; the rent roll, the executed LOI, the financing terms and
    // the sponsor/LP split are not.
    const blob = JSON.stringify(PROPERTIES)
    for (const secret of [
      'Dollar General',
      'Chamber of Commerce',
      'Laghi Zaa',
      'Anytime Fitness',
      'Chaos Kitchens',
      'seller financing',
      'Seller Financing',
      'LOI',
    ]) {
      expect(blob, `confidential OM detail "${secret}" reached the public payload`).not.toContain(
        secret,
      )
    }
  })
})

describe('migration payload — insight articles', () => {
  type Post = {
    _id: string
    slug: string
    title: string
    category: string
    excerpt: string
    body: string[]
  }
  const posts = POSTS as Post[]

  it('uses only categories the schema offers', () => {
    for (const p of posts) expect(POST_CATEGORIES as readonly string[]).toContain(p.category)
  })

  it('gives every article a unique, routable slug', () => {
    const slugs = posts.map((p) => p.slug)
    expect(new Set(slugs).size).toBe(slugs.length)
    for (const p of posts) expect(p.slug, p.title).toMatch(/^[a-z0-9-]+$/)
  })

  it('keeps every excerpt inside the 200-character schema cap', () => {
    for (const p of posts) {
      expect(p.excerpt.length, `${p.title} excerpt is ${p.excerpt.length} chars`).toBeLessThanOrEqual(200)
    }
  })

  it('states no figure at all in a starter article', () => {
    // Spec §9 lists all three original article bodies as invented. The quickest way to
    // recreate that problem is to write a statistic into a sample post that nobody
    // remembers to source before it is published.
    for (const p of posts) {
      const prose = [p.title, p.excerpt, ...p.body].join(' ')
      const figures = prose.match(/\b\d[\d,.]*\s*(?:%|x\b|SF\b|square feet|units)/gi) ?? []
      expect(figures, `${p.title} contains unsourced figures: ${figures.join(', ')}`).toEqual([])
    }
  })
})

describe('migration payload — testimonials', () => {
  type Testimonial = { _id: string; attribution: string; consentOnRecord: boolean }
  const testimonials = TESTIMONIALS as Testimonial[]

  it('records no consent for a sample entry', () => {
    // Spec §11: written consent is required before publishing any investor's name.
    // TESTIMONIALS_QUERY filters on this field, so an unconsented entry cannot render.
    for (const t of testimonials) {
      expect(t.consentOnRecord, `${t.attribution} claims consent it does not have`).toBe(false)
    }
  })

  it('names no real person', () => {
    for (const t of testimonials) {
      expect(t.attribution.toLowerCase()).toContain('sample')
    }
  })
})

describe('migration payload — site settings', () => {
  it('points the contact address at the company rather than a person', () => {
    expect(SITE_SETTINGS.contactEmail).toBe('info@em-8.com')
  })

  it('carries a scheduling link over https', () => {
    expect(SITE_SETTINGS.bookACallUrl).toMatch(/^https:\/\//)
  })
})
