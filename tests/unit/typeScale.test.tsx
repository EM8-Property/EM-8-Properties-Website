import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import { PageHero } from '@/components/layout/PageHero'

vi.mock('@/sanity/image', () => ({
  urlForImage: () => ({
    width: () => ({ height: () => ({ url: () => 'https://cdn.test/x.jpg' }) }),
  }),
}))

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
     */
    it('keeps the phone step unprefixed at the measured 36px', () => {
      const tokens = h1Tokens()
      expect(tokens).toContain('text-4xl')
      expect(tokens).not.toContain('sm:text-4xl')
      expect(tokens).not.toContain('text-3xl')
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

    it('has dropped its old sm:text-5xl step', () => {
      expect(h1Tokens()).not.toContain('sm:text-5xl')
    })
  })
})
