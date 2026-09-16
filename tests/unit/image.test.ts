import { describe, it, expect } from 'vitest'
import { urlForImage, urlForPhoto, sourceDimensions } from '@/sanity/image'

const ref = { asset: { _ref: 'image-abc123-2000x1500-jpg' } }

/** `image-<sha>-<W>x<H>-<ext>`, which is where Sanity records the source dimensions. */
const asset = (w: number, h: number) => ({ asset: { _ref: `image-abc123-${w}x${h}-jpg` } })

describe('urlForImage', () => {
  it('serves a resized, auto-format image rather than the original', () => {
    // The old site shipped 10-20MB camera originals. This is the guard against that:
    // every image goes through Sanity's pipeline with an explicit width.
    const url = urlForImage(ref).width(800).url()
    expect(url).toContain('w=800')
    expect(url).toContain('auto=format')
  })

  it('points at the Sanity CDN, which next.config must allowlist', () => {
    expect(urlForImage(ref).width(100).url()).toContain('cdn.sanity.io')
  })
})

describe('sourceDimensions', () => {
  it('reads the source size out of the asset reference rather than joining on it', () => {
    // Free, because Sanity encodes it in the _ref. The alternative is
    // `asset->metadata.dimensions`, a join every query would have to carry.
    expect(sourceDimensions(asset(4160, 3117))).toEqual({ width: 4160, height: 3117 })
  })

  it('returns null for anything it cannot read, which callers treat as "assume nothing"', () => {
    // A dereferenced asset, a hotspot-only object, an upload in flight. Guessing large
    // here would sharpen a small photograph, which is the one outcome to avoid.
    for (const bad of [null, undefined, {}, { asset: {} }, { asset: { _ref: 'file-abc-pdf' } }]) {
      expect(sourceDimensions(bad)).toBeNull()
    }
  })
})

/*
 * Sharpening is a correction for RESAMPLING, and applying it to an upscaled photograph is
 * actively harmful — there is no detail to recover and an unsharp mask amplifies the noise
 * and JPEG blocking that are already why it looks grainy.
 *
 * That is not a stylistic preference here. Audited across the dataset on 2026-09-16, the
 * site splits nearly in half: twelve images are served smaller than they are painted (the
 * worst, /portfolio/antioch-industrial, is a 620x426 original stretched across 1425 CSS px)
 * and twelve are downscaled from originals up to 5568px. The two groups want opposite
 * treatment, which is why this is a separate function rather than `.sharpen()` added to
 * `urlForImage`.
 */
describe('urlForPhoto', () => {
  it('sharpens when Sanity is shrinking the source', () => {
    // 5472px original, 1800px crop. This is the case sharpening exists for.
    expect(urlForPhoto(asset(5472, 3648), 1800, 700).width(1800).height(700).url()).toContain(
      'sharp=',
    )
  })

  it('does NOT sharpen when the source is smaller than the crop asked for', () => {
    // `fit=max` never upscales, so Sanity returns 620px and the BROWSER stretches it.
    // Sharpening here makes the grain worse, which is the whole point of the split.
    const url = urlForPhoto(asset(620, 426), 1800, 700).width(1800).height(700).url()
    expect(url).not.toContain('sharp=')
  })

  it('measures the CROP, not the source width, so a panorama is not mistaken for a big photo', () => {
    /*
     * The case a width-only test gets wrong, and the reason `targetHeight` is a parameter.
     *
     * A 4000x500 panorama cropped to 1800x700 is limited by its HEIGHT: the widest crop at
     * that aspect is 500 * (1800/700) = 1286px, so the result is upscaled and must not be
     * sharpened — even though 4000 is comfortably wider than 1800.
     *
     * No asset in the dataset is shaped like this today. A property site is exactly where
     * a panorama eventually gets uploaded.
     */
    expect(urlForPhoto(asset(4000, 500), 1800, 700).width(1800).height(700).url()).not.toContain(
      'sharp=',
    )
    // Same source, a crop it can actually fill: now it is a downscale and is sharpened.
    expect(urlForPhoto(asset(4000, 500), 1000, 125).width(1000).height(125).url()).toContain(
      'sharp=',
    )
  })

  /*
   * There is deliberately no test for "an unreadable ref is not sharpened".
   *
   * It cannot be reached: `@sanity/image-url` throws `Malformed asset _ref` from `.url()`
   * on anything it cannot parse, which is the builder's own behaviour and predates this
   * function. So the null branch in `urlForPhoto` protects a call that would have thrown
   * either way. It stays because failing closed is still the right shape for the function,
   * and `sourceDimensions` covers the parsing itself above.
   */

  it('self-corrects when a better original is uploaded', () => {
    // The same property, re-shot. Nothing in the code changes; it crosses the line on the
    // next build. This is why the rule is computed rather than a hand-maintained list.
    const target = 1800
    expect(urlForPhoto(asset(620, 426), target, 700).width(target).url()).not.toContain('sharp=')
    expect(urlForPhoto(asset(3000, 2000), target, 700).width(target).url()).toContain('sharp=')
  })

  it('still resizes and auto-formats, because it is urlForImage plus a decision', () => {
    const url = urlForPhoto(asset(4000, 3000), 800, 600).width(800).height(600).url()
    expect(url).toContain('w=800')
    expect(url).toContain('auto=format')
    expect(url).toContain('fit=max')
  })
})
