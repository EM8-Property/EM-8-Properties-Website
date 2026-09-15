/**
 * Generates scripts/content/track-record.mjs from Hunter's xlsx.
 *
 * Generated rather than typed so no figure is transcribed by hand. Run once; the output is
 * committed and the sheet is not a build dependency.
 */
import { readFileSync, writeFileSync } from 'node:fs'

const XL = process.argv[2]
const OUT = process.argv[3]

const ss = readFileSync(`${XL}/xl/sharedStrings.xml`, 'utf8')
const S = [...ss.matchAll(/<si>(.*?)<\/si>/gs)].map((m) =>
  [...m[1].matchAll(/<t[^>]*>(.*?)<\/t>/gs)].map((x) => x[1]).join('').replace(/&amp;/g, '&'),
)
const sheet = readFileSync(`${XL}/xl/worksheets/sheet1.xml`, 'utf8')
const R = {}
for (const [, rn, body] of sheet.matchAll(/<row[^>]*r="(\d+)"[^>]*>(.*?)<\/row>/gs)) {
  R[rn] = {}
  for (const c of body.matchAll(
    /<c r="([A-Z]+)\d+"([^>]*)>(?:<f[^>]*>.*?<\/f>)?(?:<v>(.*?)<\/v>)?<\/c>/gs,
  )) {
    if (c[3] === undefined) continue
    R[rn][c[1]] = /t="s"/.test(c[2]) ? S[+c[3]] : c[3]
  }
}

const yr = (serial) => new Date((+serial - 25569) * 86400000).getUTCFullYear()
const holdYears = (a, b) => (+b - +a) / 365.25

// column -> what to do with it. `existing` patches a document already in the dataset;
// `create` makes a new one; `skip` is a deliberate omission with its reason recorded.
const PLAN = {
  C: { action: 'existing', slug: 'burbank-manor-apartments' },
  D: { action: 'existing', slug: 'embassy-apartments' },
  E: {
    action: 'skip',
    why: 'ReVerb — Woodland Trails is live as `stabilized`. Hunter, 2026-09-15: the site is right, leave it alone.',
  },
  F: { action: 'create', id: 'worth-apartments', title: 'Worth Apartments', city: 'Worth', state: 'IL', lat: 41.690232, lng: -87.782551 },
  G: {
    action: 'skip',
    why: 'Old 157th Apartments was sold to an EM8 affiliate to assemble the 157 & Cicero redevelopment. Not an arm’s-length exit, so it is not a track-record line; its history belongs in 157 & Cicero’s deal story.',
  },
  H: { action: 'create', id: 'knox-and-kilpatrick', title: 'Knox & Kilpatrick', city: 'Oak Forest', state: 'IL', lat: 41.614172, lng: -87.733105 },
  I: { action: 'create', id: 'oakwood-apartments', title: 'Oakwood Apartments', city: 'Kenosha', state: 'WI', lat: 42.590736, lng: -87.857731 },
  J: { action: 'create', id: 'pinetree-apartments', title: 'Pinetree Apartments', city: 'Hanover Park', state: 'IL', lat: 41.99287, lng: -88.146483 },
  K: { action: 'create', id: 'crestline-apartments', title: 'Crestline Apartments', city: 'Alsip', state: 'IL', lat: 41.683588, lng: -87.745188, coordsUnconfirmed: true },
  L: { action: 'create', id: 'uteg-street-apartments', title: 'Uteg Street Apartments', city: 'Crystal Lake', state: 'IL', lat: 42.230944, lng: -88.329724 },
  M: { action: 'create', id: 'station-hills-belle-court', title: 'Station Hills & Belle Court', city: 'Kenosha', state: 'WI', lat: 42.581393, lng: -87.870414 },
}

const created = []
const patched = []
const skipped = []
const coordsUnconfirmed = []

