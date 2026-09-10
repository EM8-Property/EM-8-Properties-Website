import { Eyebrow } from '@/components/ui/Eyebrow'
import { Button } from '@/components/ui/Button'
import { StatBand } from '@/components/ui/StatBand'
import { HeroCarousel, type HeroVariant } from '@/components/layout/HeroCarousel'
// From lib, not from HeroCarousel: that module is `'use client'`, and a server component
// calling a function it exports fails the build outright.
import { usableSlides, type CarouselSlide } from '@/lib/heroSlides'
import { HEADER_RESERVATION } from '@/lib/headerReservation'

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
  stats,
}: {
  copy: PageHeroCopy
  slides: CarouselSlide[]
  /**
   * Forwarded to `HeroCarousel`, which is where the two shapes are defined. Defaults to
   * `band` here too rather than relying on the carousel's default, so that reading this
   * signature tells you what six of the seven pages get without opening another file.
   */
  variant?: HeroVariant
  /**
   * The five proof stats (AUM, units managed, realized multiple…), rendered below the
   * buttons. Optional, and deliberately not coupled to `variant`: only the homepage
   * (`screen`) passes one today, but the mechanism does not know that, so the six `band`
   * pages are unaffected by construction — they simply never pass this prop — rather than
   * by a `variant === 'screen'` check here that a future `band` page with its own stats
   * would have to fight.
   *
   * `undefined` and `[]` both render nothing — a dataset with no `heroStat` documents
   * must not draw an empty stat row on the photograph, the same guard `page.tsx` already
   * applies before this prop existed (`stats.length > 0 && <StatBand .../>`). Checked
   * here too, rather than trusted to every caller, so a future caller cannot reintroduce
   * that empty row by forgetting the guard at the call site.
   */
  stats?: { figure: string; label: string }[]
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
            is why the Studio field says so.

            Those two ratios are unchanged by PR 4, and that is the point rather than an
            omission. Contrast is a property of the colour pair, so growing the headline
            cannot move it; `#4ABDB5` over the same scrim measures what it measured at
            30px. What the larger scale changes is the margin over the threshold those
            ratios are judged against. The token's contract scopes it to 24px and up, and
            the headline now runs 36px on a phone, 60px from `sm` and 64px from `lg` — so
            every step is further inside the contract than the 30/36/48 scale was, and
            the pale-photograph case is the same 1.7:1 read at a size that survives it
            better. This is the one relationship in this PR that improves; do not "fix"
            it by reaching for `text-teal-text` on a photograph, which is the pairing
            that all but disappears against a dark scrim.
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

  // No pointer-events opt-in here, unlike `buttons` above: these are plain text, not
  // links or buttons, so there is nothing for the overlay's `pointer-events-none` to
  // block. Confirmed rather than assumed — `StatBand` renders no anchor, no button and no
  // click handler, so leaving pointer-events disabled costs nothing and keeps the whole
  // photograph clickable through the stats the same way it already is through the h1 and
  // the intro paragraph.
  // `columns="narrow"` in both branches, deliberately independent of `tone`: both branches
  // sit inside `max-w-[42ch]` (424px), which never has room for the `lg:` five-column
  // override regardless of which ground the text sits on. See StatBand's own docblock.
  const statBand = stats && stats.length > 0 && (
    <div className="mt-6">
      <StatBand stats={stats} tone={hasPhoto ? 'onPhoto' : 'default'} columns="narrow" />
    </div>
  )

  // No photography yet, or every slide's property reference is dangling. The title still
  // has to render, so it falls back to the plain block on white.
  if (!hasPhoto) {
    return (
      // A real reservation, not pt-14, and for the same reason the overlay carries it:
      // `showsHero` is decided by path while this branch is decided by content, so the
      // header is still absolutely positioned over this page even though there is no
      // photograph under it. See `src/lib/headerReservation.ts` for the measurements —
      // the number has moved there, and this branch needs the reservation for the same
      // reason the overlay does. Nothing in the layout's required-content guard covers
      // `heroCarousel`, so this branch is reachable on any of the seven pages the moment
      // that list is emptied.
      <div className={`mx-auto max-w-[1200px] px-6 pb-10 ${HEADER_RESERVATION}`}>
        <div className="max-w-[42ch]">
          {copy.eyebrow && <Eyebrow>{copy.eyebrow}</Eyebrow>}
          {/*
            The same sm and lg steps as the photograph branch, deliberately. This branch
            carries its own `h1` and a scale change that touched only the visible one was
            a regression once — the same shape of fault as the stat-crush defect PR 3
            paid for, where a fix scoped to the photograph branch left the fallback
            behind. `tests/unit/typeScale.test.tsx` pins both.

            The unprefixed step stays at the 36px this branch already had, which is now
            also where the overlay branch landed. The two agreeing is a coincidence worth
            naming rather than a rule: this block renders in ink on white with no scrim
            and no photograph, so it never competed for hero slack and its 36px was never
            in question, while the overlay's 36px is the output of the measurement above.
            If a later change moves the overlay's phone step, this one does not have to
            follow it.
          */}
          <h1 className="mt-4 text-4xl font-bold leading-[1.08] tracking-tight text-ink sm:text-6xl lg:text-[64px]">
            {title}
          </h1>
          {copy.intro && (
            <p className="mt-5 max-w-[56ch] text-sm leading-relaxed text-ink-secondary">
              {copy.intro}
            </p>
          )}
          {buttons}
          {statBand}
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
          {/*
            `sm` is a named step; `lg` is not, and the arbitrary value is the finding.

            Tailwind v4's defaults land exactly on §7's numbers — `--text-6xl: 3.75rem`
            is 60px and `--text-7xl: 4.5rem` is 72px at a 16px root, verified in
            `node_modules/tailwindcss/theme.css` rather than assumed — so `sm:text-6xl`
            is §7's 60px with nothing lost.

            **`lg` is 64px, not §7's 72px, because a band page's hero has a CEILING.**
            The six band pages must not fill the viewport: a hero taller than the screen
            puts the page's entire content below the fold, showing a reader a photograph
            and a title and no sign that anything is under them. That shipped for a day,
            was reverted, and is pinned by two E2E tests. Measured on `/about` at
            1280x720, which is what `devices['Desktop Chrome']` gives CI:

              48px  band 581px   ← before
              60px  band 634px
              64px  band 652px   ← here, 68px under the fold
              72px  band 845px   ← 125px OVER; both E2E tests fail

            64 → 72px crosses a 4-line to 6-line wrap cliff, which is where the 193px
            comes from. 64px is the largest value measured to clear the fold on every
            band page.

            This corrects the plan, which called `sm` and `lg` "the uncontested half"
            on the grounds that band pages have zero slack and grow downward. They do
            grow downward — into the fold. The floor was costed and the ceiling was not.

            The unprefixed step is 36px, and it is the only one that was under contest.
            §7 asks for somewhere between 40px and 60px and contradicts itself about
            which; this is measured instead, because the homepage hero came out of PR 3
            with 51px of slack at 390x844 and NONE at the other four phone widths, so
            past that 51px every pixel of headline is a pixel of scroll on `/` and on all
            six band pages at once.

            Measured at 390x844 DPR-3 on a production build, `/` page length in screens
            against PR 3's 5.47 — and the `h1` box, which is what actually spends the
            slack:

              30px  5.47   66px / 2 lines   hero  844   ← PR 3
              36px  5.48  119px / 3 lines   hero  846   ← here
              40px  5.54  176px / 4 lines   hero  904
              48px  5.58  211px / 4 lines   hero  939
              56px  5.70  308px / 5 lines   hero 1035
              60px  5.73  330px / 5 lines   hero 1058

            Growth is not gradual, it is a wrap cliff: 30 → 36px adds a line and 36 → 40
            adds another, and the second one costs 57px against slack that is already
            gone. 36px spends 53px of the 51px available, so the hero grows by 2px and
            the page by 2px — below the resolution of the measurement that chose it.
            40px, §7's own lowest reading, costs 30x that.

            No candidate keeps the hero inside `min-h-svh` at 390x844; 36px misses by
            2px and the rest by 60-214px. This is the fallback branch of the plan's
            decision rule, taken with the cost reported rather than hidden.

            **The 2px is the best case, not the typical one, and the other four widths
            are where the change is actually paid for.** 390x844 is the only phone width
            with slack, so it is the only one that absorbs anything. Everywhere else the
            53px of `h1` growth is 53px of scroll, unabsorbed, on `/` AND on all six band
            pages at once. `/` page length, 30px → 36px, fonts loaded:

              390x844   5.47 → 5.48    +2px    ← 51px of slack absorbs it
              320x844   6.10 → 6.14   +27px
              360x844   5.58 → 5.65   +59px
              375x812   5.77 → 5.85   +60px
              375x667   7.03 → 7.12   +60px    ← the short phone, worst in screens

            320px costs less than its neighbours only because its headline was already
            wrapping to 4 lines at 30px, so 36px adds one line there rather than the two
            it adds at 360-375px. Do not read the 390x844 row as the site-wide cost.
          */}
          <h1 className="mt-3 text-4xl font-bold leading-[1.1] tracking-tight text-white sm:text-6xl lg:text-[64px]">
            {title}
          </h1>
          {copy.intro && (
            <p className="mt-4 max-w-[52ch] text-sm leading-relaxed text-white/85">
              {copy.intro}
            </p>
          )}
          {buttons}
          {statBand}
        </div>
      }
    />
  )
}
