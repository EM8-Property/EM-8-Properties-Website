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
  PAGE_COPY,
  PAGE_SEO,
  CTA_BAND,
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

/**
 * Seeds the top-of-page carousel, but only when it is empty.
 *
 * This band is meant to be curated in the Studio — reordered, re-cropped, and eventually
 * swapped for real lobby photography. Rewriting it on every migration would throw away
 * that work silently, so an existing list is left completely alone.
 *
 * The seed reuses each property's own gallery image, which is already an asset in this
 * dataset, so nothing is uploaded and no photograph is invented. Sold assets are skipped:
 * this band is navigation toward what EM8 owns now.
 */
/**
 * Seeds the per-page copy documents, and only when a page does not already exist.
 *
 * The whole point of moving this copy into the CMS is that the team edits it. Rewriting
 * these on every migration would silently discard that work, so an existing page document
 * is left completely alone — this seeds the starting point once and then never touches it
 * again.
 *
 * `_key` is added to every array item. Sanity accepts a write without them and the site
 * renders fine; the Studio is where it breaks, with a "Missing keys" banner and reordering
 * disabled. Nothing in the build, the tests, or Lighthouse sees that.
 */
function withKeys(items, prefix) {
  return items.map((item, i) => ({ _key: `${prefix}-${i}`, ...item }))
}

async function seedPagesIfMissing(apply) {
  // The union, not just PAGE_COPY: /portfolio, /insights and /track-record have documents
  // that hold nothing but their search title and description, so they appear in PAGE_SEO
  // and not in PAGE_COPY.
  const ids = [...new Set([...Object.keys(PAGE_COPY), ...Object.keys(PAGE_SEO)])]
  const present = new Set(
    (await query(`*[_id in ${JSON.stringify(ids)}]._id`)) ?? [],
  )

  const docs = []
  for (const id of ids) {
    if (present.has(id)) {
      console.log(`  page      ${id} already exists — left untouched`)
      continue
    }
    const copy = structuredClone(PAGE_COPY[id] ?? {})
    if (copy.partners) copy.partners = withKeys(copy.partners, 'partner')
    if (copy.facts) copy.facts = withKeys(copy.facts, 'fact')
    if (copy.steps) copy.steps = withKeys(copy.steps, 'step')
    if (PAGE_SEO[id]) copy.seo = structuredClone(PAGE_SEO[id])
    console.log(`  page      seeding ${id}`)
    docs.push({ _id: id, _type: id, ...copy })
  }

  if (docs.length === 0 || !apply) return

  const res = await fetch(`${API}/data/mutate/${dataset}`, {
    method: 'POST',
    headers: { ...auth, 'Content-Type': 'application/json' },
    // createIfNotExists rather than createOrReplace: belt and braces alongside the check
    // above, so a race cannot clobber a page an editor created a moment ago.
    body: JSON.stringify({ mutations: docs.map((doc) => ({ createIfNotExists: doc })) }),
  })
  if (!res.ok) throw new Error(`page seed failed ${res.status}: ${await res.text()}`)
  console.log(`  page      seeded ${docs.length}`)
}

/**
 * Adds `seo` to page documents that predate the field.
 *
 * `seedPagesIfMissing` cannot do this: it seeds a whole document only when none exists, so
 * the four pages already in the dataset would keep their missing `seo` forever — and the
 * field is required, so every one of those pages would fail the build.
 *
 * `setIfMissing`, never `set`. An editor who has already written their own title and
 * description must survive a re-run of this migration; the whole point of moving these
 * strings into the CMS is that the team owns them now. This only fills a blank.
 */
async function backfillPageSeo(apply) {
  const ids = Object.keys(PAGE_SEO)

  // Per *leaf*, not per `seo` object, and with no `!defined(seo)` pre-filter.
  //
  // Keying on the whole object made this fill a blank but never repair a half-filled one:
  // `setIfMissing: { seo }` is all-or-nothing at that key, so a document with a title and
  // no description would be skipped forever — reported as "already has one" on every
  // re-run while `next build` failed on it. The Studio's required() validation blocks that
  // through the publish path, but Vision, the CLI, and any direct API write do not.
  //
  // `setIfMissing` on each leaf keeps the guarantee that matters: an editor's own words
  // are never overwritten, now at field granularity rather than object granularity.
  const incomplete =
    (await query(
      `*[_id in ${JSON.stringify(ids)} && (!defined(seo.title) || !defined(seo.description))]._id`,
    )) ?? []

  if (incomplete.length === 0) {
    console.log('  page seo  no existing page is missing one — left untouched')
    return
  }

  for (const id of incomplete) console.log(`  page seo  backfilling ${id}`)
  if (!apply) return

  const res = await fetch(`${API}/data/mutate/${dataset}`, {
    method: 'POST',
    headers: { ...auth, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      mutations: incomplete.flatMap((id) => [
        // The parent object first: a leaf path cannot be set inside an object that does
        // not exist yet, and this is a no-op when it already does.
        { patch: { id, setIfMissing: { seo: {} } } },
        {
          patch: {
            id,
            setIfMissing: {
              'seo.title': PAGE_SEO[id].title,
              'seo.description': PAGE_SEO[id].description,
            },
          },
        },
      ]),
    }),
  })
  if (!res.ok) throw new Error(`page seo backfill failed ${res.status}: ${await res.text()}`)
  console.log(`  page seo  backfilled ${incomplete.length}`)
}

