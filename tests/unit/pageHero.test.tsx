import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { PageHero } from '@/components/layout/PageHero'
import { HeroCarousel } from '@/components/layout/HeroCarousel'
import { HERO_PATHS, showsHero } from '@/lib/heroPages'
import { HEADER_RESERVATION } from '@/lib/headerReservation'
import { stripComments } from '../shared/sourceScan'

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
 * the viewport and the height of it. It is a picture with words on it, and the page is
 * scrolled to reach anything else.
 *
 * `band` — the other six section pages. The photograph is 420/500/560px tall by
 * breakpoint. It is a page header that happens to be photographic.
 *
 * **The variant is now about HEIGHT alone.** It used to carry where the copy sat as well:
 * `screen` floated it at a fixed inset from the image edge while `band` put it on the
 * content measure. Hunter reversed that on 2026-09-15 — the homepage copy is on the
 * measure like the other six, in line with the text below it — so the two shapes differ in
 * `box` and `sizes` and agree on `copy`.
 *
 * Both shapes existed separately for a day each, applied to all seven pages, before
 * Hunter looked at the two and split them by height. Which is why the variant is one prop
 * with two named values and not two booleans: the combinations are named and only the two
 * that are wanted are reachable.
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
     * aspect, and the crop is 1600x900, so that factor is 1.78.
     *
     * Above `sm` that is 1444 CSS px in `screen` and 747 CSS px in `band` at 375x812 —
     * 3.85x and 1.99x the width of the viewport. `100vw` understates the paint in BOTH
     * shapes, so the understatement is not what decides this. What decides it is how far
     * short of the paint the chosen variant falls.
     *
     * Below `sm` those two numbers no longer apply to a phone at all: `PHONE_PHOTO_CAP`
     * holds the photograph to 400px in both shapes, so both paint 712 CSS px there. That
     * is why `screen`'s phone clause is 225vw rather than the 400vw it carried until
     * 2026-09-16, and why `band`'s absence of one did not change — it painted 747 before
     * the cap and 712 after, both hinted at 100vw.
     *
     * With `100vw` in `band` the browser picks 640w at DPR 1, 750w at DPR 2 and 1200w at
     * DPR 3 — worst case 1.87x short of the 2241 device px that box wants, and at DPR 1 a
     * 1.17x upscale. With `100vw` in `screen` the same 1200w was painted across 1444 CSS
     * px, so it was upscaled at DPR 1 too and 3.6x short at DPR 3, over the whole first
     * screen and visibly soft.
     *
     * So `screen`'s hint is corrected and `band`'s is not, and the reason is proportion
     * rather than a clean line: even corrected, `screen` is 2.71x short at DPR 3 because
     * the 1600px crop cap is below the 4332 device px it wants, which leaves `band` at
     * 1.87x already sharper than the page that got the expensive hint. Correcting `band`
     * as well would cost 49KB and 141KB for the two crops of a first paint — the spread
     * is the photographs, not the widths — on six pages, for about a third of a linear
     * pixel.
     */
    const screen = img({ variant: 'screen' }).getAttribute('sizes')!
    // A phone is asked for several times its own width, because that is what it paints.
    //
    // The multiplier came down from 400vw to 225vw on 2026-09-16 and the reason is the
    // phone crop cap, not a re-derivation of the same box: `PHONE_PHOTO_CAP` holds the
    // photograph to 400px below `sm`, so the paint is a flat 712 CSS px there instead of
    // the 1444 this number was calibrated against. 712 over the narrowest phone, 320px,
    // is 2.23x — and the narrowest phone is what the clause has to clear, because that is
    // where the multiplier is largest.
    const phone = screen.match(/\(max-width:\s*640px\)\s*(\d+)vw/)
    expect(phone, 'no narrow-viewport clause').not.toBeNull()
    expect(Number(phone![1])).toBeGreaterThanOrEqual(223)
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
    // Measured rather than assumed, and it is close in `band`: /about's copy needs 400px
    // inside the 420px floor at 375px wide, and stops fitting just below that — 423px at
    // 360px wide and 456px at 320px, both of which grow the box. The homepage's copy is
    // longer and needs 477px at 375px wide, which is what made this the clipping case
    // while it ran at this height. In `screen` it is the landscape phone, 375px tall,
    // which is less than the header reservation plus four lines of copy.
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

  it('draws the scrim from the scrim token rather than an rgba literal', () => {
    /*
     * The scrim is `scrim` at three opacities. Written as `rgba(26,26,26,...)` it is that
     * value copied by hand into three places in one class string, which a token swap
     * cannot follow.
     *
     * It is bound to `scrim`, not `ink`, on purpose: `scrim` is a distinct role from `ink`
     * precisely so that spec §9's re-theme, which moves `ink` to #EDEDEB, does not lighten
     * it too. A scrim's job is to darken the photograph behind the white hero copy — if it
     * had stayed bound to `ink` it would have gone near-white right along with body text,
     * and the white copy on top would have measured about 1.5:1 instead of staying legible.
     *
     * Tailwind v4 takes an opacity modifier on a theme colour, so `from-scrim/90` is the
     * same pixels and moves with the token.
     */
    const { container } = render(<HeroCarousel slides={SLIDES} />)
    const scrim = container.querySelector('span[class*="bg-gradient-to-t"]')!
    expect(scrim.className).toMatch(/from-scrim\/90/)
    expect(scrim.className).toMatch(/via-scrim\/55/)
    expect(scrim.className).toMatch(/to-scrim\/25/)
    expect(scrim.className).not.toMatch(/rgba/)
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

  it('holds the content measure in both variants', () => {
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

    /*
     * **And settled a third time, on 2026-09-15: Hunter reversed the split.** The homepage
     * copy is back on the measure, in line with the text below it, so all seven pages sit
     * on the content column again and `screen` and `band` are indistinguishable here.
     *
     * The paragraph above is kept rather than rewritten because the reasoning that put the
     * homepage on the image edge was real and may come back; what changed is the decision,
     * not the argument. Worth knowing why it looked fine for a week: below 1248px the
     * measure is flush at x=24 and `sm:p-10` puts the copy at x=40, sixteen pixels apart
     * and invisible. The gap only opens on a wide desktop, where at 1440px the column is
     * at x=144 and the old inset held the headline at x=40.
     *
     * This assertion is deliberately identical to `band`'s rather than deleted. If someone
     * splits them again it should be a decision with a test behind it, which is what the
     * last two turns of this were.
     */
    const screen = overlay('screen')
    expect(screen).toMatch(/\bmx-auto\b/)
    expect(screen).toMatch(/max-w-\[1200px\]/)
    expect(screen).toMatch(/\bpx-6\b/)
    // The image-edge inset is gone, not merely overridden. `p-6` set vertical padding too,
    // so a leftover would still be doing something even with the measure present.
    expect(screen).not.toMatch(/(?:^|\s)p-6\b/)
    expect(screen).not.toMatch(/\bsm:p-10\b/)
  })

  it('reserves room at the top for the header that now sits over it', () => {
    /*
     * Measured, not guessed — and now shared with `HeroCarousel`'s overlay via
     * `HEADER_RESERVATION` rather than spelled out here a second time, which is how the two
     * went out of step in the first place. See src/lib/headerReservation.ts for the
     * measurements: the header grew from one row to two on a phone (spec §5), and the
     * reservation grew with it so the eyebrow still clears it.
     *
     * Two assertions, because the loop alone is tautological — it passes for any value of
     * the constant, including a value too small to clear the header. It still earns its
     * place: it pins that the overlay consumes the shared constant rather than spelling the
     * padding itself, which is the duplication this module was created to end. But the
     * magnitude needs its own guard, so the base-token assertion is here too: an edit that
     * lowers the base reservation now fails in milliseconds at the unit level instead of
     * only in the 320px Playwright clearance tests, which are the real proof but are also
     * the slowest and most easily skipped thing in the repo.
     *
     * Asserted as the FIRST token being exactly `pt-48`, not as the string containing
     * `pt-36`. The reservation reads `pt-48 min-[390px]:pt-36 md:pt-28` now, so
     * `toContain('pt-36')` — which is a natural thing to reach for — matches the
     * `min-[390px]:` variant regardless of what the base token is, and would go green even
     * if the base were weakened to something like `pt-4`. The base is the unprefixed
     * token, it is the one that governs 320px, and 320px is where the header is 153px in
     * the fallback face.
     */
    const { container } = render(<PageHero copy={COPY} slides={SLIDES} />)
    const overlay = container.querySelector('[data-hero-overlay]')!
    for (const token of HEADER_RESERVATION.split(' ')) {
      expect(overlay.className).toContain(token)
    }
    expect(
      HEADER_RESERVATION.split(' ')[0],
      'the base reservation left pt-48 — at 320px the fallback-font header is 153px tall',
    ).toBe('pt-48')
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
      '/strategy',
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

/**
 * Task 7: the five hero stats move onto the hero photograph rather than sitting in their
 * own band between the hero and the factors band. `stats` is an optional prop on
 * `PageHero` — only the homepage (the `screen` variant) supplies one, but the prop itself
 * does not know that, so the six `band` pages are unaffected by construction rather than
 * by convention.
 */
describe('PageHero stats', () => {
  const STATS = [
    { figure: '$100M+', label: 'AUM' },
    { figure: '1,350+', label: 'Units managed' },
  ]

  it('renders the stat figures and labels inside the overlay when given stats', () => {
    const { container } = render(<PageHero copy={COPY} slides={SLIDES} stats={STATS} />)
    const overlay = container.querySelector('[data-hero-overlay]')
    expect(overlay, 'no [data-hero-overlay] element at all').not.toBeNull()
    expect(overlay!.textContent).toContain('$100M+')
    expect(overlay!.textContent).toContain('AUM')
    expect(overlay!.textContent).toContain('1,350+')
    expect(overlay!.textContent).toContain('Units managed')
  })

  it('renders the stats below the buttons, not before them', () => {
    const { container } = render(
      <PageHero
        copy={{ ...COPY, primaryCta: { label: 'View portfolio', href: '/portfolio' } }}
        slides={SLIDES}
        stats={STATS}
      />,
    )
    const overlay = container.querySelector('[data-hero-overlay]')!
    const html = overlay.innerHTML
    expect(html.indexOf('View portfolio')).toBeGreaterThan(-1)
    expect(html.indexOf('AUM')).toBeGreaterThan(html.indexOf('View portfolio'))
  })

  it('renders no stat markup at all when given none', () => {
    // No `stats` prop at all — the shape every one of the six `band` pages calls this
    // component with today. A dataset with no `heroStat` documents behaves the same way:
    // page.tsx guards on `stats.length > 0` before it ever passes the prop down.
    const { container } = render(<PageHero copy={COPY} slides={SLIDES} />)
    expect(container.querySelector('[data-stat-band]')).toBeNull()
  })

  it('renders no stat markup in the no-photography fallback either', () => {
    const { container } = render(<PageHero copy={COPY} slides={[]} />)
    expect(container.querySelector('[data-stat-band]')).toBeNull()
  })

  it('never opens the fallback stat band to five columns at lg — it sits in the same 424px measure as the photograph branch', () => {
    // The defect this pins: both branches render inside `max-w-[42ch]` (424px). The
    // photograph branch passes `tone="onPhoto"`, the fallback passes `tone="default"` —
    // but `tone` is colour, not layout, and `columns` (independent of `tone`) is what
    // must stay `"narrow"` here. Before that split, `tone="default"` silently restored
    // the `lg:` five-column override for this 424px box the moment there was no
    // photograph, crushing the same five stats to ~45px each at >=1024px — the exact
    // defect the on-photo fix removed one branch over. This is the combination nothing
    // else covers: the no-photography fallback WITH stats.
    const five = Array.from({ length: 5 }, (_, i) => ({ figure: String(i), label: `l${i}` }))
    const { container } = render(<PageHero copy={COPY} slides={[]} stats={five} />)
    const statBand = container.querySelector('[data-stat-band]')!
    expect(statBand, 'no [data-stat-band] rendered').not.toBeNull()
    expect(statBand.className).not.toContain('lg:[grid-template-columns')
  })

  it('needs no pointer-events opt-in, unlike the buttons', () => {
    // The overlay disables pointer-events so the photograph underneath stays clickable;
    // the buttons opt back in because they are interactive. The stats are plain text, so
    // an opt-in here would be a silent regression — it would carve a dead click zone out
    // of the whole-hero link for content that was never meant to capture the pointer.
    const { container } = render(<PageHero copy={COPY} slides={SLIDES} stats={STATS} />)
    const statBand = container.querySelector('[data-stat-band]')!
    expect(statBand).not.toBeNull()
    expect(statBand.className).not.toMatch(/pointer-events-auto/)
    expect(statBand.closest('.pointer-events-auto')).toBeNull()
  })

  it('colours the figures and labels through the same onPhoto route Eyebrow uses, not a new pairing', () => {
    const { container } = render(<PageHero copy={COPY} slides={SLIDES} stats={STATS} />)
    const statBand = container.querySelector('[data-stat-band]')!
    // The figure takes the same `text-white` this file already uses for the h1 on a
    // photograph — not a new colour, the existing one.
    const figure = statBand.querySelector('[data-stat-figure]')!
    expect(figure.className).toMatch(/\btext-white\b/)
    expect(figure.className).not.toMatch(/text-white\//)
    // The label takes exactly Eyebrow's `onPhoto` value (`text-white/80`), not an
    // invented adjacent opacity like /70 or /75.
    const label = statBand.querySelector('[data-stat-label]')!
    expect(label.className).toMatch(/text-white\/80\b/)
  })

  it('does not ground the on-photograph stats in the panel/border treatment the banded version uses', () => {
    // border-rule and bg-panel are tokens for a hairline and a fill against a WHITE
    // ground. Against a photograph under a dark scrim they either vanish or read as a
    // stray box, so the on-photo tone must not carry them.
    const { container } = render(<PageHero copy={COPY} slides={SLIDES} stats={STATS} />)
    const statBand = container.querySelector('[data-stat-band]')!
    expect(statBand.className).not.toMatch(/bg-panel/)
    expect(statBand.className).not.toMatch(/border-rule/)
  })

  it('uses no physical-direction utilities in the stat markup', () => {
    const { container } = render(<PageHero copy={COPY} slides={SLIDES} stats={STATS} />)
    expect(container.innerHTML).not.toMatch(
      /\b(?:[a-z0-9-]+:)*-?(?:ml|mr|pl|pr|border-l|border-r|text-left|text-right)-?\b/,
    )
  })
})

/**
 * `/` is an async server component (`fetchSanity` imports `server-only`), so it cannot be
 * rendered under jsdom — `homepage.test.tsx` and `portfolioPage.test.tsx` hit the same
 * wall and settled on scanning the source with comments stripped. Same approach here.
 */
describe('the homepage no longer renders a separate stat band', () => {
  const pageSource = stripComments(
    readFileSync(resolve(import.meta.dirname, '../../src/app/(site)/page.tsx'), 'utf8'),
  ).replace(/\r\n/g, '\n')

  it('does not render <StatBand> as its own element', () => {
    // The five stats moved onto the hero photograph (spec §6) via PageHero's new `stats`
    // prop. A standalone `<StatBand` between the hero and the factors band would mean
    // they render twice.
    expect(pageSource).not.toMatch(/<StatBand\b/)
  })

  it('passes stats to PageHero instead', () => {
    expect(pageSource).toMatch(/<PageHero\b[\s\S]*?\bstats=/)
  })

  it('still guards on stats.length, so an empty heroStat dataset renders no stat row', () => {
    expect(pageSource).toMatch(/stats\.length\s*>\s*0/)
  })
})

/**
 * The hero copy's entrance — Hunter asked for the old em-8.com's fade-up on every page
 * with an image hero, 2026-09-17.
 *
 * Three of these four assertions are about the *failure modes of an entrance effect*
 * rather than about the effect, because the effect itself is the part a person can see
 * and the failures are the part nobody looks at:
 *
 *   - a Tailwind animation utility with no matching `--animate-*` in the theme compiles
 *     to nothing at all, silently, and the page just never animates;
 *   - an animation that ends anywhere but the resting position leaves the page's only
 *     `<h1>` parked 48px down forever;
 *   - and the old site's own version of this is *broken right now* for exactly the third
 *     reason in its JS form — on a reload with the photograph cached its copy never
 *     leaves `opacity-0`, measured on em-8.com on 2026-09-17.
 *
 * jsdom will not run the animation (no layout, no compositor — the same limit
 * `docs/handover-2026-09-16-map-and-lightbox-fixes.md` records for the 0x0 deadlock), so
 * what a unit test can pin is that the utility is on the right element, that the theme
 * defines it, and that its keyframes cannot strand the copy. Where it actually *lands* is
 * checked on a real page, in `tests/e2e/site.spec.ts`.
 */
describe('the hero copy rises into place', () => {
  const globalsCss = stripComments(
    readFileSync(resolve(import.meta.dirname, '../../src/app/globals.css'), 'utf8'),
  ).replace(/\r\n/g, '\n')

  it('animates the overlay on every page that has a photograph', () => {
    // Both variants: `screen` is the homepage and `band` is the other six. The animation
    // is deliberately not one of the things `SHAPE` varies — Hunter asked for it on all
    // the pages with an image hero, and a per-variant answer here is how it would come to
    // be on one of them.
    for (const variant of ['screen', 'band'] as const) {
      const overlay = render(<PageHero copy={COPY} slides={SLIDES} variant={variant} />)
        .container.querySelector('[data-hero-overlay]')!
      expect(overlay.className, `${variant} overlay does not animate`).toMatch(
        /\banimate-hero-rise\b/,
      )
      cleanup()
    }
  })

  it('drops the animation under prefers-reduced-motion', () => {
    // A full-width block of type translating 48px is the vestibular trigger, so the whole
    // animation goes rather than the transform alone. Safe to drop wholesale *because*
    // the resting style is the end state — see the keyframe test below, which is what
    // makes this a no-op rather than a hidden headline.
    const { container } = render(<PageHero copy={COPY} slides={SLIDES} />)
    expect(container.querySelector('[data-hero-overlay]')!.className).toMatch(
      /\bmotion-reduce:animate-none\b/,
    )
  })

  it('leaves the no-photograph fallback alone', () => {
    /*
     * The branch that renders when the CMS has lost its slides. There is no photograph
     * for the copy to arrive over, and this is the page's only `<h1>` rendering in its
     * degraded form — the last element on the site to make conditional on an animation.
     *
     * Asserted on the rendered class rather than on the source, so it fails if the
     * utility is ever hoisted to a wrapper both branches share.
     */
    const { container } = render(<PageHero copy={COPY} slides={[]} />)
    expect(container.querySelector('[data-hero-overlay]'), 'the fallback grew an overlay')
      .toBeNull()
    expect(container.innerHTML).not.toMatch(/animate-hero-rise/)
  })

  it('defines hero-rise in the theme, so the utility is not a dangling class name', () => {
    // The failure this catches is silent in every other check in the repo: `tsc` does not
    // read class strings, ESLint does not either, the build succeeds, and Tailwind emits
    // no rule for an `animate-*` utility it has no theme key for. The page simply does
    // not animate and nothing says so.
    expect(globalsCss, 'no --animate-hero-rise in @theme').toMatch(/--animate-hero-rise:/)
    expect(globalsCss, 'no @keyframes hero-rise').toMatch(/@keyframes\s+hero-rise\s*\{/)
  })

  it('ends at the resting position and holds nothing after it finishes', () => {
    /*
     * The one that matters. `from`-only keyframes mean the end of the animation is the
     * element's own style, so the copy cannot settle anywhere but where the six geometry
     * tests in the E2E suite assert it sits — and `backwards` fill means the animated
     * opacity and transform are dropped the instant it completes rather than held.
     *
     * Held `transform` is not cosmetic: a transformed element is a containing block for
     * `position: fixed` descendants. `InvestorPopup` is `fixed inset-0 z-50` and is one
     * component away from this subtree. `forwards` or `both` here would be a stacking
     * fault waiting for the first overlay someone renders inside the hero — the same
     * shape of bug as the Leaflet z-index one in
     * `docs/handover-2026-09-16-map-and-lightbox-fixes.md`, and fixed the same way: at the
     * thing that creates the context, not at the thing it breaks.
     */
    /*
     * Brace-counted rather than matched with a regex, and that is not fussiness: the
     * obvious `\{([\s\S]*?\})` stops at the first closing brace, which is the end of the
     * `from` block — so it reads a rule containing `to` as a rule containing only `from`
     * and goes green on exactly the fault it exists to catch. Seen doing precisely that
     * before this was rewritten.
     */
    const open = globalsCss.search(/@keyframes\s+hero-rise\s*\{/)
    expect(open, 'could not find the hero-rise keyframes').toBeGreaterThan(-1)
    let depth = 0
    let close = globalsCss.indexOf('{', open)
    for (let i = close; i < globalsCss.length; i++) {
      if (globalsCss[i] === '{') depth++
      else if (globalsCss[i] === '}' && --depth === 0) {
        close = i
        break
      }
    }
    const keyframes = globalsCss.slice(globalsCss.indexOf('{', open) + 1, close)
    expect(keyframes, 'hero-rise has a `to` keyframe').not.toMatch(/(^|\s)(to|100%)\s*\{/)

    const animation = globalsCss.match(/--animate-hero-rise:\s*([^;]+);/)![1]
    expect(animation, 'hero-rise holds its animated values after it ends').not.toMatch(
      /\bforwards\b|\bboth\b/,
    )
    expect(animation, 'hero-rise does not apply its from-state before it starts').toMatch(
      /\bbackwards\b/,
    )
  })
})
