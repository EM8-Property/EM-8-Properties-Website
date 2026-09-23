'use client'

import { useEffect, useMemo, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { urlForPhoto } from '@/sanity/image'
import { usableSlides, type CarouselSlide } from '@/lib/heroSlides'
import { HEADER_RESERVATION } from '@/lib/headerReservation'
import { phoneHeroFadeStyle, type PhoneHeroFade } from '@/lib/phoneHeroFade'

/*
 * Re-exported so the seven pages can keep importing the type from the component they are
 * rendering. It is a type-only re-export, which is erased at compile time — the *function*
 * deliberately is not re-exported, because this is a `'use client'` module and a server
 * component calling anything it exports fails the build.
 */
export type { CarouselSlide }

const INTERVAL_MS = 6000

/**
 * How the photograph is drawn, and the one thing about it that is not the same on a phone.
 *
 * `object-cover` on a box taller than the crop is shaped scales the photograph until it
 * covers the HEIGHT and throws the overflow off the sides. The crop is 1600x900, so the
 * painted width is the box height times 1.78 — and on a phone that is most of the picture
 * gone. Measured on the live site at 375x812 on 2026-09-16:
 *
 *   screen  box 957 tall  paints 1703 CSS px  4.54x the viewport  —  22% of the photo visible
 *   band    box 453 tall  paints  813 CSS px  2.17x the viewport  —  46% of the photo visible
 *
 * The homepage was the complaint: an interior shot magnified until it read as two bar
 * stools and a ceiling tile. `band` at 2.17x still reads as a room, which is why that
 * number is the target here rather than 1.0 — it is a measured example of a crop that
 * works, not a guess.
 *
 * The homepage's 957px is worth reading twice, because it rules out the obvious fix. It is
 * NOT `min-h-svh` (812 at that size). It is the overlay — eyebrow, four-line headline,
 * five-line paragraph, two buttons and the four stats — growing the box past its floor.
 * Lowering `min-h-svh` on a phone therefore does nothing at all to the homepage. The
 * height is the copy's, and the copy is the CMS's.
 *
 * So the photograph stops covering the box instead. Below `sm` it is capped at 400px and
 * masked out over its last 40%, and the section's own background carries the rest. 400px
 * paints 712 CSS px, which is 1.90x at 375 wide and 2.23x at 320 — both inside what `band`
 * already demonstrated is legible. The box, the copy and the header reservation are all
 * untouched, so every measurement the E2E suite pins about hero height and header
 * clearance still holds.
 *
 * Two consequences worth stating rather than discovering:
 *
 *   - The section background is now `bg-scrim`, not `bg-panel`. `bg-panel` is #F5F5F3 and
 *     the hero copy is white; once the photograph stops reaching the bottom of the box,
 *     panel would put white text on near-white. `scrim` is the same #1A1A1A the gradient
 *     below already fades to, so the masked edge of the photograph dissolves into it
 *     rather than landing on a seam. On a desktop the photograph covers the box and this
 *     is invisible either way.
 *   - Above `sm` nothing changes. A tablet is not tall relative to its width in the way a
 *     phone is, and the cap would crop the top of the picture off instead.
 */
const PHONE_PHOTO_CAP = 'max-h-[400px] sm:max-h-none'

/**
 * The scrim, which the cap forced to be rewritten rather than left alone — and this is the
 * part of the change that was not obvious from the complaint.
 *
 * The gradient is anchored to the BOX. On the homepage that box is 957px, so `to-scrim/25`
 * lands at the top and `from-scrim/90` at the bottom, and the eyebrow at y=192 sits under
 * **38%** scrim. That was survivable while the photograph was magnified 4.5x, because what
 * landed behind the copy was a small dark patch of whatever the crop happened to catch.
 * Zoom out and the copy sits on the picture's real content, which on half these slides is
 * a white kitchen or a pale brick elevation.
 *
 * Measured on all seven homepage slides at 375px wide, white eyebrow text, 2026-09-16:
 *
 *   photo luminance behind the eyebrow   0.19 – 0.53   (slide to slide)
 *   contrast, box-anchored scrim @ 38%   2.76 – 4.98   — fails AA on the pale slides
 *   contrast, photo-anchored scrim @ 73% 5.20 – 8.28   — passes AA on all of them
 *
 * Worth recording because it reframes the change: **the box-anchored scrim was already
 * failing.** On the old crop the same eyebrow measured 2.42 on 382 Penn and 3.34 on ReVerb
 * against AA's 4.5. The magnified crop was not protecting the text, it was making the
 * failure depend on which slide was showing. What follows fixes that outright rather than
 * restoring it.
 *
 * So on a phone the gradient is anchored to the PHOTOGRAPH — the same 400px the cap sets —
 * instead of to the box. The shape is unchanged, it is just compressed into the part of
 * the box that has a picture in it:
 *
 *   - top of the photo, `to-scrim/10`. Nothing is written above y=144, and that band is the
 *     part of the change Hunter actually asked for. It stays close to clear.
 *   - the middle stop is at **65%** rather than the default 50%, and that placement is the
 *     whole trick. `HEADER_RESERVATION` is `pt-48` below 390px and `pt-36` at 390px and
 *     up, so the eyebrow starts at y=192 on a small phone and y=144 on a large one — and
 *     y=144 is 64% of the way up a 400px photo. A stop at the default 50% would have left
 *     that eyebrow at 58% scrim and 3.79:1, failing AA on exactly the phones most people
 *     hold. Pinning the stop at 65% puts 70% scrim at y=144 instead.
 *   - 70% at that stop, derived from the palest slide rather than the average: 0.528
 *     luminance needs 66.6% to reach 4.5:1, and 70% clears it with a little room.
 *   - bottom of the photo, `from-scrim` at full opacity. Not 90%: at full opacity the
 *     photograph's bottom edge is exactly the section's own `bg-scrim`, so the capped
 *     photo dissolves into the background with no seam and no mask on the image. At 90% a
 *     bright slide leaves a visible step there.
 *
 * The cap being a fixed 400px rather than a multiple of the viewport width is what makes
 * that stop placement hold. A `vw`-based cap would keep the zoom constant across phones
 * but let the photo grow taller than the copy, which walks the eyebrow up into the clear
 * end of the gradient — at 639px wide it measured 2.85:1. With a fixed photo height the
 * eyebrow lands at one of exactly two places, y=192 or y=144, whatever the viewport does.
 *
 * Above `sm` the cap is lifted and this reverts to the box-anchored gradient the desktop
 * has always had, unchanged. The pale-slide problem is a phone problem: it exists because
 * the copy is tall relative to the picture, which is only true on a narrow screen.
 *
 * The `400px` here and in `PHONE_PHOTO_CAP` are one number and have to move together —
 * that is what makes the photo's bottom edge and the gradient's dark end the same line.
 * Tailwind scans source for literal class names, so it cannot be interpolated from a
 * constant; `heroCarousel.test.tsx` pins the two against each other instead.
 */
const PHONE_SCRIM_BAND =
  'absolute inset-x-0 top-0 h-[400px] bg-gradient-to-t ' +
  'from-scrim from-0% via-scrim/70 via-65% to-scrim/10 to-100% ' +
  'sm:inset-0 sm:h-auto sm:from-scrim/90 sm:from-0% sm:via-scrim/55 sm:via-50% sm:to-scrim/25 sm:to-100%'

/**
 * The homepage's phone scrim: an even veil over the photograph, with the fade to solid
 * scrim confined to its bottom edge. Both numbers are editable in the Studio under
 * Home page → Phone hero fade and arrive as CSS variables (`phoneHeroFadeStyle` in
 * src/lib/phoneHeroFade.ts, `bg-hero-phone-veil` in globals.css). Defaults: 40% veil,
 * fade in the bottom 5%. Everything from `sm` up is the same string as the band's, so the
 * desktop does not move.
 *
 * How it got here, 2026-09-22. Hunter: "the fade on the iphone is too much, I want to see
 * more of the image". He went through 50%, 30%, 10%, lower fades, slower fades and a text
 * shadow, and settled on the treatment that reads like the desktop hero: an even veil, no
 * shadow, no zoom. The photo stays capped at 400px because anything taller zooms the crop
 * in, which he rejected (that was the 2026-09-16 complaint).
 *
 * **Knowingly accepted: the teal headline line fails contrast on pale slides.** Measured
 * on all seven homepage slides at 320–430 wide, against the brightest 10% of pixels behind
 * each line, at the defaults:
 *
 *     eyebrow (in its 40% pill, needs 4.5)   5.88 – 6.15   passes
 *     h1 white (needs 3.0)                   2.60 – 2.82
 *     h1 teal (needs 3.0)                    1.34 – 1.37
 *
 * Raising the veil in the Studio is the lever if a slide reads badly. The lightest
 * treatment measured to pass without help was a 50%-at-50% gradient (teal 3.20).
 *
 * The six `band` pages keep `PHONE_SCRIM_BAND`. Their copy sits lower on the photo, over
 * its brightest middle, and nobody has reviewed them lighter. Measure them first.
 */
const PHONE_SCRIM_SCREEN =
  'absolute inset-x-0 top-0 h-[400px] bg-hero-phone-veil sm:bg-gradient-to-t ' +
  'sm:inset-0 sm:h-auto sm:from-scrim/90 sm:from-0% sm:via-scrim/55 sm:via-50% sm:to-scrim/25 sm:to-100%'

/**
 * Which shape the band takes. One prop with two named values, not two booleans.
 *
 * `screen` — the homepage. The photograph fills the first screen, the width of the
 * viewport and the height of it, and the copy floats on the image at a fixed inset from
 * its edge. It is a photograph with a proposition laid on it, and the page is scrolled to
 * reach anything else.
 *
 * `band` — the other six section pages. The photograph is 420/500/560px tall by
 * breakpoint and the copy sits on the site's content measure, so the page title lines up
 * with every heading and paragraph below it. It is a page header that happens to be
 * photographic.
 *
 * Each of those two shapes was briefly applied to all seven pages — full screen with the
 * copy on the measure was live for a day — before Hunter split them this way. That is why
 * this is a closed set of two rather than an independent height flag and copy flag: the
 * four combinations include the one that was looked at and rejected, and there is no
 * reason to keep it reachable.
 */
export type HeroVariant = 'screen' | 'band'

/**
 * Everything the two shapes disagree about, in one place, so the differences can be read
 * side by side rather than hunted through three ternaries.
 *
 * Only what differs. The vertical padding that reserves room for the overlaid header and
 * the slide dots is shared, so it lives in the JSX with the other shared classes — a
 * comment claiming the two are the same is worth nothing next to two strings that have to
 * be kept in step by hand.
 *
 * `sizes` is in here and not in the JSX because it is not a styling choice: it is the
 * width the browser should assume the image occupies, and `object-cover` makes that a
 * function of the box's HEIGHT. See the note at the <Image> for the measurements.
 */
const SHAPE: Record<HeroVariant, { box: string; copy: string; sizes: string; scrim: string }> = {
  /*
   * `screen` carried `p-6 sm:p-10` — an inset from the IMAGE edge, not the content column
   * — from 2026-09-0x until 2026-09-15, and that was a decision rather than an oversight.
   * The copy had gone onto the measure on all seven photographic pages; Hunter then split
   * them, homepage back to the image edge, on the reasoning that the homepage hero is a
   * photograph with a proposition laid on it and hanging the words on the body grid pulls
   * them away from the picture.
   *
   * **He reversed that on 2026-09-15: the homepage copy goes back onto the measure, in
   * line with the text below it, as the other six already are.** The split is gone and all
   * seven are on the content column again.
   *
   * Why it reads as wrong on a desktop and fine everywhere else: below 1248px the measure
   * is flush at x=24 and the two are within 16px of each other, so every phone and tablet
   * check passed. At 1440px the column starts at about x=144 while `sm:p-10` held the copy
   * at x=40 — the headline hung a hundred pixels left of its own body text.
   *
   * Both variants now carry the same three utilities. Spelled out rather than hoisted to a
   * constant because that is how `Band`, `SiteHeader`, `SiteFooter`, every page container
   * and `PageHero`'s own no-photograph fallback all spell it; `pageHero.test.tsx` pins both
   * variants against the literal.
   */
  screen: {
    box: 'min-h-svh',
    copy: 'mx-auto max-w-[1200px] px-6',
    /*
     * The phone clause came down from 400vw to 225vw on 2026-09-16, and it is the only
     * part of `sizes` the crop cap moved.
     *
     * 400vw was calibrated on a 375x812 phone where the box was the whole screen and the
     * paint was 3.85x it. `PHONE_PHOTO_CAP` makes that box 400px, so the paint is a flat
     * 712 CSS px below `sm` regardless of how tall the copy grows the section — 1.90x at
     * 375 wide, 2.23x at 320, 1.11x at 639. The clause has to clear the NARROWEST phone,
     * because that is where the multiplier is largest, so it is derived from 320 and not
     * from 375: 712 / 320 = 2.23, rounded up.
     *
     * `band` is deliberately not given a phone clause, and this is the one place the two
     * shapes stopped differing without the code following. The cap applies to both, so
     * both now paint 712 CSS px on a phone — but `band` painted 747 before it (420px box,
     * hinted at 100vw), so nothing about `band` moved and the 2026-09-15 reasoning that
     * declined to correct it stands unchanged. Correcting it now would buy a third of a
     * linear pixel on six pages for about 190KB each. See the note at the <Image>.
     *
     * The tablet and desktop clauses are untouched because the cap is not: `sm:max-h-none`
     * gives the photograph the whole box back at 640px and up, so above the phone this
     * component paints exactly what it painted yesterday.
     */
    sizes: '(max-width: 640px) 225vw, (max-width: 1024px) 200vw, 100vw',
    scrim: PHONE_SCRIM_SCREEN,
  },
  band: {
    box: 'min-h-[420px] sm:min-h-[500px] lg:min-h-[560px]',
    copy: 'mx-auto max-w-[1200px] px-6',
    sizes: '100vw',
    scrim: PHONE_SCRIM_BAND,
  },
}

/**
 * The full-bleed photograph every section page opens on, with that page's own title laid
 * over it by `PageHero`.
 *
 * Content comes from the `siteSettings` singleton, not from each property, so the same
 * photos appear everywhere the band is shown and there is exactly one list to edit.
 *
 * It had two variants once — a thin `banner` strip carrying only a property caption, and a
 * `hero` block capped at the 1200px content column — and both were removed when every page
 * started opening the same way. There are two again, and they are not those two: see
 * `SHAPE` above. What is shared now is everything that matters structurally — the
 * photograph is full-bleed on all seven pages, every page's title sits on it, and the
 * header overlays it. The variant decides a height, a copy inset and a `sizes` hint, and
 * nothing else.
 *
 * Three things this deliberately does, all of which are the difference between a carousel
 * and an accessibility complaint:
 *
 *   - It honours `prefers-reduced-motion`. An auto-advancing band is a vestibular trigger
 *     and, for anyone reading slowly, content that moves out from under them.
 *   - It pauses while hovered or focused, so a keyboard user can actually reach the link
 *     inside a slide before it changes.
 *   - Every slide is a real link with real alt text, so the band is navigation rather than
 *     decoration, and screen-reader users get the same destinations everyone else does.
 *
 * A slide whose property reference is dangling is dropped rather than rendered: a large
 * clickable photograph that goes nowhere is worse than one fewer slide.
 */
export function HeroCarousel({
  slides,
  overlay,
  variant = 'band',
  phoneFade,
}: {
  slides: CarouselSlide[]
  /**
   * The page's own title block, rendered above the slides.
   *
   * A sibling of the slides rather than a child, and this matters: every slide is a
   * `<Link>` to its property, so copy containing its own buttons cannot be nested inside
   * one — interactive elements inside an anchor are invalid and unreachable by keyboard.
   */
  overlay?: React.ReactNode
  /**
   * Which of the two shapes this band takes. See `SHAPE` above for what each one is and
   * why the two are one prop rather than two.
   *
   * Defaults to `band`, which is what six of the seven section pages want. Only the
   * homepage passes `screen`, and it says so at the call site.
   */
  variant?: HeroVariant
  /**
   * The Studio's Home page → Phone hero fade values. Read by `screen` only; `band` has no
   * editable veil and ignores it. See `PHONE_SCRIM_SCREEN`.
   */
  phoneFade?: PhoneHeroFade
}) {
  const scrimStyle = variant === 'screen' ? phoneHeroFadeStyle(phoneFade) : undefined
  const usable = useMemo(() => usableSlides(slides), [slides])
  /*
   * `prev` is the slide being faded OUT, and it is tracked in the same state update as
   * `index` on purpose.
   *
   * Without it, advancing unmounts the outgoing slide's <Image> on the very render that
   * starts its 700ms fade — so the photograph hard-cuts to the bare scrim and the next one
   * fades up out of that, every six seconds, on every page. Recording it in a separate
   * effect would not do: effects run after commit, so the image would still be gone for a
   * frame.
   *
   * It is never cleared. That means the steady state holds three images — outgoing,
   * current, incoming — which is exactly the window this component had before. What the
   * change buys is the *first paint*, where `prev` is null and only two are mounted, and
   * first paint is the number Lighthouse and a visitor actually pay.
   */
  const [{ index, prev }, setSlide] = useState<{ index: number; prev: number | null }>({
    index: 0,
    prev: null,
  })
  const [paused, setPaused] = useState(false)

  useEffect(() => {
    if (usable.length < 2 || paused) return
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return
    const id = setInterval(
      () =>
        setSlide((s) => ({ index: (s.index + 1) % usable.length, prev: s.index })),
      INTERVAL_MS,
    )
    return () => clearInterval(id)
  }, [usable.length, paused])

  if (usable.length === 0) return null

  return (
    <section
      aria-roledescription="carousel"
      aria-label="Featured properties"
      /*
       * The box. `SHAPE` decides the height; everything else here is shared.
       *
       * min-h, not h, and the overlay sits in flow rather than absolutely, which is what
       * lets the box grow past its floor when it has to. With a fixed height the section
       * clips whatever does not fit, and because the copy is bottom-aligned it clips from
       * the TOP — the eyebrow first, then the headline. The copy comes from the CMS and is
       * unbounded, so a longer intro or a third sentence would silently truncate a page's
       * own proposition with no build error and no failing test.
       *
       * Measured, so the growth path is a real one rather than a precaution: /about's copy
       * fits inside the 420px floor at 375px wide (the overlay is 400px) and stops fitting
       * just below it — 423px at 360px wide, 456px at 320px, both of which grow the box.
       * The homepage's copy is longer and needs 477px at 375px wide, which is why it was
       * this component's clipping case for as long as it ran at this height.
       *
       * `screen` measures the viewport with svh, not vh and not dvh. `vh` ignores mobile
       * browser chrome, so the bottom of the photograph — and the slide dots with it —
       * would sit behind the address bar. `dvh` tracks that chrome as it collapses, which
       * resizes the band mid-scroll and slides the bottom-aligned copy down the screen
       * while the reader is moving. `svh` is the viewport with the chrome showing, which is
       * the state the page loads in. Its own cost is that a sliver of the next section
       * shows once the chrome collapses — which happens while the reader is already
       * scrolling, where `dvh`'s cost lands under their thumb.
       *
       * `band`'s three heights are a design decision rather than a derived value: they are
       * the ones this band ran at before the homepage took the full screen, restored here.
       * What full screen cost those six pages is that the page's actual content — the
       * purpose, the portfolio grid, the realized deals — sat entirely below the fold
       * behind a photograph and a title.
       *
       * That argument does not extend to a landscape phone, and it is worth being honest
       * about: at 812x375 the `sm` breakpoint applies, so the band is 500px against a
       * 375px viewport and the content is below the fold anyway. It is the shape these six
       * pages have always had rather than something this change introduced, and no test
       * covers that orientation.
       *
       * One consequence of `screen` that is not a CSS decision: every slide is a `<Link>`
       * at `absolute inset-0`, so on the homepage the whole of the first screen is a click
       * target whose destination changes every six seconds. Hovering pauses the rotation,
       * which covers a mouse; a touch has no hover, so a tap on empty sky opens whichever
       * building is showing. That is inherited behaviour rather than new — the band has
       * always been one link — but at full screen it is about four times the area, so it is
       * written down rather than assumed.
       */
      className={`relative flex w-full flex-col justify-end overflow-hidden bg-scrim ${SHAPE[variant].box}`}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      {usable.map((slide, i) => {
        /*
         * Only the current slide, the one it will cross-fade to, and the one it just left
         * carry an <Image>.
         *
         * Every slide sits in the same absolutely-positioned box, so the browser treats
         * them all as visible and fetches every one — eight photographs on first paint,
         * which measured 1.3MB against an 800KB image budget and failed CI. Lazy loading
         * does not help for the same reason. Spec §1 names the old site's oversized
         * photography as a founding problem, so raising the budget is the last resort and
         * not the first.
         *
         * A window keeps the crossfade already decoded while paying for a few images
         * instead of eight.
         *
         * The window is forward-looking plus whatever is currently fading out: the
         * current slide, the one it will cross-fade to, and the one it just left. At
         * full-bleed the crops are large enough that the difference between two and three
         * is worth having on the *first* paint, which is why `prev` starts null — nothing
         * has faded out yet, so nothing behind is worth fetching before it is needed.
         *
         * First paint is two crops, and what they cost depends on the form factor now
         * that `sizes` differs by breakpoint: 725KB of images against a 1400KB budget on
         * Lighthouse's mobile runner, and the same 723KB it measured on desktop before
         * this band grew to full height. The before-and-after table is in
         * docs/resource-budget.md; the two numbers being one apart is a coincidence worth
         * not misreading. Including the backward neighbour up front instead would fetch a
         * third crop before anything has moved.
         */
        const forward = (i - index + usable.length) % usable.length
        const loaded = forward <= 1 || i === prev

        return (
          <Link
            key={`${slide.slug}-${i}`}
            href={`/portfolio/${slide.slug}`}
            // `inert` keeps the hidden slides out of the tab order and off the
            // accessibility tree while they are invisible, without unmounting them.
            inert={i !== index}
            aria-hidden={i !== index}
            className={`absolute inset-0 transition-opacity duration-700 ${
              i === index ? 'opacity-100' : 'opacity-0'
            }`}
          >
            {loaded && (
              <Image
                src={urlForPhoto(slide.image, 1600, 900).width(1600).height(900).url()}
                alt={(slide.image as { alt?: string })?.alt ?? slide.propertyTitle ?? ''}
                width={1600}
                height={900}
                /*
                  The width the image is PAINTED at, which is not the width of the box —
                  and the one thing `SHAPE` decides that is not a styling choice.

                  `object-cover` on a box taller than the crop is shaped scales the
                  photograph until it covers the HEIGHT and crops the overflow off the
                  sides, so the painted width is the box height times the crop's aspect.
                  The crop is 1600x900, so that factor is 1.78.

                  Measured at 375x812, which is where the two shapes diverge:

                    screen   box 812  paints 1444 CSS px  = 3.85x the viewport width
                    band     box 420  paints  747 CSS px  = 1.99x the viewport width

                  So `100vw` understates the paint in BOTH shapes. What decides whether
                  that matters is not the size of the understatement but which variant the
                  browser ends up choosing, and how far short of the paint it falls:

                    band, sizes=100vw     DPR 1 -> w=640   DPR 2 -> w=750   DPR 3 -> w=1200
                    screen, sizes=100vw   DPR 3 -> w=1200 painted across 1444 CSS px

                  In `band` the worst case is DPR 3, where a 1200px bitmap covers 2241
                  device px — 1.87x short. At DPR 1 it picks 640 against 747 CSS px, which
                  is a 1.17x upscale: real, but a sixth of a pixel per pixel, on a 420px
                  band. In `screen` with the same hint the 1200px bitmap was painted across
                  1444 CSS px, so it was upscaled at DPR 1 too and 3.6x short at DPR 3 —
                  over the whole first screen, and visibly soft.

                  The hint is corrected for `screen` and left alone for `band`, and the
                  honest reason is proportion rather than a clean line. Even corrected,
                  `screen` is still 2.71x short at DPR 3, because the 1600px crop cap is
                  below the 4332 device px that box wants — so `band` at 1.87x is already
                  sharper than the page that got the expensive hint. Correcting `band` as
                  well would buy about a third of a linear pixel on six pages, for the
                  bytes below.

                  Desktop is width-driven in both shapes — the box is wider than the crop
                  is shaped — so both hints end at `100vw`, and that is exactly right there.

                  What the correction costs, measured on the two crops the band mounts on
                  first paint, w=1200 against the 1600 cap: 85KB -> 134KB for one and
                  173KB -> 314KB for the other. So 49KB and 141KB, 190KB for the page, and
                  the spread is the photographs rather than the sizes — one source is
                  1600x917 and the other 4160x3117, and the detailed one costs three times
                  as much to serve at the same width. Do not carry "49KB a crop" anywhere:
                  it is the cheaper of the two.

                  Every variant at or above 1600w resolves to the same asset, which is what
                  bounds the whole thing. The levers that defend the image budget are still
                  the preload window above and that cap; this line only stops the browser
                  guessing low. See docs/resource-budget.md.

                  `screen`'s multipliers are approximations, and they have to be: `sizes`
                  takes media queries on WIDTH, and the quantity being described depends on
                  HEIGHT. 400vw is calibrated on a 375x812 phone, where 812 * 1.78 / 375 is
                  3.85. A shorter 375x667 phone really wants 316vw and a 768x1024 tablet
                  wants 237vw against the 200vw declared. Neither matters while the cap
                  binds — every over-ask lands on the same 1600px asset and every under-ask
                  still clears it at any plausible DPR. If the cap is ever raised, these
                  numbers stop being free and want re-deriving.

                  **PR 4 tried to raise it and did not, so these multipliers are still
                  free and are deliberately unchanged.** §7 named the cap as its third
                  lever; measured at 2048 it put `/portfolio` on desktop at 1564 KB of
                  images against a 1400 KB budget — a page CI never audits — while the
                  first slide stayed 1600x900 anyway, because its Sanity source asset is
                  only 1600x917 and Sanity does not upscale. The re-derivation above is
                  therefore still owed by whoever succeeds at raising the cap, and the
                  prerequisite for that is a higher-resolution source photograph, not a
                  bigger number here.
                */
                sizes={SHAPE[variant].sizes}
                /*
                  Raised from 68 by PR 4 (spec §7's first resolution lever), and declared
                  in `images.qualities` in next.config.ts — Next 16 silently ignores any
                  quality not on that list and falls back to 75, with no warning and
                  byte-identical output.

                  That silent-fallback behaviour is exactly why this was measured on the
                  wire rather than assumed: `qualities: [68, 75]` allowlists both, and the
                  deployed hero really was serving `q=68`, so the change was real. Read
                  back afterwards as `q=75`, and the page images on `/` moved 723 KB → 754
                  KB at 390x844 DPR-3 — +31 KB, against a 1400 KB budget. A no-op would
                  have been byte-identical, and it was not.

                  This is the only one of §7's three resolution levers that shipped. The
                  crop cap stayed at 1600 — see the cap's own note above and
                  `docs/resource-budget.md` for the measurement that declined it.
                */
                quality={75}
                priority={i === 0}
                /*
                  `h-full` with a cap, not `h-[400px]`: above `sm` the cap is lifted and
                  the photograph covers the box as it always has, and the whole change is
                  confined to a phone. See `PHONE_PHOTO_CAP` for the measurements and for
                  why lowering `min-h-svh` would not have worked.
                */
                className={`h-full w-full object-cover ${PHONE_PHOTO_CAP}`}
              />
            )}
            {/*
              A scrim, not a decoration. The page title sits on photography of unknown
              brightness, and this is what keeps it legible.

              On a DESKTOP what carries the contrast is still the photograph being dark
              rather than the gradient: measured over the box-anchored stops, the eyebrow
              reads about 9.2:1 on a dark image and about 2.4:1 on a pale one. That is a
              content constraint as much as a CSS one, the Studio field description for
              `heroCarousel` says so, and anyone swapping in a pale lobby shot still has to
              check the title against it.

              On a PHONE that is no longer true, and deliberately: the gradient is anchored
              to the photograph and carries the contrast itself, so the same pale lobby shot
              measures 5.2:1 rather than 2.4:1. See `PHONE_SCRIM_BAND` and `PHONE_SCRIM_SCREEN` for the measurements and
              for why the phone needed its own answer.
            */}
            <span className={SHAPE[variant].scrim} style={scrimStyle} />
          </Link>
        )
      })}

      {overlay && (
        /*
          pointer-events-none so the photograph underneath stays clickable; the copy
          re-enables them on its own buttons. Without this the title would swallow clicks
          meant for the slide it sits on.

          Where the copy sits horizontally is `SHAPE`'s second decision, and the two
          answers are the two things this band can be.

          `band` uses `mx-auto max-w-[1200px] px-6`, the site's content measure, spelled
          the same way in Band, SiteHeader, SiteFooter, every page's own container and this
          component's no-photography fallback. Those six pages are headers for the page
          below them, so their title starts on the same vertical as every heading,
          paragraph and the wordmark above it.

          `screen` uses `p-6 sm:p-10`, a fixed inset from the edge of the photograph. The
          homepage's hero is a picture with a proposition on it rather than a page header,
          and the measure pulls those words away from the picture they are written on.

          Both were applied to all seven pages first, in both directions, so the numbers
          are worth keeping. On the measure: the copy ran at x=180 on a 1512px viewport,
          x=144 at 1440, x=64 at 1280 and x=24 below 1024. At the inset: x=40 at every
          width above 640px, and x=24 below it — which at 1024 and under is *further* in
          than the body text it is meant to sit outside of, and that is what took the six
          onto the measure.

          The slide dots are NOT moved with the copy in either shape. They sit at
          `bottom-4 end-6`, against the edge of the photograph, because they are a control
          on the image rather than a line of the page's copy.

          pb clears those dots. With eight slides that row is ~136px wide, and at a narrow
          viewport a wrapped second row of buttons ran underneath it.

          pt clears the header, which sits *over* this band on every page. The reservation
          is shared rather than per-shape, which is why it is a constant instead of a
          number spelled in `SHAPE`: see `src/lib/headerReservation.ts` for the
          measurements and why the breakpoint it uses is `md`, not `sm`.

          `animate-hero-rise` is the entrance: the whole block fades up 48px over 1.3 seconds
          as the page opens. It is on THIS element and not on the five inside it, which is
          the same choice the old em-8.com made — one block moving reads as the page's
          title arriving, and five of them staggering reads as a slideshow. The keyframes,
          and why this is an animation rather than the old site's JS class toggle, are in
          `src/app/globals.css`.

          It is here rather than in `PageHero` because this is the branch with a
          photograph. `PageHero`'s no-photography fallback deliberately does NOT animate:
          that block is ink on white with nothing behind it, so there is no photograph for
          it to arrive over, and it is the branch that renders when the CMS has lost its
          slides — the last place to put an entrance effect on the page's only `<h1>`.

          `motion-reduce:animate-none` for the same reason the auto-advance checks
          `prefers-reduced-motion` above. Translating a full-width block of type is the
          vestibular trigger, not the fade, so the whole animation is dropped rather than
          the transform alone — and because the resting state IS the final keyframe,
          dropping it renders the finished hero rather than an empty one.
        */
        <div
          data-hero-overlay
          className={`pointer-events-none relative w-full pb-12 sm:pb-14 animate-hero-rise motion-reduce:animate-none ${HEADER_RESERVATION} ${SHAPE[variant].copy}`}
        >
          {overlay}
        </div>
      )}

      {usable.length > 1 && (
        <div className="absolute bottom-4 end-6 flex gap-2">
          {usable.map((slide, i) => (
            <button
              key={`dot-${slide.slug}-${i}`}
              type="button"
              onClick={() =>
                setSlide((s) => (s.index === i ? s : { index: i, prev: s.index }))
              }
              aria-current={i === index}
              aria-label={`Show slide ${i + 1} of ${usable.length}${
                slide.propertyTitle ? `: ${slide.propertyTitle}` : ''
              }`}
              className={`size-2.5 rounded-full border border-white transition-colors ${
                i === index ? 'bg-white' : 'bg-transparent'
              }`}
            />
          ))}
        </div>
      )}
    </section>
  )
}
