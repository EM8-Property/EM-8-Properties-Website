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
 * The homepage opens on the photography full-bleed — the properties are the strongest
 * asset EM8 has and the landing page should lead with them. Every other page keeps the
 * banner: a full screen of photo above /portfolio would push the actual portfolio below
 * the fold on a page someone arrived at to read a list.
 */
describe('HeroCarousel height', () => {
  it('fills the viewport when asked', () => {
    const { container } = render(<HeroCarousel slides={SLIDES} fullScreen />)
    expect(container.firstElementChild!.className).toMatch(/h-\[100svh\]/)
  })

  it('stays a banner by default', () => {
    const { container } = render(<HeroCarousel slides={SLIDES} />)
    const cls = container.firstElementChild!.className
    expect(cls).not.toMatch(/100svh/)
    expect(cls).toMatch(/h-\[220px\]/)
  })

  it('offers a scroll cue only when it fills the screen', () => {
    // A full screen of photograph with the page below it needs to say there is a page
    // below it. A 300px banner does not.
    const full = render(<HeroCarousel slides={SLIDES} fullScreen />)
    expect(full.container.querySelector('[data-scroll-cue]')).not.toBeNull()
    cleanup()
    const banner = render(<HeroCarousel slides={SLIDES} />)
    expect(banner.container.querySelector('[data-scroll-cue]')).toBeNull()
  })
})

describe('CarouselSlot full-screen rule', () => {
  const renderAt = (path: string) => {
    cleanup()
    mockPath.mockReturnValue(path)
    return render(<CarouselSlot slides={SLIDES} />).container
  }

  it('fills the screen on the homepage only', () => {
    expect(renderAt('/').innerHTML).toMatch(/100svh/)
    for (const p of ['/portfolio', '/about', '/insights', '/partners', '/track-record']) {
      expect(renderAt(p).innerHTML, `${p} should keep the banner`).not.toMatch(/100svh/)
    }
  })
})
