import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { HeroCarousel } from '@/components/layout/HeroCarousel'
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

const PHYSICAL = /\b(?:[a-z0-9-]+:)*-?(?:ml|mr|pl|pr|border-l|border-r|text-left|text-right)-?\b/

/**
 * The component's own source with comments stripped.
 *
 * Two facts about this component ship but cannot be rendered here: the Sanity crop cap
 * (`urlForImage` is mocked to a fixed URL that discards the width it was handed) and
 * `quality` (consumed by next/image rather than emitted as an attribute). Scanning the
 * source is the repo's idiom for that — see `pageHero.test.tsx` — and comments are
 * stripped because the docblocks explain these numbers by naming them, and would
 * otherwise satisfy the assertions on their own.
 */
const heroSource = () =>
  stripComments(
    readFileSync(resolve(import.meta.dirname, '../../src/components/layout/HeroCarousel.tsx'), 'utf8'),
  )

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
    // `object-cover` on a box taller than the crop is shaped paints the photograph wider
    // than the box and crops the sides off, so the painted width is the box HEIGHT times
    // 1.78, and the hint has to describe that rather than the box.
    //
    // `screen` covers its whole box on a phone again since 2026-09-23 ("like the
    // computer"), and that box is 900–1070px tall because the copy grows it. The narrowest
    // phone is where the multiplier is largest: about 1070px at 320 wide paints about 1900
    // CSS px, 5.9x. So the clause has to clear ~595vw. The upper bound stops it drifting
    // into a number nothing paints.
    //
    // `band` keeps its 400px phone cap, painting 712 CSS px, and is hinted at 100vw on
    // purpose: it painted 747 before the cap, so the 2026-09-15 reasoning that declined to
    // correct it stands.
    const sizesFor = (variant: 'screen' | 'band') =>
      render(<HeroCarousel slides={many} variant={variant} />)
        .container.querySelector('img')!
        .getAttribute('sizes')!

    const screen = sizesFor('screen')
    const phone = screen.match(/\(max-width:\s*640px\)\s*(\d+)vw/)
    expect(phone, 'no narrow-viewport clause').not.toBeNull()
    expect(Number(phone![1])).toBeGreaterThanOrEqual(595)
    expect(Number(phone![1])).toBeLessThan(700)
    expect(screen.endsWith('100vw')).toBe(true)

    expect(sizesFor('band')).toBe('100vw')
  })

  /*
   * The phone crop cap, which only the six `band` pages keep now.
   *
   * Hunter's complaint on 2026-09-16 was that the carousel was "too zoomed in" on a phone,
   * and the cap was the fix: `object-cover` on a box far taller than 16:9 magnifies the
   * photograph until it covers the HEIGHT. On 2026-09-23 he chose that zoom back for the
   * homepage, to match the desktop, so `screen` has no cap and its scrim covers the box.
   *
   * On `band` the fix is still TWO numbers that have to stay equal: the photograph is
   * capped at 400px and the phone scrim is 400px tall, which puts the gradient's opaque end
   * exactly on the photograph's bottom edge. Move one and the hero grows a visible seam.
   * Tailwind scans source for literal class names, so this test holds them together.
   */
  it('caps the band pages’ phone crop and scrim at the same height, and not the homepage', () => {
    const band = render(<HeroCarousel slides={many} variant="band" />).container
    const img = band.querySelector('img')!
    const scrim = band.querySelector('a > span')!
    const cap = img.className.match(/max-h-\[(\d+)px\]/)
    expect(cap, `no phone cap on the band image: ${img.className}`).not.toBeNull()
    const scrimH = scrim.className.match(/(?:^|\s)h-\[(\d+)px\]/)
    expect(scrimH, `no phone height on the band scrim: ${scrim.className}`).not.toBeNull()
    expect(scrimH![1], 'the scrim no longer ends where the photograph does').toBe(cap![1])
    expect(cap![1]).toBe('400')
    // Lifted above `sm`, where the box is not tall relative to its width.
    expect(img.className).toMatch(/\bsm:max-h-none\b/)
    expect(scrim.className).toMatch(/\bsm:h-auto\b/)
    expect(scrim.className).toMatch(/\bsm:inset-0\b/)

    cleanup()
    const home = render(<HeroCarousel slides={many} variant="screen" />).container
    expect(home.querySelector('img')!.className).not.toMatch(/max-h-\[/)
    const homeScrim = home.querySelector('a > span')!.className
    expect(homeScrim).toMatch(/(?:^|\s)inset-0\b/)
    expect(homeScrim).not.toMatch(/(?:^|\s)h-\[/)
  })

  /*
   * The six `band` pages: measured on all seven slides at 390x844, white text, 2026-09-16.
   * The eyebrow lands at y=144 there — `HEADER_RESERVATION` is `pt-36` at 390px and up —
   * which is 64% of the way up a 400px photograph, so a middle stop at the default 50% left
   * it under 58% scrim and 3.79:1 against AA's 4.5. Pinning the stop at 65% puts 70% scrim
   * at that line. This is the assertion that would catch someone "tidying" the explicit
   * stop positions back to Tailwind's defaults.
   *
   * The homepage (`screen`): the desktop's own gradient at every width since 2026-09-23,
   * so it is pinned to be exactly the band's `sm:` stops with the prefix dropped. If the
   * desktop gradient ever changes, the homepage's phone moves with it.
   */
  it('keeps the band pages’ phone scrim, and gives the homepage the desktop gradient with a darker phone middle', () => {
    const scrimOf = (variant: 'screen' | 'band') =>
      render(<HeroCarousel slides={many} variant={variant} />).container.querySelector(
        'a > span',
      )!.className

    const band = scrimOf('band')
    expect(band).toMatch(/\bvia-scrim\/70\b/)
    expect(band).toMatch(/\bvia-65%/)
    expect(band).toMatch(/\bto-scrim\/10\b/)
    // Fully opaque at the photograph's bottom edge, so it meets `bg-scrim` exactly.
    expect(band).toMatch(/\bfrom-scrim\b(?!\/)/)
    expect(band).toMatch(/\bsm:from-scrim\/90\b/)
    expect(band).toMatch(/\bsm:via-scrim\/55\b/)
    expect(band).toMatch(/\bsm:to-scrim\/25\b/)

    // The homepage on a phone: the desktop's ends, with the middle at 75% (Hunter chose it
    // over 65% on 2026-09-23). From `sm` up the middle returns to the desktop's 55%, so the
    // computer view is the band's desktop gradient exactly.
    const home = scrimOf('screen')
    expect(home).toMatch(/(?:^|\s)via-scrim\/75\b/)
    expect(home).toMatch(/\bsm:via-scrim\/55\b/)
    const stops = (c: string, prefix: string) =>
      c.split(/\s+/).filter((k) => /^(?:from|via|to)-/.test(k.slice(prefix.length)) && k.startsWith(prefix))
        .map((k) => k.slice(prefix.length)).sort().join(' ')
    const desktop = stops(home, '').replace('via-scrim/75', 'via-scrim/55')
    expect(desktop).toBe(stops(band, 'sm:'))
  })

  /*
   * The crop cap and the quality, read off the source.
   *
   * Neither is observable here: `urlForImage` is mocked to a fixed URL that discards the
   * width it was handed, and `quality` is consumed by next/image rather than rendered as
   * an attribute. The repo's idiom for a fact that ships but cannot be rendered is to
   * scan the source with comments stripped — see `pageHero.test.tsx` — so that the
   * docblocks which spell these numbers out in order to explain them cannot satisfy the
   * assertion themselves.
   *
   * Why they are pinned together: the Sanity crop and the `<Image>` intrinsic pair must
   * agree, or the aspect ratio breaks. 1600x900 is 16:9 exactly.
   *
   * **The cap stays at 1600, and PR 4 raising it to 2048 is why this test exists.** §7
   * named the cap as its third resolution lever and the plan carried it as far as a
   * measurement. Both halves of that measurement said no:
   *
   *   - **It breaks a budget nothing gates.** At 2048 the page images on `/portfolio` at
   *     desktop 1512x900 measured 1564 KB against a 1400 KB budget, and 2556 KB total
   *     against 2200 KB. `lighthouse-budget.json` declares those limits for `/*`, but
   *     `scripts/lighthouse.sh` only ever loads `/` — which sits at 754 KB and passes
   *     comfortably. The overage would have shipped green.
   *   - **It buys no sharpness on the image that matters.** The first slide is the
   *     `priority` one and the LCP, and its Sanity source asset is 1600x917. Sanity does
   *     not upscale, so at a 2048 cap it still served a 1600x900 bitmap — verified by
   *     fetching the URL, since `naturalWidth` reads 649 for it at DPR 3. Only the second
   *     slide (4160x3117) actually grew, and it grew by 202 KB.
   *
   * So the way to sharpen this hero is a better source asset, not a bigger cap. Raising
   * the cap before that photograph is re-shot spends the budget on the one slide a
   * visitor sees second.
   */
  it('keeps the 1600px crop cap, at 16:9, in both the crop and the intrinsic size', () => {
    expect(heroSource()).toContain('.width(1600).height(900)')
    expect(heroSource()).toMatch(/width=\{1600\}/)
    expect(heroSource()).toMatch(/height=\{900\}/)

    // The ratio is read back OUT of the source, not asserted on two literals — a
    // `expect(1600 / 900).toBeCloseTo(16 / 9)` would be arithmetic on constants written
    // in the test and would stay green while the component said anything at all. These
    // two numbers are whatever `urlForImage` is actually being handed.
    const [, w, h] = heroSource().match(/\.width\((\d+)\)\.height\((\d+)\)/)!
    expect(Number(w) / Number(h), `the crop is ${w}x${h}, which is not 16:9`).toBeCloseTo(16 / 9, 5)
  })

  /*
   * 68 → 75. `next.config.ts` allowlists both, so 68 was genuinely being served at
   * `7d0d9ff` — confirmed by reading `q=68` off the deployed hero URL before the change,
   * which is what makes this a real change rather than the no-op the budget doc's
   * generic warning would suggest. Measured after: `q=75` on the wire, +31 KB on `/`.
   */
  it('serves the hero at quality 75', () => {
    expect(heroSource()).toMatch(/quality=\{75\}/)
    expect(heroSource()).not.toMatch(/quality=\{68\}/)
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
