/**
 * Writes the real content into the Sanity dataset, images included.
 *
 *   node --env-file=.env.local scripts/migrate-content.mjs           # dry run, writes nothing
 *   node --env-file=.env.local scripts/migrate-content.mjs --apply   # actually writes
 *
 * Idempotent by construction: every document uses a fixed `_id` from em8-content.mjs and
 * is written with createOrReplace, and images are matched by their original filename so a
 * second run re-uses the asset already in the dataset rather than uploading a duplicate.
 * Running it twice leaves the dataset in the same state as running it once.
 *
 * Photography is pulled from the *current live site's* Sanity project (svwmqi1a), which
 * is public. That is the only thing taken from it — the destination project, dataset, and
 * schema are all new.
 *
 * The payload is gated offline by tests/unit/contentSource.test.ts, which runs in
 * `npm test`. Run that before this. It fails on any spec §9 placeholder, any promissory
 * phrasing, a transposed coordinate, an over-long blurb, or a confidential figure from
 * the internal portfolio sheet.
 */

import {
  PROPERTIES,
  HERO_STATS,
  FOCUS_CARDS,
  TEAM,
  oldImage,
  portable,
} from './content/em8-content.mjs'

const APPLY = process.argv.includes('--apply')

const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID
const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET
const token = process.env.SANITY_API_WRITE_TOKEN

if (!projectId || !dataset || !token) {
  console.error(
    'Missing env. Run with:  node --env-file=.env.local scripts/migrate-content.mjs\n' +
      'Needs NEXT_PUBLIC_SANITY_PROJECT_ID, NEXT_PUBLIC_SANITY_DATASET, SANITY_API_WRITE_TOKEN.',
  )
  process.exit(1)
}

const API = `https://${projectId}.api.sanity.io/v2024-01-01`
const auth = { Authorization: `Bearer ${token}` }

async function query(groq) {
  const res = await fetch(`${API}/data/query/${dataset}?query=${encodeURIComponent(groq)}`, {
    headers: auth,
  })
  if (!res.ok) throw new Error(`query failed ${res.status}: ${await res.text()}`)
  return (await res.json()).result
}

/** Upload once, then re-use. Sanity dedupes identical bytes, but this also avoids the download. */
const assetCache = new Map()
async function uploadImage(filename) {
  if (assetCache.has(filename)) return assetCache.get(filename)

  const existing = await query(
    `*[_type=="sanity.imageAsset" && originalFilename==${JSON.stringify(filename)}][0]._id`,
  )
  if (existing) {
    console.log(`    reusing asset  ${filename}`)
    assetCache.set(filename, existing)
    return existing
  }

  const url = oldImage(filename)
  const res = await fetch(url)
  if (!res.ok) throw new Error(`could not fetch ${url}: ${res.status}`)
  const bytes = Buffer.from(await res.arrayBuffer())
  const contentType = res.headers.get('content-type') ?? 'image/jpeg'
  console.log(`    uploading      ${filename}  (${(bytes.length / 1024 / 1024).toFixed(1)} MB)`)

  const up = await fetch(
    `${API}/assets/images/${dataset}?filename=${encodeURIComponent(filename)}`,
    { method: 'POST', headers: { ...auth, 'Content-Type': contentType }, body: bytes },
  )
  if (!up.ok) throw new Error(`upload failed ${up.status}: ${await up.text()}`)
  const id = (await up.json()).document._id
  assetCache.set(filename, id)
  return id
}

const imageField = (assetId, alt) => ({
  _type: 'image',
  asset: { _type: 'reference', _ref: assetId },
  alt,
})

async function buildDocuments() {
  const docs = []

  for (const p of PROPERTIES) {
    console.log(`  property  ${p.title}`)
    const doc = {
      _id: p._id,
      _type: 'property',
      title: p.title,
      slug: { _type: 'slug', current: p.slug },
      assetClass: p.assetClass,
      status: p.status,
      city: p.city,
      state: p.state,
      coordinates: { _type: 'geopoint', lat: p.coordinates.lat, lng: p.coordinates.lng },
      cardBlurb: p.cardBlurb,
      order: p.order,
      featured: Boolean(p.featured),
      // Never true without an explicit 506(c) decision per property. Defaulting it on
      // would publish an offering that may only be marketed privately.
      publiclyOffered: false,
    }

    if (p.metraStation) doc.metraStation = p.metraStation
    if (p.walkMinutes !== undefined) doc.walkMinutes = p.walkMinutes
    if (p.unitCount !== undefined) doc.unitCount = p.unitCount
    if (p.retailUnitCount !== undefined) doc.retailUnitCount = p.retailUnitCount
    if (p.squareFeet !== undefined) doc.squareFeet = p.squareFeet
    if (p.yearBuilt !== undefined) doc.yearBuilt = p.yearBuilt
    if (p.yearRenovated !== undefined) doc.yearRenovated = p.yearRenovated
    if (p.overview) doc.overview = portable(p.overview)
    if (p.businessPlan) doc.businessPlan = portable(p.businessPlan)
    if (p.dealStory) doc.dealStory = p.dealStory

    if (p.image) {
      const assetId = APPLY ? await uploadImage(p.image) : 'image-DRYRUN'
      doc.gallery = [{ _key: `${p._id}-0`, ...imageField(assetId, p.alt) }]
    }

    docs.push(doc)
  }

  for (const m of TEAM) {
    console.log(`  team      ${m.name}`)
    const doc = {
      _id: m._id,
      _type: 'teamMember',
      name: m.name,
      role: m.role,
      bio: m.bio,
      order: m.order,
    }
    if (m.image) {
      const assetId = APPLY ? await uploadImage(m.image) : 'image-DRYRUN'
      doc.photo = imageField(assetId, `${m.name}, ${m.role}, EM8 Properties`)
    }
    docs.push(doc)
  }

  for (const s of HERO_STATS) {
    docs.push({ _id: s._id, _type: 'heroStat', figure: s.figure, label: s.label, order: s.order })
  }
  for (const f of FOCUS_CARDS) {
    docs.push({
      _id: f._id,
      _type: 'focusCard',
      title: f.title,
      description: f.description,
      order: f.order,
    })
  }

  return docs
}

async function main() {
  console.log(`\nEM8 content migration -> project ${projectId}, dataset ${dataset}`)
  console.log(APPLY ? 'MODE: apply (writing)\n' : 'MODE: dry run (no writes; pass --apply)\n')

  const docs = await buildDocuments()

  console.log(`\n${docs.length} documents prepared:`)
  for (const [type, n] of Object.entries(
    docs.reduce((acc, d) => ({ ...acc, [d._type]: (acc[d._type] ?? 0) + 1 }), {}),
  )) {
    console.log(`  ${String(n).padStart(3)}  ${type}`)
  }

  if (!APPLY) {
    console.log('\nDry run complete. Nothing was written. Re-run with --apply.')
    return
  }

  const res = await fetch(`${API}/data/mutate/${dataset}?returnIds=true`, {
    method: 'POST',
    headers: { ...auth, 'Content-Type': 'application/json' },
    body: JSON.stringify({ mutations: docs.map((doc) => ({ createOrReplace: doc })) }),
  })
  if (!res.ok) throw new Error(`mutate failed ${res.status}: ${await res.text()}`)
  const body = await res.json()
  console.log(`\nWrote ${body.results?.length ?? 0} documents.`)
  console.log('Next: npm run test:content, then npm run build.')
}

main().catch((err) => {
  console.error('\nMigration failed:', err.message)
  process.exit(1)
})
