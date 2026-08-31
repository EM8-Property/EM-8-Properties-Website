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
  POSTS,
  TESTIMONIALS,
  SITE_SETTINGS,
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

/**
 * In dry-run mode this verifies the source is reachable and returns a stub id, rather
 * than skipping the network entirely. A dry run that never touches the CDN cannot catch
 * a 404 or a token missing asset-upload scope — which is the whole reason to run one
 * before writing.
 */
async function checkImage(filename) {
  const url = oldImage(filename)
  const res = await fetch(url, { method: 'HEAD' })
  if (!res.ok) throw new Error(`source image unreachable (${res.status}): ${url}`)
  console.log(`    reachable      ${filename}  (${((Number(res.headers.get('content-length')) || 0) / 1024 / 1024).toFixed(1)} MB)`)
  return 'image-DRYRUN'
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

  // publiclyOffered is the one field an editor is expected to change and that this
  // script would otherwise clobber on every run.
  //
  // Two cases, and they must not be conflated. For a property already in the dataset the
  // stored value wins outright, so turning an offering *off* in the Studio survives the
  // next migration — re-reading a payload default there would silently re-solicit a raise
  // an editor had deliberately withdrawn. Only a property that does not exist yet takes
  // its default from the payload, which is how Antioch arrives already public.
  const existing = new Map(
    ((await query('*[_type=="property"]{_id, publiclyOffered}')) ?? []).map((d) => [
      d._id,
      d.publiclyOffered === true,
    ]),
  )

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
      // Preserved from the dataset rather than reset, because createOrReplace overwrites
      // the whole document. Hard-coding false here would silently revert a 506(c)
      // offering an editor had deliberately enabled in the Studio. New documents default
      // to false: never public without an explicit per-property decision.
      publiclyOffered: existing.has(p._id) ? existing.get(p._id) : Boolean(p.publiclyOffered),
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
    // Only ever written alongside publiclyOffered, which is preserved from the dataset
    // above rather than reset — so the figures can sit ready while the offering stays
    // private until someone deliberately turns it on.
    if (p.offering) doc.offering = p.offering

    if (p.image) {
      const assetId = APPLY ? await uploadImage(p.image) : await checkImage(p.image)
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
      const assetId = APPLY ? await uploadImage(m.image) : await checkImage(m.image)
      doc.photo = imageField(assetId, `${m.name}, ${m.role}, EM8 Properties`)
    }
    docs.push(doc)
  }

  for (const post of POSTS) {
    console.log(`  post      ${post.title}`)
    docs.push({
      _id: post._id,
      _type: 'post',
      title: post.title,
      slug: { _type: 'slug', current: post.slug },
      publishedAt: post.publishedAt,
      category: post.category,
      excerpt: post.excerpt,
      body: portable(post.body),
    })
  }

  /**
   * Testimonials are written as DRAFTS, on purpose.
   *
   * These are samples to practise editing against, not investors. Spec §11 requires
   * written consent before publishing any investor's name, so `consentOnRecord` stays
   * false — which TESTIMONIALS_QUERY already filters on, so they cannot render either
   * way. The draft prefix is the second layer: the release gate inspects published
   * documents only, so a sample never has to be explained to it.
   *
   * To use one: replace the quote and attribution with the real investor's words, tick
   * the consent box once the written permission is genuinely on file, and publish. The
   * homepage and /investors sections appear by themselves once a consented one exists.
   */
  for (const t of TESTIMONIALS) {
    console.log(`  draft     testimonial ${t.attribution}`)
    docs.push({
      _id: `drafts.${t._id}`,
      _type: 'testimonial',
      quote: t.quote,
      attribution: t.attribution,
      descriptor: t.descriptor,
      ...(t.investorSince !== undefined ? { investorSince: t.investorSince } : {}),
      consentOnRecord: t.consentOnRecord,
      featured: false,
      order: t.order,
    })
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

  /**
   * siteSettings is PATCHED rather than replaced.
   *
   * The singleton also holds the disclaimer and the Agora portal URL — the disclaimer is
   * pending securities counsel and the portal URL is the Investor Login destination.
   * createOrReplace would drop both, so only the two fields this migration owns are set.
   */
  const settingsRes = await fetch(`${API}/data/mutate/${dataset}`, {
    method: 'POST',
    headers: { ...auth, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      mutations: [{ patch: { id: 'siteSettings', set: SITE_SETTINGS } }],
    }),
  })
  if (!settingsRes.ok) {
    throw new Error(`siteSettings patch failed ${settingsRes.status}: ${await settingsRes.text()}`)
  }
  console.log(`Patched siteSettings: ${Object.keys(SITE_SETTINGS).join(', ')}`)
  const body = await res.json()
  console.log(`\nWrote ${body.results?.length ?? 0} documents.`)
  console.log('Next: npm run test:content, then npm run build.')
}

main().catch((err) => {
  console.error('\nMigration failed:', err.message)
  process.exit(1)
})
