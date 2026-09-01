import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import { PageHero } from '@/components/layout/PageHero'
import type { CarouselSlide } from '@/components/layout/HeroCarousel'
import { PAGE_COPY } from '../../scripts/content/em8-content.mjs'

const PROMISSORY = /(guaranteed|will return|assured|risk-free|no risk)/i

vi.mock('@/sanity/image', () => ({
  urlForImage: () => ({
    width: () => ({ height: () => ({ url: () => 'https://cdn.test/x.jpg' }) }),
  }),
}))

beforeEach(() => {
  cleanup()
  window.matchMedia = vi.fn().mockReturnValue({
    matches: false,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }) as unknown as typeof window.matchMedia
})

/**
 * Rendered with the copy that actually ships, not with a fixture.
 *
 * The hero words moved into the CMS (plan revision D4), so asserting against a stand-in
 * would prove nothing about the live page. These render the seeded payload — the same
 * strings the migration writes — so the compliance and no-invented-figure guarantees still
 * cover the real hero rather than a test double.
 */
/* eslint-disable @typescript-eslint/no-explicit-any -- plain ESM data module */
const hero = (PAGE_COPY as any).homePage.hero

/**
 * Both render paths, every time.
 *
 * `PageHero` has two: the photograph with the copy laid over it, and a plain block for
 * when no slide has a usable property reference. Every test in this file used to pass
 * `slides={[]}`, which is the *fallback* — so the branch that actually ships was
 * unrendered by the whole suite, and the two guards below scanned markup no visitor sees.
 * Someone could have pasted an invented multiple into the overlay headline and every test
 * would have stayed green.
 *
 * Running each assertion over both closes that, and it also stops the two branches
 * drifting: they duplicate the copy markup by necessity, and this is what keeps them
 * honest about rendering the same words.
 */
const SLIDES: CarouselSlide[] = [{ image: { alt: 'a' }, slug: 'one', propertyTitle: 'One' }]

const PATHS: [string, CarouselSlide[]][] = [
  ['with photography — the path that ships', SLIDES],
  ['without photography — the fallback block', []],
]

describe.each(PATHS)('PageHero %s', (_label, slides) => {
  it('leads with the purpose, not the balance sheet', () => {
    render(<PageHero copy={hero} slides={slides} />)
    const h1 = screen.getByRole('heading', { level: 1 })
    expect(h1.textContent).toMatch(/choose to live in/i)
    expect(h1.textContent).not.toMatch(/\$100M/)
  })

  it('states the TOD thesis in the subhead', () => {
    render(<PageHero copy={hero} slides={slides} />)
    expect(screen.getByText(/walking distance of Metra/i)).toBeDefined()
  })

  it('offers both calls to action', () => {
    render(<PageHero copy={hero} slides={slides} />)
    expect(screen.getByRole('link', { name: /view portfolio/i })).toBeDefined()
    expect(screen.getByRole('link', { name: /read our thinking/i })).toBeDefined()
  })

  it('uses no promissory return language', () => {
    const { container } = render(<PageHero copy={hero} slides={slides} />)
    expect(container.textContent ?? '').not.toMatch(PROMISSORY)
  })

  it('carries no invented figure in the hero', () => {
    // Spec §9: no placeholder number ships. The hero is the most likely place for one
    // to be hardcoded and forgotten.
    const { container } = render(<PageHero copy={hero} slides={slides} />)
    expect(container.textContent ?? '').not.toMatch(/\d+(\.\d+)?x\b|\$\d|\d+%/)
  })

  it('uses no physical-direction utilities', () => {
    // Non-negotiable #2, checked on both branches: the overlay was written second and is
    // the one a `text-left` would most plausibly creep into.
    const { container } = render(<PageHero copy={hero} slides={slides} />)
    expect(container.innerHTML).not.toMatch(
      /\b(?:[a-z0-9-]+:)*-?(?:ml|mr|pl|pr|border-l|border-r|text-left|text-right)-?\b/,
    )
  })
})

describe('PageHero render paths', () => {
  it('lays the copy over the photograph when there is one', () => {
    const { container } = render(<PageHero copy={hero} slides={SLIDES} />)
    expect(container.querySelector('section[aria-roledescription="carousel"]')).not.toBeNull()
    // White on photography, not ink on white.
    expect(container.querySelector('h1')!.className).toMatch(/text-white/)
  })

  it('falls back to a plain block rather than disappearing with the images', () => {
    // A hero that renders nothing when the carousel is empty would take the page's whole
    // proposition with it.
    const { container } = render(<PageHero copy={hero} slides={[]} />)
    expect(container.querySelector('section[aria-roledescription="carousel"]')).toBeNull()
    expect(container.querySelector('h1')!.className).toMatch(/text-ink/)
  })

  it('treats a slide with no property reference as no photography', () => {
    // HeroCarousel drops those slides, so a hero built on them would render an empty box.
    const { container } = render(
      <PageHero copy={hero} slides={[{ image: { alt: 'a' }, slug: null, propertyTitle: 'X' }]} />,
    )
    expect(container.querySelector('h1')!.className).toMatch(/text-ink/)
  })
})