for (const [col, plan] of Object.entries(PLAN)) {
  const label = R[3][col]
  if (plan.action === 'skip') {
    skipped.push({ label, why: plan.why })
    continue
  }
  const dealStory = {
    acquiredYear: yr(R[5][col]),
    exitYear: yr(R[16][col]),
    equityMultiple: `${(+R[21][col]).toFixed(2)}x`,
    grossIrr: +(+R[19][col] * 100).toFixed(1),
    salePrice: Math.round(+R[14][col]),
  }
  if (plan.action === 'existing') {
    patched.push({ slug: plan.slug, label, dealStory })
    continue
  }
  const held = holdYears(R[5][col], R[16][col])
  const heldText =
    held < 2 ? `${Math.round(held * 12)} months` : `${held.toFixed(held % 1 < 0.15 ? 0 : 1)} years`
  if (plan.coordsUnconfirmed) coordsUnconfirmed.push(plan.id)
  created.push({
    _id: `property-${plan.id}`,
    _type: 'property',
    title: plan.title,
    slug: { _type: 'slug', current: plan.id },
    assetClass: 'multifamily',
    status: 'sold',
    city: plan.city,
    state: plan.state,
    coordinates: { _type: 'geopoint', lat: plan.lat, lng: plan.lng },
    cardBlurb: `Value-add multifamily in ${plan.city}, ${plan.state === 'WI' ? 'Wisconsin' : 'Illinois'}. Acquired ${dealStory.acquiredYear}, sold ${dealStory.exitYear} after ${heldText}.`,
    showInPortfolio: true,
    featured: false,
    order: 200,
    dealStory,
  })
}

const banner = `/**
 * The realized track record, from "EM8 Transacted Assets as of August 2026".
 *
 * GENERATED, not typed. Every figure here was read out of Hunter's spreadsheet by
 * scripts/dev/gen-track-record.mjs rather than copied by hand, because eleven deals times
 * five figures is fifty-five chances to fat-finger a number that a reader would take for a
 * measurement. Regenerate rather than edit if the sheet changes.
 *
 * ## What is deliberately not here
 *
 * The sheet also carries total equity, total project cost, purchase price, closing costs,
 * net exit proceeds to LPs, LTM NOI and realized cap rate. None of them are in this file.
 * LP capital and operating margins are not marketing copy, and tests/unit/contentSource
 * .test.ts already refuses lender names, debt balances and promote for the same reason —
 * it is extended to cover these.
 *
 * ## Gross, not net
 *
 * \`grossIrr\` is before fees and promote. The sheet has a Net IRR to LPs for two of the
 * eleven deals only; Hunter's decision of 2026-09-15 was one basis across all of them, so
 * gross it is, named for its basis and labelled that way on the page. Burbank is 51.7%
 * gross against 42.5% net, which is the size of the gap this naming exists to prevent
 * anyone forgetting.
 */`

const out = `${banner}

/** New \`property\` documents. Written with createIfNotExists — never clobbers a live edit. */
export const TRACK_RECORD_NEW = ${JSON.stringify(created, null, 2)}

/** Deal-story figures patched onto properties that already exist in the dataset. */
export const TRACK_RECORD_PATCH = ${JSON.stringify(patched, null, 2)}

/**
 * Rows in the sheet that are deliberately NOT published, and why. Recorded so the next
 * person can see the omission was a decision rather than an oversight.
 */
export const TRACK_RECORD_SKIPPED = ${JSON.stringify(skipped, null, 2)}

/**
 * Map pins that geocoded to a street but not a house number, so the marker is approximate.
 *
 * Nominatim returned three candidates for Crestline spanning about 1.2 miles of longitude,
 * every one of them labelled West 115th Street, and a Chicago-grid estimate disagreed with
 * all three. This is the Alsip-proper match. **Hunter to confirm the exact spot** — he knows
 * where his own building is, and a wrong pin is visible on the property page rather than
 * hidden in a field.
 */
export const TRACK_RECORD_COORDS_UNCONFIRMED = ${JSON.stringify(coordsUnconfirmed, null, 2)}
`

writeFileSync(OUT, out)
console.log(`created ${created.length}, patched ${patched.length}, skipped ${skipped.length}`)
for (const c of created) console.log(`  new    ${c._id.padEnd(28)} ${c.dealStory.equityMultiple} ${c.dealStory.grossIrr}%`)
for (const p of patched) console.log(`  patch  ${p.slug.padEnd(28)} ${p.dealStory.equityMultiple} ${p.dealStory.grossIrr}%`)
for (const s of skipped) console.log(`  skip   ${s.label}`)
