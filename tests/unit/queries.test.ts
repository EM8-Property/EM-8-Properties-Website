import { describe, it, expect } from 'vitest'
import {
  ALL_PROPERTIES_QUERY,
  PROPERTY_BY_SLUG_QUERY,
  POST_BY_SLUG_QUERY,
  TESTIMONIALS_QUERY,
  SITE_SETTINGS_QUERY,
} from '@/sanity/queries'

describe('GROQ queries', () => {
  it('orders properties by their order field', () => {
    expect(ALL_PROPERTIES_QUERY).toContain('order(order asc)')
  })

  it('a post resolves its related property slug for cross-linking', () => {
    expect(POST_BY_SLUG_QUERY).toContain('relatedProperty->')
  })

  it('looks properties up by slug parameter rather than interpolating one in', () => {
    expect(PROPERTY_BY_SLUG_QUERY).toContain('slug.current == $slug')
  })

  it('never publishes a testimonial without recorded consent', () => {
    // This is the only thing standing between an investor's name and the public site.
    expect(TESTIMONIALS_QUERY).toContain('consentOnRecord == true')
  })

  it('fetches the retail unit count everywhere the residential one is fetched', () => {
    // A card showing "90 units" for a 90-residential + 3-retail asset is the exact
    // ambiguity the split fields exist to remove. Selecting one without the other puts
    // it straight back.
    for (const q of [ALL_PROPERTIES_QUERY, PROPERTY_BY_SLUG_QUERY]) {
      expect(q).toContain('unitCount')
      expect(q).toContain('retailUnitCount')
    }
  })

  it('selects both leaves of the header button, not just the object', () => {
    // A projection naming only `headerCta` would type as `unknown` and give the header
    // nothing to render. Both fields are named, and named explicitly rather than through
    // a fragment, because typegen only discovers queries written that way.
    expect(SITE_SETTINGS_QUERY).toContain('headerCta { label, href }')
  })

  it('projects the realized-results heading, which no guard would miss for you', () => {
    /*
     * `dealStoryHeading` is optional by design, so it is not in REQUIRED_SITE_SETTINGS —
     * which means the layout's throw and the release gate both ignore it. Left out of the
     * projection it is `undefined` on every property page no matter what the Studio holds,
     * and the only symptom is a heading that never appears. This assertion is the whole of
     * the protection.
     */
    expect(SITE_SETTINGS_QUERY).toContain('dealStoryHeading')
  })
})
