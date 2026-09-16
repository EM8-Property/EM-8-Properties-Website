/**
 * Upload a folder of photographs per property and append them to that property's gallery.
 *
 * Written for the 2026-09-16 batch: Hunter exported the "Advantage Photos" folder from each
 * property's Drive folder as `EM8 - Images/<Property>/`, and the site had no way to show
 * more than one photograph until `PropertyGallery` shipped.
 *
 * Two properties of this script matter more than the upload itself:
 *
 *   - **It is idempotent.** Sanity deduplicates assets by content hash, so re-uploading the
 *     same file returns the same asset id — but the gallery is an ARRAY, and appending
 *     again would add a second entry pointing at the same picture. Every run reads the
 *     current gallery first and skips any asset already referenced. Run it twice and the
 *     second run reports zero added.
 *   - **It fails closed on the mapping.** A folder whose name does not resolve to exactly
 *     one property is an error, not a guess. The 2026-09-15 handover records a property
 *     being mapped from its name alone and being wrong (Knox/Kilpatrick), which is the
 *     kind of mistake that puts one building's photographs on another building's page.
 *
 * Usage:
 *   node --env-file=.env.local scripts/dev/upload-gallery.mjs --dir "<path>" [--dry-run]
 *   node --env-file=.env.local scripts/dev/upload-gallery.mjs --dir "<path>" --only "382 Penn"
 *
 * `--dry-run` resolves the mapping, reads every gallery and reports exactly what it would
 * upload, without writing anything. Always run it first.
 */

import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, extname, basename } from 'node:path'

const PROJECT = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID
const DATASET = process.env.NEXT_PUBLIC_SANITY_DATASET
const TOKEN = process.env.SANITY_API_WRITE_TOKEN
const API = `https://${PROJECT}.api.sanity.io/v2024-01-01`

/**
 * Folder name → property slug.
 *
 * Spelled out rather than fuzzy-matched. Every one of these was confirmed by walking the
 * Drive tree to the property-level folder, not inferred from the words: "One Fifty Seven"
 * is the `Oak Forest 1 - 157 & Cicero` folder, "Woodland Trails" is
 * `Woodland Trail Apartments (Reverb)`, and "382 Penn" is `Gentry Manor - 382 Pennsylvania
 * Ave, Glen Ellyn, IL`. None of those three is guessable from the folder name alone.
 *
 * Waverly Creek is deliberately absent: Hunter added the photographs he wanted there
 * himself on 2026-09-16 and asked for it to be left alone. An unmapped folder is skipped
 * with a message rather than treated as an error, so the export can stay as it is.
 */
const FOLDER_TO_SLUG = {
  '382 Penn': '382-penn-apartments',
  'Oak Forest K': 'oak-forest-k',
  'One Fifty Seven': '157-and-cicero',
  'Park Townhomes': 'park-townhomes-highland-park',
  'The Boulevard': 'boulevard-at-central-station',
  'Woodland Trails': 'reverb-woodland-trails',
}

const SKIP_FOLDERS = new Set(['Waverly Creek'])

const MIME = { '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png' }

function arg(name, fallback = null) {
  const i = process.argv.indexOf(name)
  return i === -1 ? fallback : process.argv[i + 1]
}
const DRY = process.argv.includes('--dry-run')
const ONLY = arg('--only')
const DIR = arg('--dir')

if (!DIR) throw new Error('--dir is required')
if (!TOKEN) throw new Error('SANITY_API_WRITE_TOKEN missing — is --env-file=.env.local set?')

async function query(groq, params = {}) {
  const u = new URL(`${API}/data/query/${DATASET}`)
  u.searchParams.set('query', groq)
  for (const [k, v] of Object.entries(params)) u.searchParams.set(`$${k}`, JSON.stringify(v))
  const r = await fetch(u, { headers: { Authorization: `Bearer ${TOKEN}` } })
  const j = await r.json()
  if (j.error) throw new Error(`query failed: ${JSON.stringify(j.error)}`)
  return j.result
}

