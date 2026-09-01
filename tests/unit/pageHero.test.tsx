import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import { PageHero } from '@/components/layout/PageHero'
import { HeroCarousel } from '@/components/layout/HeroCarousel'
import { HERO_PATHS, showsHero } from '@/lib/heroPages'

vi.mock('@/sanity/image', () => ({
  urlForImage: () => ({
    width: () => ({ height: () => ({ url: () => 'https://cdn.test/x.jpg' }) }),
  }),
}))

const SLIDES = [
  { image: { alt: 'a' }, slug: 'one', propertyTitle: 'One' },
  { image: { alt: 'b' }, slug: 'two', propertyTitle: 'Two' },
]

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
 * The photograph now runs edge to edge on every section page, with that page's own title
 * laid over it.
 *
 * Two things this deliberately keeps from the contained hero it replaces, because they
 * were the actual fixes in the change that contained it — the width was only ever half
 * of that story:
 *
 *   - The headline sits ON the photograph, so the first screen carries words. The band
 *     this grew out of ran the full width of the viewport at the full HEIGHT of it, and
 *     that is what put EM8's proposition below the fold.
 *   - The box grows rather than clipping. The copy comes from the CMS and is unbounded.
 */
describe('full-bleed hero geometry', () => {
  it('spans the viewport rather than the content column', () => {
    const { container } = render(<HeroCarousel slides={SLIDES} />)
    const cls = container.firstElementChild!.className
    expect(cls).toMatch(/\bw-full\b/)
    // A max-width here would be the contained hero again under another name.
    expect(cls).not.toMatch(/max-w-/)
    // Rounded corners belong to a block on a page, not to a band that reaches both edges.
    expect(cls).not.toMatch(/rounded-card/)
  })

  it('tells the browser it is full width, which is what decides the bytes fetched', () => {
    // The single most expensive line in this component. Without an accurate hint Next
    // emits a srcset up to 3840w and the browser fetches a variant far larger than it
    // paints — docs/resource-budget.md records 567KB for one crop that way. Full-bleed
    // genuinely is 100vw, so it says so; the budget is defended by the preload window and
    // the crop size instead.
    const { container } = render(<HeroCarousel slides={SLIDES} />)
    expect(container.querySelector('img')!.getAttribute('sizes')).toBe('100vw')
  })

  it('never fills the viewport height', () => {
    // The regression that put the headline below the fold. Width came back; height did not.
    const { container } = render(<HeroCarousel slides={SLIDES} />)
    expect(container.firstElementChild!.className).not.toMatch(/100svh|100vh|100dvh/)
  })

  it('grows rather than clipping, because the copy is unbounded CMS text', () => {
    const cls = render(<HeroCarousel slides={SLIDES} />).container.firstElementChild!
      .className
    // min-h, never a fixed h-[…]: the copy is bottom-aligned, so a fixed height clips
    // from the TOP — the eyebrow first, then the headline.
    expect(cls).toMatch(/min-h-\[420px\]/)
    expect(cls).not.toMatch(/(?:^|\s)h-\[\d+px\]/)
  })

  it('preloads forward only, which is what pays for full-bleed', () => {
    /*
     * Eight slides in one absolutely-positioned box read as all-visible to the browser,
     * which fetched every one and failed the image budget. Only a window carries an <img>.
     *
     * The window is two at full-bleed, not three. docs/resource-budget.md records this
     * exact trade the last time the band ran edge to edge: the crops are far larger, and
     * the third one is what put the page over. Measured here, three crops came to 1206KB
     * against a 1400KB image budget — passing, but spending the headroom that is
     * deliberately reserved for the real lobby photography still to be shot.
     *
     * Forward is the direction that matters, because the band only auto-advances that way.
     * The previous slide is dropped and reloads if someone clicks back to it.
     */
    const many = Array.from({ length: 8 }, (_, i) => ({
      image: { alt: `a${i}` },
      slug: `s${i}`,
      propertyTitle: `S${i}`,
    }))
    const { container } = render(<HeroCarousel slides={many} />)
    const alts = [...container.querySelectorAll('img')].map((i) => i.getAttribute('alt'))
    expect(alts.length).toBeLessThanOrEqual(2)
    // The current slide and the one it is about to cross-fade to.
    expect(alts).toContain('a0')
    expect(alts).toContain('a1')
    // The slide behind is not worth a full-bleed crop up front.
    expect(alts).not.toContain('a7')
  })
})

