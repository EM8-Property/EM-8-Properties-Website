import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { stripComments } from '../shared/sourceScan'

/**
 * `/portfolio` is an async server component that fetches from Sanity, so it is asserted
 * against its source rather than rendered -- the same approach `strategyPage.test.tsx`,
 * `aboutSections.test.tsx` and `ctaCoverage.test.ts` already take for page-level structure
 * on this codebase's other server-component pages.
 *
 * `CurrentOfferings`'s own render contract (heading/offerings gating, wrapper ownership)
 * is covered directly in `currentOfferings.test.tsx`; this file covers only what lives at
 * the call site: order and the absence of a duplicate gate.
 */
const source = stripComments(
  readFileSync(resolve(import.meta.dirname, '../../src/app/(site)/portfolio/page.tsx'), 'utf8'),
).replace(/\r\n/g, '\n')

describe('the portfolio page', () => {
  it('renders hero, offerings, filters and cta in spec §6 order', () => {
    // §6: Current Offerings first -- it is the actionable content and the reason a reader
    // arriving from "Invest With Us" is on this page -- then the filters directly above
    // the grid they belong to, then the closing call to action.
    const heroAt = source.indexOf('<PageHero')
    const offeringsAt = source.indexOf('<CurrentOfferings')
    const filterAt = source.indexOf('<PortfolioFilter')
    const ctaAt = source.indexOf('<CtaBand')

    expect(heroAt, 'no <PageHero').toBeGreaterThan(-1)
    expect(offeringsAt, 'no <CurrentOfferings').toBeGreaterThan(-1)
    expect(filterAt, 'no <PortfolioFilter').toBeGreaterThan(-1)
    expect(ctaAt, 'no <CtaBand').toBeGreaterThan(-1)

    expect(heroAt).toBeLessThan(offeringsAt)
    expect(offeringsAt).toBeLessThan(filterAt)
    expect(filterAt).toBeLessThan(ctaAt)
  })

  // Finding 1 fix: this call site used to re-implement CurrentOfferings' own emptiness
  // contract with `offerings.length > 0 && copy.offeringsHeading?.title` wrapped around a
  // wrapper `<div>`, duplicating a rule the component already enforces internally. That
  // guard, and the wrapper it protected, are both gone -- CurrentOfferings owns its own
  // measure wrapper and renders null for either empty condition, so the call site has
  // nothing left to gate.
  it('renders Current Offerings unconditionally, leaving emptiness to the component', () => {
    expect(source).not.toContain('offerings.length > 0 &&')
    expect(source).not.toMatch(/&&\s*\(?\s*<CurrentOfferings/)

    // The component now owns the measure wrapper -- the call site must not reintroduce
    // one immediately around it the way it used to
    // (`<div className="mx-auto max-w-[1200px] px-6 pt-14"><CurrentOfferings … /></div>`).
    expect(source).not.toMatch(/<div[^>]*>\s*<CurrentOfferings/)
  })

  it('passes the offerings heading and the fetched offerings through', () => {
    expect(source).toMatch(/<CurrentOfferings[\s\S]*?heading=\{copy\.offeringsHeading\}/)
    expect(source).toMatch(/<CurrentOfferings[\s\S]*?offerings=\{offerings/)
  })
})
