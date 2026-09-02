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
 * The band has two shapes, and which page gets which is a design decision rather than a
 * technical one.
 *
 * `screen` — the homepage only. The photograph fills the whole first screen, the width of
 * the viewport and the height of it, and the copy floats on the image at a fixed inset
 * from its edge rather than on the site's content column. It is a picture with words on
 * it, and the page is scrolled to reach anything else.
 *
 * `band` — the other six section pages. The photograph is 420/500/560px tall by
 * breakpoint and the copy sits on the content measure, so the page title lines up with
 * every heading and paragraph below it. It is a page header that happens to be
 * photographic.
 *
 * Both shapes existed separately for a day each, applied to all seven pages, before
 * Hunter looked at the two and split them this way. Which is why the variant is one prop
 * with two named values and not two booleans: `screen` height with `band` copy is the
 * combination that was live yesterday and was rejected, and there is no reason to keep it
 * reachable.
 *
 * Three properties hold in BOTH shapes, and each was a regression once:
 *
 *   - The copy clears the overlaid header. `screen` has slack; `band` is where the near
 *     miss was measured, at 375px with the eyebrow at y=62 under a header ending at y=68.
 *   - The box grows rather than clipping. `min-h`, never `h`: the copy comes from the CMS,
 *     is unbounded, and is bottom-aligned, so a fixed height clips from the TOP — the
 *     eyebrow first, then the headline. In `band` this is routine rather than defensive:
 *     420px does not hold the homepage's copy at 375px wide, and the box really does grow.
 *   - `sizes` describes the width the image is PAINTED at, which `object-cover` makes a
 *     function of the box's HEIGHT. The two shapes therefore need different hints, and
 *     that is the one place the variant reaches beyond CSS.
 */
