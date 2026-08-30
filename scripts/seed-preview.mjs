/**
 * Seeds the `preview` dataset with representative sample content, so the design can be
 * reviewed before real content entry begins.
 *
 * ============================ READ THIS ============================
 * The target dataset is HARDCODED to `preview` and cannot be pointed at production.
 * Nothing here is real. Figures are invented for layout only — several are the very
 * placeholders spec §9 forbids shipping, which is precisely why they live in a dataset
 * the site never reads.
 *
 * The exceptions are the hero stats, which spec §9 confirms as real:
 *   $100M+ AUM · 1,350+ units managed · 750+ units sold · 1.79x realized · 36.2%
 * ==================================================================
 *
 * Usage: node --env-file=.env.local scripts/seed-preview.mjs
 */

const DATASET = 'preview' // not configurable, on purpose
const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID
const token = process.env.SANITY_API_WRITE_TOKEN

if (!projectId || !token) {
  console.error('Missing NEXT_PUBLIC_SANITY_PROJECT_ID or SANITY_API_WRITE_TOKEN')
  process.exit(1)
}

const block = (text) => [
  { _type: 'block', _key: Math.random().toString(36).slice(2, 10), style: 'normal', markDefs: [], children: [{ _type: 'span', _key: Math.random().toString(36).slice(2, 10), text, marks: [] }] },
]

const properties = [
  {
    _id: 'p.boulevard', title: 'Boulevard at Central Station', slug: 'boulevard-at-central-station',
    assetClass: 'mixed-use', status: 'lease-up', city: 'Tinley Park', state: 'IL',
    coordinates: { _type: 'geopoint', lat: 41.5731, lng: -87.7845 },
    metraStation: 'Tinley Park', walkMinutes: 2, unitCount: 66, yearBuilt: 2024,
    cardBlurb: 'Ground-up mixed-use on the last developable parcel beside the Rock Island District platform.',
    overview: block('A ground-up mixed-use building on the last developable parcel beside the station platform, delivered in partnership with the Village after a two-year entitlement process.'),
    businessPlan: block('Stabilise the residential floors through the first lease-up cycle, then bring the ground-floor retail online as the surrounding block fills in.'),
    publiclyOffered: true, featured: true, order: 1,
  },
  {
    _id: 'p.waverly', title: 'Waverly Creek', slug: 'waverly-creek',
    assetClass: 'multifamily', status: 'stabilized', city: 'Antioch', state: 'IL',
    coordinates: { _type: 'geopoint', lat: 42.4772, lng: -88.0956 },
    metraStation: 'Antioch', walkMinutes: 9, unitCount: 148, yearBuilt: 2019,
    cardBlurb: 'Stabilised garden-style multifamily at the northern edge of the North Central Service line.',
    overview: block('A stabilised garden-style community acquired below replacement cost and self-managed since acquisition.'),
    publiclyOffered: false, order: 2,
  },
  {
    _id: 'p.parktownhomes', title: 'Park Townhomes', slug: 'park-townhomes',
    assetClass: 'townhomes', status: 'renovation-complete', city: 'Oak Forest', state: 'IL',
    coordinates: { _type: 'geopoint', lat: 41.6028, lng: -87.7539 },
    metraStation: 'Oak Forest', walkMinutes: 6, unitCount: 42, yearBuilt: 1998, yearRenovated: 2023,
    cardBlurb: 'Full interior modernisation across every unit, completed without displacing a single resident.',
    overview: block('Forty-two townhomes taken through a full interior modernisation on a rolling schedule, so no household had to leave.'),
    publiclyOffered: false, order: 3,
  },
  {
    _id: 'p.burbank', title: 'Burbank Commons', slug: 'burbank-commons',
    assetClass: 'multifamily', status: 'sold', city: 'Burbank', state: 'IL',
    coordinates: { _type: 'geopoint', lat: 41.7442, lng: -87.7695 },
    metraStation: 'Chicago Ridge', walkMinutes: 14, unitCount: 88, yearBuilt: 1986,
    cardBlurb: 'Acquired below replacement cost, modernised over three years, and taken full cycle.',
    dealStory: {
      acquired: 'Acquired below replacement cost from a family partnership winding down.',
      executed: 'Interior modernisation, new roofs, and a rebuilt management operation.',
      exited: 'Sold to a regional owner-operator in a full-cycle transaction.',
      equityMultiple: '2.1x', exitYear: 2019,
    },
    publiclyOffered: false, order: 4,
  },
  {
    _id: 'p.embassy', title: 'Embassy Apartments', slug: 'embassy-apartments',
    assetClass: 'multifamily', status: 'sold', city: 'Oak Lawn', state: 'IL',
    coordinates: { _type: 'geopoint', lat: 41.72, lng: -87.7479 },
    metraStation: 'Oak Lawn', walkMinutes: 4, unitCount: 54, yearBuilt: 1972,
    cardBlurb: 'A walk-to-station asset repositioned over five years and exited into a strong bid.',
    dealStory: {
      acquired: 'Acquired with deferred maintenance and below-market rents.',
      executed: 'Unit-by-unit renovation alongside a full amenity refresh.',
      exited: 'Exited into a competitive bid from an institutional buyer.',
      equityMultiple: '1.7x', exitYear: 2021,
    },
    publiclyOffered: false, order: 5,
  },
]

