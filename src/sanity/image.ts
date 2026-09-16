// Named export: the default export is deprecated and warns four times per build.
import { createImageUrlBuilder } from '@sanity/image-url'

/**
 * Built from plain config rather than from `sanityClient`.
 *
 * This module is reached from client components (PropertyCard and PostCard are rendered
 * inside the 'use client' filters), so importing the read client here would compile it
 * into the browser bundle. That is harmless while the client is tokenless — but it turns
 * "give the read client a token" into "ship a Sanity token to every visitor", which is
 * exactly the trap waiting for whoever makes the dataset private. Severing the edge now
 * keeps `sanity/client.ts` server-only.
 *
 * Only the two NEXT_PUBLIC_ identifiers are used, and both are non-secret by design.
 */
const builder = createImageUrlBuilder({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID!,
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET!,
})

/**
 * Always call with an explicit width. The old site's central performance failure was
 * shipping 10-20MB camera originals; routing every image through this builder is what
 * replaces them with a resized, auto-formatted asset from Sanity's CDN.
 */
export function urlForImage(source: unknown) {
  return builder.image(source as never).auto('format').fit('max')
}

/**
 * The source pixel dimensions, read out of the asset reference.
 *
 * Sanity encodes them in the `_ref` itself — `image-<sha>-<W>x<H>-<ext>` — so this is
 * free. The alternative is `asset->metadata.dimensions`, which is a join every query
 * would have to carry and a field every projection would have to remember.
 *
 * Returns null for anything that is not a resolvable reference: a dereferenced asset, a
 * hotspot-only object, or an upload still in flight. Every caller treats null as "assume
 * nothing", which is the only safe default — guessing large would sharpen a small photo.
 */
export function sourceDimensions(source: unknown): { width: number; height: number } | null {
  const ref = (source as { asset?: { _ref?: string } } | null)?.asset?._ref
  const m = /-(\d+)x(\d+)-/.exec(ref ?? '')
  return m ? { width: Number(m[1]), height: Number(m[2]) } : null
}

/**
 * How hard to sharpen an image that Sanity is shrinking. 0-100 in Sanity's API.
 *
 * 15 is deliberately mild. Resampling a 5472px photograph down to 1800 throws away two
 * thirds of its linear detail and leaves edges soft — a light unsharp mask is the standard
 * correction for that, and it is the same reason every photo tool sharpens after a resize.
 * Past about 25 the halos start showing on rooflines and window frames, which is most of
 * what these photographs are.
 */
const SHARPEN = 15

/**
 * `urlForImage`, plus sharpening **only when the crop is actually being downscaled**.
 *
 * Audited across the whole dataset on 2026-09-16, and the site splits almost exactly in
 * half. Measured as the ratio of painted CSS pixels to the bitmap Sanity can actually
 * deliver:
 *
 *   /portfolio/antioch-industrial      620x426 source, served 620 across 1425px   2.30x
 *   /portfolio/knox-in-oak-forest      768x576 source, served 768 across 1425px   1.86x
 *   …ten more between 1.17x and 1.53x
 *   /portfolio/burbank-manor           5472x3648 source, served 1800              0.79x
 *   homepage carousel slide 7          5568x3712 source, served 1600              0.89x
 *
 * Those two groups want opposite treatment, which is the entire reason this function
 * exists rather than a `.sharpen()` added to `urlForImage`. **`fit=max` never upscales**,
 * so when the source is smaller than the crop asked for, Sanity returns the source at its
 * own size and the BROWSER stretches it. Sharpening that is actively harmful: there is no
 * detail to recover and an unsharp mask amplifies the sensor noise and the JPEG blocking
 * that are already why it looks grainy.
 *
 * So the test is not "is the source big" but "is Sanity shrinking it", which is the
 * condition under which sharpening is a correction rather than a distortion. Below that
 * line the honest fix is a better photograph, and no parameter substitutes for one — see
 * `docs/image-resolution.md` for the ranked list.
 *
 * It also means this self-corrects. Re-upload Antioch Industrial at 3000px and it crosses
 * the line on the next build with nothing to change here.
 *
 * `targetHeight` is optional but should be passed wherever `.height()` is, and the reason
 * is a case that source width alone gets wrong. What Sanity can deliver is bounded by the
 * CROP, not by the source: a 4000x500 panorama cropped to 1800x700 is limited by its
 * height, so the crop is only 1286px wide and the result is upscaled — while its 4000px
 * width would have passed a width-only test and earned it sharpening it must not have.
 * No asset in the dataset is shaped like that today. A property site is exactly where a
 * panorama eventually gets uploaded.
 *
 * @param targetWidth  the width handed to `.width()` — the crop Sanity is asked for.
 * @param targetHeight the height handed to `.height()`, where the caller sets one.
 */
export function urlForPhoto(source: unknown, targetWidth: number, targetHeight?: number) {
  const base = urlForImage(source)
  const src = sourceDimensions(source)
  if (!src) return base

  // The widest crop of this source at the requested aspect, which is what bounds delivery.
  const cropWidth = targetHeight
    ? Math.min(src.width, src.height * (targetWidth / targetHeight))
    : src.width

  return cropWidth > targetWidth ? base.sharpen(SHARPEN) : base
}