describe('hero geometry, both shapes', () => {
  // `band` is the default because six of the seven pages use it. The homepage asks for
  // `screen` explicitly, which is also how it reads at the call site.
  const cls = (props?: { variant?: 'screen' | 'band' }) =>
    render(<HeroCarousel slides={SLIDES} {...props} />).container.firstElementChild!
      .className
  const img = (props?: { variant?: 'screen' | 'band' }) =>
    render(<HeroCarousel slides={SLIDES} {...props} />).container.querySelector('img')!

  it('spans the viewport rather than the content column, in both shapes', () => {
    for (const variant of ['screen', 'band'] as const) {
      const c = cls({ variant })
      expect(c, variant).toMatch(/\bw-full\b/)
      // A max-width here would be the contained hero again under another name. The
      // measure belongs to the copy on the photograph, never to the photograph.
      expect(c, variant).not.toMatch(/max-w-/)
      // Rounded corners belong to a block on a page, not to a band that reaches both
      // edges.
      expect(c, variant).not.toMatch(/rounded-card/)
    }
  })

  it('fills the screen in `screen`, and is 420/500/560 in `band`', () => {
    expect(cls({ variant: 'screen' })).toMatch(/\bmin-h-svh\b/)

    const band = cls({ variant: 'band' })
    expect(band).not.toMatch(/svh/)
    // The three heights this band had before the homepage took the full screen. They are
    // asserted literally because they are a design decision, not a derived value.
    expect(band).toMatch(/\bmin-h-\[420px\]/)
    expect(band).toMatch(/\bsm:min-h-\[500px\]/)
    expect(band).toMatch(/\blg:min-h-\[560px\]/)
  })

  it('defaults to `band`, which is what six of the seven pages want', () => {
    expect(cls()).toBe(cls({ variant: 'band' }))
  })

  it('rejects vh and dvh, which are the two wrong ways to measure a screen', () => {
    /*
     * A forward guard rather than a check on any one change: a class string naming no
     * viewport unit at all satisfies both assertions too. What pins `screen` is
     * `min-h-svh` above; this exists so a later edit cannot swap the unit for one of the
     * two that misbehave. The difference between the three shows up only on a phone.
     *
     * `vh` ignores mobile browser chrome, so 100vh is taller than what can be seen: the
     * bottom of the photograph, and the slide dots with it, sit behind the address bar.
     *
     * `dvh` tracks that chrome as it collapses, so the band RESIZES mid-scroll. The copy
     * is bottom-aligned, so it would slide down the screen while the reader is moving, and
     * the section below would shift under their thumb.
     *
     * `svh` is the viewport with the chrome showing, which is the state a page is in when
     * it loads. Its own cost is that a sliver of the next section shows once the chrome
     * collapses — which happens while the reader is already scrolling.
     */
    for (const variant of ['screen', 'band'] as const) {
      expect(cls({ variant }), variant).not.toMatch(/100vh|min-h-screen/)
      expect(cls({ variant }), variant).not.toMatch(/dvh/)
    }
  })

  it('describes the width the image is PAINTED at, which differs by shape', () => {
    /*
     * The single most expensive line in this component, and the one place the variant
     * reaches past CSS.
     *
     * `sizes` is the width the browser should assume the image occupies, and with
     * `object-cover` on a box taller than the crop is shaped that is NOT the width of the
     * box: the image is scaled until it covers the box's HEIGHT and the overflow is
     * cropped off the sides. So the painted width is the box height times the crop's
     * aspect, about 1.8x.
     *
     * In `screen` the box is the height of the viewport, so on a portrait phone the
     * painted width is around four times the width of the screen. Measured at 375x812
     * with `100vw`: the browser fetched the 1200w variant and painted it across 1444 CSS
     * px — an upscale at any DPR, visibly soft, over the whole first screen.
     *
     * In `band` the box is 420px on a phone, so the painted width is about 747 CSS px.
     * `100vw` understates that too, by roughly half — but the 1200w variant it picks is
     * still WIDER than the 747 px it paints, so there is no upscale and nothing visible.
     * That is the whole difference between the two, and it is why `band` keeps the
     * cheaper hint rather than the more accurate one: the accurate one would cost 49KB a
     * crop on six pages to fix an artefact that is not there.
     */
    const screen = img({ variant: 'screen' }).getAttribute('sizes')!
    // A phone is asked for several times its own width, because that is what it paints.
    const phone = screen.match(/\(max-width:\s*640px\)\s*(\d+)vw/)
    expect(phone, 'no narrow-viewport clause').not.toBeNull()
    expect(Number(phone![1])).toBeGreaterThanOrEqual(300)
    // And a tablet, by less, because it is less tall relative to its width. Asserted
    // because without it the middle clause can be deleted with every test still green.
    const tablet = screen.match(/\(max-width:\s*1024px\)\s*(\d+)vw/)
    expect(tablet, 'no tablet clause').not.toBeNull()
    expect(Number(tablet![1])).toBeGreaterThan(100)
    expect(Number(tablet![1])).toBeLessThan(Number(phone![1]))
    // Desktop is width-driven either way, so it stays at the width of the viewport.
    expect(screen.endsWith('100vw')).toBe(true)

    expect(img({ variant: 'band' }).getAttribute('sizes')).toBe('100vw')
  })

  it('grows rather than clipping in both shapes, because the copy is CMS text', () => {
    // min-h, never a fixed height: the copy is bottom-aligned, so a fixed height clips
    // from the TOP — the eyebrow first, then the headline.
    //
    // This is not defensive in `band`. 420px does not hold the homepage's own copy at
    // 375px wide — measured, that box renders 477px tall — so the growth path is the
    // normal one there rather than an edge case. In `screen` it is the landscape phone,
    // 375px tall, which is less than the header reservation plus four lines of copy.
    //
    // The positive assertion matters as much as the negatives: without it this passes
    // against a component carrying no height utility at all, which is a different bug
    // with the same shape.
    for (const variant of ['screen', 'band'] as const) {
      const c = cls({ variant })
      expect(c, variant).toMatch(/\bmin-h-/)
      expect(c, variant).not.toMatch(/(?:^|\s)h-\[\d+px\]/)
      expect(c, variant).not.toMatch(/(?:^|\s)h-svh\b/)
      expect(c, variant).not.toMatch(/(?:^|\s)h-screen\b/)
    }
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

  it('holds the content measure in `band`, and the image edge in `screen`', () => {
    /*
     * Where the words sit is the other half of the variant, and it has been settled twice.
     *
     * When the band first went edge to edge, the copy was left at a fixed inset from the
     * *image* on all seven pages, on the reasoning that snapping it to the content column
     * would undo the full-bleed change for everything except the picture. Measured, that
     * put the eyebrow and h1 at x=40 at every width above 640px while the column ran at
     * x=180 on a 1512px viewport, x=144 at 1440 and x=64 at 1280 — and at 1024 and below,
     * where the column is flush at x=24, it put the hero copy FURTHER in than the body
     * text. So it went onto the measure on all seven.
     *
     * Hunter then split them: on the homepage the copy goes back to the image edge, and
     * on the other six it stays on the measure. That reads as one decision rather than
     * two once you look at what each page is. The homepage hero is a photograph with a
     * proposition laid on it — the words belong to the picture, and hanging them on the
     * body grid pulls them away from it. The other six are page headers that happen to be
     * photographic, and their job is to title the page below, so their first line lines up
     * with every heading under it.
     *
     * `mx-auto max-w-[1200px] px-6` is the measure, spelled the same way in Band,
     * SiteHeader, SiteFooter, every page container and this component's own no-photography
     * fallback. Written as those three utilities rather than as a shared constant because
     * that is how the rest of the codebase writes it.
     */
    const overlay = (variant: 'screen' | 'band') =>
      render(<PageHero copy={COPY} slides={SLIDES} variant={variant} />)
        .container.querySelector('[data-hero-overlay]')!.className

    const band = overlay('band')
    expect(band).toMatch(/\bmx-auto\b/)
    expect(band).toMatch(/max-w-\[1200px\]/)
    expect(band).toMatch(/\bpx-6\b/)

    const screen = overlay('screen')
    // Not the measure: the words stay on the photograph rather than on the body grid.
    expect(screen).not.toMatch(/\bmx-auto\b/)
    expect(screen).not.toMatch(/max-w-\[1200px\]/)
    // The inset the homepage had before it went onto the measure. `p-6`/`sm:p-10` set the
    // vertical padding too, which the two overrides below then replace — so this cannot
    // be narrowed to `px-`, and the vertical values have to stay after it in the string.
    expect(screen).toMatch(/(?:^|\s)p-6\b/)
    expect(screen).toMatch(/\bsm:p-10\b/)
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
