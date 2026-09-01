import { Eyebrow } from '@/components/ui/Eyebrow'
import { Button } from '@/components/ui/Button'
import { HeroCarousel, type CarouselSlide } from '@/components/layout/HeroCarousel'

export type HeroCopy = {
  eyebrow?: string | null
  title?: string | null
  titleAccent?: string | null
  titleSuffix?: string | null
  intro?: string | null
  primaryCta?: { label?: string | null; href?: string | null } | null
  secondaryCta?: { label?: string | null; href?: string | null } | null
}

/**
 * The page-opening block, driven entirely by CMS copy.
 *
 * It used to hold its words as literals, which plan revision D4 recorded as a conscious
 * Phase 1 tradeoff — the team could not change its own headline without a developer.
 *
 * `titleAccent` arrives as its own field rather than as markup inside the title, so the
 * teal stays a design token instead of a hex an editor might paste, and nobody has to
 * write HTML in a text box to colour three words.
 *
 * No figure is hardcoded here, which was true before and stays true: nothing in the hero
 * can drift from the CMS or survive as an invented placeholder.
 *
 * **The copy sits on the photograph rather than beneath it.** The homepage opened on a
 * band that ran the full width of the viewport at the full height of it, so the first
 * screen was a photograph, a property caption and a scroll arrow — EM8's actual
 * proposition began below the fold. The photograph is now a block inside the same 1200px
 * column as everything else on the page, and the headline is on it.
 */
export function HomeHero({ hero, slides }: { hero: HeroCopy; slides: CarouselSlide[] }) {
  const copy = (
    <div className="max-w-[42ch]">
      {hero.eyebrow && <Eyebrow tone="onPhoto">{hero.eyebrow}</Eyebrow>}
      <h1 className="mt-3 text-3xl font-bold leading-[1.1] tracking-tight text-white sm:text-4xl lg:text-5xl">
        {hero.title}
        {hero.titleAccent && (
          <>
            {' '}
            {/*
              The accent is the light teal, not `teal-text`. That darker tone exists for
              small type on white and all but disappears against a dark scrim; here the
              ground is photography under a heavy gradient, where the accent reads.
            */}
            <span className="text-teal">{hero.titleAccent}</span>
          </>
        )}
        {hero.titleSuffix}
      </h1>
      {hero.intro && (
        <p className="mt-4 max-w-[52ch] text-sm leading-relaxed text-white/85">
          {hero.intro}
        </p>
      )}
      {(hero.primaryCta?.href || hero.secondaryCta?.href) && (
        // pointer-events re-enabled here only. The wrapper disables them so the
        // photograph underneath stays clickable; the buttons have to opt back in.
        <div className="pointer-events-auto mt-6 flex flex-wrap gap-3">
          {hero.primaryCta?.href && hero.primaryCta.label && (
            <Button href={hero.primaryCta.href}>{hero.primaryCta.label}</Button>
          )}
          {hero.secondaryCta?.href && hero.secondaryCta.label && (
            <Button href={hero.secondaryCta.href} variant="onPhoto">
              {hero.secondaryCta.label}
            </Button>
          )}
        </div>
      )}
    </div>
  )

  // No photography yet, or every slide's property reference is dangling: the headline
  // still has to render, so it falls back to the plain block it used to be. A hero that
  // disappears with its images would take the page's whole proposition with it.
  if (slides.filter((s) => s.slug).length === 0) {
    return (
      <div className="mx-auto max-w-[1200px] px-6 pb-10 pt-14">
        <div className="max-w-[42ch]">
          {hero.eyebrow && <Eyebrow>{hero.eyebrow}</Eyebrow>}
          <h1 className="mt-4 max-w-[19ch] text-5xl font-bold leading-[1.08] tracking-tight text-ink">
            {hero.title}
            {hero.titleAccent && (
              <> <span className="text-teal-text">{hero.titleAccent}</span></>
            )}
            {hero.titleSuffix}
          </h1>
          {hero.intro && (
            <p className="mt-5 max-w-[56ch] text-sm leading-relaxed text-ink-secondary">
              {hero.intro}
            </p>
          )}
          <div className="mt-6 flex flex-wrap gap-3">
            {hero.primaryCta?.href && hero.primaryCta.label && (
              <Button href={hero.primaryCta.href}>{hero.primaryCta.label}</Button>
            )}
            {hero.secondaryCta?.href && hero.secondaryCta.label && (
              <Button href={hero.secondaryCta.href} variant="secondary">
                {hero.secondaryCta.label}
              </Button>
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-[1200px] px-6 pb-10 pt-8">
      <HeroCarousel slides={slides} variant="hero" overlay={copy} />
    </div>
  )
}
