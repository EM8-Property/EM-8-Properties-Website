import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
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
 * The photograph now fills the whole first screen on every section page — the width of the
 * viewport and the height of it — with that page's own title laid over it.
 *
 * The height was withheld for two revisions, so it is worth being exact about what changed
 * rather than reading the older comments as still true. The band this grew out of was
 * `100vh` *with the heading rendered underneath it*, and that is what put EM8's
 * proposition below the fold — the height was never the defect, the stacking was. The
 * title has sat ON the photograph since the full-bleed change, so filling the viewport now
 * means the first screen is a photograph carrying the page's own words.
 *
 * Two properties survive from the contained hero and are still load-bearing:
 *
 *   - The copy clears the overlaid header. Full height gives it far more room, so this is
 *     slack rather than the near miss it was — but the reservation stays, because a
 *     landscape phone is 375px tall and puts it straight back.
 *   - The box grows rather than clipping. `min-h`, never `h`: the copy comes from the CMS,
 *     is unbounded, and is bottom-aligned, so a fixed height clips from the TOP — the
 *     eyebrow first, then the headline.
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

  it('describes the width the image is PAINTED at, not the width of the box', () => {
    /*
     * The single most expensive line in this component, and full height changed what the
     * honest answer to it is.
     *
     * `sizes` is the width the browser should assume the image occupies, and with
     * `object-cover` on a box that is taller than the photograph is shaped, that is not
     * the width of the box. The image is scaled until it covers the box's HEIGHT and the
     * overflow is cropped off the sides, so the painted width is the viewport height
     * times the crop's aspect ratio — about 1.8 times. On a portrait phone that is
     * roughly four times the width of the screen.
     *
     * `sizes="100vw"` was accurate while the band was 420px tall. Measured at 375x812
     * with it still in place: the browser fetched the 1200w variant and painted it across
     * 1444 CSS px, so the photograph was upscaled 3.6x on a phone — visibly soft, on the
     * whole of the first screen, and invisible to every other check. Desktop was
     * unaffected, because there the box is wider than it is tall and width still drives.
     *
     * So the phone breakpoints ask for the painted width. What keeps that from becoming a
     * byte regression is the crop cap: every variant at or above 1600w resolves to the
     * same 1600x900 asset, measured at 133KB against 84KB for the 1200w it was fetching
     * before. See docs/resource-budget.md.
     */
    const { container } = render(<HeroCarousel slides={SLIDES} />)
    const sizes = container.querySelector('img')!.getAttribute('sizes')!
    // A phone is asked for several times its own width, because that is what it paints.
    const phone = sizes.match(/\(max-width:\s*640px\)\s*(\d+)vw/)
    expect(phone, 'no narrow-viewport clause').not.toBeNull()
    expect(Number(phone![1])).toBeGreaterThanOrEqual(300)
    // Desktop is width-driven, so it stays honest at the width of the viewport.
    expect(sizes.endsWith('100vw')).toBe(true)
  })

  it('fills the height of the first screen, so the page has to be scrolled', () => {
    const { container } = render(<HeroCarousel slides={SLIDES} />)
    expect(container.firstElementChild!.className).toMatch(/\bmin-h-svh\b/)
  })

  it('measures the screen with svh, not vh and not dvh', () => {
    /*
     * Three units, and the difference between them shows up only on a phone.
     *
     * `vh` ignores mobile browser chrome, so 100vh is taller than what can be seen: the
     * bottom of the photograph, and the slide dots with it, sit behind the address bar.
     *
     * `dvh` tracks that chrome as it collapses, so the band RESIZES mid-scroll. The copy
     * is bottom-aligned, so it would slide down the screen while the reader is moving, and
     * the section below would shift under their thumb.
     *
     * `svh` is the viewport with the chrome showing, which is the state a page is in when
     * it loads. The first screen is the photograph, nothing peeks out below it, and
     * nothing moves afterwards.
     */
    const cls = render(<HeroCarousel slides={SLIDES} />).container.firstElementChild!
      .className
    expect(cls).not.toMatch(/100vh|min-h-screen/)
    expect(cls).not.toMatch(/dvh/)
  })

  it('grows rather than clipping, because the copy is unbounded CMS text', () => {
    const cls = render(<HeroCarousel slides={SLIDES} />).container.firstElementChild!
      .className
    // min-h, never a fixed height: the copy is bottom-aligned, so a fixed height clips
    // from the TOP — the eyebrow first, then the headline. A landscape phone is 375px
    // tall, which is less than the header reservation plus four lines of CMS copy, so
    // this is reachable rather than theoretical.
    expect(cls).not.toMatch(/(?:^|\s)h-\[\d+px\]/)
    expect(cls).not.toMatch(/(?:^|\s)h-svh\b/)
    expect(cls).not.toMatch(/(?:^|\s)h-screen\b/)
  })

  it('keeps the outgoing slide mounted while it fades out', async () => {
    /*
     * The defect this exists to catch, and the reason every other window test missed it:
     * they all assert at index 0, where nothing has faded out yet.
     *
     * With a forward-only window the outgoing slide's <Image> unmounted on the very render
     * that started its 700ms fade, so the photograph hard-cut to the bare scrim and the
     * next one faded up out of that — every six seconds, on all seven pages. Invisible to
     * a static render, a screenshot, the build, and Lighthouse.
     */
    const many = Array.from({ length: 8 }, (_, i) => ({
      image: { alt: `a${i}` },
      slug: `s${i}`,
      propertyTitle: `S${i}`,
    }))
    const { container } = render(<HeroCarousel slides={many} />)
    const alts = () =>
      [...container.querySelectorAll('img')].map((i) => i.getAttribute('alt'))

    expect(alts()).not.toContain('a3')
    // Jump to slide 4 the way a visitor does, through the dots.
    await userEvent.click(container.querySelectorAll('button')[3]!)

    expect(alts(), 'the slide being faded out lost its image').toContain('a0')
    expect(alts(), 'the newly current slide has no image').toContain('a3')
    expect(alts(), 'the next slide is not decoded').toContain('a4')
    // Still bounded — the point of a window at all.
    expect(alts().length).toBeLessThanOrEqual(3)
  })

  it('fetches only two crops on the first paint', () => {
    /*
     * Eight slides in one absolutely-positioned box read as all-visible to the browser,
     * which fetched every one and failed the image budget. Only a window carries an <img>.
     *
     * First paint is where full-bleed is actually paid for: nothing has faded out yet, so
     * the backward neighbour is not worth a crop this size. Measured on this build, two
     * crops came to 723KB of images against a 1400KB budget, and Lighthouse reported no
     * overage. Once the band advances, the outgoing slide stays mounted through its fade
     * and the steady state is three — see the crossfade test above.
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

  it('holds the same measure as the copy below it', () => {
    /*
     * The photograph is full-bleed; the words on it are not.
     *
     * This reverses what this test asserted a day earlier, so the history is worth
     * keeping. When the band first went edge to edge, the copy was deliberately left at a
     * fixed inset from the *image* rather than snapped to the content column, on the
     * reasoning that re-imposing the measure would undo the change for everything except
     * the picture. Hunter looked at it and asked for the opposite: the hero's first line
     * should start on the same vertical as every heading, paragraph and the wordmark
     * below it.
     *
     * Measured before: the eyebrow and the h1 began at x=40 at every width above 640px,
     * while the content column began at x=180 on a 1512px viewport, x=144 at 1440 and
     * x=64 at 1280 — and at x=24 at 1024 and below, where the hero copy was actually
     * inset FURTHER than the body text. The two only agreed on a phone.
     *
     * `mx-auto max-w-[1200px] px-6` is the measure, spelled the same way in Band,
     * SectionHeading's callers, SiteHeader, SiteFooter and this component's own
     * no-photography fallback. Written as those three utilities rather than as a shared
     * constant because that is how the rest of the codebase writes it; a wrapper would
     * have to be adopted everywhere to be worth anything.
     */
    const { container } = render(<PageHero copy={COPY} slides={SLIDES} />)
    const overlay = container.querySelector('[data-hero-overlay]')!
    expect(overlay.className).toMatch(/\bmx-auto\b/)
    expect(overlay.className).toMatch(/max-w-\[1200px\]/)
    expect(overlay.className).toMatch(/\bpx-6\b/)
    // The old fixed inset, which is what put the copy out of line. `sm:p-10` also set the
    // vertical padding, so it cannot simply be narrowed to `sm:px-10`.
    expect(overlay.className).not.toMatch(/sm:p-10/)
    expect(overlay.className).not.toMatch(/(?:^|\s)p-6\b/)
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
