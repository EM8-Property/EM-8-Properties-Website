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
  it('passes the gallery MINUS the hero, so the same photograph is not shown twice', () => {
    /*
     * `gallery[0]` is the photograph at the top of the page. Handing the whole array to
     * the gallery would render it again in the grid below, with nothing to tell a reader
     * it is the same picture.
     *
     * The slice is pinned HERE, on the page, because the page is what decides which image
     * is the hero. `PropertyGallery` deliberately does not know that rule — it renders
     * exactly what it is given — so if this moves into the component the two can disagree.
     */
    expect(page).toMatch(/const hero = p\.gallery\?\.\[0\]/)
    expect(page).toMatch(/p\.gallery\?\.slice\(1\)/)
    expect(page).toMatch(/<PropertyGallery[\s\S]{0,120}photos=\{rest\}/)
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
