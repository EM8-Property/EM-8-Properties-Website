import { Eyebrow } from '@/components/ui/Eyebrow'
import { Button } from '@/components/ui/Button'

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
 */
export function HomeHero({ hero }: { hero: HeroCopy }) {
  return (
    <div className="mx-auto max-w-[1200px] px-6 pb-10 pt-14">
      {hero.eyebrow && <Eyebrow>{hero.eyebrow}</Eyebrow>}
      <h1 className="mt-4 max-w-[19ch] text-5xl font-bold leading-[1.08] tracking-tight text-ink">
        {hero.title}
        {hero.titleAccent && <> <span className="text-teal-text">{hero.titleAccent}</span></>}
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
  )
}
