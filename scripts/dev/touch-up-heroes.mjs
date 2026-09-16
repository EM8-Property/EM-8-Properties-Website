/**
 * Clean up the property heroes that are too small for the box they are painted in.
 *
 * **This is conventional image processing, not AI.** It denoises, resamples with Lanczos and
 * applies an unsharp mask — what photo software did before upscaling models existed. It
 * removes the blockiness of a small file being stretched by the browser. It does **not**
 * invent detail, and it cannot make a 0.26MP photograph HD. Read `docs/image-resolution.md`
 * before assuming otherwise; the honest fix for these is a new photograph.
 *
 * What it does buy, and the reason it is worth doing at all: `fit=max` never upscales, so a
 * 620px source is delivered at 620px and the BROWSER stretches it to the 1425 CSS px the
 * hero is painted at, with whatever naive filter it uses. Resampling once, deliberately,
 * with denoise first and sharpening after beats that — and taking the asset past the
 * painted width means the browser stops resampling at all.
 *
 * Non-destructive. The touched-up file is uploaded as a NEW Sanity asset and `gallery[0]`'s
 * reference is repointed at it; the original asset is untouched and still in the dataset.
 * Every replacement prints the reference it replaced, so any of them can be put back with a
 * single patch. Nothing is deleted.
 *
 * Idempotent: a hero already at or above the painted width is skipped, so a second run is a
 * no-op rather than a second round of sharpening on an already-sharpened file. Sharpening
 * twice is exactly the artefact this is trying to avoid.
 *
 * Usage:
 *   node --env-file=.env.local scripts/dev/touch-up-heroes.mjs            # dry run
 *   node --env-file=.env.local scripts/dev/touch-up-heroes.mjs --apply
 */

import sharp from 'sharp'

const PROJECT = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID
const DATASET = process.env.NEXT_PUBLIC_SANITY_DATASET
const TOKEN = process.env.SANITY_API_WRITE_TOKEN
const API = `https://${PROJECT}.api.sanity.io/v2024-01-01`
const APPLY = process.argv.includes('--apply')

if (!TOKEN) throw new Error('SANITY_API_WRITE_TOKEN missing — is --env-file=.env.local set?')

/**
 * The width the property hero is painted at on a desktop, and therefore the line between
 * "the browser is stretching this" and "the browser is shrinking this". Derived in
 * `docs/image-resolution.md`: the hero box is the full viewport width and the crop is wider
 * than it is tall, so the paint is width-driven at 1425 CSS px on a 1440 screen.
 */
const PAINTED = 1425

/**
 * The width to resample to. The hero asks Sanity for an 1800px crop, so anything at or above
 * that is served without further resizing. Going higher would only add bytes: there is no
 * detail above the source to preserve.
 */
const TARGET = 1800

/**
 * Deliberately gentle, and in this order.
 *
 * `median(3)` first, because sharpening before denoising amplifies exactly the sensor noise
 * and JPEG blocking that make these look grainy — which is the measured reason
 * `urlForPhoto` refuses to sharpen upscaled images at serve time. Denoise, then resample,
 * then sharpen is the order that makes sharpening a correction rather than a magnifier.
 */
const DENOISE = 3
const SHARPEN = { sigma: 1.2, m1: 0.5, m2: 2.5 }
const QUALITY = 92

const dims = (ref) => {
  const m = /^image-([a-f0-9]+)-(\d+)x(\d+)-(\w+)$/.exec(ref ?? '')
  return m ? { hash: m[1], w: Number(m[2]), h: Number(m[3]), ext: m[4] } : null
}

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

const properties = await query(
  `*[_type=="property" && defined(gallery[0])]{_id, "slug": slug.current, status, "key": gallery[0]._key, "alt": gallery[0].alt, "ref": gallery[0].asset._ref}`,
)

let changed = 0
for (const p of properties) {
  const d = dims(p.ref)
  if (!d) continue
  if (d.w >= PAINTED) continue // already big enough; nothing to correct

  const src = `https://cdn.sanity.io/images/${PROJECT}/${DATASET}/${d.hash}-${d.w}x${d.h}.${d.ext}`
  const original = Buffer.from(await (await fetch(src)).arrayBuffer())

  const out = await sharp(original)
    .median(DENOISE)
    .resize(TARGET, null, { kernel: 'lanczos3' })
    .sharpen(SHARPEN)
    .jpeg({ quality: QUALITY })
    .toBuffer()

  const factor = (TARGET / d.w).toFixed(2)
  console.log(
    `  ${p.slug.padEnd(42)} ${d.w}x${d.h} -> ${TARGET}px  (${factor}x)  ` +
      `${Math.round(original.length / 1024)}KB -> ${Math.round(out.length / 1024)}KB`,
  )
  console.log(`      replaces ${p.ref}`)

  if (!APPLY) continue

  const filename = `${p.slug}-hero-resampled-${TARGET}.jpg`
  const up = await fetch(
    `${API}/assets/images/${DATASET}?filename=${encodeURIComponent(filename)}`,
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'image/jpeg' },
      body: out,
    },
  )
  const uj = await up.json()
  if (!up.ok || uj.error) throw new Error(`upload failed for ${p.slug}: ${JSON.stringify(uj)}`)

  await mutate([
    {
      patch: {
        id: p._id,
        // Keyed path, so this survives anyone reordering the gallery in the Studio between
        // the read above and this write.
        set: { [`gallery[_key=="${p.key}"].asset._ref`]: uj.document._id },
      },
    },
  ])
  changed++
  console.log(`      -> ${uj.document._id}`)
}

console.log(
  APPLY
    ? `\nReplaced ${changed} hero${changed === 1 ? '' : 'es'}. Originals are still in the dataset; the reference each one replaced is printed above.`
    : `\nDRY RUN — nothing written.`,
)
