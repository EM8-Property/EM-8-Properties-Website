/**
 * Promote the best available photograph into the slots where a grainy one is showing.
 *
 * `docs/image-resolution.md` ranks twelve images that are served smaller than they are
 * painted. Five of them turned out not to need a new photograph at all: a higher-resolution
 * shot of the same building was already in the dataset after the 2026-09-16 upload, sitting
 * further down the same property's gallery. This moves those into place.
 *
 * Nothing is uploaded and nothing is deleted. A property hero is `gallery[0]`, so promoting
 * one is a **reorder** of an array the page already renders in full; a carousel slide is a
 * pointer, so promoting one is a **reference swap**. Both are reversible in the Studio by
 * dragging the array back.
 *
 * Targets are matched on the alt text written during the upload rather than on position,
 * because positions move every time anyone edits a gallery. A target that does not match
 * exactly one photograph is an error, not a guess — the 2026-09-15 handover records a
 * property being identified from its name alone and being wrong.
 *
 * Usage:
 *   node --env-file=.env.local scripts/dev/promote-hero-photos.mjs            # dry run
 *   node --env-file=.env.local scripts/dev/promote-hero-photos.mjs --apply
 */

const PROJECT = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID
const DATASET = process.env.NEXT_PUBLIC_SANITY_DATASET
const TOKEN = process.env.SANITY_API_WRITE_TOKEN
const API = `https://${PROJECT}.api.sanity.io/v2024-01-01`
const APPLY = process.argv.includes('--apply')

if (!TOKEN) throw new Error('SANITY_API_WRITE_TOKEN missing — is --env-file=.env.local set?')

/**
 * Property heroes to promote: move the photograph whose alt contains `match` to `gallery[0]`.
 *
 * Only two qualify. The other property heroes on the grainy list belong to sold assets with
 * no photo folder, so there is nothing better in the dataset to promote.
 */
const HEROES = [
  { slug: 'boulevard-at-central-station', match: 'Four-storey mixed-use building' },
  { slug: 'oak-forest-k', match: 'Two-storey apartment building' },
]

/**
 * Carousel slides to repoint, identified by the property the slide already links to.
 *
 * The slide keeps its property reference and its own alt; only the asset moves. An exterior
 * is chosen deliberately over the widest available file — several of the widest photographs
 * in these galleries are kitchens, and the homepage carousel is where a building should
 * look like a building.
 */
const SLIDES = [
  { prop: '157-and-cicero', match: 'Street elevation of the apartment building' },
  { prop: 'oak-forest-k', match: 'Two-storey apartment building' },
  { prop: '382-penn-apartments', match: '382 PENN lettering' },
]

const widthOf = (ref) => Number(/-(\d+)x\d+-/.exec(ref ?? '')?.[1] ?? 0)

async function query(groq) {
  const u = new URL(`${API}/data/query/${DATASET}`)
  u.searchParams.set('query', groq)
  const r = await fetch(u, { headers: { Authorization: `Bearer ${TOKEN}` } })
  const j = await r.json()
  if (j.error) throw new Error(`query failed: ${JSON.stringify(j.error)}`)
  return j.result
}

async function mutate(mutations) {
  const r = await fetch(`${API}/data/mutate/${DATASET}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ mutations }),
  })
  const j = await r.json()
  if (!r.ok || j.error) throw new Error(`mutate failed: ${JSON.stringify(j)}`)
  return j
}

/** Exactly one match, or throw. A target that is ambiguous is a target that is wrong. */
function only(items, match, what) {
  const hits = items.filter((i) => (i.alt ?? '').includes(match))
  if (hits.length !== 1) throw new Error(`${what}: expected 1 photo matching "${match}", got ${hits.length}`)
  return hits[0]
}

const mutations = []

// ---- property heroes -------------------------------------------------------------------
for (const { slug, match } of HEROES) {
  const p = await query(
    `*[_type=="property" && slug.current=="${slug}"][0]{_id, gallery}`,
  )
  if (!p) throw new Error(`no property ${slug}`)
  const target = only(p.gallery ?? [], match, slug)
  const current = p.gallery[0]

  if (current._key === target._key) {
    console.log(`  ${slug}: already the hero, nothing to do`)
    continue
  }
  // Move the target to the front, leaving every other item in its existing order. The whole
  // array is written back with its _keys intact, so no item is recreated.
  const reordered = [target, ...p.gallery.filter((g) => g._key !== target._key)]
  console.log(
    `  ${slug} hero: ${widthOf(current.asset?._ref)}px -> ${widthOf(target.asset?._ref)}px  "${target.alt.slice(0, 50)}"`,
  )
  mutations.push({ patch: { id: p._id, set: { gallery: reordered } } })
}

// ---- homepage carousel slides ----------------------------------------------------------
const settings = await query(`*[_type=="siteSettings"][0]{_id, heroCarousel}`)
for (const { prop, match } of SLIDES) {
  const slideIndex = (settings.heroCarousel ?? []).findIndex(
    (s) => s.property?._ref && s.property._ref.includes(prop.replace(/-/g, '')),
  )
  // The reference id is not always derivable from the slug, so resolve it properly.
  const resolved = await query(
    `*[_type=="siteSettings"][0].heroCarousel[]{_key, "prop": property->slug.current, "ref": image.asset._ref}`,
  )
  const slide = resolved.find((s) => s.prop === prop)
  if (!slide) throw new Error(`no carousel slide for ${prop}`)
  void slideIndex

  const gallery = await query(`*[_type=="property" && slug.current=="${prop}"][0].gallery`)
  const target = only(gallery ?? [], match, `${prop} slide`)

  if (slide.ref === target.asset._ref) {
    console.log(`  carousel ${prop}: already the high-resolution photo, nothing to do`)
    continue
  }
  console.log(
    `  carousel ${prop}: ${widthOf(slide.ref)}px -> ${widthOf(target.asset._ref)}px  "${target.alt.slice(0, 50)}"`,
  )
  mutations.push({
    patch: {
      id: settings._id,
      // Keyed path, so this is unaffected by anyone reordering the carousel in the Studio.
      set: { [`heroCarousel[_key=="${slide._key}"].image.asset._ref`]: target.asset._ref },
    },
  })
}

if (!APPLY) {
  console.log(`\nDRY RUN — ${mutations.length} change(s) prepared, nothing written.`)
} else if (mutations.length === 0) {
  console.log('\nNothing to do.')
} else {
  await mutate(mutations)
  console.log(`\nApplied ${mutations.length} change(s).`)
}