describe('PageHero copy', () => {
  it('renders the page title as the h1, on the photograph', () => {
    render(<PageHero copy={COPY} slides={SLIDES} />)
    const h1 = screen.getByRole('heading', { level: 1 })
    expect(h1.textContent).toBe('Realized results, not projections.')
    expect(h1.className).toMatch(/text-white/)
  })

  it('shows the eyebrow and the intro', () => {
    render(<PageHero copy={COPY} slides={SLIDES} />)
    expect(screen.getByText('Track Record')).toBeDefined()
    expect(screen.getByText(COPY.intro)).toBeDefined()
  })

  it('is not bound by the content measure', () => {
    // The explicit ask: the words sit a similar distance in from the edge of the image as
    // they did when the image was a 1152px block, rather than snapping to that column.
    const { container } = render(<PageHero copy={COPY} slides={SLIDES} />)
    const overlay = container.querySelector('[data-hero-overlay]')!
    expect(overlay.className).not.toMatch(/max-w-\[1200px\]/)
    expect(overlay.className).not.toMatch(/mx-auto/)
    expect(overlay.className).toMatch(/\bp-6\b/)
    expect(overlay.className).toMatch(/sm:p-10/)
  })

  it('reserves room at the top for the header that now sits over it', () => {
    /*
     * Measured, not guessed: at 375px the eyebrow's first line started at y=62 while the
     * header ran to y=68, so the top line of copy rendered *under* the header.
     *
     * It only bites on a narrow viewport, which is why it survived a desktop check. The
     * copy is bottom-aligned in a flex column, so it climbs as it grows — three wrapped
     * headline lines plus a four-line intro is enough on mobile, and the copy comes from
     * the CMS, so a longer intro pushes it further up with no build error and no failing
     * test. The header is ~68px, so the padding clears it with room to spare.
     */
    const { container } = render(<PageHero copy={COPY} slides={SLIDES} />)
    const overlay = container.querySelector('[data-hero-overlay]')!
    expect(overlay.className).toMatch(/\bpt-24\b/)
  })

  it('renders buttons when the page supplies them, outside the slide links', () => {
    // Every slide is an anchor. Copy carrying its own buttons cannot nest inside one —
    // interactive elements inside an anchor are invalid and unreachable by keyboard.
    const { container } = render(
      <PageHero
        copy={{ ...COPY, primaryCta: { label: 'View portfolio', href: '/portfolio' } }}
        slides={SLIDES}
      />,
    )
    const cta = container.querySelector('a[href="/portfolio"]')!
    expect(cta).not.toBeNull()
    expect(cta.closest('a[href^="/portfolio/"]')).toBeNull()
  })

  it('still renders the title when there is no photography at all', () => {
    // A hero that disappears with its images would take the page's whole proposition with
    // it. Dangling slide references count as no photography.
    render(<PageHero copy={COPY} slides={[]} />)
    const h1 = screen.getByRole('heading', { level: 1 })
    expect(h1.textContent).toBe('Realized results, not projections.')
    // On white, not on a photograph, so it takes ink rather than white.
    expect(h1.className).toMatch(/text-ink/)
  })

  it('uses no physical-direction utilities', () => {
    const { container } = render(<PageHero copy={COPY} slides={SLIDES} />)
    expect(container.innerHTML).not.toMatch(
      /\b(?:[a-z0-9-]+:)*-?(?:ml|mr|pl|pr|border-l|border-r|text-left|text-right)-?\b/,
    )
  })
})

describe('which pages open on a photograph', () => {
  it('covers all seven section pages, the homepage included', () => {
    expect([...HERO_PATHS].sort()).toEqual([
      '/',
      '/about',
      '/insights',
      '/investors',
      '/partners',
      '/portfolio',
      '/track-record',
    ])
  })

  it('leaves the two detail routes alone', () => {
    // Both already open on their own image and their own headline. A rotating band of
    // other buildings above either one would be a second, unrelated photograph.
    expect(showsHero('/portfolio/oak-forest-k')).toBe(false)
    expect(showsHero('/insights/some-article')).toBe(false)
  })

  it('does not leak onto a path that merely starts with an allowed one', () => {
    expect(showsHero('/aboutus')).toBe(false)
    expect(showsHero('/portfolio/anything')).toBe(false)
  })

  it('tolerates a trailing slash', () => {
    expect(showsHero('/about/')).toBe(true)
    expect(showsHero('/')).toBe(true)
  })
})
