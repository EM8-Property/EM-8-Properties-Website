# Palette Centralization and Guard Derivation — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Put every colour in the codebase behind a token and derive both required-content guards from one array, so the dark re-theme becomes a token swap and the next required field is free.

**Architecture:** Two independent PRs. PR 1 moves seven scattered colour decisions into `src/lib/tokens.ts` and `@theme`, converts the photographic scrims to token-with-opacity, fixes a live WCAG 1.4.11 defect on form inputs, adds an ESLint rule forbidding colour literals under `src/`, and collapses team bios behind a native disclosure. PR 2a replaces two hand-maintained lists of required `siteSettings` leaves with one exported array that both the layout guard and the release gate consume.

**Tech Stack:** Next.js 16 (App Router, RSC), TypeScript strict, Tailwind v4 (`@theme`), Sanity v6, Vitest, Playwright, ESLint flat config.

**Spec:** `docs/superpowers/specs/2026-09-08-em8-feedback-design.md` — §4 (palette centralization), §9 (the `field-border` split and the chip table), §5 (why the guard derivation is a precondition for the nav), §3 (team role changes are Studio work; only the disclosure is code).

## Global Constraints

Copied from `README.md` "Non-negotiables" and the spec. Every task's requirements implicitly include these.

- **Small teal text is `#2C7A74`, never `#4ABDB5`.** The accent measures ~2.2:1 on white. Teal-filled buttons carry **ink** text, not white — white on the accent is 2.27:1. `tests/unit/chipContrast.test.ts` pins this.
- **CSS logical properties only.** `ms-`/`me-`/`ps-`/`pe-`/`text-start`. Never `ml-`/`mr-`/`text-left`. Enforced by ESLint across all of `src/`, including class strings built in variables and inline styles.
- **Never phrase returns as promises.** Permitted: *targeted, projected, underwritten, estimated, pro forma*. Banned: *guaranteed, will return, assured, risk-free*.
- **No placeholder figures ship.** The denylist is `tests/shared/placeholders.ts`.
- **Queries use `defineQuery` with fields inlined.** Typegen only discovers queries declared that way.
- **Do not run `npx prettier`** — there is no config in this repo and it rewrites files to double quotes and semicolons. Fix indentation by hand.
- **Do not use Next's generated global types** (`LayoutProps`, `PageProps`) — they exist only after a build and fail `tsc --noEmit` on a clean checkout.
- Every PR is accepted on a **390x844 DPR-3 phone** measurement, with desktop as the regression check (spec §11).

---

## File Structure

**PR 1 — colours**

| file | responsibility |
|---|---|
| `src/lib/tokens.ts` | modify — the palette record; gains `danger`, `tealHover`, `fieldBorder` |
| `src/app/globals.css` | modify — `@theme` gains the matching CSS variables |
| `src/lib/chipColors.ts` | **create** — the taxonomy-keyed chip fills, moved out of the component so the lint rule needs no component-shaped exception |
| `src/components/ui/Chip.tsx` | modify — imports the map instead of declaring it |
| `src/components/forms/LeadForm.tsx` | modify — `text-[#C0392B]` to `text-danger`; input border to `border-field-border` |
| `src/components/ui/Button.tsx` | modify — `hover:bg-[#3AA8A0]` to `hover:bg-teal-hover` |
| `src/components/property/OfferingBlock.tsx` | modify — same hover |
| `src/components/property/PropertyMap.tsx` | modify — marker colours imported from `tokens` |
| `src/components/layout/HeroCarousel.tsx` | modify — gradient scrim to `from-ink/90 via-ink/55 to-ink/25` |
| `src/components/home/InvestorPopup.tsx` | modify — `bg-[rgba(26,26,26,0.55)]` to `bg-ink/55` |
| `src/components/layout/SiteHeader.tsx` | modify — inline `rgba(255,255,255,...)` to `bg-ground/85` |
| `src/components/about/TeamBio.tsx` | modify — wraps its paragraphs in a `<details>` disclosure |
| `eslint.config.mjs` | modify — a `no-restricted-syntax` entry forbidding colour literals |
| `tests/unit/tokens.test.ts` | modify — assert the new tokens and their ratios |
| `tests/unit/chipContrast.test.ts` | modify — import from the new module; assert fill-against-ground |
| `tests/unit/teamBio.test.tsx` | **create** — the disclosure's behaviour |

**PR 2a — guards**

| file | responsibility |
|---|---|
| `src/lib/requiredContent.ts` | **create** — one array of required `siteSettings` leaves, each with a GROQ alias and a message |
| `src/app/(site)/layout.tsx` | modify — throws by iterating that array |
| `tests/integration/content-integrity.test.ts` | modify — gates the live dataset by iterating the same array |
| `tests/unit/requiredContent.test.ts` | **create** — the predicate's edge cases, and that the layout no longer repeats the list |

---

# PR 1 — Make every colour a token

## Task 1: The three missing tokens

