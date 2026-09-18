import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import { PageHero } from '@/components/layout/PageHero'

vi.mock('@/sanity/image', () => {
  /*
   * A chainable stub rather than a hand-spelled width().height().url() chain.
   *
   * The literal version broke the moment a call site chained differently: the gallery
   * overlay calls .width().url() with no .height(), and `urlForPhoto` adds .sharpen().
   * Returning the same object from every method means a mock cannot be wrong about the
   * ORDER of a chain it is not testing.
   */
  const chain: Record<string, unknown> = { url: () => 'https://cdn.test/x.jpg' }
  for (const m of ['width', 'height', 'auto', 'fit', 'sharpen']) chain[m] = () => chain
  return { urlForImage: () => chain, urlForPhoto: () => chain, sourceDimensions: () => null }
})

const SLIDES = [{ image: { alt: 'a' }, slug: 'one', propertyTitle: 'One' }]

const COPY = {
  eyebrow: 'Track Record',
  title: 'Realized results, not',
  titleAccent: 'projections',
  titleSuffix: '.',
  intro: 'Every deal we have taken full cycle.',
}

beforeEach(() => {
  cleanup()
  window.matchMedia = vi.fn().mockReturnValue({
    matches: false,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }) as unknown as typeof window.matchMedia
})

/**
 * The `h1` scale, pinned as whole class tokens rather than substrings.
 *
 * `expect(className).toContain('text-3xl')` passes on `sm:text-3xl`, so a scale that had
 * lost its unprefixed step entirely would still look green. That trap is already in the
 * README from PR 2b and it is the reason this file splits the class list and asserts
 * exact membership: `tokens` holds `sm:text-6xl` and `text-3xl` as separate strings, and
 * an unprefixed assertion cannot be satisfied by a prefixed class.
 *
 * Both branches are pinned. `PageHero` carries two `h1`s — the overlay on a photograph
 * and the plain block that renders when every slide's property reference is dangling —
 * and a type-scale change that touched only the visible one was a regression once.
 */
function h1Tokens(): string[] {
  return screen.getByRole('heading', { level: 1 }).className.split(/\s+/).filter(Boolean)
}

describe('the h1 type scale', () => {
  describe('on a photograph', () => {
    beforeEach(() => {
      render(<PageHero copy={COPY} slides={SLIDES} variant="screen" />)
    })

    /*
     * 36px, and the value is measured rather than specced. §7 asks for 40-60px on a
     * phone and contradicts itself about which; PR 3 left the homepage hero with 51px
     * of slack at 390x844 and none at the other four widths, and 40px costs 110px of
     * `h1` box against that 51px. 36px costs 53px — 2px of scroll. See the derivation
     * in `PageHero.tsx`.
     *
     * Pinned because it is the one number in this PR that a later reader would
     * reasonably assume came from the spec, and it did not.
     *
     * Re-costed when the hero was reworked against the reference shot, with the leading
     * free to move this time, and it held for a second reason: 36px is the last size at
     * which the longest headline on the site sets in three lines at 390px and 320px.
     * 37px is four, and the cliff is 40px of scroll for one point of type.
     */
    it('keeps the phone step unprefixed at the measured 36px', () => {
      const tokens = h1Tokens()
      expect(tokens).toContain('text-4xl')
      expect(tokens).not.toContain('sm:text-4xl')
      expect(tokens).not.toContain('text-3xl')
    })

    /*
     * The phone leading is 1.0, and it is pinned next to the size because it is what the
     * size decision bought. The reference hero the phone was measured against is not set
     * larger than this one relative to its viewport — 6.7% of viewport width against
     * 9.6% here — it is set tighter, and 1.1 was what the block actually had wrong.
     *
     * `sm:leading-[1.1]` is pinned with it: the six band pages' fold measurements at
     * 1280x720 were all taken at 1.1, and tightening there would move six pages nobody
     * measured to answer a question about a phone.
     */
    it('tightens the phone leading to 1.0 and leaves the desktop leading alone', () => {
      const tokens = h1Tokens()
      expect(tokens).toContain('leading-[1]')
      expect(tokens).toContain('sm:leading-[1.1]')
    })

    /*
     * `lg` is 64px rather than §7's 72px, and the reason is a ceiling the plan did not
     * cost: a band page's hero must stay shorter than the viewport, or the page's whole
     * content sits below the fold. Measured on `/about` at 1280x720 — CI's Desktop
     * Chrome — 72px gives an 845px band against a 720px screen and fails two E2E tests;
     * 64px gives 652px. See the table in `PageHero.tsx`.
     */
    it('goes to 60px at sm and the measured 64px at lg', () => {
      const tokens = h1Tokens()
      expect(tokens).toContain('sm:text-6xl')
      expect(tokens).toContain('lg:text-[64px]')
      expect(tokens).not.toContain('lg:text-7xl')
    })

    it('has dropped the old 36/48 steps rather than layering over them', () => {
      const tokens = h1Tokens()
      expect(tokens).not.toContain('sm:text-4xl')
      expect(tokens).not.toContain('lg:text-5xl')
    })
  })

  describe('on the no-photograph fallback', () => {
    beforeEach(() => {
      render(<PageHero copy={COPY} slides={[]} variant="screen" />)
    })

    it('renders the fallback h1, not the overlay one', () => {
      expect(h1Tokens()).toContain('text-ink')
    })

    it('carries the same sm and lg steps as the photograph branch', () => {
      const tokens = h1Tokens()
      expect(tokens).toContain('sm:text-6xl')
      expect(tokens).toContain('lg:text-[64px]')
    })

    /*
     * And the same phone leading. This branch renders when every slide's property
     * reference is dangling, so it is the page's only `h1` when it renders at all — a
     * leading that stayed at 1.08 here would mean the headline sets at a different
     * rhythm the day the CMS loses its photography. The `sm` step keeps this branch's
     * own 1.08, which was never measured on a phone either way.
     */
    it('carries the phone leading of the photograph branch too', () => {
      const tokens = h1Tokens()
      expect(tokens).toContain('text-4xl')
      expect(tokens).toContain('leading-[1]')
      expect(tokens).toContain('sm:leading-[1.08]')
    })

    it('has dropped its old sm:text-5xl step', () => {
      expect(h1Tokens()).not.toContain('sm:text-5xl')
    })
  })
})