async function uploadAsset(file, mime) {
  const u = `${API}/assets/images/${DATASET}?filename=${encodeURIComponent(basename(file))}`
  const r = await fetch(u, {
    method: 'POST',
    headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': mime },
    body: readFileSync(file),
  })
  const j = await r.json()
  if (!r.ok || j.error) throw new Error(`upload failed for ${file}: ${JSON.stringify(j)}`)
  return j.document._id
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

/**
 * Alt text, read from `<folder>/alt.json` when present: `{ "<filename>": "<alt>" }`.
 *
 * The schema requires alt on every gallery image, and these files are named
 * `original - 2026-09-11T133009.550.png`, so there is nothing in the export to derive a
 * description from. The fallback names the property and numbers the photograph, which is
 * accurate and useless — it is there so a missing line in alt.json cannot fail a build, not
 * because it is good enough. `PropertyGallery` uses alt as the button's accessible name, so
 * a gallery that falls back everywhere announces fifteen identical controls.
 */
function altFor(altMap, filename, propertyTitle, indexInGallery) {
  const written = altMap[filename]?.trim()
  if (written) return written
  return `${propertyTitle}, photograph ${indexInGallery}`
}

const key = () => Math.random().toString(36).slice(2, 14)

const folders = readdirSync(DIR).filter((f) => statSync(join(DIR, f)).isDirectory())
let totalAdded = 0
let totalSkipped = 0

for (const folder of folders) {
  if (SKIP_FOLDERS.has(folder)) {
    console.log(`\n== ${folder}: skipped (Hunter curated this one himself)`)
    continue
  }
  if (ONLY && folder !== ONLY) continue

  const slug = FOLDER_TO_SLUG[folder]
  if (!slug) {
    console.log(`\n== ${folder}: NO MAPPING — skipped. Add it to FOLDER_TO_SLUG if it belongs.`)
    continue
  }

  const property = await query(
    `*[_type=="property" && slug.current==$slug][0]{_id, title, "refs": gallery[].asset._ref}`,
    { slug },
  )
  if (!property) throw new Error(`no property for slug "${slug}" (folder "${folder}")`)

  const existing = new Set(property.refs ?? [])
  const files = readdirSync(join(DIR, folder))
    .filter((f) => MIME[extname(f).toLowerCase()])
    .sort()

  let altMap = {}
  try {
    altMap = JSON.parse(readFileSync(join(DIR, folder, 'alt.json'), 'utf8'))
  } catch {
    // No alt.json for this folder; every image falls back. Reported below.
  }
  const missingAlt = files.filter((f) => !altMap[f]?.trim()).length

  console.log(
    `\n== ${folder} -> ${slug} (${property.title})` +
      `\n   ${files.length} files, ${existing.size} already in the gallery` +
      (missingAlt ? `\n   ${missingAlt} of ${files.length} have NO written alt text` : ''),
  )

  const items = []
  for (const f of files) {
    const full = join(DIR, folder, f)
    const mime = MIME[extname(f).toLowerCase()]

    if (DRY) {
      const mb = (statSync(full).size / 1048576).toFixed(1)
      console.log(`   would upload ${f} (${mb}MB)`)
      continue
    }

    const assetId = await uploadAsset(full, mime)
    if (existing.has(assetId)) {
      totalSkipped++
      console.log(`   already present, skipped: ${f}`)
      continue
    }
    existing.add(assetId)
    items.push({
      _type: 'image',
      _key: key(),
      asset: { _type: 'reference', _ref: assetId },
      alt: altFor(altMap, f, property.title, existing.size),
    })
    console.log(`   uploaded ${f} -> ${assetId}`)
  }

  if (!DRY && items.length) {
    await mutate([
      {
        patch: {
          id: property._id,
          // `setIfMissing` first: a property with no gallery at all has no array to append
          // to, and `insert` on a missing key is an error rather than a create.
          setIfMissing: { gallery: [] },
        },
      },
      { patch: { id: property._id, insert: { after: 'gallery[-1]', items } } },
    ])
    totalAdded += items.length
    console.log(`   appended ${items.length} to ${slug}`)
  }
}

console.log(
  `\n${DRY ? 'DRY RUN — nothing written.' : `Done. Added ${totalAdded}, skipped ${totalSkipped} already present.`}`,
)