**Files:**
- Modify: `src/lib/tokens.ts:1-13`
- Modify: `src/app/globals.css:11-26`
- Test: `tests/unit/tokens.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: `palette.danger`, `palette.tealHover`, `palette.fieldBorder` as hex `string`s on the frozen `palette` object exported from `@/lib/tokens`; CSS classes `text-danger`, `bg-teal-hover`, `border-field-border`.

- [ ] **Step 1: Write the failing test**

Append to `tests/unit/tokens.test.ts`:

```ts
describe('tokens that were literals in components', () => {
  it('carries a danger colour that passes as text on the ground', () => {
    // #C0392B was `text-[#C0392B]` in LeadForm. It measures 5.44:1 on white and 3.20:1
    // on #1A1A1A — so the value that ships today fails the moment the ground moves, on
    // the error message of the site's only conversion path.
    expect(contrastRatio(palette.danger, palette.ground)).toBeGreaterThanOrEqual(4.5)
  })

  it('carries a teal hover that reaches 3:1 against the ground', () => {
    // #3AA8A0 was `hover:bg-[#3AA8A0]` in Button and OfferingBlock, and it measures
    // 2.88:1 on white — already failing today as a control boundary.
    expect(contrastRatio(palette.tealHover, palette.ground)).toBeGreaterThanOrEqual(3)
  })

  it('carries a field border at 3:1, which `rule` deliberately is not', () => {
    // WCAG 1.4.11: an input's border conveys where the control is, so it needs 3:1. A
    // divider does not. `rule` is 1.43:1 against white by design; splitting the token is
    // what lets both be correct.
    expect(contrastRatio(palette.fieldBorder, palette.ground)).toBeGreaterThanOrEqual(3)
    expect(contrastRatio(palette.rule, palette.ground)).toBeLessThan(3)
  })
})
```

- [ ] **Step 2: Run it and watch it fail**

Run: `npx vitest run tests/unit/tokens.test.ts`

Expected: three failures, each `expected NaN to be greater than or equal to ...` — `contrastRatio` receives `undefined` because the tokens do not exist yet.

- [ ] **Step 3: Add the tokens**

In `src/lib/tokens.ts`, inside `Object.freeze({ ... })`, after `tealText`:

```ts
  /**
   * Colours that lived as Tailwind arbitrary values in components until 2026-09-08.
   *
   * They are here because the palette has to be *whole* before the ground can move: a
   * token swap only moves what is in the palette, and every one of these was invisible to
   * both contrast tests. `danger` is the sharpest case — it is the lead form's error
   * message, and at #C0392B it measures 3.20:1 on a dark ground, below the 4.5 a text
   * colour needs, on the only conversion path the site has.
   */
  danger: '#C0392B',
  tealHover: '#3AA8A0',
  /**
   * An input's border, which WCAG 1.4.11 holds to 3:1 because it conveys where the
   * control is. `rule` is 1.43:1 against white and stays that way — it draws dividers,
   * which 1.4.11 does not govern. LeadForm used `rule` for its inputs, so the site ships
   * a 1.43:1 field border today; that is the defect this split fixes.
   */
  fieldBorder: '#959590',
```

- [ ] **Step 4: Add the matching CSS variables**

In `src/app/globals.css`, inside `@theme`, after `--color-teal-text`:

```css
  /* Mirrors src/lib/tokens.ts. See the comments there for why each one exists. */
  --color-danger: #C0392B;
  --color-teal-hover: #3AA8A0;
  --color-field-border: #959590;
```

- [ ] **Step 5: Run the test and watch it pass**

Run: `npx vitest run tests/unit/tokens.test.ts`

Expected: PASS, every test in the file.

- [ ] **Step 6: Commit**

```bash
git add src/lib/tokens.ts src/app/globals.css tests/unit/tokens.test.ts
git commit -m "Add the three colours that were living in components"
```

## Task 2: Move the chip fills into `lib`

**Files:**
- Create: `src/lib/chipColors.ts`
- Modify: `src/components/ui/Chip.tsx:1-33`
- Test: `tests/unit/chipContrast.test.ts`

**Interfaces:**
- Consumes: nothing from Task 1.
- Produces: `CHIP_COLORS: Record<string, string>` and `CHIP_FALLBACK_COLOR: string` exported from `@/lib/chipColors`. `Chip.tsx` re-exports neither — importers must move to the new path.

- [ ] **Step 1: Point the test at the new module**

In `tests/unit/chipContrast.test.ts`, change the import:

```ts
import { CHIP_COLORS, CHIP_FALLBACK_COLOR } from '@/lib/chipColors'
```

- [ ] **Step 2: Run it and watch it fail**

Run: `npx vitest run tests/unit/chipContrast.test.ts`

Expected: FAIL — `Failed to resolve import "@/lib/chipColors"`.

- [ ] **Step 3: Create the module**

Create `src/lib/chipColors.ts`, moving the map verbatim out of `Chip.tsx`:

```ts
/**
 * Chip fills, keyed by asset class and status.
 *
 * In `lib` rather than beside the component for the same reason `propertyTaxonomy.ts` is:
 * this is shared vocabulary and the module imports nothing. It also keeps the
 * colour-literal lint rule honest — its exception list is two files in `lib` plus
 * `global-error.tsx`, rather than an exception shaped like a component.
 *
 * Every fill carries white text at 4.5:1 or better. The original palette ranged 2.16:1 to
 * 4.37:1 — every one failing, on 10px text, on every portfolio card and property header.
 * `tests/unit/chipContrast.test.ts` pins the ratios both ways: text on the fill, and the
 * fill against the page ground.
 *
 * `stabilized` and `lease-up` use the accessible teal (#2C7A74) rather than the accent
 * (#4ABDB5), which measured 2.27:1.
 */
export const CHIP_COLORS: Record<string, string> = {
  multifamily: '#00707F',
  'mixed-use': '#01579B',
  townhomes: '#2E7D32',
  industrial: '#A64B00',
  retail: '#6A1B9A',
  senior: '#455A64',
  stabilized: '#2C7A74',
  'lease-up': '#2C7A74',
  'under-construction': '#01579B',
  'renovation-complete': '#2E7D32',
  'under-contract': '#8C5000',
  sold: '#455A64',
}

