import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { HeroCarousel } from '@/components/layout/HeroCarousel'

vi.mock('@/sanity/image', () => ({
  urlForImage: () => ({ width: () => ({ height: () => ({ url: () => 'https://cdn.test/x.jpg' }) }) }),
}))

const PHYSICAL = /\b(?:[a-z0-9-]+:)*-?(?:ml|mr|pl|pr|border-l|border-r|text-left|text-right)-?\b/

const SLIDES = [
  { image: { alt: 'Lobby at 157 & Cicero' }, slug: '157-and-cicero', propertyTitle: '157 & Cicero' },
  { image: { alt: 'Lobby at Oak Forest K' }, slug: 'oak-forest-k', propertyTitle: 'Oak Forest K' },
  { image: { alt: 'Lobby at 382 Penn' }, slug: '382-penn-apartments', propertyTitle: '382 Penn Apartments' },
]

beforeEach(() => {
  // jsdom has no matchMedia; the component asks it about reduced motion.
  window.matchMedia = vi.fn().mockReturnValue({
    matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn(),
  }) as unknown as typeof window.matchMedia
})

describe('HeroCarousel', () => {
  it('renders nothing when there are no slides', () => {
    const { container } = render(<HeroCarousel slides={[]} />)
    expect(container.innerHTML).toBe('')
  })

  it('links every slide to its property page', () => {
    // Queried from the DOM rather than by role: only the visible slide is in the
    // accessibility tree, which is the point of the test below.
    const { container } = render(<HeroCarousel slides={SLIDES} />)
    const hrefs = [...container.querySelectorAll('a')].map((a) => a.getAttribute('href'))
    expect(hrefs).toEqual(SLIDES.map((s) => `/portfolio/${s.slug}`))
  })

  it('keeps the off-screen slides out of the accessibility tree and the tab order', () => {
    // Every slide stays mounted so the browser can decode the next image ahead of time,
    // but an invisible link that a keyboard user can still tab into is a trap. Only the
    // current slide is exposed.
    render(<HeroCarousel slides={SLIDES} />)
    expect(screen.getAllByRole('link')).toHaveLength(1)
    expect(screen.getByRole('link').getAttribute('href')).toBe('/portfolio/157-and-cicero')
  })

  it('drops a slide whose property reference is broken rather than linking nowhere', () => {
    // A deleted property leaves a dangling reference, so slug resolves null. A large
    // clickable image that goes nowhere is worse than one fewer slide.
    const { container } = render(
      <HeroCarousel slides={[...SLIDES, { image: { alt: 'orphan' }, slug: null, propertyTitle: null }]} />,
    )
    expect(container.querySelectorAll('a')).toHaveLength(SLIDES.length)
  })

  it('exposes each slide with its alt text, so the band is not decorative-only', () => {
    render(<HeroCarousel slides={SLIDES} />)
    expect(screen.getByAltText('Lobby at 157 & Cicero')).toBeDefined()
  })

  it('offers a control per slide, labelled and marked current', async () => {
    const user = userEvent.setup()
    render(<HeroCarousel slides={SLIDES} />)
    const dots = screen.getAllByRole('button', { name: /show slide/i })
    expect(dots).toHaveLength(3)
    expect(dots[0]!.getAttribute('aria-current')).toBe('true')

    await user.click(dots[2]!)
    expect(screen.getAllByRole('button', { name: /show slide/i })[2]!.getAttribute('aria-current')).toBe('true')
  })

  it('does not auto-advance when the visitor prefers reduced motion', () => {
    window.matchMedia = vi.fn().mockReturnValue({
      matches: true, addEventListener: vi.fn(), removeEventListener: vi.fn(),
    }) as unknown as typeof window.matchMedia
    vi.useFakeTimers()
    render(<HeroCarousel slides={SLIDES} />)
    vi.advanceTimersByTime(30_000)
    const dots = screen.getAllByRole('button', { name: /show slide/i })
    expect(dots[0]!.getAttribute('aria-current')).toBe('true')
    vi.useRealTimers()
  })

  it('uses no physical-direction utilities', () => {
    const { container } = render(<HeroCarousel slides={SLIDES} />)
    expect(container.innerHTML).not.toMatch(PHYSICAL)
  })
})

/**
 * The resource budget in CI caught this: rendering an <Image> for all eight slides pulled
 * 1.3MB of photography against an 800KB image budget on first load, because every slide
 * sits in the same absolutely-positioned box and the browser treats them all as visible.
 *
 * That is the specific failure this whole rebuild exists to avoid — spec §1 describes the
 * old site's 10-20MB camera-original photos as a founding problem. Only a window around
 * the current slide is rendered now, which keeps the crossfade smooth without paying for
 * six photographs nobody has scrolled to.
 */
describe('HeroCarousel — resource budget', () => {
  const many = Array.from({ length: 8 }, (_, i) => ({
    image: { alt: `slide ${i}` },
    slug: `property-${i}`,
    propertyTitle: `Property ${i}`,
  }))

  it('renders only a small window of images, not one per slide', () => {
    const { container } = render(<HeroCarousel slides={many} />)
    const imgs = container.querySelectorAll('img')
    expect(imgs.length, `rendered ${imgs.length} images for 8 slides`).toBeLessThanOrEqual(3)
  })

  it('describes its width honestly in each shape, which decides the bytes fetched', () => {
    // There were two variants here once, and the contained one claimed a 1152px box.
    // There are two again, and the difference between them is a height rather than a
    // width: `screen` is the viewport, `band` is 420/500/560px.
    //
    // Honest therefore differs. `object-cover` on a box taller than the crop is shaped
    // paints the photograph wider than the box and crops the sides off, so the painted
    // width is the box height times about 1.8. At full screen on a portrait phone that is
    // around four times the width of the screen — measured, a 1200w variant stretched
    // across 1444 CSS px at 375x812, which is an upscale at any DPR. In the band the same
    // phone paints about 747 CSS px, which the 1200w variant still covers, so `100vw`
    // understates it without producing an artefact and the cheaper hint stays. The window
    // above and the 1600px crop cap are what hold the image budget either way.
    const sizesFor = (variant: 'screen' | 'band') =>
      render(<HeroCarousel slides={many} variant={variant} />)
        .container.querySelector('img')!
        .getAttribute('sizes')!

    const screen = sizesFor('screen')
    expect(screen).toMatch(/\(max-width:\s*640px\)\s*[34]\d\dvw/)
    expect(screen.endsWith('100vw')).toBe(true)

    expect(sizesFor('band')).toBe('100vw')
  })

  it('still preloads the slide it is about to advance to', () => {
    // Forward is the direction the band auto-advances, so that transition must be decoded.
    const { container } = render(<HeroCarousel slides={many} />)
    const alts = [...container.querySelectorAll('img')].map((i) => i.getAttribute('alt'))
    expect(alts).toContain('slide 0')
    expect(alts).toContain('slide 1')
  })

  it('still renders every slide as a link, so navigation is unaffected', () => {
    const { container } = render(<HeroCarousel slides={many} />)
    expect(container.querySelectorAll('a')).toHaveLength(8)
  })

  it('includes the neighbouring slides so the next transition is already decoded', async () => {
    const user = userEvent.setup()
    const { container } = render(<HeroCarousel slides={many} />)
    await user.click(container.querySelectorAll('button')[4]!)
    const alts = [...container.querySelectorAll('img')].map((i) => i.getAttribute('alt'))
    expect(alts).toContain('slide 4')
    expect(alts).toContain('slide 5')
  })
})
