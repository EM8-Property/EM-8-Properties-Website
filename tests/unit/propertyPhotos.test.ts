import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { stripComments } from '../shared/sourceScan'

const page = stripComments(
  readFileSync(resolve(__dirname, '../../src/app/(site)/portfolio/[slug]/page.tsx'), 'utf8'),
)

/*
 * Two facts about the property page that live in its JSX and are not observable from a
 * rendered component in isolation: which photograph is the hero, and how tall the hero is
 * on a phone.
 *
 * Scanned from source with comments stripped — the repo's idiom for a fact that ships but
 * cannot be rendered here — so that the docblocks which spell these numbers out in order
 * to explain them cannot satisfy the assertion themselves.
 */
describe('the property page hero and gallery', () => {
  it('passes the WHOLE gallery, so the hero can also be opened uncropped', () => {
    /*
     * This was `gallery.slice(1)` when the gallery shipped, to avoid showing the same
     * picture twice. Hunter asked for it back on 2026-09-16, and the reason is specific:
     * the hero is cropped to a 2.571 letterbox, so it is the one photograph on the page a
     * reader cannot see in full. Leaving it out of the grid removed the only place they
     * could open it uncropped.
     *
     * Pinned HERE, on the page, because the page is what decides both which image is the
     * hero and what the grid contains. `PropertyGallery` renders exactly what it is given
     * and holds no opinion, so if this moves into the component the two can disagree.
     *
     * Asserted with `includes` rather than regexes: these are literal source fragments and
     * the escaping buys nothing.
     */
    expect(page.includes('const hero = p.gallery?.[0]'), 'hero is no longer gallery[0]').toBe(true)
    expect(page.includes('const photos = p.gallery ?? []'), 'the whole gallery is no longer passed').toBe(true)
    expect(page.includes('photos={photos}'), 'PropertyGallery is not given the whole gallery').toBe(true)
    expect(page.includes('slice(1)'), 'the hero is being sliced out of the grid again').toBe(false)
  })

  /*
   * The hero crop is 1800x700 — an aspect of 2.571 — and `object-cover` magnifies it on
   * any box narrower than that shape.
   *
   * At the fixed `h-[340px]` this page carried until 2026-09-16, a 375px-wide phone got a
   * box of aspect 1.10, so the crop was HEIGHT-driven and painted 874 CSS px: 2.33x the
   * viewport, showing 43% of an already-wide slice. Hunter reported it as the property
   * photos being "super zoomed in" on a phone, the same complaint and the same cause as
   * the hero carousel a day earlier.
   *
   * Desktop needed no change and got none: above about 875px wide the box is wider than
   * the crop is shaped, so it is width-driven and already paints 1:1. That asymmetry is
   * why this is three heights rather than art direction with a second crop.
   */
  it('shortens the hero on a phone, where the letterbox crop is magnified', () => {
    const cls = /className="([^"]*object-cover[^"]*)"/.exec(page)?.[1] ?? ''
    expect(cls, 'no object-cover hero found on the property page').not.toBe('')

    const base = /(?:^|\s)h-\[(\d+)px\]/.exec(cls)
    expect(base, `no unprefixed height in "${cls}"`).not.toBeNull()
    const phoneHeight = Number(base![1])

    // 375 / 2.571 = 146px would be 1:1 and far too thin for a page header. The ceiling is
    // what keeps the magnification near 1.3x: 190 * 2.571 / 375 = 1.30.
    expect(phoneHeight).toBeLessThanOrEqual(200)
    const magnification = (phoneHeight * (1800 / 700)) / 375
    expect(magnification).toBeLessThan(1.5)

    // And it grows back, or this is just a smaller hero everywhere rather than a fix
    // aimed at the one place the fault exists.
    expect(cls).toMatch(/sm:h-\[\d+px\]/)
    expect(cls).toMatch(/lg:h-\[340px\]/)
  })

  it('routes the hero through the sharpening decision rather than straight to urlForImage', () => {
    // `urlForPhoto` sharpens only when Sanity is shrinking the source. The property heroes
    // are the most mixed set on the site — 620x426 at one end, 5568x3712 at the other — so
    // this is the page where the difference between the two is most visible.
    expect(page).toMatch(/urlForPhoto\(hero, 1800, 700\)/)
  })
})
