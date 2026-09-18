import type { CSSProperties } from 'react'

/**
 * The proof band — AUM, units managed, realized multiple.
 *
 * Columns are responsive rather than a flat `repeat(n)`. With five stats, a fixed inline
 * grid gives ~75px per column on a 375px viewport, which crushes both the figure and its
 * label. It starts at two columns and only opens to the full count at `lg`, where there
 * is room — *for a container that actually grows at that width*, such as `mx-auto
 * max-w-[1200px] px-6`.
 *
 * That column decision is controlled by `columns`, and it is deliberately a *second*,
 * independent prop from `tone`. `columns` answers "how wide is the box this grid sits
 * in"; `tone` answers "what ground is it sitting on, ink-on-white or white-on-photo".
 * They used to be one prop — `columns` was inferred from `tone === 'onPhoto'` — and that
 * conflation was itself the bug: `PageHero` has a no-photography fallback branch where
 * `tone` is `'default'` but the container is still `max-w-[42ch]`, so the old code
 * happily restored the `lg:` override for a 424px box the moment there was no photograph,
 * crushing the same five stats the on-photo fix had just repaired one branch over.
 *
 * `columns="narrow"` is for any container that is `max-w-[42ch]` — measured at 424px —
 * regardless of viewport width, because `lg:` is a *viewport* breakpoint, not a
 * container query: it fires once the viewport crosses 1024px, whether or not the box the
 * grid actually lives in ever grows. Five columns inside 424px works out to roughly 85px
 * each before gaps, and gaps only shrink that; measured in the browser it was 45px per
 * figure cell, well under the ~75px this docblock already documents as too crushed for
 * `text-2xl` figures like "$100M+" and "36.2%". So `narrow` stops at the `sm:grid-cols-3`
 * step (five stats wrap 3+2) and never adopts the `lg:` override at all — not a narrower
 * version of it, none of it. `columns="measure"` (the default) is for a container that
 * really does have the room at `lg`, such as the 1200px page measure; it still opens to
 * the full column count there. `PageHero` passes `columns="narrow"` in *both* of its
 * branches — the photograph overlay and the no-photography fallback — because both sit
 * inside `max-w-[42ch]`; only `tone` differs between them. Do not restore the `lg:` rule
 * for a 424px container without first changing the container it measures against — see
 * `tests/unit/ui.test.tsx`, which pins the presence of the `lg:` token on `columns="measure"`
 * and its absence on `columns="narrow"`, independent of tone.
 *
 * `tone="onPhoto"` is the same closed-set pattern `Eyebrow` already uses, and deliberately
 * reuses its exact values rather than choosing new ones: the figure takes `text-white`
 * (what `PageHero`'s own h1 already wears on a photograph) and the label takes
 * `text-white/80` (`Eyebrow`'s own `onPhoto` value). Spec §9 counts seven pre-existing
 * `text-white`-on-a-moving-token pairings a future dark re-theme has to fix and says not
 * to add an eighth; reusing these two exact, already-legal values means this component
 * adds nothing new for that re-theme to find — it moves when `Eyebrow` and the hero h1
 * move, because it is the same value, not a value that happens to match today. The
 * default tone keeps the band's own bordered, panel-grounded look — `border-rule` and
 * `bg-panel` are tokens for a hairline and a fill against a *white* ground, and against a
 * photograph under a dark scrim they either disappear or read as a stray box, so the
 * on-photo tone drops both rather than trying to make them work on an image.
 */
