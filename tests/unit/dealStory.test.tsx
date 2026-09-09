import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { DealStory } from '@/components/property/DealStory'
import { stripComments } from '../shared/sourceScan'

const propertyPage = stripComments(
  readFileSync(
    resolve(import.meta.dirname, '../../src/app/(site)/portfolio/[slug]/page.tsx'),
    'utf8',
  ),
).replace(/\r\n/g, '\n')

const PHYSICAL = /\b(?:[a-z0-9-]+:)*-?(?:ml|mr|pl|pr|border-l|border-r|text-left|text-right)-?\b/
const PROMISSORY = /\b(guaranteed|will return|assured|risk-free|projected|targeted)\b/i

const story = {
  acquired: '2016 — below replacement cost',
  executed: 'Interior modernization',
  exited: 'Full-cycle sale',
  equityMultiple: '2.1x',
  exitYear: 2019,
}

describe('DealStory', () => {
  it('tells the deal in acquired, executed, exited order', () => {
    /*
     * h3, not h4. On /track-record this sat inside a card whose title was a link rather
     * than a heading, so h4 skipped a level from the page's h1 and nothing minded. On the
     * property page it sits directly under an h2, so h3 is the level that follows it —
     * heading order is an accessibility requirement and one of the few Lighthouse actually
     * audits.
     */
    render(<DealStory story={story} />)
    const headings = screen.getAllByRole('heading', { level: 3 }).map((h) => h.textContent)
    expect(headings).toEqual(['Acquired', 'Executed', 'Exited'])
  })

  it('labels the multiple as realized, never as a projection', () => {
    render(<DealStory story={story} />)
    expect(screen.getByText(/Realized Equity Multiple/i)).toBeDefined()
  })

  it('uses no forward-looking language on a closed deal', () => {
    // These are results that happened. Calling one "projected" or "targeted" here would
    // misstate a realized figure.
    const { container } = render(<DealStory story={story} />)
    expect(container.textContent ?? '').not.toMatch(PROMISSORY)
  })

  it('omits the multiple block entirely when no multiple is recorded', () => {
    render(<DealStory story={{ acquired: 'a', executed: 'b', exited: 'c' }} />)
    expect(screen.queryByText(/Realized Equity Multiple/i)).toBeNull()
  })

  it('uses no physical-direction utilities', () => {
    const { container } = render(<DealStory story={story} />)
    expect(container.innerHTML).not.toMatch(PHYSICAL)
  })
})

describe('where the deal story renders', () => {
  it('is on the canonical property page', () => {
    /*
     * It used to be on /track-record and nowhere else, which made deleting that route a
     * content deletion rather than a route deletion: PROPERTY_BY_SLUG_QUERY already
     * selected `dealStory` and the property page never rendered it, so the 1.99x and
     * 1.37x multiples would have left the site with the page. §8: one import and one line,
     * because the data is already fetched.
     */
    expect(propertyPage).toContain('<DealStory')
    expect(propertyPage).toMatch(/from '@\/components\/property\/DealStory'/)
  })

  it('is gated on the deal actually being closed', () => {
    /*
     * §5 asks for `status == 'sold'`, and the gate is a compliance matter rather than a
     * cosmetic one. DealStory's labels say "Realized", so rendering it for a property that
     * has not exited would describe an open position as a completed result — on the same
     * page where OfferingBlock carefully labels every figure as targeted. The status check
     * is what keeps those two vocabularies apart.
     *
     * And `dealStory` itself is checked too: a sold property whose narrative has not been
     * written yet would otherwise render an empty three-column grid with a rule above it.
     */
    expect(propertyPage).toMatch(/status === 'sold'/)
    expect(propertyPage).toMatch(/p\.dealStory\s*&&/)
  })

  it('sits under a heading from the CMS, at the level below it', () => {
    /*
     * The page's other two blocks — "The business plan" and "Location" — are h2s under the
     * property's h1, so a block of content with no heading between them reads as a
     * continuation of the one above it.
     *
     * And the words come from `siteSettings.dealStoryHeading`, not from this file. Hunter's
     * instruction of 2026-09-08: every string this PR writes has to be editable in the
     * Studio, and this was the only one that would not have been. Asserted as the absence
     * of the literal as well as the presence of the field, because reading the field would
     * pass just as happily against a component that also hardcoded a fallback.
     */
    // No `?.` inside the element: the `settings?.dealStoryHeading &&` guard wrapping it is
    // what makes the inner access safe, so the JSX renders `{settings.dealStoryHeading}`.
    expect(propertyPage).toMatch(/<h2[^>]*>\s*\{settings\.dealStoryHeading\}/)
    expect(propertyPage).not.toContain('Realized results')
  })

  it('renders the figures with no heading when that field is blank', () => {
    /*
     * The field is optional, so this is a state an editor can produce in one keystroke —
     * and it is how these figures looked on /track-record, which had no heading above them
     * at all. So the guard is on the heading alone: clearing the words must not take the
     * 1.99x multiple off the site with them.
     */
    expect(propertyPage).toMatch(/settings\?\.dealStoryHeading\s*&&/)
  })
})