export const CHIP_FALLBACK_COLOR = '#455A64'
```

- [ ] **Step 4: Strip the map out of the component**

In `src/components/ui/Chip.tsx`, delete the `CHIP_COLORS` and `CHIP_FALLBACK_COLOR` declarations and their docblock, and set the imports to:

```ts
import { ASSET_CLASS_LABELS, STATUS_LABELS } from '@/lib/propertyTaxonomy'
import { CHIP_COLORS, CHIP_FALLBACK_COLOR } from '@/lib/chipColors'
```

Leave the `Chip` function and its comments exactly as they are.

- [ ] **Step 5: Move every other importer**

Run: `grep -rn "from '@/components/ui/Chip'" src/ tests/`

For each hit importing `CHIP_COLORS` or `CHIP_FALLBACK_COLOR`, change the specifier to `@/lib/chipColors`. Imports of the `Chip` component itself stay.

- [ ] **Step 6: Run the test and the typechecker**

Run: `npx vitest run tests/unit/chipContrast.test.ts && npx tsc --noEmit`

Expected: PASS, and tsc silent.

- [ ] **Step 7: Commit**

```bash
git add src/lib/chipColors.ts src/components/ui/Chip.tsx tests/unit/chipContrast.test.ts
git commit -m "Move the chip fills into lib, beside the taxonomy they key off"
```

## Task 3: Assert chip fills against the ground, not just their text

**Files:**
- Modify: `tests/unit/chipContrast.test.ts`

**Interfaces:**
- Consumes: `CHIP_COLORS` from `@/lib/chipColors`; `palette` and `contrastRatio` from `@/lib/tokens`.
- Produces: nothing importable. This is the assertion that makes the re-theme's chip work visible instead of silent.

- [ ] **Step 1: Write the test**

Append inside the `describe('chip fills', ...)` block in `tests/unit/chipContrast.test.ts`:

```ts
  it('keeps every fill distinguishable from the page ground', () => {
    /*
     * The gap this closes: the assertions above check the white text ON each fill and say
     * nothing about the fill against the page. So a re-theme could move the ground and
     * leave every chip a dark rectangle on a dark page with this file still green.
     *
     * Against the current white ground the fills run 5.07:1 to 9.39:1, so this passes
     * today with room. Against #1A1A1A four of the eight unique fills fall below 3:1 —
     * retail #6A1B9A worst at 1.85 — which is the work the dark re-theme has to do, and
     * the reason this assertion lands before it rather than after.
     *
     * 3:1 rather than 4.5:1 because a chip's edge is a non-text boundary: WCAG 1.4.11,
     * the same bar `fieldBorder` is held to.
     */
    const failures = Object.entries(CHIP_COLORS)
      .map(([kind, hex]) => ({ kind, hex, ratio: contrastRatio(hex, palette.ground) }))
      .filter(({ ratio }) => ratio < 3)
    expect(
      failures,
      `chip fills below 3:1 against the page ground (${palette.ground}):\n  ${failures
        .map((f) => `${f.kind} ${f.hex} = ${f.ratio.toFixed(2)}:1`)
        .join('\n  ')}`,
    ).toEqual([])
  })
```

- [ ] **Step 2: Run it, then prove it can fail**

Run: `npx vitest run tests/unit/chipContrast.test.ts`

Expected: **PASS.** This is the one test in the plan that passes when first written, deliberately — it guards a change that has not happened yet. So prove it can fail: temporarily set `retail: '#1F1F1F'` in `src/lib/chipColors.ts`, re-run, confirm it reports `retail #1F1F1F = 1.12:1`, then restore `#6A1B9A`.

- [ ] **Step 3: Commit**

```bash
git add tests/unit/chipContrast.test.ts
git commit -m "Assert chip fills against the ground, not only their own text"
```

## Task 4: Replace the component colour literals

**Files:**
- Modify: `src/components/forms/LeadForm.tsx:15,110`
- Modify: `src/components/ui/Button.tsx:35`
- Modify: `src/components/property/OfferingBlock.tsx:71`
- Modify: `src/components/property/PropertyMap.tsx:58-59`

**Interfaces:**
- Consumes: `palette` from Task 1; the classes `text-danger`, `bg-teal-hover`, `border-field-border`.
- Produces: no new exports. After this task no `src/**/*.tsx` outside the exception list holds a colour literal.

- [ ] **Step 1: Fix the error text and the input border**

In `src/components/forms/LeadForm.tsx`, line 15 becomes:

```ts
/*
 * `field-border`, not `rule`. An input's border conveys where the control is, so WCAG
 * 1.4.11 holds it to 3:1; `rule` is 1.43:1 against white because it draws dividers, which
 * 1.4.11 does not govern. This form shipped at 1.43:1 until 2026-09-08.
 */
const inputClass = 'rounded-control border border-field-border px-3 py-2 text-xs'
```

and line 110:

```tsx
        <p role="alert" className="text-xs text-danger">
```

- [ ] **Step 2: Fix the two teal hovers**

`src/components/ui/Button.tsx` line 35: `'bg-teal text-ink hover:bg-teal-hover'`

`src/components/property/OfferingBlock.tsx` line 71: replace `hover:bg-[#3AA8A0]` with `hover:bg-teal-hover`, leaving the rest of the class string untouched.

- [ ] **Step 3: Fix the map markers**

In `src/components/property/PropertyMap.tsx` add to the imports:

```ts
import { palette } from '@/lib/tokens'
```

and replace lines 58-59 with:

```ts
        // From tokens rather than literals: Leaflet draws its vectors through a JS API,
        // so these cannot be Tailwind classes and would otherwise be the one pair of
        // colours a token swap silently misses.
        color: palette.tealText,
        fillColor: palette.teal,
```

- [ ] **Step 4: Run the suite, the typechecker and lint**

Run: `npm test && npx tsc --noEmit && npm run lint`

Expected: all green, with the unit count unchanged by this task (443 as of 2026-09-03).

- [ ] **Step 5: Commit**

```bash
git add src/components/forms/LeadForm.tsx src/components/ui/Button.tsx src/components/property/OfferingBlock.tsx src/components/property/PropertyMap.tsx
git commit -m "Put the component colour literals behind tokens, and fix a 1.43:1 input border"
```

## Task 5: Turn the photographic scrims into tokens with opacity

**Files:**
- Modify: `src/components/layout/HeroCarousel.tsx:341`
- Modify: `src/components/home/InvestorPopup.tsx:138`
- Modify: `src/components/layout/SiteHeader.tsx:72`
- Test: `tests/unit/pageHero.test.tsx`, `tests/unit/overlayHeader.test.tsx`

**Interfaces:**
- Consumes: the `--color-ink` and `--color-ground` theme variables, which already exist.
- Produces: no new exports. `HEADER_SCRIM` in `SiteHeader.tsx` is deleted; its opacity becomes part of a class name.

- [ ] **Step 1: Write the failing test**

Append inside `describe('hero geometry, both shapes', ...)` in `tests/unit/pageHero.test.tsx`:

```tsx
  it('draws the scrim from the ink token rather than an rgba literal', () => {
    /*
     * The scrim is ink at three opacities. Written as `rgba(26,26,26,...)` it is the ink
     * value copied by hand into three places in one class string, which a token swap
     * cannot follow — the photograph would keep a near-black scrim on a page whose ink
     * had become near-white.
     *
     * Tailwind v4 takes an opacity modifier on a theme colour, so `from-ink/90` is the
     * same pixels and moves with the token.
     */
    const { container } = render(<HeroCarousel slides={SLIDES} />)
    const scrim = container.querySelector('span[class*="bg-gradient-to-t"]')!
    expect(scrim.className).toMatch(/from-ink\/90/)
    expect(scrim.className).toMatch(/via-ink\/55/)
    expect(scrim.className).toMatch(/to-ink\/25/)
    expect(scrim.className).not.toMatch(/rgba/)
  })
```