export function StatBand({
  stats,
  tone = 'default',
  columns = 'measure',
}: {
  stats: { figure: string; label: string }[]
  tone?: 'default' | 'onPhoto'
  /**
   * The column decision, independent of `tone` — see the docblock above. `'narrow'` is
   * for a `max-w-[42ch]` (424px) container and never adopts the `lg:` override at all;
   * `'measure'` (the default) is for a container with real room at `lg`, such as the
   * 1200px page measure, and keeps it.
   */
  columns?: 'measure' | 'narrow'
}) {
  const onPhoto = tone === 'onPhoto'
  // The `lg:` column override is scoped to `columns="measure"` only — see the docblock
  // above. `columns="narrow"` caps at the `sm:grid-cols-3` step and never receives the
  // `lg:` rule, in any form, because a 424px box never has room for five.
  const colClasses =
    columns === 'narrow'
      ? 'grid-cols-2 sm:grid-cols-3'
      : 'grid-cols-2 sm:grid-cols-3 lg:[grid-template-columns:repeat(var(--stat-cols),minmax(0,1fr))]'
  return (
    <div
      data-stat-band
      className={`grid ${colClasses}${onPhoto ? '' : ' border-y border-rule bg-panel'}`}
      style={{ '--stat-cols': stats.length } as CSSProperties}
    >
      {/*
        The cell's own box differs by tone, and on a photograph the three differences are
        all about the stats reading as part of the hero copy rather than as a widget
        sitting near it. Measured at 375x812 on the homepage, five stats in the
        `columns="narrow"` 2-column grid:

          px-5 py-5   band 300px   figures start 20px right of the h1
          pe-5 py-4   band 252px   figures start on the h1

        - `ps-0`, spelled by leaving the inline-start padding off: the first column's
          figure now begins on the same vertical as the eyebrow, the headline, the intro
          and the buttons. It was inset 20px from all four, which on a phone — where the
          grid is 2 columns wide and the copy is the full measure — reads as a misaligned
          block rather than as a deliberate indent. `pe-5` stays, and it is what keeps
          the 20px gutter between column one and column two.
        - `py-4` over `py-5`: 8px a row, 24px over the three rows the five stats wrap to
          on a phone. That is the budget the 10px label below is paid for out of.
        - Physical `pl`/`pr` are banned in the shared primitives (asserted in
          `tests/unit/ui.test.tsx`), so this is `pe`, not `pr`. Phase 2 mirrors it.

        The white-ground tone keeps `px-5 py-5`: it has the rules and the panel fill to
        sit inside, so its padding is the box, not an alignment.
      */}
      {stats.map((s) => (
        <div
          key={s.label}
          className={onPhoto ? 'py-4 pe-5' : 'border-e border-rule px-5 py-5 last:border-e-0'}
        >
          {/*
            26px on a photograph against the white ground's 24px. The figure is the
            loudest thing in the stat row and it now sits under a 40px headline rather
            than a 36px one; 26px holds the gap between them without touching the wrap —
            "$100M+" sets 134px wide in a 164px column at 375px, so the longest figure
            still clears its cell. The banded version is unchanged, because nothing moved
            above it.
          */}
          <div
            data-stat-figure
            className={`font-bold tracking-tight ${
              onPhoto ? 'text-[26px] text-white' : 'text-2xl text-ink'
            }`}
          >
            {s.figure}
          </div>
          {/*
            10px on a photograph, up from 8px, and this is the legibility fix rather than
            a proportion one. 8px of letter-spaced uppercase is below what a phone screen
            renders as words — "Realized Equity Multiple" at 8px/0.16em was the worst
            case on the homepage — and it is the only type on the site set under 10px.
            The tracking comes in to 0.14em at the larger size so the labels still wrap
            where they did.

            It costs 33px across the three rows, against the 24px the `py-4` above gives
            back: the stat block nets +9px, and the hero +9px on a 957px box.

            8px survives on the white ground, where these labels sit in a bordered panel
            at desktop widths and were never the phone's problem.
          */}
          <div
            data-stat-label
            className={`mt-1 font-semibold uppercase ${
              onPhoto
                ? 'text-[10px] tracking-[0.14em] text-white/80'
                : 'text-[8px] tracking-[0.16em] text-ink-secondary'
            }`}
          >
            {s.label}
          </div>
        </div>
      ))}
    </div>
  )
}
