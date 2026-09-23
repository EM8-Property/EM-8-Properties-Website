# EM8 website — handover, 2026-09-23 (phone homepage hero, concept B)

Follows `docs/handover-2026-09-23-phone-hero-full-bleed.md` the same day. With the phone
homepage full-bleed and "like the computer", Hunter looked at it on his phone: "not giving
me that wow factor ... maybe too text heavy". Three concepts were mocked on the real
slides (A cinematic, B headline + stat strip, C split). He chose **B**, and chose to
**drop the intro paragraph on phones** rather than move it below the hero.

## What changed — homepage, below `sm` only

| | before | concept B |
|---|---|---|
| intro paragraph | 5 lines on the photo | **hidden** (`hidden sm:block`) |
| headline | 36px / 1.0 | **40px, 42px from 390 wide / 1.02** (`HOME_PHONE_H1`) |
| secondary CTA | outlined button | **underlined text link** (`Button` `onPhotoLink`; outlined again from `sm`) |
| stats | 5-stat grid, 3 rows | **one strip of the first 3** under a teal hairline (`StatStrip`); full grid from `sm` |
| scrim | 90 / 75 / 25 | **`bg-hero-phone-scrim`**: 95% @0, 70% @40%, 10% @68%, 15% @100% — top of photo nearly clear |
| box | ~897px at 390 | **one screen** (min-h-svh, copy now fits) |
| `sizes` phone clause | 600vw | **400vw** (812 / 375 × 1.78 ≈ 3.85x) |

**Unchanged, verified against live computed styles:** `/` at 1440 and 768 (the only
difference is the hidden strip's `display: none`), `/investors` at 1440 and 390, `/about`
at 390. The six band pages keep their 36px headline, paragraph, buttons and scrim.

## Decisions worth carrying

- **The three stats are the Studio's first three `heroStat` documents**, so which three
  show on a phone is editable by reordering there. Today: $100M+ AUM, 1,350+ units managed,
  750+ units sold.
- **The strip is accessible as a `<dl>`:** the label is an `sr-only` `<dt>` and the visible
  label is `aria-hidden`, so a screen reader reads each stat once.
- **40px under 390 wide** is what keeps "communities" inside a 320px screen's 272px
  measure. Checked at 320 and 390: no h1 overflow.
- **The 36px rationale still holds for band pages** and is now scoped to them: the E2E test
  asserts the homepage at 42px and `/about` at 36px, at 390x844.
- On the smallest phone (320x568) the hero is taller than the screen, so the stat strip
  sits just below the first screen. Expected at that size.

## Brand note, not acted on

The desktop's five-stat grid mixes scopes: 36.2% average annual return on equity is a
**sponsor-scope** figure (with Deshe Real Estate Group) per the EM8 brand guidelines, shown
beside firm-scope figures without a label. The phone strip shows only firm-scope figures.
Flagged to Hunter; unchanged in code because it is CMS content.

## Tests

669 unit, 47/47 Playwright, `tsc`, `eslint`, `next build` clean.

- `pageHero.test.tsx`: the homepage hides the intro, links the secondary CTA, and renders
  the first three stats in a phone-only strip with the full grid kept for `sm`; the band
  variant does none of it.
- `typeScale.test.tsx`: band pages pinned at 36px / 1.0; the homepage phone step at
  40px / 42px / 1.02; both share the `sm` and `lg` steps.
- `heroCarousel.test.tsx`: the homepage phone scrim is `bg-hero-phone-scrim` with the
  band's desktop `sm:` stops exactly; `sizes` phone clause 385–500vw.
- `site.spec.ts`: computed headline size, 42px on `/` and 36px on `/about`, at 390x844.

---

## For Hunter — add anything below this line

Nothing below here is written by Claude.

### Priorities for the next session

-

### Corrections to anything above

-
