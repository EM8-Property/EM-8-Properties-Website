import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, cleanup } from '@testing-library/react'
import { HeroCarousel } from '@/components/layout/HeroCarousel'
import { CarouselSlot } from '@/components/layout/CarouselSlot'

const mockPath = vi.fn()
vi.mock('next/navigation', () => ({ usePathname: () => mockPath() }))
vi.mock('@/sanity/image', () => ({
  urlForImage: () => ({ width: () => ({ height: () => ({ url: () => 'https://cdn.test/x.jpg' }) }) }),
}))

const SLIDES = [
  { image: { alt: 'a' }, slug: 'one', propertyTitle: 'One' },
  { image: { alt: 'b' }, slug: 'two', propertyTitle: 'Two' },
]

beforeEach(() => {
  cleanup()
  window.matchMedia = vi.fn().mockReturnValue({
    matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn(),
  }) as unknown as typeof window.matchMedia
})

/**
 * The homepage hero used to fill the viewport, edge to edge and top to bottom. The first
 * screen a visitor saw was therefore a photograph, a property caption and a scroll arrow,
 * with EM8's actual proposition below the fold — and on a wide monitor it read as though
 * the photograph were the whole site.
 *
 * It is now a block inside the same 1200px column as the rest of the page, with the
 * headline on the photograph. Every other page keeps the thin banner unchanged.
 */
describe('HeroCarousel height', () => {
  it('never fills the viewport', () => {
    for (const variant of ['banner', 'hero'] as const) {
      cleanup()
      const { container } = render(<HeroCarousel slides={SLIDES} variant={variant} />)
      expect(
        container.firstElementChild!.className,
        `${variant} must not be viewport-height`,
      ).not.toMatch(/100svh|100vh|100dvh/)
    }
  })

  it('gives the hero real height without taking the screen', () => {
    const { container } = render(<HeroCarousel slides={SLIDES} variant="hero" />)
    const cls = container.firstElementChild!.className
    expect(cls).toMatch(/h-\[420px\]/)
    // Rounded, because it is a block on the page rather than a full-bleed band.
    expect(cls).toMatch(/rounded-card/)
  })

  it('stays a banner by default', () => {
    const { container } = render(<HeroCarousel slides={SLIDES} />)
    const cls = container.firstElementChild!.className
    expect(cls).toMatch(/h-\[220px\]/)
    expect(cls).not.toMatch(/rounded-card/)
  })

  it('drops the scroll cue, which only existed because the photo hid the page', () => {
    for (const variant of ['banner', 'hero'] as const) {
      cleanup()
      const { container } = render(<HeroCarousel slides={SLIDES} variant={variant} />)
      expect(container.querySelector('[data-scroll-cue]')).toBeNull()
    }
  })

  it('captions the property on the banner, and leaves the hero to its headline', () => {
    const banner = render(<HeroCarousel slides={SLIDES} />)
    expect(banner.container.textContent).toContain('One')
    cleanup()
    // Two captions in the same corner would collide; the page's own headline wins.
    const hero = render(<HeroCarousel slides={SLIDES} variant="hero" />)
    expect(hero.container.textContent).not.toContain('One')
  })

  it('renders an overlay above the slides, not inside their links', () => {
    // Every slide is an anchor. Copy carrying its own buttons cannot nest inside one —
    // interactive elements inside an anchor are invalid and unreachable by keyboard.
    const { container } = render(
      <HeroCarousel
        slides={SLIDES}
        variant="hero"
        overlay={<a href="/investors">Get started</a>}
      />,
    )
    const cta = container.querySelector('a[href="/investors"]')!
    expect(cta).not.toBeNull()
    expect(cta.closest('a[href^="/portfolio/"]')).toBeNull()
  })
})

describe('CarouselSlot', () => {
  const renderAt = (path: string) => {
    cleanup()
    mockPath.mockReturnValue(path)
    return render(<CarouselSlot slides={SLIDES} />).container
  }

  it('renders nothing on the homepage, which supplies its own hero', () => {
    // Left in CAROUSEL_PATHS this would stack a second photo band above the hero.
    expect(renderAt('/').innerHTML).toBe('')
  })

  it('still renders the banner on the five pages that carry one', () => {
    for (const p of ['/portfolio', '/about', '/insights', '/partners', '/track-record']) {
      expect(renderAt(p).innerHTML, `${p} lost its banner`).toMatch(/h-\[220px\]/)
    }
  })
})
