'use client'

import { useEffect, useMemo, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { urlForImage } from '@/sanity/image'
import { usableSlides, type CarouselSlide } from '@/lib/heroSlides'

/*
 * Re-exported so the seven pages can keep importing the type from the component they are
 * rendering. It is a type-only re-export, which is erased at compile time — the *function*
 * deliberately is not re-exported, because this is a `'use client'` module and a server
 * component calling anything it exports fails the build.
 */
export type { CarouselSlide }

const INTERVAL_MS = 6000

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
const SHAPE: Record<HeroVariant, { box: string; copy: string; sizes: string }> = {
  screen: {
    box: 'min-h-svh',
    copy: 'p-6 sm:p-10',
    sizes: '(max-width: 640px) 400vw, (max-width: 1024px) 200vw, 100vw',
  },
  band: {
    box: 'min-h-[420px] sm:min-h-[500px] lg:min-h-[560px]',
    copy: 'mx-auto max-w-[1200px] px-6',
    sizes: '100vw',
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
}) {
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
      className={`relative flex w-full flex-col justify-end overflow-hidden bg-panel ${SHAPE[variant].box}`}
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
                src={urlForImage(slide.image).width(1600).height(900).url()}
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
                */
                sizes={SHAPE[variant].sizes}
                /*
                  Below Next's default of 75, and declared in `images.qualities` in
                  next.config.ts — Next 16 silently ignores any quality not on that list
                  and falls back to 75, with no warning and byte-identical output. A
                  photograph carries compression far better than a chart would, and this is
                  the heaviest single asset on the site.
                */
                quality={68}
                priority={i === 0}
                className="h-full w-full object-cover"
              />
            )}
            {/*
              A scrim, not a decoration. The page title sits on photography of unknown
              brightness, and this is what keeps it legible.

              What carries the contrast is the photograph being dark, not the gradient:
              measured over this, the eyebrow reads about 9.2:1 on a dark image and about
              2.4:1 on a pale one. That is a content constraint as much as a CSS one, and
              the Studio field description for `heroCarousel` says so. Anyone swapping in a
              pale lobby shot has to check the title against it.
            */}
            <span className="absolute inset-0 bg-gradient-to-t from-[rgba(26,26,26,0.90)] via-[rgba(26,26,26,0.55)] to-[rgba(26,26,26,0.25)]" />
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

          pt clears the header, which sits *over* this band on every page. Measured at
          375px: the eyebrow's first line began at y=62 while the header ran to y=68, so
          the top line of copy rendered underneath it. The copy is bottom-aligned, so it
          climbs as it grows — and it comes from the CMS, so a longer intro would push it
          further up with no build error and nothing to catch it. The header is ~68px.

          The reservation is shared rather than per-shape, which is why it is spelled in
          the class below instead of in `SHAPE`, and the two shapes are nowhere near each
          other in how much of it they need. Measured clearance between the header and the
          eyebrow: 363px on the homepage at 375px wide, 48px on /about at the same width,
          and 28px on /about at 360px and 320px — where the overlay has grown to fill the
          band, so bottom-alignment leaves no slack at all and `pt-24` minus the header is
          the entire margin. `band` at a narrow viewport is the case to test.
        */
        <div
          data-hero-overlay
          className={`pointer-events-none relative w-full pb-12 pt-24 sm:pb-14 sm:pt-28 ${SHAPE[variant].copy}`}
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