// Confirmed real in spec §9 — the only figures here that are not invented.
const heroStats = [
  { _id: 'hs.1', figure: '$100M+', label: 'Assets Under Management', order: 1 },
  { _id: 'hs.2', figure: '1,350+', label: 'Units Managed', order: 2 },
  { _id: 'hs.3', figure: '750+', label: 'Units Sold', order: 3 },
  { _id: 'hs.4', figure: '1.79x', label: 'Realized Equity Multiple', order: 4 },
  { _id: 'hs.5', figure: '36.2%', label: 'Avg. Annual Return on Equity', order: 5 },
]

const focusCards = [
  { _id: 'fc.1', title: 'We stay the owner', description: 'We do not merchant-build and walk away. The people who chose the site are the people answering for it in year eight.', order: 1 },
  { _id: 'fc.2', title: 'One accountable team', description: 'The same builder and the same manager across the portfolio, so nobody gets to point at somebody else.', order: 2 },
  { _id: 'fc.3', title: 'Build where the infrastructure is', description: 'A train, a main street, green space, somewhere to buy groceries. We add housing where a good life is already possible.', order: 3 },
  { _id: 'fc.4', title: 'Work with municipalities, not around them', description: 'Entitlement is a partnership. We bring plans a village can defend to its own residents.', order: 4 },
]

const team = [
  { _id: 'tm.1', name: 'Sample Person', role: 'Managing Partner', bio: 'Placeholder biography for design review. Replace with the real team before launch.', order: 1 },
  { _id: 'tm.2', name: 'Sample Person', role: 'Director of Operations', bio: 'Placeholder biography for design review. Replace with the real team before launch.', order: 2 },
  { _id: 'tm.3', name: 'Sample Person', role: 'Asset Management', bio: 'Placeholder biography for design review. Replace with the real team before launch.', order: 3 },
]

const posts = [
  { _id: 'po.1', title: 'Why we stopped treating zoning as a negotiation', slug: 'zoning-is-not-a-negotiation', category: 'municipal-partnership', publishedAt: '2026-08-12T00:00:00Z', excerpt: 'Oak Forest approved our plan faster than we budgeted for, and the reason had nothing to do with the drawings.', body: block('Sample article body for design review.') },
  { _id: 'po.2', title: 'What two minutes from a platform is actually worth', slug: 'two-minutes-from-a-platform', category: 'market', publishedAt: '2026-07-03T00:00:00Z', excerpt: 'Walk time is the one amenity a competitor cannot add later. We price it accordingly.', body: block('Sample article body for design review.') },
  { _id: 'po.3', title: 'Renovating 42 townhomes without displacing anyone', slug: 'renovating-without-displacing', category: 'operations', publishedAt: '2026-05-21T00:00:00Z', excerpt: 'A rolling schedule costs more and takes longer. Here is why we did it anyway.', body: block('Sample article body for design review.'), relatedProperty: { _type: 'reference', _ref: 'p.parktownhomes' } },
]

const testimonials = [
  { _id: 'te.1', quote: 'They send the same report whether the quarter was good or bad. That is rarer than it should be.', attribution: 'Sample Investor', descriptor: 'Private Equity Consultant', investorSince: 2019, consentOnRecord: true, featured: true, order: 1 },
  { _id: 'te.2', quote: 'I have invested with sponsors who disappear between distributions. These are not those people.', attribution: 'Sample Investor', descriptor: 'Physician', investorSince: 2021, consentOnRecord: true, order: 2 },
]

const settings = {
  _id: 'siteSettings', _type: 'siteSettings',
  agoraPortalUrl: 'https://em-8.acp.agorareal.com/#/login',
  contactEmail: 'hunter@em-8.com',
  disclaimer: 'PREVIEW DATASET — sample content for design review only. Nothing on this page is real. The production disclaimer is pending securities-counsel review.',
}

const docs = [
  settings,
  ...properties.map((p) => ({ ...p, _type: 'property', slug: { _type: 'slug', current: p.slug } })),
  ...heroStats.map((d) => ({ ...d, _type: 'heroStat' })),
  ...focusCards.map((d) => ({ ...d, _type: 'focusCard' })),
  ...team.map((d) => ({ ...d, _type: 'teamMember' })),
  ...posts.map((p) => ({ ...p, _type: 'post', slug: { _type: 'slug', current: p.slug } })),
  ...testimonials.map((d) => ({ ...d, _type: 'testimonial' })),
]

const res = await fetch(`https://${projectId}.api.sanity.io/v2026-01-01/data/mutate/${DATASET}`, {
  method: 'POST',
  headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
  body: JSON.stringify({ mutations: docs.map((doc) => ({ createOrReplace: doc })) }),
})

if (!res.ok) {
  console.error('Seed failed:', res.status, (await res.text()).slice(0, 600))
  process.exit(1)
}

console.log(`Seeded ${docs.length} documents into the "${DATASET}" dataset.`)
console.log(`  ${properties.length} properties (2 sold, 1 publicly offered)`)
console.log(`  ${heroStats.length} hero stats — the only real figures here`)
console.log(`  ${focusCards.length} success factors, ${team.length} team, ${posts.length} posts, ${testimonials.length} testimonials`)