- [ ] **Step 2: Run it and watch it fail**

Run: `npx vitest run tests/unit/pageHero.test.tsx -t "draws the scrim"`

Expected: FAIL — the class string still reads `from-[rgba(26,26,26,0.90)]`.

- [ ] **Step 3: Convert the three scrims**

`src/components/layout/HeroCarousel.tsx` line 341:

```tsx
            <span className="absolute inset-0 bg-gradient-to-t from-ink/90 via-ink/55 to-ink/25" />
```

`src/components/home/InvestorPopup.tsx` line 138:

```tsx
        className="absolute inset-0 bg-ink/55"
```

`src/components/layout/SiteHeader.tsx` — this one is an inline style driven by a constant, so the constant goes and the class takes over. Remove the `style={overlay ? ... : undefined}` attribute, delete the `HEADER_SCRIM` constant, and add `bg-ground/85` to the overlay branch of the existing `className` expression, carrying the reasoning across:

```tsx
      /*
       * 0.85, not 1: the header sits over a photograph on the hero pages, and a fully
       * opaque bar would cut a hard line across it. `bg-ground/85` rather than an inline
       * rgba, so the ground token carries it — at 0.85 the worst case is still legible
       * ink on a near-ground field.
       */
```

- [ ] **Step 4: Run the affected tests**

Run: `npx vitest run tests/unit/pageHero.test.tsx tests/unit/overlayHeader.test.tsx`

Expected: PASS. If `overlayHeader.test.tsx` asserts on `style` or on `HEADER_SCRIM`, move those assertions onto the class — the scrim's *value* is unchanged, only where it is written.

- [ ] **Step 5: Prove the pixels did not move**

A scrim is the one thing in this PR that can pass a test and look wrong, so look at it:

```bash
netstat -ano | grep :3000
```

Kill any listener with `taskkill //PID <pid> //F`, then `rm -rf .next/cache && npm run build && npm start`. Open `/` and confirm the hero gradient and the header bar are visually unchanged.

- [ ] **Step 6: Commit**

```bash
git add src/components/layout/HeroCarousel.tsx src/components/home/InvestorPopup.tsx src/components/layout/SiteHeader.tsx tests/unit/pageHero.test.tsx tests/unit/overlayHeader.test.tsx
git commit -m "Draw the scrims from tokens with opacity, not rgba literals"
```

## Task 6: Forbid colour literals under `src/`

**Files:**
- Modify: `eslint.config.mjs:36-72`

**Interfaces:**
- Consumes: nothing. Depends on Tasks 1-5 having removed every literal outside the exception list.
- Produces: a lint error on any new hex or `rgba(` under `src/**/*.{ts,tsx}` outside the three allowed files.

- [ ] **Step 1: Confirm the codebase is clean first**

```bash
grep -rnE "#[0-9a-fA-F]{6}\b|rgba?\(" src/ --include=*.ts --include=*.tsx \
  | grep -v "src/lib/tokens.ts" \
  | grep -v "src/lib/chipColors.ts" \
  | grep -v "src/app/global-error.tsx"
```

Expected: only comment lines, if anything. Any live hit is a literal Tasks 1-5 missed — fix it before adding the rule, because a rule that fails on `main` is a rule someone will disable.

- [ ] **Step 2: Add the rule**

In `eslint.config.mjs`, above `const eslintConfig`:

```js
const COLOR_LITERAL = "#[0-9a-fA-F]{3,8}\\b|rgba?\\(";
const COLOR_LITERAL_MESSAGE =
  "Colour literals belong in src/lib/tokens.ts (or chipColors.ts), not in a " +
  "component. The dark re-theme is a token swap, and a swap only moves what is in " +
  "the palette. Use a token class (text-danger, bg-teal-hover, border-field-border) " +
  "or an opacity modifier on one (bg-ink/55).";
```

Then append to the `no-restricted-syntax` array in the `src/**/*.{ts,tsx}` block:

```js
        // Added 2026-09-08. Seven colour decisions were living as Tailwind arbitrary
        // values and inline styles across eleven files, so the palette was not actually
        // centralized and a token swap would have missed all of them — including
        // LeadForm's error text, which measures 3.20:1 on a dark ground.
        //
        // Same shape as the logical-properties rule above and for the same reason: the
        // guard has to see how this codebase really writes classes, which is often in a
        // variable rather than in a className attribute.
        {
          selector: `Literal[value=/${COLOR_LITERAL}/]`,
          message: COLOR_LITERAL_MESSAGE,
        },
        {
          selector: `TemplateElement[value.raw=/${COLOR_LITERAL}/]`,
          message: COLOR_LITERAL_MESSAGE,
        },
```

- [ ] **Step 3: Exempt the three files that must keep literals**

Add a config object after the `src/**/*.{ts,tsx}` one:

```js
  {
    /*
     * The palette's own home, and the boundary that renders without it.
     *
     * tokens.ts and chipColors.ts ARE the centralized palette — the rule exists to push
     * colours into them. global-error.tsx is the error boundary that renders when the
     * stylesheet has failed to load, so its colours have to be inline: a token it cannot
     * resolve is a black page.
     */
    files: ["src/lib/tokens.ts", "src/lib/chipColors.ts", "src/app/global-error.tsx"],
    rules: { "no-restricted-syntax": "off" },
  },
```

This disables the whole rule for those three, including the logical-properties entries. That is acceptable for two `lib` modules holding only colour strings and for a boundary with no layout — and it is honest, where a partial disable would need the rule split in two.

- [ ] **Step 4: Verify the rule fires and the repo passes**

Run: `npm run lint` — expected clean.

Then prove it works: add `const x = '#FF0000'` to `src/components/ui/Button.tsx`, run `npm run lint`, confirm the message appears, and remove it.

- [ ] **Step 5: Commit**

```bash
git add eslint.config.mjs
git commit -m "Forbid colour literals under src/, now that there are none"
```

## Task 7: Team bios open on click

**Files:**
- Modify: `src/components/about/TeamBio.tsx`
- Modify: `src/app/(site)/about/page.tsx` (the `TeamBio` call inside the card)
- Test: `tests/unit/teamBio.test.tsx` (create)

