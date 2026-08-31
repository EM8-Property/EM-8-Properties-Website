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
