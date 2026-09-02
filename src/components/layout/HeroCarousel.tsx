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
 * The full-bleed photograph every section page opens on, with that page's own title laid
 * over it by `PageHero`.
 *
 * Content comes from the `siteSettings` singleton, not from each property, so the same
 * photos appear everywhere the band is shown and there is exactly one list to edit.
 *
 * It used to have two variants: a thin `banner` strip carrying only a property caption,
 * and a `hero` block capped at the 1200px content column. Both are gone. Every page now
 * opens the same way, so there is one shape and one set of numbers to reason about.
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
       * `min-h-svh`: the first screen is the photograph, and the page is scrolled to
       * reach anything else.
       *
       * min-h, not h, and the overlay sits in flow rather than absolutely, which is what
       * lets the box grow past the screen when it has to. With a fixed height the section
       * clips whatever does not fit, and because the copy is bottom-aligned it clips from
       * the TOP — the eyebrow first, then the headline. The copy comes from the CMS and is
       * unbounded, so a longer intro or a third sentence would silently truncate a page's
       * own proposition with no build error and no failing test. A landscape phone is
       * 375px tall, which is less than the header reservation plus four lines of copy, so
       * this is a real case and not a theoretical one. The box grows instead.
       *
       * svh, not vh and not dvh. `vh` ignores mobile browser chrome, so the bottom of the
       * photograph — and the slide dots with it — would sit behind the address bar. `dvh`
       * tracks that chrome as it collapses, which resizes the band mid-scroll and slides
       * the bottom-aligned copy down the screen while the reader is moving. `svh` is the
       * viewport with the chrome showing, which is the state the page loads in.
       *
       * The height was withheld through the two revisions before this one, and the older
       * comments read as though it always should be. What they were describing is a
       * different layout: the band was `100vh` with the heading rendered *underneath* it,
       * so the first screen was a photograph and nothing else and EM8's proposition was
       * below the fold. The stacking was the defect, not the height. The title has sat ON
       * the photograph since the full-bleed change, so the first screen now carries the
       * page's own words at any height.
       */
      className="relative flex w-full flex-col justify-end overflow-hidden bg-panel min-h-svh"
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
         * Measured on this build: first paint is two crops, 723KB of images against a
         * 1400KB budget, and Lighthouse reported no overage. Including the backward
         * neighbour up front instead would fetch a third before anything has moved.
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
                  The width the image is PAINTED at, which is not the width of the box.

                  `object-cover` on a box taller than the crop is shaped scales the
                  photograph until it covers the HEIGHT and crops the overflow off the
                  sides, so the painted width is the viewport height times the crop's
                  aspect — about 1.8x. On a portrait phone that is roughly four times the
                  width of the screen, and `100vw` understates it by that much.

                  It did not while this band was 420px tall, which is why it used to say
                  100vw. Measured at 375x812 with full height and the old hint still in
                  place: the browser chose the 1200w variant and painted it across 1444
                  CSS px — a 3.6x upscale, over the whole first screen of a phone, and
                  invisible to the build, tsc, lint, the unit tests and Lighthouse alike.
                  Desktop was unaffected: there the box is wider than the crop is shaped,
                  so width still drives and 100vw is exactly right.

                  What stops this becoming a byte regression is the crop cap below. Every
                  variant at or above 1600w resolves to the same 1600x900 asset — measured
                  at 133KB, against 84KB for the 1200w a phone was fetching before, so the
                  whole cost is 49KB per crop and two crops on the first paint. The levers
                  that defend the image budget are still the preload window above and that
                  cap; this line only stops the browser guessing low. See
                  docs/resource-budget.md.
                */
                sizes="(max-width: 640px) 400vw, (max-width: 1024px) 200vw, 100vw"
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

          No `mx-auto max-w-[1200px]` here, deliberately. The words are held a similar
          distance in from the edge of the image as they were when that image was a 1152px
          block — they are not snapped back to the content column, which would undo the
          full-bleed change for everything except the photograph itself.

          pb clears the slide dots, which sit at `bottom-4 end-6`. With eight slides that
          row is ~136px wide, and at a narrow viewport a wrapped second row of buttons ran
          underneath it.

          pt clears the header, which now sits *over* this band on every page. Measured at
          375px: the eyebrow's first line began at y=62 while the header ran to y=68, so
          the top line of copy rendered underneath it. The copy is bottom-aligned, so it
          climbs as it grows — and it comes from the CMS, so a longer intro would push it
          further up with no build error and nothing to catch it. The header is ~68px.
        */
        <div
          data-hero-overlay
          className="pointer-events-none relative w-full p-6 pb-12 pt-24 sm:p-10 sm:pb-14 sm:pt-28"
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