**Interfaces:**
- Consumes: nothing from earlier tasks.
- Produces: `TeamBio({ bio, name }: { bio?: string | null; name: string })` — `name` is new and required, used for the disclosure's accessible label. `about/page.tsx` must pass `name={m.name ?? ''}`.

- [ ] **Step 1: Write the failing test**

Create `tests/unit/teamBio.test.tsx`:

```tsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { TeamBio } from '@/components/about/TeamBio'

describe('TeamBio disclosure', () => {
  const BIO = 'First paragraph.\n\nSecond paragraph.'

  it('collapses the bio behind a summary', () => {
    const { container } = render(<TeamBio bio={BIO} name="Nir Dror" />)
    const details = container.querySelector('details')
    expect(details, 'the bio is not inside a <details>').not.toBeNull()
    // Closed by default: Etamar asked for bios that appear on click, and collapsing them
    // is also what shortens /about on a phone.
    expect(details!.hasAttribute('open')).toBe(false)
  })

  it('names the person in the summary, so the control is not a bare "Read bio"', () => {
    // A page of nine identical "Read bio" controls is unusable with a screen reader,
    // which announces the control and not the card around it.
    render(<TeamBio bio={BIO} name="Nir Dror" />)
    expect(screen.getByText(/Nir Dror/)).toBeDefined()
  })

  it('still preserves paragraph breaks', () => {
    // The reason this component exists: `bio` is a plain text field, so a board member's
    // three-paragraph career collapses into one wall of text in a single <p>.
    const { container } = render(<TeamBio bio={BIO} name="Nir Dror" />)
    expect(container.querySelectorAll('details p')).toHaveLength(2)
  })

  it('renders nothing at all when there is no bio', () => {
    // No empty disclosure. A summary that opens onto nothing is worse than no control.
    const { container } = render(<TeamBio bio={null} name="Nir Dror" />)
    expect(container.innerHTML).toBe('')
  })

  it('uses no physical-direction utilities', () => {
    const { container } = render(<TeamBio bio={BIO} name="Nir Dror" />)
    expect(container.innerHTML).not.toMatch(/\b(ml-|mr-|pl-|pr-|text-left|text-right)/)
  })
})
```

- [ ] **Step 2: Run it and watch it fail**

Run: `npx vitest run tests/unit/teamBio.test.tsx`

Expected: FAIL — the first test reports `the bio is not inside a <details>`, and TypeScript flags the unknown `name` prop.

- [ ] **Step 3: Implement the disclosure**

Replace `src/components/about/TeamBio.tsx`:

```tsx
/**
 * A team biography, collapsed behind a native disclosure.
 *
 * `<details>` rather than a client component with state: it works with no JavaScript, it
 * is keyboard-operable for free, and it keeps /about a server component. The only cost is
 * styling the marker, which is cheaper than a `useState` boundary on a page that
 * otherwise has none.
 *
 * Collapsed by default. Etamar asked for bios that appear on click, and it also shortens a
 * page that renders nine cards in one column on a phone.
 *
 * `bio` is a plain text field, so its newlines carry no meaning to HTML — a board member's
 * three-paragraph career collapses into one unbroken wall of text if it is dropped into a
 * single <p>. Blank runs are discarded rather than emitted as empty paragraphs, because an
 * editor pasting from a document reliably brings extra newlines with them.
 */
export function TeamBio({ bio, name }: { bio?: string | null; name: string }) {
  if (!bio) return null
  const paragraphs = bio.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean)
  if (paragraphs.length === 0) return null

  return (
    <details className="mt-2">
      {/*
        The name is in the label, not just "Read bio". A screen reader announces the
        control without the card around it, so nine identical controls on one page are
        nine indistinguishable ones.
      */}
      <summary className="cursor-pointer list-none text-[10px] font-semibold uppercase tracking-[0.14em] text-teal-text hover:text-ink">
        <span className="sr-only">Read the biography of {name}</span>
        <span aria-hidden="true">Read bio</span>
      </summary>
      {paragraphs.map((p, i) => (
        <p key={i} className="mt-2 text-xs leading-relaxed text-ink-secondary">
          {p}
        </p>
      ))}
    </details>
  )
}
```

- [ ] **Step 4: Pass the name at the call site**

In `src/app/(site)/about/page.tsx`:

```tsx
                        <TeamBio bio={m.bio} name={m.name ?? ''} />
```

- [ ] **Step 5: Run the tests, the typechecker and lint**

Run: `npx vitest run tests/unit/teamBio.test.tsx && npx tsc --noEmit && npm run lint`

Expected: PASS, tsc silent, lint clean.

- [ ] **Step 6: Measure the effect on the phone, which is the point**

Spec §11 accepts every PR on a phone measurement, so this is the evidence, not a nicety. Write it once and reuse it in Task 8 — put it in the scratchpad, not the repo:

