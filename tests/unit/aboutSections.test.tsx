import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { stripComments } from '../shared/sourceScan'
import { ABOUT_PAGE_QUERY, NAV_SECTIONS_QUERY } from '@/sanity/queries'
import { navDestinations } from '@/lib/navigation'

const about = stripComments(
  readFileSync(resolve(import.meta.dirname, '../../src/app/(site)/about/page.tsx'), 'utf8'),
).replace(/\r\n/g, '\n')

const layout = stripComments(
  readFileSync(resolve(import.meta.dirname, '../../src/app/(site)/layout.tsx'), 'utf8'),
).replace(/\r\n/g, '\n')

describe('/about carries the anchors the nav points at', () => {
  it('has an element for every #anchor in the nav tree', () => {
    /*
     * The failure this prevents is a menu link that scrolls nowhere — valid HTML, no
     * console error, no failing test, and a reader who taps "Our Team" and stays where
     * they were. The nav tree is the source of truth, so this derives the list from it
     * rather than restating it: a fourth anchor added there fails here until the page has
     * somewhere to land.
     */
    const anchors = navDestinations()
      .filter((href) => href.includes('#'))
      .map((href) => href.split('#')[1]!)
    expect(anchors.length, 'the nav has no anchors — this test has gone vacuous').toBeGreaterThan(0)

    for (const id of anchors) {
      expect(about, `/about has no id="${id}" for a nav link that points at it`).toContain(
        `id="${id}"`,
      )
    }
  })
})

describe('the Why EM8 section', () => {
  it('is projected with both of its leaves', () => {
    expect(ABOUT_PAGE_QUERY).toContain('whyEm8 { heading { eyebrow, title, intro }, body }')
  })

  it('renders only when both the title and the body are there', () => {
    /*
     * Guarded per leaf, because a `whyEm8` object with null fields is still a truthy
     * object and a shallow check would render an empty <h2> with a rule under it. §5: "a
     * half-filled one renders nothing rather than an empty <h2>".
     *
     * Both leaves, not either: a heading with no body is a title over blank space, and a
     * body with no heading is prose with no idea what it is.
     */
    expect(about).toMatch(/whyEm8\?\.heading\?\.title\s*&&\s*copy\.whyEm8\?\.body/)
  })
})

describe('the nav is told which optional sections exist', () => {
  it('asks the dataset in its own query, not in SITE_SETTINGS_QUERY', () => {
    /*
     * Deliberately separate. `requiredContent.test.ts` proves each required leaf is
     * projected by finding its path segments as substrings of SITE_SETTINGS_QUERY, and it
     * documents that a coincidental match elsewhere would satisfy it wrongly. Putting the
     * string "whyEm8" into that query for an unrelated reason manufactures that
     * coincidence for the very leaf it would hide — navLabels.whyEm8. So this lives apart,
     * and this assertion is what stops someone folding it in for the round trip.
     */
    expect(NAV_SECTIONS_QUERY).toContain('_id == "aboutPage"')
    expect(NAV_SECTIONS_QUERY).toContain('defined(whyEm8.body)')
  })

  it('is passed to the header by the layout', () => {
    expect(layout).toContain('NAV_SECTIONS_QUERY')
    expect(layout).toMatch(/sections=\{/)
  })

  it('treats a missing document as a missing section rather than crashing', () => {
    /*
     * `*[_id == "aboutPage"][0]{...}` is null when the document is absent, and the nav
     * renders on all 29 pages. A `!` here would take the whole site down over an optional
     * section on one page — so the fallback is "the section is not there", which is true.
     */
    expect(layout).toMatch(/whyEm8:\s*(?:!!)?navSections\?\./)
  })
})