/**
 * Moves the closing call to action from `homePage` onto `siteSettings`.
 *
 * It was only ever read by the homepage. Property pages rendered the same component with
 * no copy — a headless email box on all eleven — and the five content pages had no call to
 * action at all. `siteSettings` is where a record every page reads belongs.
 *
 * The live value wins over the seed constant. If the team has already edited this copy in
 * the Studio, that is the version that must survive the move; falling back to the constant
 * would quietly revert their words to what shipped months ago. The constant is only used
 * when `homePage` has nothing to move.
 */
async function moveCtaBandToSettings(apply) {
  const [existing, fromHomePage] = await Promise.all([
    query('*[_id=="siteSettings"][0].ctaBand'),
    query('*[_id=="homePage"][0].ctaBand'),
  ])

  // Checked per leaf, not on the object. Keyed on `existing` alone, a ctaBand with a
  // heading and no submitLabel would report "already has one" on every re-run while the
  // band stayed broken — the same granularity bug backfillPageSeo was rewritten to fix.
  const complete = Boolean(existing?.heading?.title && existing?.submitLabel)
  if (complete) {
    console.log('  cta band  siteSettings already has one — left untouched')
  } else if (existing) {
    console.log('  cta band  siteSettings has an incomplete one — filling the gaps')
  }

  const needsMove = !complete
  const needsCleanup = Boolean(fromHomePage)
  if (!needsMove && !needsCleanup) return

  if (needsMove) {
    console.log(
      fromHomePage
        ? '  cta band  moving the live copy from homePage to siteSettings'
        : '  cta band  seeding siteSettings from the content module',
    )
  }
  if (needsCleanup) console.log('  cta band  clearing the old homePage copy')
  if (!apply) return

  const mutations = []
  if (needsMove) {
    mutations.push({
      patch: { id: 'siteSettings', setIfMissing: { ctaBand: fromHomePage ?? CTA_BAND } },
    })
  }
  // Unset last, and only after the copy is safely on siteSettings.
  if (needsCleanup) mutations.push({ patch: { id: 'homePage', unset: ['ctaBand'] } })

  const res = await fetch(`${API}/data/mutate/${dataset}`, {
    method: 'POST',
    headers: { ...auth, 'Content-Type': 'application/json' },
    body: JSON.stringify({ mutations }),
  })
  if (!res.ok) throw new Error(`cta band move failed ${res.status}: ${await res.text()}`)
  console.log('  cta band  done')
}

async function seedCarouselIfEmpty(apply) {
  const existing = await query('*[_id=="siteSettings"][0].heroCarousel')
  if (Array.isArray(existing) && existing.length > 0) {
    console.log(`  carousel  ${existing.length} slides already curated — left untouched`)
    return
  }

  const sources = await query(
    `*[_type=="property" && status != "sold" && defined(gallery[0].asset._ref)]
       | order(order asc){ _id, title, "slug": slug.current, "asset": gallery[0].asset._ref, "alt": gallery[0].alt }`,
  )
  if (!sources?.length) {
    console.log('  carousel  no property photography available to seed from')
    return
  }

  const slides = sources.map((p, i) => ({
    _key: `slide-${i}`,
    _type: 'carouselSlide',
    image: {
      _type: 'image',
      asset: { _type: 'reference', _ref: p.asset },
      alt: p.alt || `${p.title}, ${'an EM8 Properties asset'}`,
    },
    property: { _type: 'reference', _ref: p._id },
  }))

  console.log(`  carousel  seeding ${slides.length} slides: ${sources.map((p) => p.title).join(', ')}`)
  if (!apply) return

  const res = await fetch(`${API}/data/mutate/${dataset}`, {
    method: 'POST',
    headers: { ...auth, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      mutations: [{ patch: { id: 'siteSettings', set: { heroCarousel: slides } } }],
    }),
  })
  if (!res.ok) throw new Error(`carousel seed failed ${res.status}: ${await res.text()}`)
  console.log('  carousel  seeded')
}

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
  const existingVisible = new Map(
    ((await query('*[_type=="property"]{_id, showInPortfolio}')) ?? []).map((d) => [
      d._id,
      d.showInPortfolio,
    ]),
  )

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
    // An *explicit* stored value wins, so re-listing a property in the Studio after
    // closing survives the next migration. An absent one does not: every property predates
    // this field, so treating "unset" as an editor decision would mean the payload default
    // could never reach a document that already exists — which is every document.
    const storedVisibility = existingVisible.get(p._id)
    doc.showInPortfolio =
      typeof storedVisibility === 'boolean' ? storedVisibility : p.showInPortfolio !== false

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
      // Governance grouping, not job title. Defaults to leadership for anyone unmarked.
      group: m.group ?? 'leadership',
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
    await seedCarouselIfEmpty(false)
    await seedPagesIfMissing(false)
    await backfillPageSeo(false)
    await moveCtaBandToSettings(false)
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

  await seedCarouselIfEmpty(true)
  await seedPagesIfMissing(true)
  await backfillPageSeo(true)
  await moveCtaBandToSettings(true)
  const body = await res.json()
  console.log(`\nWrote ${body.results?.length ?? 0} documents.`)
  console.log('Next: npm run test:content, then npm run build.')
}

main().catch((err) => {
  console.error('\nMigration failed:', err.message)
  process.exit(1)
})