```js
// phone.mjs — page length and header height at the review viewport.
// Usage: node phone.mjs /about
import { createRequire } from 'node:module'
const require = createRequire(process.cwd() + '/package.json')
const { chromium } = require('@playwright/test')

const route = process.argv[2] ?? '/'
const browser = await chromium.launch()
const ctx = await browser.newContext({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 3,
  isMobile: true,
  hasTouch: true,
})
const page = await ctx.newPage()
await page.goto('http://localhost:3000' + route, { waitUntil: 'networkidle' })
console.log(
  await page.evaluate(() => ({
    scrollHeight: document.documentElement.scrollHeight,
    screens: +(document.documentElement.scrollHeight / window.innerHeight).toFixed(1),
    headerHeight: Math.round(document.querySelector('header').getBoundingClientRect().height),
  })),
)
await page.screenshot({ path: `phone-${route.replace(/\//g, '-') || '-home'}.png` })
await browser.close()
```

Kill any stale listener (`npm start` does **not** replace one), `npm run build && npm start`, then run it against `/about` before and after this change and record both `screens` numbers in the PR description. `/about` renders nine team cards in one column on a phone, so collapsing the bios is the largest single reduction available on that page.

- [ ] **Step 7: Commit**

```bash
git add src/components/about/TeamBio.tsx "src/app/(site)/about/page.tsx" tests/unit/teamBio.test.tsx
git commit -m "Collapse team bios behind a native disclosure"
```

## Task 8: Close PR 1

- [ ] **Step 1: Run everything**

```bash
npm test && npx tsc --noEmit && npm run lint && npm run test:content && npm run build
```

Expected: unit suite green with the new tests, tsc silent, lint clean, content gate green, build 29 pages.

- [ ] **Step 2: E2E against a local production build**

Kill any listener on 3000, then `npm run build && npm start`, then `npx playwright test`. Expected: 22 passed, as of 2026-09-03.

- [ ] **Step 3: Screenshot the phone**

Reuse `phone.mjs` from Task 7 Step 6:

```bash
for r in / /about /portfolio /portfolio/burbank-manor-apartments; do node phone.mjs "$r"; done
```

Task 5's scrims and Task 7's disclosure are the only visible changes; everything else should be pixel-identical, and saying so in the PR description is the claim a reviewer will check. `/portfolio/burbank-manor-apartments` is in the list because it is the page carrying both a `Sold` chip and the map markers Task 4 touched.

- [ ] **Step 4: Request a code review, then open the PR**

Title: `Centralize the palette, fix a 1.43:1 input border, collapse team bios`

The description must carry: the seven literals and where they were; the measured `#C0392B` figures (5.44 on white, 3.20 on dark) as the reason this is a prerequisite rather than a tidy-up; the `rule` / `field-border` split with both ratios; the chip table from spec §9; and the before/after phone page length for `/about`.

---

# PR 2a — One list, two guards

## Task 9: Extract the required-leaf array

**Files:**
- Create: `src/lib/requiredContent.ts`
- Test: `tests/unit/requiredContent.test.ts` (create)

**Interfaces:**
- Consumes: nothing. The module must import nothing — like `propertyTaxonomy.ts` and `tokens.ts` — because a server component and a Vitest integration test both import it.
- Produces:
  ```ts
  export type RequiredLeaf = { path: string; groq: string; describe: string }
  export const REQUIRED_SITE_SETTINGS: readonly RequiredLeaf[]
  export function missingLeaves(settings: unknown): RequiredLeaf[]
  ```
  `path` is a dotted accessor (`headerCta.label`), `groq` is the projection the gate uses, `describe` is the sentence naming what breaks.

- [ ] **Step 1: Write the failing test**

Create `tests/unit/requiredContent.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { REQUIRED_SITE_SETTINGS, missingLeaves } from '@/lib/requiredContent'

const COMPLETE = {
  agoraPortalUrl: 'https://example.com',
  contactEmail: 'info@em-8.com',
  disclaimer: 'x',
  headerCta: { label: 'Invest With Us', href: '/investors' },
  ctaBand: { heading: { title: 'x' }, submitLabel: 'x' },
}

describe('required siteSettings leaves', () => {
  it('lists every leaf the layout throws on', () => {
    expect(REQUIRED_SITE_SETTINGS.map((l) => l.path)).toEqual([
      'agoraPortalUrl',
      'contactEmail',
      'disclaimer',
      'headerCta.label',
      'headerCta.href',
      'ctaBand.heading.title',
      'ctaBand.submitLabel',
    ])
  })

  it('reports a leaf whose parent object exists but whose value is null', () => {
    /*
     * The trap this array exists to make unrepeatable. `headerCta { label, href }`
     * projects to a truthy OBJECT when both fields are null, so a guard written against
     * the parent waves a half-filled document straight through — and the header then
     * renders a dark rounded box with no words in it, on every page.
     */
    const missing = missingLeaves({ ...COMPLETE, headerCta: { label: null, href: null } })
    expect(missing.map((l) => l.path)).toEqual(['headerCta.label', 'headerCta.href'])
  })

  it('treats an empty string as missing, not as present', () => {
    // setIfMissing keys on absence, not on falsiness — a leaf holding '' is present and
    // useless, and a header button labelled '' is the defect this guards.
    const missing = missingLeaves({
      ...COMPLETE,
      headerCta: { label: '', href: '/investors' },
    })
    expect(missing.map((l) => l.path)).toEqual(['headerCta.label'])
  })

  it('returns nothing for a complete document', () => {
    expect(missingLeaves(COMPLETE)).toEqual([])
  })

  it('reports everything for a missing document', () => {
    expect(missingLeaves(undefined)).toHaveLength(REQUIRED_SITE_SETTINGS.length)
    expect(missingLeaves(null)).toHaveLength(REQUIRED_SITE_SETTINGS.length)
  })

  it('gives every leaf a GROQ projection and a description', () => {
    // The gate projects by these, and the layout's message is built from the
    // descriptions, so a leaf missing either fails uselessly.
    for (const leaf of REQUIRED_SITE_SETTINGS) {
      expect(leaf.groq, `${leaf.path} has no groq projection`).toBeTruthy()
      expect(leaf.describe, `${leaf.path} has no description`).toBeTruthy()
    }
  })
})
```

- [ ] **Step 2: Run it and watch it fail**

Run: `npx vitest run tests/unit/requiredContent.test.ts`

Expected: FAIL — `Failed to resolve import "@/lib/requiredContent"`.

- [ ] **Step 3: Write the module**

Create `src/lib/requiredContent.ts`:

```ts
/**
 * The `siteSettings` leaves the site cannot render without — in one place, because it was
 * in two and they had already drifted.
 *
 * Before this module the layout threw on seven leaves and `content-integrity` gated four.
 * `contactEmail`, `ctaBand.heading.title` and `ctaBand.submitLabel` were checked by the
 * layout and not by the release gate, so a document missing any of them passed the gate
 * and then failed `next build` at deploy time — the worst place to meet it. The
 * 2026-09-03 handover predicted this drift and said deriving both from one array "would
 * make the next required field free". §5 of the 2026-09-08 spec adds ten nav labels, so
 * this is that array, written before they arrive.
 *
 * Imports nothing, deliberately: a React Server Component and a Vitest integration test
 * both consume it, and anything pulled in here would be pulled into both.
 *
 * Leaves, never parents. `headerCta { label, href }` projects to a truthy object when both
 * of its fields are null, so a guard on the parent waves a half-filled document through
 * and the header renders a dark box with no words in it.
 */
export type RequiredLeaf = {
  /** Dotted accessor into the fetched document. */
  path: string
  /** The projection this leaf needs in a GROQ query, aliased to a flat key. */
  groq: string
  /** What a visitor sees if it is missing. Used to build the thrown message. */
  describe: string
}

export const REQUIRED_SITE_SETTINGS: readonly RequiredLeaf[] = [
  {
    path: 'agoraPortalUrl',
    groq: 'agoraPortalUrl',
    describe: 'agoraPortalUrl — Investor Login has nowhere to point',
  },
  {
    path: 'contactEmail',
    groq: 'contactEmail',
    describe: 'contactEmail — the footer and the Organization JSON-LD both read it',
  },
  {
    path: 'disclaimer',
    groq: 'disclaimer',
    describe: 'disclaimer — the securities language in the footer of every page',
  },
  {
    path: 'headerCta.label',
    groq: '"headerCtaLabel": headerCta.label',
    describe: 'headerCta.label — the header button renders as a dark box with no words',
  },
  {
    path: 'headerCta.href',
    groq: '"headerCtaHref": headerCta.href',
    describe: 'headerCta.href — the header button goes nowhere',
  },
  {
    path: 'ctaBand.heading.title',
    groq: '"ctaBandTitle": ctaBand.heading.title',
    describe: 'ctaBand.heading.title — every page closes on an empty heading',
  },
  {
    path: 'ctaBand.submitLabel',
    groq: '"ctaBandSubmitLabel": ctaBand.submitLabel',
    describe: 'ctaBand.submitLabel — the closing form has an unlabelled submit button',
  },
] as const

function valueAt(source: unknown, path: string): unknown {
  return path
    .split('.')
    .reduce<unknown>(
      (acc, key) =>
        acc && typeof acc === 'object' ? (acc as Record<string, unknown>)[key] : undefined,
      source,
    )
}

/**
 * Which required leaves are absent, empty, or blank.
 *
 * Empty strings count as missing. `setIfMissing` keys on absence rather than falsiness, so
 * a leaf holding `''` is "present" and useless — and a header button labelled `''` is
 * exactly the defect the guard exists for.
 */
export function missingLeaves(settings: unknown): RequiredLeaf[] {
  return REQUIRED_SITE_SETTINGS.filter((leaf) => {
    const value = valueAt(settings, leaf.path)
    return typeof value === 'string' ? value.trim() === '' : !value
  })
}
```

- [ ] **Step 4: Run the test and watch it pass**

Run: `npx vitest run tests/unit/requiredContent.test.ts`

Expected: PASS, six tests.

- [ ] **Step 5: Commit**

```bash
git add src/lib/requiredContent.ts tests/unit/requiredContent.test.ts
git commit -m "Put the required siteSettings leaves in one array"
```

## Task 10: The layout guard iterates the array

**Files:**
- Modify: `src/app/(site)/layout.tsx:27-55`
- Test: `tests/unit/requiredContent.test.ts`

**Interfaces:**
- Consumes: `missingLeaves` from `@/lib/requiredContent`.
- Produces: no new exports. The thrown message now names only the leaves actually missing.

- [ ] **Step 1: Write the failing test**

Add these to the **top** of `tests/unit/requiredContent.test.ts`, beside the existing imports — an `import` mid-file is hoisted and legal but this repo does not write them that way:

```ts
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { stripComments } from '../shared/sourceScan'
```

Then append:

```ts
describe('the layout consumes the array rather than repeating it', () => {
  /*
   * `resolve(import.meta.dirname, ...)` and `stripComments`, both copied from the
   * repo's existing scanners, because this file has been bitten by each: a scanner
   * resolving `src/` from the working directory silently reads nothing, and an assertion
   * that a string is ABSENT matches the comment discussing it and passes for the wrong
   * reason. `\r\n` is normalised for the same class of reason — core.autocrlf is on.
   */
  const layout = stripComments(
    readFileSync(
      resolve(import.meta.dirname, '../../src/app/(site)/layout.tsx'),
      'utf8',
    ),
  ).replace(/\r\n/g, '\n')

  it('imports the shared guard', () => {
    expect(layout).toMatch(/from '@\/lib\/requiredContent'/)
  })

  it('no longer checks leaves by hand', () => {
    /*
     * A source assertion, which is weak, and it is the right weak test here: the drift
     * this PR fixes was two lists of strings, and the only way to stop them growing back
     * is to notice when someone adds an eighth `!settings?....` beside the loop.
     */
    expect(layout).not.toMatch(/!settings\?\.headerCta\?\.label/)
    expect(layout).not.toMatch(/!settings\?\.ctaBand\?\.heading\?\.title/)
  })
})
```

- [ ] **Step 2: Run it and watch it fail**

Run: `npx vitest run tests/unit/requiredContent.test.ts -t "layout consumes"`

Expected: FAIL on both — the layout still holds the hand-written conditions.

- [ ] **Step 3: Rewrite the guard**

In `src/app/(site)/layout.tsx` add to the imports:

```ts
import { missingLeaves } from '@/lib/requiredContent'
```

Replace the seven-condition `if (...) { throw ... }` block with:

```tsx
  /*
   * Missing required content fails the build loudly rather than rendering a broken shell.
   * That is the failure mode the old constants.ts fallback created, and it is why this
   * throws instead of defaulting.
   *
   * The list lives in src/lib/requiredContent.ts because `content-integrity` needs the
   * same one — it used to be written out twice and the two had already diverged by three
   * leaves. Sanity's `required()` gates the Publish button and nothing else: not the API,
   * not a GROQ query, not `next build`.
   *
   * This throws only for content routes. /studio sits outside this route group precisely
   * so that the tool needed to create the missing document stays reachable.
   */
  const missing = missingLeaves(settings)
  if (missing.length > 0) {
    throw new Error(
      'siteSettings is missing or incomplete. Publish a siteSettings document with:\n' +
        missing.map((leaf) => `  - ${leaf.describe}`).join('\n') +
        '\nEdit it at /studio, or at https://em-8-properties.sanity.studio',
    )
  }

  // Non-null past this point: `missingLeaves` returns every leaf for a null document, so
  // the throw above covers it. TypeScript cannot see that through the array.
  const site = settings!
```

- [ ] **Step 4: Fix the narrowing the old `if` was providing**

The old condition narrowed `settings` for the JSX below it; a `missing.length` check does not. Run `npx tsc --noEmit`, expect `'settings' is possibly 'null'` errors in the JSX, and replace each `settings.` accessor below the guard with `site.`.

- [ ] **Step 5: Run everything**

Run: `npx vitest run tests/unit/requiredContent.test.ts && npm test && npx tsc --noEmit && npm run lint`

Expected: all green.

- [ ] **Step 6: Prove the guard still fires**

The guard is what stops a broken shell shipping, so verify it rather than assume it. Temporarily add `{ path: 'nonexistentLeaf', groq: 'nonexistentLeaf', describe: 'probe' }` to `REQUIRED_SITE_SETTINGS`, run `npm run build`, confirm the build fails with `probe` in the message, then remove it and rebuild.

- [ ] **Step 7: Commit**

```bash
git add "src/app/(site)/layout.tsx" tests/unit/requiredContent.test.ts
git commit -m "Throw from the shared array instead of seven hand-written conditions"
```

## Task 11: The release gate iterates the same array

**Files:**
- Modify: `tests/integration/content-integrity.test.ts:170-215`

**Interfaces:**
- Consumes: `REQUIRED_SITE_SETTINGS` and `missingLeaves` from `@/lib/requiredContent`.
- Produces: no new exports. This closes the three-leaf gap between the two guards.

- [ ] **Step 1: Add the import**

```ts
import { REQUIRED_SITE_SETTINGS, missingLeaves } from '@/lib/requiredContent'
```

- [ ] **Step 2: Replace the hand-written gate**

Replace the `siteSettings` assertions — the `agoraPortalUrl`/`disclaimer` fetch and the separate `headerCta` per-leaf test — with one test built from the array:

```ts
  it('publishes a siteSettings document with every leaf the site cannot render without', async () => {
    /*
     * The same array the layout throws on, so the gate and the build can no longer
     * disagree. They did: this file checked four leaves and the layout threw on seven, so
     * a document missing contactEmail, ctaBand.heading.title or ctaBand.submitLabel passed
     * here and failed `next build` at deploy time instead.
     *
     * Projected by alias so a nested leaf arrives flat, then rebuilt into the nested shape
     * and checked with the same predicate the layout uses — including the empty-string
     * case, which `required()` permits and `setIfMissing` will not repair.
     */
    const projection = REQUIRED_SITE_SETTINGS.map((leaf) => leaf.groq).join(', ')
    const rows = await client.fetch<Record<string, unknown>[]>(
      `*[_type == "siteSettings" && ${PUBLISHED}]{ ${projection} }`,
    )
    expect(rows.length, 'no published siteSettings document').toBe(1)

    const flat = rows[0]!
    const settings: Record<string, unknown> = {}
    for (const leaf of REQUIRED_SITE_SETTINGS) {
      // '"headerCtaLabel": headerCta.label' -> 'headerCtaLabel'; 'disclaimer' -> itself.
      const alias = leaf.groq.includes(':') ? leaf.groq.split('"')[1]! : leaf.path
      const keys = leaf.path.split('.')
      let cursor = settings
      for (const key of keys.slice(0, -1)) {
        cursor[key] = (cursor[key] as Record<string, unknown>) ?? {}
        cursor = cursor[key] as Record<string, unknown>
      }
      cursor[keys.at(-1)!] = flat[alias]
    }

    const missing = missingLeaves(settings)
    expect(
      missing,
      `siteSettings leaves that will fail next build:\n  ${missing
        .map((leaf) => leaf.describe)
        .join('\n  ')}`,
    ).toEqual([])
  })
```

Keep the separate `headerCta.label` 20-character assertion — that is a design guardrail on the header, not a required-content check, and it does not belong in this array.

- [ ] **Step 3: Run the gate against the live dataset**

Run: `npm run test:content`

Expected: PASS. It was 12 tests as of 2026-09-03; folding two into one makes it 11. **If it fails, read it rather than fixing the test** — a failure means the live document genuinely lacks one of the three leaves that were never gated, which is the bug this task exists to surface.

- [ ] **Step 4: Prove the gate can fail**

Temporarily add `{ path: 'nonexistentLeaf', groq: 'nonexistentLeaf', describe: 'probe' }` to the array, run `npm run test:content`, confirm it fails naming `probe`, and remove it.

- [ ] **Step 5: Commit**

```bash
git add tests/integration/content-integrity.test.ts
git commit -m "Gate the live dataset from the same array the layout throws on"
```

## Task 12: Close PR 2a

- [ ] **Step 1: Run everything**

```bash
npm test && npx tsc --noEmit && npm run lint && npm run test:content && npm run build
```

Expected: unit suite green, tsc silent, lint clean, content gate 11, build 29 pages.

- [ ] **Step 2: E2E against a local production build**

Kill any listener on 3000, `npm run build && npm start`, then `npx playwright test`. Expected: 22 passed.

- [ ] **Step 3: Request a code review, then open the PR**

Title: `Derive both required-content guards from one array`

The description must state the drift as the reason: seven leaves in the layout against four in the gate, with `contactEmail`, `ctaBand.heading.title` and `ctaBand.submitLabel` gated nowhere — so a document missing any of them passed the release gate and failed `next build` at deploy time. Note that this is a refactor with no visible effect, done now because spec §5 adds ten nav labels and doing it afterwards costs twelve careful edits instead of one.

---

## Notes for whoever executes this

- **`npm start` does not replace a server already on port 3000.** The old process keeps the port and keeps serving the previous build. `netstat -ano | grep :3000`, then `taskkill //PID <pid> //F`.
- **`npm run lighthouse` dies on Windows *after* it finishes** — `chrome-launcher` throws `EPERM` removing its temp directory. `lh.json` is already written; run `node scripts/lighthouse-report.mjs`.
- **CRLF comes back after a branch switch**, so a multi-line replacement keyed on `\n` can silently match nothing. Normalise, edit, restore.
- **Branch off `origin/main`**, never off the local worktree branch, and confirm with `git log --oneline -1 origin/main` rather than trusting a SHA written in prose.
- **A code review runs before anything merges**, then CI, then merge, then trigger the Railway deploy — auto-deploy is off, so merging ships nothing. Verify the deploy by **commit hash**, never by the word `SUCCESS`.
- **Each commit message above is a subject line only.** This repo writes long, explanatory bodies; add one saying what the change is for, and end it with the `Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>` trailer.
