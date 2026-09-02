import { Eyebrow } from '@/components/ui/Eyebrow'
import { Button } from '@/components/ui/Button'
import { HeroCarousel, type HeroVariant } from '@/components/layout/HeroCarousel'
// From lib, not from HeroCarousel: that module is `'use client'`, and a server component
// calling a function it exports fails the build outright.
import { usableSlides, type CarouselSlide } from '@/lib/heroSlides'

/**
 * The title block every section page opens with.
 *
 * Nullable throughout because these arrive from the CMS, and typegen cannot see that the
 * schema marks them required — it only knows the field may be absent on the document.
 * The schema's `required()` is what enforces presence; this just means a half-filled draft
 * renders a short heading instead of crashing the page.
 */
export type PageHeroCopy = {
  eyebrow?: string | null
  title?: string | null
  /** The closing words of the headline, shown in teal. Only the hero blocks carry one. */
  titleAccent?: string | null
  /** Usually just punctuation, such as a full stop. */
  titleSuffix?: string | null
  intro?: string | null
  primaryCta?: { label?: string | null; href?: string | null } | null
  secondaryCta?: { label?: string | null; href?: string | null } | null
}

/**
 * A photograph with the page's own title laid over it, in one of the band's two shapes.
 *
 * This generalises what was `HomeHero`. The homepage was the only page whose title sat on
 * the photograph; the other six carried a thin decorative strip with a property caption
 * and then their heading *below* it, in ink on white. All seven now carry their title on
 * the photograph — that part is settled and shared. What differs is the shape: the
 * homepage's photograph fills the first screen with its copy floating at the edge of the
 * image, and the other six run a 420/500/560px band with their copy on the content
 * measure. `HeroCarousel`'s `SHAPE` map is where those numbers live and where the reason
 * for the split is recorded; this component only forwards the choice.
 *
 * Three properties hold whichever shape is asked for, and each was a regression once:
 *
 *   - The photograph runs edge to edge; the copy on it never spans the same width. In
 *     `band` it sits on `mx-auto max-w-[1200px] px-6` — the same three utilities as Band,
 *     SiteHeader, SiteFooter, every page container and the fallback below — so the page
 *     title starts on the same vertical as every heading under it. In `screen` it sits at
 *     a fixed inset from the image instead, because there the words belong to the
 *     photograph rather than to the page's grid.
 *
 *     Both of those were briefly applied to all seven pages, in both directions, before
 *     Hunter split them. The measurement that settled the six: copy at x=40 at every
 *     width above 640px against a column at x=180 on a 1512px viewport, and at 1024px and
 *     below the hero copy sat *further* in than the body text it was meant to sit outside
 *     of.
 *   - The title still renders when there is no photography. A hero that disappears with
 *     its images would take the page's whole proposition with it, so the no-slides path
 *     falls back to a plain block in ink on white. That fallback has one shape, on the
 *     measure, because with no photograph there is no image edge to hang copy off.
 *   - The copy clears the overlaid header. `screen` has slack; `band` is where the near
 *     miss was measured, at 375px with the eyebrow at y=62 under a header ending at y=68.
 *     The copy is bottom-aligned and unbounded CMS text, so it climbs as it grows.
 *
 * `titleAccent` arrives as its own field rather than as markup inside the title, so the
 * teal stays a design token instead of a hex an editor might paste, and nobody has to
 * write HTML in a text box to colour three words.
 */
export function PageHero({
  copy,
  slides,
  variant = 'band',
}: {
  copy: PageHeroCopy
  slides: CarouselSlide[]
  /**
   * Forwarded to `HeroCarousel`, which is where the two shapes are defined. Defaults to
   * `band` here too rather than relying on the carousel's default, so that reading this
   * signature tells you what six of the seven pages get without opening another file.
   */
  variant?: HeroVariant
}) {
  // The same helper HeroCarousel uses to decide what it will render, deliberately shared:
  // if these two ever disagreed, this would hand a carousel a list it then rejects, and
  // the page would lose its <h1> while the header kept overlaying nothing.
  const hasPhoto = usableSlides(slides).length > 0

  const title = (
    <>
      {copy.title}
      {copy.titleAccent && (
        <>
          {' '}
          {/*
            The accent is the light teal, not `teal-text`. That darker tone exists for
            small type on white and all but disappears against a dark scrim.

            This is the most image-fragile element here: measured over the gradient it
            reads about 5.9:1 on a dark photograph and about 1.7:1 on a pale one — worse
            than plain white would be. What carries it is the photograph being dark, which
            is why the Studio field says so. The token is used within its documented
            contract, which scopes it to 24px and up; this is 30px.
          */}
          <span className={hasPhoto ? 'text-teal' : 'text-teal-text'}>
            {copy.titleAccent}
          </span>
        </>
      )}
      {copy.titleSuffix}
    </>
  )

  const buttons = (copy.primaryCta?.href || copy.secondaryCta?.href) && (
    // pointer-events re-enabled here only. The overlay wrapper disables them so the
    // photograph underneath stays clickable; the buttons have to opt back in.
    <div className={`mt-6 flex flex-wrap gap-3 ${hasPhoto ? 'pointer-events-auto' : ''}`}>
      {copy.primaryCta?.href && copy.primaryCta.label && (
        <Button href={copy.primaryCta.href}>{copy.primaryCta.label}</Button>
      )}
      {copy.secondaryCta?.href && copy.secondaryCta.label && (
        <Button href={copy.secondaryCta.href} variant={hasPhoto ? 'onPhoto' : 'secondary'}>
          {copy.secondaryCta.label}
        </Button>
      )}
    </div>
  )

  // No photography yet, or every slide's property reference is dangling. The title still
  // has to render, so it falls back to the plain block on white.
  if (!hasPhoto) {
    return (
      // pt-24, not pt-14, and for the same reason the overlay carries it: `showsHero` is
      // decided by path while this branch is decided by content, so the header is still
      // absolutely positioned over this page even though there is no photograph under it.
      // At pt-14 (56px) the eyebrow rendered beneath a ~68px header. Nothing in the
      // layout's required-content guard covers `heroCarousel`, so this branch is reachable
      // on any of the seven pages the moment that list is emptied.
      <div className="mx-auto max-w-[1200px] px-6 pb-10 pt-24 sm:pt-28">
        <div className="max-w-[42ch]">
          {copy.eyebrow && <Eyebrow>{copy.eyebrow}</Eyebrow>}
          <h1 className="mt-4 text-4xl font-bold leading-[1.08] tracking-tight text-ink sm:text-5xl">
            {title}
          </h1>
          {copy.intro && (
            <p className="mt-5 max-w-[56ch] text-sm leading-relaxed text-ink-secondary">
              {copy.intro}
            </p>
          )}
          {buttons}
        </div>
      </div>
    )
  }

  return (
    <HeroCarousel
      slides={slides}
      variant={variant}
      overlay={
        <div className="max-w-[42ch]">
          {copy.eyebrow && <Eyebrow tone="onPhoto">{copy.eyebrow}</Eyebrow>}
          <h1 className="mt-3 text-3xl font-bold leading-[1.1] tracking-tight text-white sm:text-4xl lg:text-5xl">
            {title}
          </h1>
          {copy.intro && (
            <p className="mt-4 max-w-[52ch] text-sm leading-relaxed text-white/85">
              {copy.intro}
            </p>
          )}
          {buttons}
        </div>
      }
    />
  )
}
