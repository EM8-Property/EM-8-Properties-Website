# Navigation, `/strategy`, and the End of `/track-record` — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the navigation visible on a phone without a tap, move its labels into Sanity, add `/strategy` and the `whyEm8` section, and delete `/track-record` without losing the realized deal narrative.

**Architecture:** This is PR 2b from spec §10, and it is one PR because its halves are not separable: the nav cannot drop `/track-record` before `DealStory` has somewhere else to live, and the taller phone header cannot ship without the hero reservation that clears it. The nav's *structure* moves into `src/lib/navigation.ts` — a pure module that imports nothing — while its *labels* move into `siteSettings.navLabels`, nine new required leaves. Eleven tasks land in a deliberate order: the schema lands before anything writes to it, the dataset is filled before any code requires it, and the route is deleted last.

**Tech Stack:** Next.js 16 (App Router, RSC), TypeScript strict, Tailwind v4 (`@theme`), Sanity v6, Vitest, Playwright, ESLint flat config.

**Spec:** `docs/superpowers/specs/2026-09-08-em8-feedback-design.md` — §5 (the whole of it), §8 (why `DealStory` moving is one line and a precondition), §10 (the sequence), §11 (accepted on a phone, not a desktop).

**Migration authority:** `docs/deploys-and-migrations.md`. Every dataset change here is an **addition**, so all of it is safe to apply ahead of the code — and two of them are *required* to be applied ahead of it, because the code that follows throws without them. This is the first migration since the 2026-08-31 incident that document was written from; Task 3 is the gated step and it follows that document's checklist literally.

## Global Constraints

Copied from `README.md` "Non-negotiables" and the spec. Every task's requirements implicitly include these.

- **Small teal text is `#2C7A74`, never `#4ABDB5`.** The accent measures ~2.2:1 on white. Teal-filled buttons carry **ink** text, not white. `tests/unit/chipContrast.test.ts` pins this.
- **CSS logical properties only.** `ms-`/`me-`/`ps-`/`pe-`/`text-start`. Never `ml-`/`mr-`/`text-left`. Enforced by ESLint across all of `src/`, including class strings built in variables and inline styles.
- **No colour literal under `src/`.** Added in PR 1: no hex and no `rgba(` in `src/**/*.{ts,tsx}`, with exactly three exemptions (`src/lib/tokens.ts`, `src/lib/chipColors.ts`, `src/app/global-error.tsx`). Use a token class or an opacity modifier on one. Note the documented cost: the rule fires on strings like `"Unit #204"`, and the remedy is a one-line `eslint-disable`, not a pattern change.
- **`text-white` is invisible to that lint rule**, and spec §9 lists seven `text-white`-on-a-moving-token pairings the dark re-theme has to fix. **Do not add an eighth.** Every new surface in this PR paints `text-ink` on `bg-ground` or `bg-panel`. The one existing pairing in this file — `bg-ink text-white` on the header CTA at `SiteHeader.tsx:124` — is carried forward unchanged, not copied to anything new.
- **`scrim` must not move when the ground does.** Nothing in this PR touches it; it is listed so nobody re-points it while editing the header.
- **Never phrase returns as promises.** Permitted: *targeted, projected, underwritten, estimated, pro forma*. Banned: *guaranteed, will return, assured, risk-free*. Scanned in source and in every CMS document.
- **No placeholder figures ship.** The denylist is `tests/shared/placeholders.ts`, checked against both source and the seed payload.
- **Queries use `defineQuery` with fields inlined.** Typegen only discovers queries declared that way and cannot resolve interpolated fragments. Written otherwise it silently reports "0 queries".
- **A new required `siteSettings` leaf needs THREE edits, not two:** the schema, `REQUIRED_SITE_SETTINGS`, **and** `SITE_SETTINGS_QUERY`. Miss the query and the release gate stays green while `next build` fails on all 29 pages, because the gate builds its own projection from the array's `groq`. `tests/unit/requiredContent.test.ts` catches it — heed it rather than working around it. This task list adds nine such leaves at once.
- **This is not the Next.js you know.** `AGENTS.md` at the repo root is explicit: read the relevant guide in `node_modules/next/dist/docs/01-app` before writing any App Router code — metadata, `generateMetadata`, `params` and route conventions have all changed shape between versions, and the docs are resolved from that file's directory. Tasks 7 and 8 are the ones this bites.
- **Do not use Next's generated global types** (`LayoutProps`, `PageProps`) — they exist only after a build and fail `tsc --noEmit` on a clean checkout.
- **No horizontally scrolling nav strip, at any width.** §5 rules it out explicitly: it reads as a tab bar, which misrepresents a small marketing site, and horizontal scroll containers are a known accessibility problem. The phone bar wraps; it never scrolls sideways.
- **Do not run `npx prettier`** — no config in this repo, and it rewrites files to double quotes and semicolons. `eslint.config.mjs` itself uses double quotes and semicolons; the `.ts`/`.tsx` sources use single quotes and no semicolons. Match the file you are in.
- **`npm run typegen` after every schema change**, and `bash scripts/deploy-studio.sh` after every schema change — from merged code, not from this branch.
- Every PR is accepted on a **390x844 DPR-3 phone** measurement, with desktop as the regression check (spec §11).

---

## Baseline, measured on this branch at `6d60200` before anything changed

Captured 2026-09-08 against `npm run build && npm start`, because spec §11 asks for a
before number and it cannot be produced after the fact. Every "after" in this plan is
compared against these.

| | 390x844 DPR-3 | 320x720 DPR-2 |
|---|---|---|
| phone header height | **68px** | **68px** |
| items visible in it without a tap | **2** — `EM8 Properties`, `Menu` | **2** |
| `/` page length | 8.23 screens | 10.28 screens |
| `/about` page length | 7.45 screens | 8.42 screens |
| `/portfolio` page length | 5.38 screens | 6.67 screens |
| `h1` font size | 30px | 30px |

Eyebrow clearance below the overlaid header — the quantity the E2E asserts and the one
this PR spends:

| route | width | header | eyebrow y | clearance |
|---|---|---|---|---|
| `/` | 375px | 68px | 431 | **363px** |
| `/about` | 375px | 68px | 96 | **28px** |
| `/about` | 360px | 68px | 96 | **28px** |
| `/about` | 320px | 68px | 96 | **28px** |
| `/portfolio` | 320px | 68px | 172 | 104px |

**28px is the whole budget**, and it is identical at 320, 360 and 375px because below
375px the band's overlay has grown to fill it — bottom-alignment leaves no slack, so
`pt-24` minus the header *is* the margin. A two-row header near 100px overruns it. That is
why the reservation grows inside Task 6 rather than in a follow-up.

Verified green on this branch before starting: `npm test` 468 · `npx tsc --noEmit` ·
`npm run lint` · `npm run test:content` 13 · `npm run build` 29 pages. Deployed commit
confirmed by hash from the Railway API: `6d60200`, matching `origin/main`.

Dataset facts confirmed by query, not by prose: **eight** published team members, all
eight with bios; `navLabels`, `strategyPage` and `aboutPage.whyEm8` all absent;
`trackRecordPage` present; `homePage.offeringsHeading` populated; one `publiclyOffered`
property (Antioch, `showInPortfolio: false`); two sold properties with real `dealStory`
figures (Burbank 1.99x/2022, Embassy 1.37x/2023); **no drafts in the dataset**.

---

## Three things the spec gets wrong or leaves open

Recorded because the plan has to resolve them, and because the last two sessions each lost
time to a spec number that had gone stale.

**1. `/track-record` is referenced in 25 files under `src/` and `tests/`, not the 8 in
§5's table** — plus six more outside them (`src/sanity/schema/index.ts`,
`src/sanity/schema/pages.ts`, `src/sanity/types.generated.ts`, `sanity.config.ts`,
`scripts/content/em8-content.mjs`, `scripts/migrate-content.mjs`). The table misses most of
the test suite. Task 10 lists all of them. Re-grep before starting, both spellings:

```bash
grep -rln "track-record" src/ tests/ && grep -rln "trackRecord\|TRACK_RECORD" src/ tests/ scripts/ sanity.config.ts
```

**2. §5 says "ten nav labels"; the structure it specifies has nine.** The nine are the four
bar items and the five children. The tenth in §5's table is **Investor Login**, and making
that a Sanity label would reverse a decision recorded in two places — `README.md` ("the
five nav labels and the words *Investor Login* are still literals in `SiteHeader.tsx` —
they name routes and a third-party product") and the `headerCta` docblock in
`src/sanity/schema/siteSettings.ts`. This plan ships **nine** and leaves Investor Login a
literal. **A tenth label later is an addition and therefore cheap; retiring one is a
remove-plus-add and therefore a breaking migration** — so nine is the reversible choice,
which is why it is the one to take before Hunter has ruled. Flagged to him with this plan.

**3. §5 wants `Strategy ▾` to be a link *and* a parent and calls the asymmetry deliberate.
Taken literally it makes `/partners` unreachable on a phone.** A tap on a link navigates,
so the panel never opens, so its children — `/strategy` and `/partners` — are reachable
only from the footer. That is Etamar's "I could not see the nav" recreated one level down.
§5's own mitigation ("the panel's first child is the parent's own page") rescues the
parent's destination and not its siblings.

Resolved in Task 5 by keeping the link and adding an adjacent disclosure control:
`Strategy` is an `<a href="/strategy">` with a separate `▾` `<button aria-expanded>` beside
it, while `About Us` — which has no destination — is a single `<button>` carrying its own
`▾`. The spec's asymmetry survives, the destination still navigates on the first tap, and
the panel opens without one. The cost is one extra control in the bar, named
`Open the Strategy menu` for a screen reader.

---

## File Structure

**New**

| file | responsibility |
|---|---|
| `src/lib/navigation.ts` | the nav tree — which nodes exist, how they nest, where each points. Imports nothing, like `propertyTaxonomy.ts` and `requiredContent.ts`, because a server component, a client component and three test files all consume it |
| `src/lib/headerReservation.ts` | the `pt-` classes the hero reserves for the overlaid header, in one place because two files must agree on them |
| `src/components/layout/NavDropdown.tsx` | one parent and its panel: hover, focus, tap, Escape, arrow keys, `aria-expanded`/`aria-controls` |
| `src/app/(site)/strategy/page.tsx` | the one new route |
| `tests/unit/navigation.test.ts` | the tree's invariants, and its two joins to other files |
| `tests/unit/navDropdown.test.tsx` | the keyboard and ARIA contract |
| `tests/unit/strategyPage.test.tsx` | the new route's guard and its empty-body behaviour |

**Modified**

| file | change |
|---|---|
| `src/sanity/schema/siteSettings.ts` | gains `navLabels`, nine string leaves, each description naming its destination |
| `src/sanity/schema/pages.ts` | gains `strategyPage` and `aboutPage.whyEm8`; loses `trackRecordPage` (Task 10) |
| `src/sanity/schema/index.ts` | registers `strategyPage`, drops `trackRecordPage`, updates `SINGLETON_TYPES` |
| `sanity.config.ts` | Studio structure: `Strategy page` in, `Track record page` out |
| `src/sanity/queries.ts` | `SITE_SETTINGS_QUERY` gains `navLabels`; `ABOUT_PAGE_QUERY` gains `whyEm8`; adds `STRATEGY_PAGE_QUERY` and `NAV_SECTIONS_QUERY`; deletes `SOLD_PROPERTIES_QUERY` and `TRACK_RECORD_PAGE_QUERY` |
| `src/lib/requiredContent.ts` | nine `navLabels` leaves appended |
| `src/app/(site)/layout.tsx` | fetches `NAV_SECTIONS_QUERY`; passes `labels` and `sections` to `SiteHeader` |
| `src/components/layout/SiteHeader.tsx` | rebuilt: two rows on a phone, dropdowns from `md`, no hamburger |
| `src/components/layout/SiteFooter.tsx` | `Track Record` becomes `Strategy` |
| `src/components/layout/HeroCarousel.tsx` | the overlay's `pt-` comes from `headerReservation.ts` |
| `src/components/layout/PageHero.tsx` | the no-photo fallback's `pt-` from the same place |
| `src/app/(site)/about/page.tsx` | the `whyEm8` section, `id="why-em8"`, `id="team"` |
| `src/app/(site)/portfolio/[slug]/page.tsx` | renders `DealStory`, gated on `status === 'sold'` |
| `src/components/property/DealStory.tsx` | stage labels become `h3`, since they now sit under a real `h2` |
| `src/lib/heroPages.ts` · `src/app/sitemap.ts` | `/track-record` out, `/strategy` in |
| `src/lib/seo.ts` · `src/lib/rateLimit.ts` · `src/components/ui/SectionHeading.tsx` · `src/components/property/PropertyCard.tsx` · `src/components/property/OfferingBlock.tsx` · `src/sanity/schema/property.ts` | doc comments that name the route |
| `scripts/content/em8-content.mjs` | `SITE_SETTINGS.navLabels`, `PAGE_COPY.strategyPage`, `PAGE_SEO.strategyPage`; `trackRecordPage` seeds out |
| `scripts/migrate-content.mjs` | a `nav-labels` step |
| `tests/integration/content-integrity.test.ts` | gates the nine labels; `strategyPage` in and `trackRecordPage` out of four lists |
| `tests/e2e/site.spec.ts` | the track-record test deleted; route lists swapped; a phone-nav-visible test added |
| 16 unit test files | route lists, label lists and comments — each named in the task that touches it |

**Deleted**

| file | why |
|---|---|
| `src/app/(site)/track-record/page.tsx` | Hunter's instruction, §5. `DealStory` moves first, in Task 9 |

---

# Task 1: The nav tree, in code and only in code

Structure and destinations live here; labels do not. §5: "The nodes carry stable keys and
hrefs in code; Sanity supplies a label per key. That keeps the failure mode small: a bad
edit makes a tab read oddly, but it cannot make a tab point somewhere else or drop out of
the site's structure."

**Files:**
- Create: `src/lib/navigation.ts`
- Test: `tests/unit/navigation.test.ts` (create)

**Interfaces:**
- Consumes: nothing.
- Produces: `NAV_TREE: readonly NavNode[]`, `NAV_KEYS: readonly NavKey[]`, `navDestinations(): string[]`, and the types `NavKey`, `NavNode`, `NavLabels`, all from `@/lib/navigation`. `NavNode` is `{ key: NavKey; href: string | null; children?: readonly NavNode[] }`. `NavLabels` is `Record<NavKey, string>`. Tasks 4, 5, 6, 8 and 10 import from here.

- [ ] **Step 1: Write the failing test**

Create `tests/unit/navigation.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { stripComments } from '../shared/sourceScan'
import { NAV_TREE, NAV_KEYS, navDestinations } from '@/lib/navigation'
import { REQUIRED_SITE_SETTINGS } from '@/lib/requiredContent'

describe('the nav tree', () => {
  it('is the two dropdowns and the two plain links spec §5 specifies', () => {
    // Named rather than counted. `expected 5 to be 4` says a number changed, not which
    // tab arrived — and this shape is Hunter's instruction of 2026-09-08, so a diff here
    // is a product change and should read like one.
    expect(NAV_TREE.map((n) => n.key)).toEqual([
      'aboutUs',
      'strategy',
      'portfolio',
      'insights',
    ])
  })

  it('gives About Us no destination of its own and Strategy one', () => {
    /*
     * The asymmetry §5 calls deliberate, pinned so it cannot be tidied away. About Us is
     * a button: every page under it is a section of /about, so the tab itself has nowhere
     * distinct to go. Strategy is a link AND a parent, which is the awkward case — see
     * NavDropdown, where a link parent gets its own disclosure button so its panel stays
     * reachable on a phone.
     */
    const byKey = (k: string) => NAV_TREE.find((n) => n.key === k)!
    expect(byKey('aboutUs').href).toBeNull()
    expect(byKey('strategy').href).toBe('/strategy')
  })

  it('folds Why EM8 and Our Team into /about rather than minting routes', () => {
    // §12: "neither is a page at all". Four proposed routes became one, and these two are
    // anchors on a page that already has content. An href here that did not start with
    // /about would be that decision quietly reversed.
    const aboutChildren = NAV_TREE.find((n) => n.key === 'aboutUs')!.children!
    expect(aboutChildren.map((c) => [c.key, c.href])).toEqual([
      ['aboutEm8', '/about'],
      ['whyEm8', '/about#why-em8'],
      ['ourTeam', '/about#team'],
    ])
  })

  it('repeats /strategy as the first child of the Strategy panel', () => {
    /*
     * §5's resolution for a parent that navigates: the panel's first child is the
     * parent's own page, so the destination is reachable without depending on how the
     * parent behaves under a tap. Why Midwest IS /strategy — it is that page's body, not
     * a route of its own.
     */
    const strategyChildren = NAV_TREE.find((n) => n.key === 'strategy')!.children!
    expect(strategyChildren.map((c) => [c.key, c.href])).toEqual([
      ['whyMidwest', '/strategy'],
      ['partners', '/partners'],
    ])
  })

  it('lists nine label keys, parents and children alike', () => {
    // Nine, not the ten §5's prose counts. The tenth in its table is Investor Login,
    // which names a third-party product and stays a literal — see the plan's "Three
    // things the spec gets wrong". Nine is also the reversible count: a tenth later is an
    // addition, retiring one is a breaking migration.
    expect([...NAV_KEYS]).toEqual([
      'aboutUs',
      'aboutEm8',
      'whyEm8',
      'ourTeam',
      'strategy',
      'whyMidwest',
      'partners',
      'portfolio',
      'insights',
    ])
  })

  it('requires a Sanity label for every key in the tree', () => {
    /*
     * The failure this prevents is a tab rendering `undefined`. A node added to the tree
     * without a matching required leaf reads its label off a document that was never
     * asked to carry one, and neither guard fires: the layout only knows about leaves in
     * REQUIRED_SITE_SETTINGS, and the release gate builds its projection from the same
     * array. So the tree is the source of truth and this is the join.
     */
    const required = new Set(
      REQUIRED_SITE_SETTINGS.map((leaf) => leaf.path).filter((p) =>
        p.startsWith('navLabels.'),
      ),
    )
    for (const key of NAV_KEYS) {
      expect(
        required.has(`navLabels.${key}`),
        `nav node "${key}" has no required siteSettings leaf — its tab would render ` +
          'undefined and nothing would report it',
      ).toBe(true)
    }
    // The reverse too, so a leaf cannot outlive the node it labelled: a required leaf
    // with no node fails every build on content nothing renders.
    expect(
      required.size,
      'a navLabels leaf exists for a node that is not in the tree',
    ).toBe(NAV_KEYS.length)
  })

  it('keeps every destination in the footer, so the panel is never the only route', () => {
    /*
     * §5, verbatim: "The panel must not be the only route to a page. Every destination
     * stays in the footer, which is where a reader with JavaScript disabled and a crawler
     * both find them."
     *
     * Asserted against the footer's source rather than a render, because the footer's
     * labels are literals and its list is hand-maintained — this is the check that fails
     * when someone adds a nav node and forgets the other file. Anchors are compared by
     * their page: /about#team is reachable from a footer link to /about.
     */
    const footer = stripComments(
      readFileSync(
        resolve(import.meta.dirname, '../../src/components/layout/SiteFooter.tsx'),
        'utf8',
      ),
    ).replace(/\r\n/g, '\n')

    for (const href of navDestinations()) {
      const page = href.split('#')[0]!
      expect(
        footer.includes(`href: '${page}'`),
        `${href} is reachable from the nav panel and not from the footer`,
      ).toBe(true)
    }
  })

  it('mints no URL of its own for a property', () => {
    // Non-negotiable #4: one canonical URL per property, /portfolio/[slug]. A nav node
    // pointing into a property is how a second index of EM8's assets starts.
    for (const href of navDestinations()) {
      expect(href).not.toMatch(/^\/portfolio\/./)
    }
  })
})
```

- [ ] **Step 2: Run it and watch it fail**

Run: `npx vitest run tests/unit/navigation.test.ts`

Expected: FAIL — `Failed to resolve import "@/lib/navigation"`. The whole file errors at
collection; nothing runs.

- [ ] **Step 3: Write the module**

Create `src/lib/navigation.ts`:

```ts
/**
 * The site's navigation: which nodes exist, how they nest, and where each one points.
 *
 * The labels are NOT here. They are `siteSettings.navLabels`, Hunter's decision of
 * 2026-09-08 over the recommendation to keep them in code, and the split is the design:
 * Sanity owns the words, this file owns the structure. A bad edit in the Studio can make a
 * tab read oddly; it cannot re-aim it or remove it.
 *
 * The one failure that split leaves open is a label that lies about its destination —
 * "Insights" over a link to /partners is individually valid on both halves and catchable
 * by no test. The mitigations are that the hrefs are here rather than there, and that each
 * Studio field description names the destination it labels. Spec §5 records that as a
 * trust decision taken knowingly.
 *
 * Imports nothing, deliberately, like `propertyTaxonomy.ts`, `tokens.ts` and
 * `requiredContent.ts`: a server component (the layout), a client component (SiteHeader)
 * and three test files all consume it, and anything pulled in here would be pulled into
 * all of them.
 *
 * Two dropdowns and two plain links, which is spec §5's tree:
 *
 *   About Us ▾        Strategy ▾        Portfolio   Insights
 *     About EM8         Why Midwest
 *     Why EM8           Partners
 *     Our Team
 *
 * Nine keys, not the ten §5's prose counts. The tenth in its table is Investor Login,
 * which names a third-party product rather than carrying copy and stays a literal in
 * SiteHeader — the rule `README.md` and the `headerCta` docblock both state. Nine is also
 * the reversible count: a tenth label later is an ADDITION and safe to apply ahead of its
 * code, where retiring one would be a remove-plus-add and a breaking migration.
 */
export type NavKey =
  | 'aboutUs'
  | 'aboutEm8'
  | 'whyEm8'
  | 'ourTeam'
  | 'strategy'
  | 'whyMidwest'
  | 'partners'
  | 'portfolio'
  | 'insights'

export type NavNode = {
  /** Stable across label edits. It is the `siteSettings.navLabels` key and the React key. */
  key: NavKey
  /**
   * `null` for a parent with no destination of its own.
   *
   * `aboutUs` is null because every page under it is a section of /about, so the tab has
   * nowhere distinct to go — which is what lets it be a plain button. `strategy` is not
   * null, and that asymmetry is §5's, deliberately kept: see `NavDropdown`, where a link
   * parent gets its own disclosure button so its panel stays reachable on a phone.
   */
  href: string | null
  children?: readonly NavNode[]
}

/** The labels, by key. Supplied by `siteSettings.navLabels`, required leaf by leaf. */
export type NavLabels = Record<NavKey, string>

export const NAV_TREE = [
  {
    key: 'aboutUs',
    href: null,
    children: [
      { key: 'aboutEm8', href: '/about' },
      /*
       * Sections, not pages. Hunter's word was "fold", and §12 records this as the place
       * four proposed routes became one: Why EM8 is a section of /about and Why Midwest is
       * the body of /strategy. The two pages that would have started empty are now
       * sections of pages that already have content.
       */
      { key: 'whyEm8', href: '/about#why-em8' },
      { key: 'ourTeam', href: '/about#team' },
    ],
  },
  {
    key: 'strategy',
    href: '/strategy',
    children: [
      /*
       * First child, and it repeats the parent's own page on purpose. §5: "a parent that
       * navigates cannot also open on first tap. It resolves the same way — the panel's
       * first child is the parent's own page, so the destination is reachable without
       * depending on how the parent behaves under a tap."
       *
       * Why Midwest is not a route. It is /strategy's body — the argument that page exists
       * to make — so this label names that content rather than a second address for it.
       */
      { key: 'whyMidwest', href: '/strategy' },
      { key: 'partners', href: '/partners' },
    ],
  },
  { key: 'portfolio', href: '/portfolio' },
  { key: 'insights', href: '/insights' },
] as const satisfies readonly NavNode[]

/**
 * Every label key, each parent before its own children, in bar order.
 *
 * Derived rather than written out, so it cannot disagree with the tree. `requiredContent`
 * cannot import this — it imports nothing, by design — so `navigation.test.ts` is what
 * joins the two lists, in both directions.
 */
export const NAV_KEYS: readonly NavKey[] = NAV_TREE.flatMap((node: NavNode) => [
  node.key,
  ...(node.children ?? []).map((child) => child.key),
])

/** Every href in the tree, parents included. Used to prove the footer covers them all. */
export function navDestinations(): string[] {
  return NAV_TREE.flatMap((node: NavNode) => [
    ...(node.href ? [node.href] : []),
    ...(node.children ?? []).map((child) => child.href).filter((h): h is string => !!h),
  ])
}
```

Note `as const satisfies readonly NavNode[]` rather than a plain type annotation: the
annotation would widen `key` to `NavKey` and lose the literal types `NAV_KEYS` needs, while
`as const` alone would not check the keys against `NavKey` at all. Both halves are load
bearing — drop either and either `NAV_KEYS` widens to `string[]` or a typo in a key
compiles.

And note the `(node: NavNode)` annotations on both `flatMap` callbacks. They are not
decoration: `as const` keeps `NAV_TREE` as a literal tuple, and two of its four elements
(`portfolio`, `insights`) have no `children` key at all — so on the inferred union
`node.children` is `Property 'children' does not exist on type '{ readonly key:
"portfolio"; … }'` and the inner callbacks fall to `implicitly has an 'any' type`. Six
errors from two missing annotations. `satisfies` guarantees every element IS a `NavNode`,
so widening the parameter to it costs nothing and is what makes the strict build pass.

- [ ] **Step 4: Run the test — six of eight pass, and two must not**

Run: `npx vitest run tests/unit/navigation.test.ts`

Expected: **2 failed | 6 passed (8)**, and both failures are correct at this point:

- `requires a Sanity label for every key in the tree` — FAIL, `nav node "aboutUs" has no
  required siteSettings leaf`. Task 4 adds the leaves.
- `keeps every destination in the footer` — FAIL on `/strategy`, which the footer does not
  list until Task 10.

**Do not weaken either to get green.** They are the guards for work later in this PR, and
their failing is the schedule showing through. Record both in the commit body so the next
worker does not treat them as a regression.

- [ ] **Step 5: Typecheck and lint**

Run: `npx tsc --noEmit && npm run lint`

Expected: both silent.

- [ ] **Step 6: Commit**

```bash
git add src/lib/navigation.ts tests/unit/navigation.test.ts
git commit -m "Put the nav tree in one module, labels deliberately absent"
```

Body: structure and destinations are code, labels are content, and why — a Studio edit must
not be able to re-aim a tab. Name the two assertions that fail on purpose and which tasks
close them. End with the `Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>` trailer.

---

# Task 2: The schema, before anything writes to it

Additions only. Nothing is required yet and nothing reads them yet, so this task cannot
break a build or a page — which is exactly why it goes before the migration. A document
written to an unregistered type is accepted silently and never shown in the Studio, which
is the failure `tests/unit/pageSeo.test.ts` exists to prevent; landing the schema first
means Task 3 never creates one.

**Files:**
- Modify: `src/sanity/schema/siteSettings.ts` (before the `ctaBand` field, line 153)
- Modify: `src/sanity/schema/pages.ts` (`aboutPage`, line 104-120; new type at the tail)
- Modify: `src/sanity/schema/index.ts:19-77`
- Modify: `sanity.config.ts:55-67`
- Test: `tests/unit/schema.test.ts`

**Interfaces:**
- Consumes: nothing. The nine field names match `NavKey` from Task 1 and are written out rather than imported — `README.md` forbids importing `src/sanity/schema/*` into application code, and coupling the schema to `lib` in the other direction is just as unwanted.
- Produces: `siteSettings.navLabels.{aboutUs,aboutEm8,whyEm8,ourTeam,strategy,whyMidwest,partners,portfolio,insights}` as strings; the `strategyPage` document type with `seo`, `heading`, `body`; `aboutPage.whyEm8` as an optional object with `heading` and `body`. `strategyPage` joins `SINGLETON_TYPES`.

- [ ] **Step 1: Write the failing test**

Append to `tests/unit/schema.test.ts`. The file already has `byName`, `field`,
`captureValidation` and the `RuleCall` type at the top; add `SINGLETON_TYPES` to its import
from `@/sanity/schema` if it is not already there.

```ts
describe('navLabels on siteSettings', () => {
  const settings = byName('siteSettings')
  const navLabels = field(settings, 'navLabels')
  const KEYS = [
    'aboutUs',
    'aboutEm8',
    'whyEm8',
    'ourTeam',
    'strategy',
    'whyMidwest',
    'partners',
    'portfolio',
    'insights',
  ]

  it('carries one field per nav node, in bar order', () => {
    expect(navLabels).toBeDefined()
    expect(navLabels.fields.map((f: any) => f.name)).toEqual(KEYS)
  })

  it('describes the destination each label points at', () => {
    /*
     * The only guard available against the one failure this design cannot test for: a
     * label that lies about where it goes. "Insights" over a link to /partners is valid on
     * both halves and catchable by nothing. §5's mitigation is that each field description
     * names its destination, so the editor is told. Asserting that a description mentions
     * a path is weak; it is the difference between a field that explains itself and one
     * that does not.
     */
    for (const f of navLabels.fields) {
      expect(f.description, `navLabels.${f.name} has no description`).toBeTruthy()
      expect(
        f.description,
        `navLabels.${f.name}'s description does not name its destination`,
      ).toMatch(/\//)
    }
  })

  it('caps the four bar labels at 12 characters and the panel labels at 24', () => {
    /*
     * The phone bar is measured in characters and, now that the labels are CMS fields, the
     * count is not knowable at build time — "Our Investment Strategy" is a legal edit.
     * §5's arithmetic at the 11px semibold the bar uses: four 14-character labels reach
     * ~356px, fitting 390px but not 320px; 12 characters reach ~312px and fit both. Task 6
     * confirms 12 by measurement rather than by that arithmetic.
     *
     * The five children cap at 24 instead, because a panel row has the width of the panel
     * and none of the bar's problem. Same shape as `headerCta.label`'s cap of 20 against
     * ctaLink's own 40: a guardrail on the design, not on correctness.
     */
    const cap = (name: string) => {
      const f = navLabels.fields.find((x: any) => x.name === name)
      return captureValidation(f.validation).find((c: RuleCall) => c.method === 'max')?.arg
    }
    for (const bar of ['aboutUs', 'strategy', 'portfolio', 'insights']) {
      expect(cap(bar), `navLabels.${bar} is a bar label and must cap at 12`).toBe(12)
    }
    for (const child of ['aboutEm8', 'whyEm8', 'ourTeam', 'whyMidwest', 'partners']) {
      expect(cap(child), `navLabels.${child} is a panel label and should cap at 24`).toBe(24)
    }
  })

  it('marks every label required in the Studio too', () => {
    // A courtesy to the editor, not the guard. Sanity's required() greys out Publish and
    // gates nothing else — not the API, not a GROQ query, not `next build`. The guard is
    // the per-leaf throw in (site)/layout.tsx via REQUIRED_SITE_SETTINGS, added in Task 4.
    for (const f of navLabels.fields) {
      expect(
        captureValidation(f.validation),
        `navLabels.${f.name} is not required`,
      ).toContainEqual({ method: 'required', arg: undefined })
    }
  })
})

describe('the realized-results heading', () => {
  const settings = byName('siteSettings')
  const heading = field(settings, 'dealStoryHeading')

  it('is a siteSettings field, so the words are editable', () => {
    /*
     * Hunter's instruction, 2026-09-08: every string this PR writes has to be editable in
     * the Studio. This was the only one that would have been a literal in TSX — the h2
     * above a sold property's realized figures — so it is a field.
     *
     * On siteSettings rather than on the property, because it is a section label read by
     * every property page rather than a fact about any one of them. Same reasoning as
     * `ctaBand`, whose account of the "one record every page reads" rule is on that field.
     */
    expect(heading).toBeDefined()
    expect(heading.type).toBe('string')
  })

  it('is optional, so blanking it cannot fail a build', () => {
    /*
     * Deliberately NOT required, unlike the nine nav labels. A missing nav label renders a
     * tab with no words in it, which is a broken page; a missing heading here renders the
     * deal figures with no heading, which is exactly how they looked on /track-record for
     * the last three weeks. So the cost of an editor clearing it is a slightly plainer
     * section, not 29 failed pages — and there is no reason to buy a tenth build-failure
     * vector for a heading that degrades gracefully.
     */
    expect(heading.validation).toBeDefined()
    const rules = captureValidation(heading.validation)
    expect(rules.map((r: RuleCall) => r.method)).not.toContain('required')
    expect(rules).toContainEqual({ method: 'max', arg: 60 })
  })
})

describe('strategyPage', () => {
  const strategy = byName('strategyPage')

  it('is shaped like the other page singletons, plus a body', () => {
    expect(strategy).toBeDefined()
    expect(strategy.fields.map((f: any) => f.name)).toEqual(['seo', 'heading', 'body'])
  })

  it('requires seo and heading, and leaves the body optional', () => {
    /*
     * The body is the Why Midwest argument, and it is copy EM8 owes — §3 lists it under
     * "Owed by people". So the page ships with its structure in place and its body empty,
     * which is what means nobody needs a developer when the words arrive. `heading` is
     * required for the same reason it is on /portfolio and /insights: the component throws
     * without a title, and a titleless page failing the build loudly is what this project
     * prefers to a shell.
     */
    for (const name of ['seo', 'heading']) {
      expect(
        captureValidation(field(strategy, name).validation),
        `strategyPage.${name} should be required`,
      ).toContainEqual({ method: 'required', arg: undefined })
    }
    expect(field(strategy, 'body').validation).toBeUndefined()
  })

  it('is registered as a pinned singleton', () => {
    // Unpinned, the Studio lets an editor create a second one, which the [0] in
    // STRATEGY_PAGE_QUERY silently ignores — so their edits land in a document the site
    // never reads.
    expect([...SINGLETON_TYPES]).toContain('strategyPage')
  })
})

describe('whyEm8 on aboutPage', () => {
  const whyEm8 = field(byName('aboutPage'), 'whyEm8')

  it('is an optional block with its own heading and body', () => {
    expect(whyEm8).toBeDefined()
    expect(whyEm8.fields.map((f: any) => f.name)).toEqual(['heading', 'body'])
    // Optional at the top: the section ships empty and renders nothing until the copy
    // lands. §5: "A section whose body is absent renders nothing, and its nav entry goes
    // with it." An empty <h2> on /about would be worse than no section at all.
    expect(whyEm8.validation).toBeUndefined()
  })
})
```

- [ ] **Step 2: Run it and watch it fail**

Run: `npx vitest run tests/unit/schema.test.ts`

Expected: FAIL on all eight new tests. The first reads `expected undefined to be defined`
because `field(settings, 'navLabels')` returns `undefined`; `byName('strategyPage')` is
`undefined`, so its assertions throw rather than fail. Both shapes are expected.

- [ ] **Step 3: Add `navLabels` to `siteSettings`**

In `src/sanity/schema/siteSettings.ts`, insert immediately before the `ctaBand` field, so
the header's three concerns — Investor Login's URL, the CTA button, the nav labels — sit
together rather than after the footer's disclaimer:

```ts
    /**
     * The visible text of every navigation tab and panel link.
     *
     * Hunter's decision, 2026-09-08, over the recommendation to keep these in code. The
     * split is deliberate and it is the whole design: Sanity owns the words, and
     * `src/lib/navigation.ts` owns which nodes exist, how they nest and where each points.
     * A bad edit here makes a tab read oddly; it cannot re-aim it or remove it.
     *
     * The failure that split leaves open is a label that lies about its destination —
     * "Insights" over a link to /partners is individually valid on both halves and
     * catchable by no test. Each description below names the destination it labels,
     * because that is the only place an editor will ever be told. Spec §5 records this as a
     * trust decision taken knowingly.
     *
     * Nine fields, not the ten §5's prose counts. The tenth in its table is Investor Login,
     * which names a third-party product rather than carrying copy — the same rule that
     * keeps it a literal in SiteHeader, stated on `headerCta` above and in the README.
     *
     * Every one is required content. The guard is the per-leaf throw in
     * `(site)/layout.tsx`, driven by `REQUIRED_SITE_SETTINGS`, and the pre-deploy check is
     * in `content-integrity`. The `required()` calls below gate the Publish button and
     * nothing else.
     *
     * Caps: 12 on the four bar labels, 24 on the five panel labels. The bar is measured in
     * characters and its four labels share one row on a phone, so their length decides how
     * tall the header is — and because these are CMS fields now, that length is no longer a
     * build-time fact. A panel row has the width of the panel and none of that problem.
     * Measured at 390px and 320px with all four bar labels at their cap; the numbers are in
     * the PR that added this. Like `headerCta.label`'s cap this is a guardrail on the
     * design rather than on correctness — over-long labels wrap the header to a third row
     * rather than overflowing it, which is graceful and which nobody would be told about.
     */
    defineField({
      name: 'navLabels',
      title: 'Navigation labels',
      type: 'object',
      description:
        'The words on the top navigation. Where each one goes is set in code and cannot ' +
        'be changed here — the description under each field names its destination.',
      options: { collapsible: true, collapsed: false },
      fields: [
        defineField({
          name: 'aboutUs',
          title: 'About Us (tab)',
          type: 'string',
          description:
            'The first tab. Opens a menu; it is not a link itself. Its three menu links ' +
            'go to /about, /about#why-em8 and /about#team.',
          validation: (r) => r.required().max(12),
        }),
        defineField({
          name: 'aboutEm8',
          title: 'About EM8 (under About Us)',
          type: 'string',
          description: 'Goes to /about.',
          validation: (r) => r.required().max(24),
        }),
        defineField({
          name: 'whyEm8',
          title: 'Why EM8 (under About Us)',
          type: 'string',
          description:
            'Goes to /about#why-em8, the Why EM8 section of the About page. This link is ' +
            'hidden while that section has no body text.',
          validation: (r) => r.required().max(24),
        }),
        defineField({
          name: 'ourTeam',
          title: 'Our Team (under About Us)',
          type: 'string',
          description: 'Goes to /about#team, the team section of the About page.',
          validation: (r) => r.required().max(24),
        }),
        defineField({
          name: 'strategy',
          title: 'Strategy (tab)',
          type: 'string',
          description:
            'The second tab. Goes to /strategy, and also opens a menu of two links.',
          validation: (r) => r.required().max(12),
        }),
        defineField({
          name: 'whyMidwest',
          title: 'Why Midwest (under Strategy)',
          type: 'string',
          description:
            'Goes to /strategy — the same page as the tab above it. It labels that page’s ' +
            'argument, and it is what makes the page reachable by tapping on a phone.',
          validation: (r) => r.required().max(24),
        }),
        defineField({
          name: 'partners',
          title: 'Partners (under Strategy)',
          type: 'string',
          description: 'Goes to /partners.',
          validation: (r) => r.required().max(24),
        }),
        defineField({
          name: 'portfolio',
          title: 'Portfolio (tab)',
          type: 'string',
          description: 'Goes to /portfolio. A plain link with no menu.',
          validation: (r) => r.required().max(12),
        }),
        defineField({
          name: 'insights',
          title: 'Insights (tab)',
          type: 'string',
          description: 'Goes to /insights. A plain link with no menu.',
          validation: (r) => r.required().max(12),
        }),
      ],
    }),
```

Then, immediately after `navLabels`, the one other string this PR would otherwise have
baked into a component:

```ts
    /**
     * The heading above a sold property's realized deal figures, on /portfolio/[slug].
     *
     * A field rather than a literal on Hunter's instruction of 2026-09-08: every string
     * this PR writes has to be editable in the Studio. It was the only one that would not
     * have been — the nine nav labels and the Strategy page's heading are all CMS content
     * already.
     *
     * On `siteSettings` because it is a section label every property page reads rather
     * than a fact about any one property; `ctaBand` further down this file carries the full
     * account of that rule. Per-property it would be eleven copies of one phrase, drifting.
     *
     * Optional, unlike the nav labels, and the difference is what a blank one does. A
     * missing nav label renders a tab with no words in it, so the layout throws. A missing
     * heading here renders the figures with no heading — which is exactly how they looked
     * on /track-record — so it degrades rather than failing, and there is no reason to buy
     * a tenth build-failure vector for it.
     *
     * The three other headings on that page — "The business plan", "Location", and
     * DealStory's own Acquired/Executed/Exited labels — are still literals. They predate
     * this PR and moving them is a separate change; noted so the inconsistency is on the
     * record rather than a surprise.
     */
    defineField({
      name: 'dealStoryHeading',
      title: 'Realized results heading',
      type: 'string',
      description:
        'The heading above the realized figures on a sold property’s page — the deal ' +
        'narrative and its equity multiple. Leave it empty to show those figures with no ' +
        'heading above them.',
      validation: (r) => r.max(60),
    }),
```

- [ ] **Step 4: Add `aboutPage.whyEm8`**

In `src/sanity/schema/pages.ts`, add to `aboutPage`'s field list immediately after
`factorsHeading`:

```ts
    /**
     * The Why EM8 section, and it is a section rather than a page on purpose.
     *
     * Hunter's word was "fold". §12 records this as the place four proposed routes became
     * one: Why EM8 lives here and Why Midwest is /strategy's body, so neither starts life
     * as a thin page with a heading and nothing under it.
     *
     * Optional at this level, and the only optional block on any page document. The copy is
     * owed by people — §3 lists it — so the structure ships ahead of the words and /about
     * renders nothing at all for this until both the title and the body are there. An empty
     * <h2> would be worse than no section, and §5 asks for exactly that: "A section whose
     * body is absent renders nothing, and its nav entry goes with it."
     *
     * The nav entry going with it is real rather than decorative: on the day this merges
     * the section is empty, so "Why EM8" would otherwise be a menu link to an anchor that
     * is not on the page. `NAV_SECTIONS_QUERY` is what tells the header, and the gate is in
     * SiteHeader.
     *
     * `headingBlock`'s own eyebrow and title are required, so a half-filled block fails
     * Studio validation and cannot be published — a nudge to finish it. That nudge is not
     * the guard: Vision, the CLI and any direct API write ignore it, so /about checks both
     * leaves before rendering.
     */
    defineField({
      name: 'whyEm8',
      title: 'Why EM8 section',
      type: 'object',
      description:
        'The Why EM8 argument, shown between the success factors and the team. Leave the ' +
        'whole block empty and the section — and its link in the About Us menu — do not ' +
        'appear at all.',
      options: { collapsible: true, collapsed: true },
      fields: [
        defineField({ name: 'heading', type: 'headingBlock' }),
        defineField({ name: 'body', type: 'array', of: [{ type: 'block' }] }),
      ],
    }),
```

- [ ] **Step 5: Add the `strategyPage` type**

Append to `src/sanity/schema/pages.ts`, after `trackRecordPage`. **Leave
`trackRecordPage` in place** — Task 10 removes it, and removing it here would break
`SINGLETON_TYPES`, four lists in `content-integrity` and `pageSeo.test.ts` eight tasks
before those are ready.

```ts
/**
 * The one new route in spec §5, and the only one: an earlier draft would have created four.
 *
 * Shaped like `portfolioPage` and `insightsPage` — `seo` and `heading` — plus a `body`,
 * which is the Why Midwest argument and the reason the page exists. A page of this kind
 * usually starts empty and stays that way; here that is deliberate and temporary. §3 lists
 * the copy under "Owed by people", and the structure shipping first is what means nobody
 * needs a developer when it arrives.
 *
 * `heading` is required and `body` is not, so this page always has a title and may have
 * nothing under it. That is the right way round: the component throws without a heading,
 * and a titleless page failing `next build` is the loud failure this project prefers.
 */
export const strategyPage = defineType({
  name: 'strategyPage',
  title: 'Strategy page',
  type: 'document',
  fields: [
    defineField({ name: 'seo', type: 'seoBlock', validation: (r) => r.required() }),
    defineField({ name: 'heading', type: 'headingBlock', validation: (r) => r.required() }),
    defineField({
      name: 'body',
      title: 'Why Midwest',
      type: 'array',
      of: [{ type: 'block' }],
      description:
        'The argument for the Midwest, and for suburban Chicago in particular. The page ' +
        'renders its title with nothing under it until this is filled in.',
    }),
  ],
  preview: { prepare: () => ({ title: 'Strategy page' }) },
})
```

- [ ] **Step 6: Register it**

In `src/sanity/schema/index.ts`: add `strategyPage` to the import from `./pages`, to
`schemaTypes` after `insightsPage`, and to `SINGLETON_TYPES` after `insightsPage`. Leave
`trackRecordPage` in all three.

In `sanity.config.ts`, add a Studio list item after `['insightsPage', 'Insights page']`:

```ts
                ['strategyPage', 'Strategy page'],
```

- [ ] **Step 7: Regenerate the Sanity types**

Run: `npm run typegen`

Expected: it reports the number of queries it found — **not `0 queries`**, which would mean
a query has lost its `defineQuery` wrapper — and rewrites `src/sanity/types.generated.ts`
with the new `navLabels`, `strategyPage` and `whyEm8` shapes. No *query result* type
changes yet, because no query reads them until Task 4.

- [ ] **Step 8: Run everything, including the build**

```bash
npx vitest run tests/unit/schema.test.ts && npx tsc --noEmit && npm run lint && npm test
```

Expected: the eight new schema tests pass, `tsc` silent, lint clean, and the suite green
apart from the two `navigation.test.ts` assertions Task 1 left failing.

```bash
rm -rf .next/cache/fetch-cache && npm run build
```

Expected: **29 pages, unchanged from the baseline.** A schema addition that nothing reads
must be invisible to the build. If the page count moves, something in this task read a
field it should not have.

- [ ] **Step 9: Commit**

```bash
git add src/sanity/schema/siteSettings.ts src/sanity/schema/pages.ts src/sanity/schema/index.ts sanity.config.ts src/sanity/types.generated.ts tests/unit/schema.test.ts
git commit -m "Add the nav-label, strategy-page and why-EM8 fields, reading none of them yet"
```

Body: additions only, nothing required and nothing read, so the build is untouched — and
why the schema lands before the migration: a document written to an unregistered type is
accepted silently and never shown in the Studio, the failure `pageSeo.test.ts` exists to
prevent.

---

# Task 3: Fill the dataset, before the code requires it

**This is the gated task and the only one that writes to production.** Two additions —
nine `navLabels` leaves and the `strategyPage` document — both of which the code in Tasks
4 and 7 throws without. `docs/deploys-and-migrations.md`: "Adding a field ahead of the code
is safe... It is also *required* to run first: the layout throws when either leaf is
missing, so shipping the code ahead of this would fail the build on every route."

Nothing here is a move or a removal. `homePage.offeringsHeading` — the one field move in
this whole workstream — belongs to PR 3, not to this PR. **If you find yourself writing an
`unset` in this task, stop: you are in the wrong PR.**

**Files:**
- Modify: `scripts/content/em8-content.mjs` (`SITE_SETTINGS`, `PAGE_COPY`, `PAGE_SEO`)
- Modify: `scripts/migrate-content.mjs` (`STEPS`, a new `backfillNavLabels`, the dry-run list)
- Test: `tests/unit/contentSource.test.ts`, `tests/unit/pageCopy.test.tsx`, `tests/unit/pageSeo.test.ts`

**Interfaces:**
- Consumes: nothing from earlier tasks. The nine key names match `NavKey` from Task 1 and the schema from Task 2; all three lists are written out independently and joined by `navigation.test.ts` and `schema.test.ts`.
- Produces: `SITE_SETTINGS.navLabels` (nine strings), `SITE_SETTINGS.dealStoryHeading`, `PAGE_COPY.strategyPage`, `PAGE_SEO.strategyPage` in the seed module; the `nav-labels` step, runnable as `--only=nav-labels`. After the apply, the production dataset carries all nine labels, the realized-results heading, and a published `strategyPage`.

- [ ] **Step 1: Write the failing test**

Append to `tests/unit/contentSource.test.ts`. **Add the file-level disable first** if it
is not already there — `SITE_SETTINGS` comes from a plain ESM data module with no types, so
the assertions below need `as any` and `@typescript-eslint/no-explicit-any` is on. Eight
test files in this repo already carry this line with a reason; `homepage.test.tsx` uses the
one that fits here, because this is a data module rather than a schema:

```ts
/* eslint-disable @typescript-eslint/no-explicit-any -- plain ESM data module */
```

```ts
describe('the seeded nav labels', () => {
  const KEYS = [
    'aboutUs',
    'aboutEm8',
    'whyEm8',
    'ourTeam',
    'strategy',
    'whyMidwest',
    'partners',
    'portfolio',
    'insights',
  ]

  it('covers every nav node', () => {
    expect(Object.keys((SITE_SETTINGS as any).navLabels ?? {})).toEqual(KEYS)
  })

  it('respects the caps the schema will reject past', () => {
    /*
     * A value that exceeds the cap seeds fine through the API and then fails validation in
     * the Studio, where an editor meets it as an error on content they did not write. Same
     * reason `pageSeo.test.ts` bounds the seeded titles.
     *
     * 12 for the four bar labels, 24 for the five panel labels — the split is in the
     * schema and its reasoning is there.
     */
    const labels = (SITE_SETTINGS as any).navLabels
    for (const bar of ['aboutUs', 'strategy', 'portfolio', 'insights']) {
      expect(labels[bar].length, `${bar} = "${labels[bar]}"`).toBeLessThanOrEqual(12)
    }
    for (const child of ['aboutEm8', 'whyEm8', 'ourTeam', 'whyMidwest', 'partners']) {
      expect(labels[child].length, `${child} = "${labels[child]}"`).toBeLessThanOrEqual(24)
    }
  })

  it('fits the phone bar at its stated arithmetic', () => {
    /*
     * §5 measures the bar in characters: `About Us · Strategy · Portfolio · Insights` is
     * 33 characters as seeded, against the 42 §5 called more than tight and the ~48 four
     * 12-character labels would reach. This is the *seeded* case, so it is a sanity check
     * on the words this PR chooses and not a guarantee about what an editor may type —
     * the cap above is that, and Task 6's measurement is what confirms the cap.
     */
    const labels = (SITE_SETTINGS as any).navLabels
    const bar = ['aboutUs', 'strategy', 'portfolio', 'insights']
      .map((k) => labels[k])
      .join('')
    expect(bar.length).toBeLessThanOrEqual(36)
  })

  it('seeds the realized-results heading, so there is something to rewrite', () => {
    /*
     * Optional in the schema, so the site is correct without it — but an unseeded optional
     * field is a field nobody knows exists. Hunter's instruction was that every string this
     * PR writes be editable in the Studio, and a blank field is not editable copy, it is an
     * absent feature.
     *
     * "Realized" and not "targeted" or "projected": these are closed results. The
     * compliance scan below covers this string because SITE_SETTINGS is in the blob.
     */
    expect((SITE_SETTINGS as any).dealStoryHeading).toBeTruthy()
    expect((SITE_SETTINGS as any).dealStoryHeading.length).toBeLessThanOrEqual(60)
  })

  it('says nothing promissory and invents no figure', () => {
    // navLabels is inside SITE_SETTINGS, which is already in the `blob` this file scans,
    // so the placeholder and compliance gates cover it for free. This asserts that
    // coverage exists rather than trusting it — the same reason PAGE_COPY and PAGE_SEO
    // were added to that blob.
    expect(blob).toContain('navLabels')
  })
})
```

In `tests/unit/pageCopy.test.tsx`, extend the two lists — `SINGLETON_TYPES` and the
`PAGE_COPY` keys — with `'strategyPage'`, keeping them sorted. Leave `'trackRecordPage'` in
both; Task 10 takes it out. Then add:

```ts
  it('gives the strategy page a complete heading, since that page throws without one', () => {
    // Same rule as /portfolio and /insights. `body` is deliberately absent from the seed:
    // the Why Midwest copy is owed by people (§3), and the page renders its title with
    // nothing under it until it arrives.
    const strategy = (PAGE_COPY as any).strategyPage
    for (const field of ['eyebrow', 'title', 'intro']) {
      expect(strategy.heading?.[field], `strategyPage.heading.${field} is empty`).toBeTruthy()
    }
    expect(strategy.body, 'the Why Midwest body must ship empty, not invented').toBeUndefined()
  })
```

In `tests/unit/pageSeo.test.ts`, add `'strategyPage'` to the `PAGE_SEO` key list, sorted.
Note that the second test in that block cross-checks the same keys against
`SINGLETON_TYPES` minus `siteSettings`, so both lists have to move together or that test
fails with a diff naming the odd one out — which is the check working.

- [ ] **Step 2: Run them and watch them fail**

```bash
npx vitest run tests/unit/contentSource.test.ts tests/unit/pageCopy.test.tsx tests/unit/pageSeo.test.ts
```

Expected: `expected [] to equal [ 'aboutUs', ... ]` from the first new test —
`SITE_SETTINGS.navLabels` is `undefined`, so `Object.keys({})` is empty. `pageCopy` and
`pageSeo` fail with a list diff naming `strategyPage` as the missing entry.

- [ ] **Step 3: Add the seed values**

In `scripts/content/em8-content.mjs`, add to `SITE_SETTINGS` after `headerCta`:

```js
  /**
   * The words on the top navigation. Nine of them, one per node in
   * `src/lib/navigation.ts`; where each goes is decided there and cannot be changed here.
   *
   * Backfilled by `--only=nav-labels`, per leaf and only where the leaf is blank, so once
   * an editor has reworded a tab in the Studio the step leaves it alone.
   *
   * These are proposals, not transcriptions. Every other string in this file was already
   * on the site and was moved here verbatim; there was no navigation with these labels to
   * transcribe, so §5's own wording is what is seeded. §3 lists the labels under "Owed by
   * people" and says they "can ship with the labels this document proposes and be edited
   * later; nothing is blocked on them".
   *
   * As seeded the bar reads `About Us · Strategy · Portfolio · Insights` — 33 characters
   * against the 42 §5 called more than tight. The caps in the schema are what hold that
   * once an editor is typing.
   */
  navLabels: {
    aboutUs: 'About Us',
    aboutEm8: 'About EM8',
    whyEm8: 'Why EM8',
    ourTeam: 'Our Team',
    strategy: 'Strategy',
    whyMidwest: 'Why Midwest',
    partners: 'Partners',
    portfolio: 'Portfolio',
    insights: 'Insights',
  },
  /**
   * The heading above a sold property's realized figures. Backfilled by the same step as
   * the labels, and only where the leaf is blank.
   *
   * Written rather than moved: on /track-record those figures had no heading at all, so
   * there is nothing to transcribe. It is a field rather than a literal because every
   * string this PR writes has to be editable — Hunter, 2026-09-08 — and it is optional, so
   * clearing it in the Studio returns the section to how it looked before.
   */
  dealStoryHeading: 'Realized results',
```

Add to `PAGE_COPY`, after `insightsPage`:

```js
  /**
   * The one new page, and the only seeded copy in this file that was not already on the
   * site — there was no /strategy to transcribe from.
   *
   * So this heading is written rather than moved, and it is written narrowly: it says what
   * the page is about and asserts nothing. No figures, no municipal claims, no
   * forward-looking language — `placeholders.ts` and the compliance scan both cover this
   * object, and the point is not merely to pass them but to seed something nobody has to
   * retract. Reword it in the Studio; that is what it is there for.
   *
   * No `body`. The Why Midwest argument is copy EM8 owes (§3), the field is optional, and
   * the page renders its title with nothing under it until the words arrive. Inventing an
   * argument for the Midwest here would be the one thing this project has never done.
   */
  strategyPage: {
    heading: {
      eyebrow: 'Strategy',
      title: 'Why the Midwest',
      intro:
        'How we choose markets, and why our work sits within walking distance of Metra stations in suburban Chicago.',
    },
  },
```

Add to `PAGE_SEO`, after `insightsPage`:

```js
  strategyPage: {
    title: 'Strategy',
    description:
      'How EM8 chooses markets in suburban Chicago, and the partners we build with.',
  },
```

- [ ] **Step 4: Add the migration step**

In `scripts/migrate-content.mjs`, add after `backfillHeaderCta`:

```js
/**
 * Fills `siteSettings.navLabels` — the nine labels on the top navigation.
 *
 * Modelled on `backfillHeaderCta` directly above, and for the same reasons, which are
 * worth restating rather than cross-referencing because getting either wrong is silent:
 *
 *   - The document itself is queried, not the field, so a missing siteSettings is reported
 *     rather than folded into "nothing to do". It matches no filter, so keying on the
 *     field alone would print a clean dry run for a dataset the site cannot build against.
 *     The full run hides this because it patches siteSettings first; a scoped run does not.
 *   - `set` on the blank leaves, never `setIfMissing` on the object. `setIfMissing` keys on
 *     absence and the guard throws on falsiness, so pairing them would report "filling
 *     aboutUs", write nothing, print "backfilled", and say the same on every future run
 *     while the build stayed broken on an empty string. A migration that claims a repair it
 *     did not make is worse than one that does nothing, because it is believed.
 *   - The parent object is `setIfMissing`-ed first: a leaf path cannot be set inside an
 *     object that does not exist, and it is a no-op when it already does.
 *
 * An ADDITION, so safe to apply before the code that reads it deploys — and *required* to
 * run first, because Task 4 makes all nine leaves required and the layout throws per leaf.
 * Shipping the code ahead of this fails `next build` on all 29 pages.
 * See docs/deploys-and-migrations.md.
 */
async function backfillNavLabels(apply) {
  const doc = await query('*[_id=="siteSettings"][0]{ navLabels, dealStoryHeading }')
  if (!doc) {
    throw new Error(
      'nav-labels: no siteSettings document. Every page throws without one — create it ' +
        'in the Studio first.',
    )
  }

  const fill = {}
  for (const [leaf, value] of Object.entries(SITE_SETTINGS.navLabels)) {
    if (!doc.navLabels?.[leaf]) fill[`navLabels.${leaf}`] = value
  }
  /*
   * The realized-results heading rides along, because it is the same kind of change to the
   * same document: one blank leaf of chrome copy, filled once, never overwritten. A step of
   * its own would be a third scoped apply against production for one string.
   *
   * It is the one leaf here the site does not require — see the field in
   * src/sanity/schema/siteSettings.ts — so a run that fills the nine labels and leaves this
   * alone because an editor has already reworded it is a correct run, not a partial one.
   */
  if (!doc.dealStoryHeading) fill.dealStoryHeading = SITE_SETTINGS.dealStoryHeading

  if (Object.keys(fill).length === 0) {
    console.log('  nav labels  all nine labels and the deal heading already set — left untouched')
    return
  }

  console.log(`  nav labels  filling ${Object.keys(fill).length} of 10:`)
  for (const [path, value] of Object.entries(fill)) {
    console.log(`              ${path} -> "${value}"`)
  }
  if (!apply) return

  const res = await fetch(`${API}/data/mutate/${dataset}`, {
    method: 'POST',
    headers: { ...auth, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      mutations: [
        // The parent object first: a leaf path cannot be set inside an object that does
        // not exist yet, and this is a no-op when it already does. `dealStoryHeading` is
        // top-level and needs no parent, so this covers navLabels alone.
        { patch: { id: 'siteSettings', setIfMissing: { navLabels: {} } } },
        { patch: { id: 'siteSettings', set: fill } },
      ],
    }),
  })
  if (!res.ok) {
    throw new Error(`nav labels backfill failed ${res.status}: ${await res.text()}`)
  }
  console.log('  nav labels  backfilled')
}
```

Ten leaves in one step, nine of them required and one not. The step's name stays
`nav-labels` — it is what the README, the commit and this plan all call it, and renaming a
migration step for a tenth leaf costs more than the slight imprecision.

Register it in `STEPS` after `'header-button'`:

```js
  'nav-labels': backfillNavLabels,
```

Add `await backfillNavLabels(false)` to the dry-run list in `main()` after
`backfillHeaderCta(false)`, and `await backfillNavLabels(true)` to the apply path after
`backfillHeaderCta(true)`. Update the `STEPS` docblock's count — it says "Five of these are
**additions**"; it is now six. Leave `REMOVALS` alone: `nav-labels` is not one.

Update `README.md`'s command table, which lists the steps as
`carousel`, `pages`, `seo`, `headings`, `header-button`, `cta` — add `nav-labels`.

- [ ] **Step 5: Run the tests and watch them pass**

```bash
npx vitest run tests/unit/contentSource.test.ts tests/unit/pageCopy.test.tsx tests/unit/pageSeo.test.ts && npm test
```

Expected: all three files green; the suite green apart from Task 1's two deliberate
failures.

- [ ] **Step 6: Dry run both steps against production, and read the output**

```bash
node --env-file=.env.local scripts/migrate-content.mjs --only=nav-labels
node --env-file=.env.local scripts/migrate-content.mjs --only=pages
```

Use the worktree's `.env.local` — it is the one holding `SANITY_API_WRITE_TOKEN`. A dry run
writes nothing and names every document it would touch.

Expected from the first: `SCOPE: nav-labels only`, then `filling 10 of 10` — the nine
`navLabels.<key> -> "<label>"` lines plus `dealStoryHeading -> "Realized results"`. Ten,
because the probe on 2026-09-08 confirmed `navLabels` absent and `dealStoryHeading` is new
in this PR. **If it says fewer than ten, stop and find out who wrote the others** — `set`
on the blank leaves means an existing value is preserved, which is correct behaviour and a
surprise worth understanding before writing.

Expected from the second: `page      seeding strategyPage`, and
`already exists — left untouched` for the other seven. **If it names any page other than
`strategyPage` as being seeded, stop** — `seedPagesIfMissing` creates a whole document
only when none exists, so a second name means a page document has gone missing from
production, which is a different and larger problem.

- [ ] **Step 7: Walk the migration checklist, then apply**

From `docs/deploys-and-migrations.md`. Confirm each aloud in the task's report before
writing anything:

- [ ] Is every change an **addition**? — Yes: nine new leaves on an existing document, and
      one new document. No `unset`, no rename, no move.
- [ ] If anything is removed, renamed or moved, is the code that stops reading it deployed
      and verified? — N/A. Nothing is.
- [ ] Dry run first — done in Step 6, and its output read rather than skimmed.
- [ ] Does anything target a `drafts.` id? — **No.** Both steps patch or create published
      ids. The probe on 2026-09-08 found zero drafts in the dataset, so there is nothing
      for a write to shadow. This is the check that would have caught the 2026-08-31 fault,
      and it is the reason it is on the list.

Then apply:

```bash
node --env-file=.env.local scripts/migrate-content.mjs --only=nav-labels --apply
node --env-file=.env.local scripts/migrate-content.mjs --only=pages --apply
```

- [ ] **Step 8: Re-run both dry runs, and prove the writes landed**

```bash
node --env-file=.env.local scripts/migrate-content.mjs --only=nav-labels
node --env-file=.env.local scripts/migrate-content.mjs --only=pages
```

Expected: `all nine labels and the deal heading already set — left untouched` and
`strategyPage already exists — left untouched`. A second dry run reporting work still
pending is the `setIfMissing`-versus-falsiness trap firing, and it means the write did not
do what the log claimed.

Then query the dataset directly rather than trusting either log — this project's rule is
that a defect is invisible to everything except reading the real thing:

```bash
node --env-file=.env.local -e '
const [pid, ds, tok] = [process.env.NEXT_PUBLIC_SANITY_PROJECT_ID, process.env.NEXT_PUBLIC_SANITY_DATASET, process.env.SANITY_API_READ_TOKEN]
const q = async (g) => {
  const u = new URL(`https://${pid}.api.sanity.io/v2026-01-01/data/query/${ds}`)
  u.searchParams.set("query", g)
  return (await (await fetch(u, { headers: { Authorization: `Bearer ${tok}` } })).json()).result
}
console.log("navLabels:", JSON.stringify(await q(`*[_id=="siteSettings"][0].navLabels`)))
console.log("dealHeading:", JSON.stringify(await q(`*[_id=="siteSettings"][0].dealStoryHeading`)))
console.log("strategyPage:", JSON.stringify(await q(`*[_id=="strategyPage"][0]{ _type, heading, seo, "hasBody": defined(body) }`)))
console.log("drafts:", JSON.stringify(await q(`*[_id in path("drafts.**")]{ _id, _type }`)))
'
```

Expected: all nine labels with their seeded values, `dealStoryHeading` as
`"Realized results"`; `strategyPage` with `_type:
"strategyPage"`, a complete `heading` and `seo`, and `hasBody: false`; and **`drafts: []`**.
A draft appearing here means a write went to `drafts.<id>` — the 2026-08-31 fault, which
every automated check stays green through and only the Studio shows.

- [ ] **Step 9: Confirm the live site is unaffected**

```bash
curl -s https://em-8-properties-website-production.up.railway.app/ | grep -o "Track Record" | head -1
curl -s -o /dev/null -w "%{http_code}\n" https://em-8-properties-website-production.up.railway.app/strategy
```

Expected: `Track Record` still present, and `/strategy` still `404`. The publish webhook
revalidates within seconds of a mutation, so this is the moment the deployed build meets
the new content — and the correct outcome is that nothing changed, because a deployed build
ignores fields it does not know about. That is the *addition* half of the rule being
exercised, and confirming it here is what makes the next migration's judgement trustworthy.

- [ ] **Step 10: Commit**

```bash
git add scripts/content/em8-content.mjs scripts/migrate-content.mjs README.md tests/unit/contentSource.test.ts tests/unit/pageCopy.test.tsx tests/unit/pageSeo.test.ts
git commit -m "Seed the nine nav labels and the strategy page document"
```

Body: state that both are additions, that both were applied to production **before** the
code that requires them, and that the live site was confirmed unchanged afterwards. Quote
the dataset query's output. Note that the `strategyPage` heading is written rather than
transcribed — the only seeded copy in the file that is — and that its body ships empty
because the argument is owed by people.

---

# Task 4: Make the nine labels required — all three edits at once

The trap this task exists to walk into deliberately. A new required `siteSettings` leaf
needs **three** edits: the schema (Task 2), `REQUIRED_SITE_SETTINGS`, and
`SITE_SETTINGS_QUERY`. Miss the query and the layout reads every leaf as missing for a
document that is complete, `next build` fails on all 29 pages, and **the release gate stays
green** — because it builds its own projection from each leaf's `groq` and never consults
the query the layout actually runs.

`tests/unit/requiredContent.test.ts` catches exactly that, in the test named
`mentions every segment of every leaf's path in SITE_SETTINGS_QUERY`. Heed it. Do not
loosen it.

**Files:**
- Modify: `src/lib/requiredContent.ts:29-65`
- Modify: `src/sanity/queries.ts:114-124`
- Modify: `tests/unit/requiredContent.test.ts:18-27`
- Modify: `tests/integration/content-integrity.test.ts`

**Interfaces:**
- Consumes: the schema fields from Task 2; the dataset values from Task 3.
- Produces: nine more entries in `REQUIRED_SITE_SETTINGS`, paths `navLabels.<key>`, each with an aliased `groq` projection (`'"navAboutUs": navLabels.aboutUs'` and so on). `SITE_SETTINGS_QUERY_RESULT` gains `navLabels: { aboutUs: string | null, ... } | null`. `SiteHeader` consumes it in Task 6.

- [ ] **Step 1: Write the failing test**

In `tests/unit/requiredContent.test.ts`, extend the pinned path list in
`lists every leaf the layout throws on` with the nine, after `ctaBand.submitLabel`:

```ts
      'navLabels.aboutUs',
      'navLabels.aboutEm8',
      'navLabels.whyEm8',
      'navLabels.ourTeam',
      'navLabels.strategy',
      'navLabels.whyMidwest',
      'navLabels.partners',
      'navLabels.portfolio',
      'navLabels.insights',
```

Extend the `COMPLETE` fixture at the top of that file, or every test in it that expects an
empty result starts failing for the wrong reason:

```ts
const COMPLETE = {
  agoraPortalUrl: 'https://example.com',
  contactEmail: 'info@em-8.com',
  disclaimer: 'x',
  headerCta: { label: 'Invest With Us', href: '/investors' },
  ctaBand: { heading: { title: 'x' }, submitLabel: 'x' },
  // Nine labels, because nine leaves are required. A fixture that is complete in name only
  // makes `returns nothing for a complete document` assert the opposite of its name.
  navLabels: {
    aboutUs: 'About Us',
    aboutEm8: 'About EM8',
    whyEm8: 'Why EM8',
    ourTeam: 'Our Team',
    strategy: 'Strategy',
    whyMidwest: 'Why Midwest',
    partners: 'Partners',
    portfolio: 'Portfolio',
    insights: 'Insights',
  },
}
```

Then add the test that pins why this task is one task and not two:

```ts
  it('projects every nav label in SITE_SETTINGS_QUERY, nested and aliased', () => {
    /*
     * The specific shape of the three-edit trap, asserted rather than left to the loose
     * segment check above.
     *
     * `navLabels` has nine leaves, so nine aliases have to be unique and nine nested
     * projections have to exist. The loose check passes as soon as the word "navLabels"
     * appears anywhere in the query — which it does after the first leaf is added — so it
     * would wave through eight missing ones. This asserts the leaf names individually.
     */
    for (const leaf of REQUIRED_SITE_SETTINGS.filter((l) =>
      l.path.startsWith('navLabels.'),
    )) {
      const key = leaf.path.split('.')[1]!
      expect(
        SITE_SETTINGS_QUERY,
        `navLabels.${key} is required but SITE_SETTINGS_QUERY does not project it — the ` +
          'layout will read it as always missing and fail next build on every page, ' +
          'while the release gate stays green',
      ).toMatch(new RegExp(`\\b${key}\\b`))
    }
  })
```

- [ ] **Step 2: Run it and watch it fail — and note which tests fail**

Run: `npx vitest run tests/unit/requiredContent.test.ts`

Expected: `lists every leaf the layout throws on` fails with a list diff showing the nine
`navLabels.*` paths as expected-but-absent. `returns nothing for a complete document` and
the two aliasing tests still pass, because the array has not changed yet. The new
projection test passes **vacuously** — its filter matches nothing — which is exactly the
kind of green this repo distrusts, so it will be re-run in Step 5 with the array populated.

- [ ] **Step 3: Add the nine leaves**

Append to `REQUIRED_SITE_SETTINGS` in `src/lib/requiredContent.ts`, after
`ctaBand.submitLabel`:

```ts
  /*
   * The nine navigation labels, spec §5. Hunter's decision of 2026-09-08 put the words in
   * Sanity and left the structure in code; `src/lib/navigation.ts` is the other half, and
   * `navigation.test.ts` joins the two lists in both directions so neither can grow a node
   * the other does not know about.
   *
   * Required rather than defaulted. A label falling back to a literal in the component is
   * the constants.ts fallback pattern this project removed — "There is no constants.ts
   * fallback and no sanity:sync script — both were failure modes on the old site. Missing
   * required content fails the build loudly rather than rendering a broken shell." A tab
   * reading `undefined` is that shell.
   *
   * Every one is nested, so every one carries an aliased projection. That is not stylistic:
   * `content-integrity` rebuilds the nested value from the flat row by reading
   * `leaf.groq.split('"')[1]` as the alias, and an unaliased nested projection is invalid
   * GROQ besides. `requiredContent.test.ts` enforces both the aliasing and the uniqueness.
   */
  {
    path: 'navLabels.aboutUs',
    groq: '"navAboutUs": navLabels.aboutUs',
    describe: 'navLabels.aboutUs — the first nav tab renders with no words in it',
  },
  {
    path: 'navLabels.aboutEm8',
    groq: '"navAboutEm8": navLabels.aboutEm8',
    describe: 'navLabels.aboutEm8 — the About Us menu has an unlabelled link to /about',
  },
  {
    path: 'navLabels.whyEm8',
    groq: '"navWhyEm8": navLabels.whyEm8',
    describe: 'navLabels.whyEm8 — the About Us menu has an unlabelled link to /about#why-em8',
  },
  {
    path: 'navLabels.ourTeam',
    groq: '"navOurTeam": navLabels.ourTeam',
    describe: 'navLabels.ourTeam — the About Us menu has an unlabelled link to /about#team',
  },
  {
    path: 'navLabels.strategy',
    groq: '"navStrategy": navLabels.strategy',
    describe: 'navLabels.strategy — the second nav tab renders with no words in it',
  },
  {
    path: 'navLabels.whyMidwest',
    groq: '"navWhyMidwest": navLabels.whyMidwest',
    describe: 'navLabels.whyMidwest — the Strategy menu has an unlabelled link to /strategy',
  },
  {
    path: 'navLabels.partners',
    groq: '"navPartners": navLabels.partners',
    describe: 'navLabels.partners — the Strategy menu has an unlabelled link to /partners',
  },
  {
    path: 'navLabels.portfolio',
    groq: '"navPortfolio": navLabels.portfolio',
    describe: 'navLabels.portfolio — the Portfolio tab renders with no words in it',
  },
  {
    path: 'navLabels.insights',
    groq: '"navInsights": navLabels.insights',
    describe: 'navLabels.insights — the Insights tab renders with no words in it',
  },
```

- [ ] **Step 4: The third edit — the query**

In `src/sanity/queries.ts`, add to `SITE_SETTINGS_QUERY`'s projection after
`headerCta { label, href },`:

```
    navLabels {
      aboutUs, aboutEm8, whyEm8, ourTeam,
      strategy, whyMidwest, partners, portfolio, insights
    },
```

Nested rather than nine aliases, because the layout runs `missingLeaves` against **this**
result and it walks the dotted `path` — `navLabels.aboutUs` has to arrive as
`settings.navLabels.aboutUs`. The flat aliases in the array's `groq` are for
`content-integrity`, which builds its own projection and reassembles the nesting itself.
The two shapes are different on purpose and both are tested.

- [ ] **Step 5: Regenerate types, then run the test and watch it pass**

```bash
npm run typegen && npx vitest run tests/unit/requiredContent.test.ts
```

Expected: PASS, every test in the file — including the new projection test, which is no
longer vacuous because the array now has nine matching leaves. `SITE_SETTINGS_QUERY_RESULT`
in `src/sanity/types.generated.ts` now carries `navLabels`.

- [ ] **Step 6: Prove the guard fires, in the direction that matters**

The whole point of this task is that a missing query edit is invisible. Prove it is not:

Temporarily delete `insights` from the `navLabels` projection you just added in
`src/sanity/queries.ts`, then:

```bash
npx vitest run tests/unit/requiredContent.test.ts
```

Expected: FAIL, naming it — `navLabels.insights is required but SITE_SETTINGS_QUERY does
not project it`. Restore the word.

Then prove it end to end, because a unit test asserting on a string is one step removed
from the failure it stands for. Delete the same word again and run:

```bash
rm -rf .next/cache/fetch-cache && npm run build 2>&1 | tail -20
```

Expected: the build fails, and the error is the layout's throw naming
`navLabels.insights — the Insights tab renders with no words in it`, on a dataset that
genuinely has that label. **That is the 29-page failure this task's three edits prevent,
reproduced on purpose.** Restore the word and confirm the build recovers.

- [ ] **Step 7: Gate the nine on the live dataset**

`content-integrity` needs no new test for these — its `siteSettings` check already
iterates `REQUIRED_SITE_SETTINGS` and rebuilds the nesting from each `groq` alias, which is
the whole return on PR 2a. Confirm that rather than assume it:

```bash
npm run test:content
```

Expected: **13 passed**, same count as the baseline, and green. The nine leaves are now
gated with no edit to that file at all — which is the claim PR 2a made and this is the
first change to test it.

Then prove the gate can see them, so its silence means "checked" rather than "not looked".
In the Studio or through Vision, blank `siteSettings.navLabels.insights` on the **published**
document, re-run `npm run test:content`, and confirm it fails naming that leaf. Restore the
value and re-run to green.

If you would rather not touch the production document for a falsification — a defensible
call, and this is the site's live singleton — the equivalent is to add the leaf to
`REQUIRED_SITE_SETTINGS` with a deliberately wrong `groq` alias
(`'"navInsightsTypo": navLabels.insights'` changed to project a field that does not exist,
`'"navInsights": navLabels.insightsX'`), run the gate, watch it fail, and revert. Record
which of the two you did.

- [ ] **Step 8: Run everything**

```bash
npm test && npx tsc --noEmit && npm run lint && npm run test:content && rm -rf .next/cache/fetch-cache && npm run build
```

Expected: suite green apart from Task 1's two deliberate failures — and note that one of
them, `requires a Sanity label for every key in the tree`, **now passes**, because the
nine leaves it was waiting for exist. So: one deliberate failure left, the footer one,
which Task 10 closes. `tsc` silent, lint clean, content gate 13, build **29 pages**.

The build being green here is the load-bearing result of this task: nine required leaves
against a dataset Task 3 filled first, in that order, is the rule from
`docs/deploys-and-migrations.md` working.

- [ ] **Step 9: Commit**

```bash
git add src/lib/requiredContent.ts src/sanity/queries.ts src/sanity/types.generated.ts tests/unit/requiredContent.test.ts
git commit -m "Require the nine nav labels, in all three places at once"
```

Body: name the three edits and what happens when the third is missed — the build fails on
all 29 pages while the release gate stays green, because the gate builds its own projection
from the array. Record that the 29-page failure was reproduced deliberately in Step 6 and
recovered. Note that `content-integrity` needed no edit, which is PR 2a paying for itself.

---

# Task 5: The dropdown, whose requirements are accessibility requirements

§5: "The one genuinely new interactive piece, and its requirements are accessibility
requirements rather than styling ones."

Built standalone and tested standalone, before the header consumes it in Task 6, because
the keyboard contract is the part most likely to be got wrong and the least likely to be
noticed once it is wrapped in a bar that looks right.

**The markup, and why the two parents differ.** §5 makes `Strategy` a link *and* a parent
and calls the asymmetry deliberate. Taken literally that makes `/partners` unreachable on a
phone: a tap on a link navigates, so the panel never opens, so its children are reachable
only from the footer — Etamar's original complaint, one level down. So the link stays and
gains a neighbour:

```
About Us      <button aria-expanded aria-controls>About Us ▾</button>
Strategy      <a href="/strategy">Strategy</a>
              <button aria-expanded aria-controls aria-label="Open the Strategy menu">▾</button>
```

`About Us` has no destination, so one button carries both the label and the disclosure.
`Strategy` has one, so the label navigates on the first tap and the `▾` beside it opens the
panel without one. Both panels are the same element with the same behaviour.

**Files:**
- Create: `src/components/layout/NavDropdown.tsx`
- Test: `tests/unit/navDropdown.test.tsx` (create)

**Interfaces:**
- Consumes: `NavNode`, `NavLabels` from `@/lib/navigation`.
- Produces: `NavDropdown` from `@/components/layout/NavDropdown`, props
  `{ node: NavNode; labels: NavLabels; hiddenKeys?: readonly NavKey[]; onNavigate?: () => void }`.
  `hiddenKeys` is how Task 8 removes the `whyEm8` child when that section has no body;
  `onNavigate` lets the header react to a child being followed. Task 6 renders one per
  parent node.

- [ ] **Step 1: Write the failing test**

Create `tests/unit/navDropdown.test.tsx`:

```tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { NavDropdown } from '@/components/layout/NavDropdown'
import { NAV_TREE } from '@/lib/navigation'
import type { NavLabels } from '@/lib/navigation'

const LABELS: NavLabels = {
  aboutUs: 'About Us',
  aboutEm8: 'About EM8',
  whyEm8: 'Why EM8',
  ourTeam: 'Our Team',
  strategy: 'Strategy',
  whyMidwest: 'Why Midwest',
  partners: 'Partners',
  portfolio: 'Portfolio',
  insights: 'Insights',
}

const aboutUs = NAV_TREE.find((n) => n.key === 'aboutUs')!
const strategy = NAV_TREE.find((n) => n.key === 'strategy')!

const PHYSICAL = /\b(?:[a-z0-9-]+:)*-?(?:ml|mr|pl|pr|border-l|border-r|text-left|text-right)-?\b/

describe('NavDropdown, a parent with no destination', () => {
  it('renders the label from Sanity, never a literal of its own', () => {
    /*
     * The test that fails if a string goes back into the JSX, which is the whole point of
     * Hunter's decision to move these into the CMS. Rendering the real label would pass
     * against a component that ignores the prop and hardcodes the same two words, so this
     * renders different copy and asserts the seeded wording is absent.
     */
    render(
      <NavDropdown node={aboutUs} labels={{ ...LABELS, aboutUs: 'Who We Are' }} />,
    )
    expect(screen.getByRole('button', { name: /who we are/i })).toBeDefined()
    expect(screen.queryByRole('button', { name: /^about us/i })).toBeNull()
  })

  it('starts collapsed, and says so', () => {
    render(<NavDropdown node={aboutUs} labels={LABELS} />)
    const toggle = screen.getByRole('button', { name: /about us/i })
    expect(toggle.getAttribute('aria-expanded')).toBe('false')
    expect(toggle.getAttribute('aria-controls')).toBe('nav-panel-aboutUs')
  })

  it('points aria-controls at the panel that actually exists', () => {
    /*
     * An aria-controls naming no element is worse than none: a screen reader announces a
     * relationship and then cannot follow it. This is the assertion that catches the id
     * and the attribute drifting apart, which is invisible in a browser.
     */
    const { container } = render(<NavDropdown node={aboutUs} labels={LABELS} />)
    const toggle = screen.getByRole('button', { name: /about us/i })
    const id = toggle.getAttribute('aria-controls')!
    expect(container.querySelector(`#${id}`), `no element with id ${id}`).not.toBeNull()
  })

  it('opens on click and closes again', async () => {
    const user = userEvent.setup()
    render(<NavDropdown node={aboutUs} labels={LABELS} />)
    const toggle = screen.getByRole('button', { name: /about us/i })

    await user.click(toggle)
    expect(toggle.getAttribute('aria-expanded')).toBe('true')
    await user.click(toggle)
    expect(toggle.getAttribute('aria-expanded')).toBe('false')
  })

  it('opens on a touch tap, which is the case that made this a component', async () => {
    /*
     * §5: "Touch: opens on tap; a parent that is also a link must not navigate on that
     * first tap." About Us sidesteps that by being a button — so what this asserts is the
     * other half: a tap has to be enough. A hover-only panel is unreachable on a phone,
     * and a phone is the review surface (§11).
     *
     * userEvent's pointer API with a touch pointer, rather than `click`, so this fails if
     * the panel is ever moved onto a CSS :hover that a touch device cannot produce.
     */
    const user = userEvent.setup()
    render(<NavDropdown node={aboutUs} labels={LABELS} />)
    const toggle = screen.getByRole('button', { name: /about us/i })

    await user.pointer({ target: toggle, keys: '[TouchA]' })
    expect(toggle.getAttribute('aria-expanded')).toBe('true')
  })

  it('renders its three children as links once the panel is open', async () => {
    const user = userEvent.setup()
    render(<NavDropdown node={aboutUs} labels={LABELS} />)
    await user.click(screen.getByRole('button', { name: /about us/i }))

    expect(screen.getByRole('link', { name: 'About EM8' }).getAttribute('href')).toBe('/about')
    expect(screen.getByRole('link', { name: 'Why EM8' }).getAttribute('href')).toBe(
      '/about#why-em8',
    )
    expect(screen.getByRole('link', { name: 'Our Team' }).getAttribute('href')).toBe(
      '/about#team',
    )
  })

  it('keeps the children in the tree while collapsed, hidden rather than unmounted', () => {
    /*
     * The pattern the header has used since the mobile nav was fixed: render once, reveal
     * with CSS. A second copy for a second breakpoint puts two nodes with the same
     * accessible name in the tree, which breaks `getByRole` for every consumer and makes
     * the nav ambiguous to a screen reader — `mobileNav.test.tsx` was written for exactly
     * that regression.
     *
     * `hidden` rather than `display: none` in a class: `[hidden]` keeps the subtree out of
     * the accessibility tree AND out of the tab order, where a class can be overridden by
     * a later rule and silently leave focusable links inside a closed panel.
     */
    const { container } = render(<NavDropdown node={aboutUs} labels={LABELS} />)
    const panel = container.querySelector('#nav-panel-aboutUs')!
    expect(panel).not.toBeNull()
    expect(panel.hasAttribute('hidden')).toBe(true)
    expect(panel.querySelectorAll('a')).toHaveLength(3)
  })

  it('closes on Escape and returns focus to the parent', async () => {
    // §5, verbatim: "Escape closes and returns focus to the parent." Without the second
    // half, focus is left on a link inside a panel that is no longer there, and the next
    // Tab starts from nowhere.
    const user = userEvent.setup()
    render(<NavDropdown node={aboutUs} labels={LABELS} />)
    const toggle = screen.getByRole('button', { name: /about us/i })

    await user.click(toggle)
    await user.tab()
    expect(document.activeElement).toBe(screen.getByRole('link', { name: 'About EM8' }))

    await user.keyboard('{Escape}')
    expect(toggle.getAttribute('aria-expanded')).toBe('false')
    expect(document.activeElement).toBe(toggle)
  })

  it('moves focus down and up the panel with the arrow keys', async () => {
    // §5: "Arrow keys move within the panel." ArrowDown on the closed toggle opens it and
    // lands on the first child, so a keyboard user reaches the panel in one key rather
    // than opening and then tabbing.
    const user = userEvent.setup()
    render(<NavDropdown node={aboutUs} labels={LABELS} />)
    const toggle = screen.getByRole('button', { name: /about us/i })
    toggle.focus()

    await user.keyboard('{ArrowDown}')
    expect(toggle.getAttribute('aria-expanded')).toBe('true')
    expect(document.activeElement).toBe(screen.getByRole('link', { name: 'About EM8' }))

    await user.keyboard('{ArrowDown}')
    expect(document.activeElement).toBe(screen.getByRole('link', { name: 'Why EM8' }))

    await user.keyboard('{ArrowUp}')
    expect(document.activeElement).toBe(screen.getByRole('link', { name: 'About EM8' }))
  })

  it('lets Tab leave the panel rather than trapping focus in it', async () => {
    /*
     * §5: "Tab leaves it." A menu is not a dialog. Trapping focus in a navigation panel
     * is a worse failure than not opening it, because there is no visible way out — so
     * this asserts the absence of a trap, which is the kind of thing added by accident
     * while making Escape work.
     */
    const user = userEvent.setup()
    render(
      <>
        <NavDropdown node={aboutUs} labels={LABELS} />
        <a href="/after">After</a>
      </>,
    )
    await user.click(screen.getByRole('button', { name: /about us/i }))
    for (let i = 0; i < 4; i++) await user.tab()
    expect(document.activeElement).toBe(screen.getByRole('link', { name: 'After' }))
  })

  it('closes when a child is followed, and reports it', async () => {
    // The panel must not stay open over the page the reader just asked for.
    const user = userEvent.setup()
    const onNavigate = vi.fn()
    render(<NavDropdown node={aboutUs} labels={LABELS} onNavigate={onNavigate} />)

    await user.click(screen.getByRole('button', { name: /about us/i }))
    await user.click(screen.getByRole('link', { name: 'Our Team' }))
    expect(screen.getByRole('button', { name: /about us/i }).getAttribute('aria-expanded')).toBe(
      'false',
    )
    expect(onNavigate).toHaveBeenCalled()
  })

  it('drops a child named in hiddenKeys, and its panel keeps the rest', () => {
    /*
     * How Task 8 removes "Why EM8" while that section has no body. §5: "A section whose
     * body is absent renders nothing, and its nav entry goes with it." On the day this
     * merges the section IS empty, so this is the live behaviour rather than a hypothetical.
     */
    const { container } = render(
      <NavDropdown node={aboutUs} labels={LABELS} hiddenKeys={['whyEm8']} />,
    )
    expect(container.querySelector('#nav-panel-aboutUs')!.querySelectorAll('a')).toHaveLength(2)
    expect(screen.queryByRole('link', { name: 'Why EM8' })).toBeNull()
    expect(screen.getByRole('link', { name: 'Our Team' })).toBeDefined()
  })

  it('uses no physical-direction utilities', () => {
    const { container } = render(<NavDropdown node={aboutUs} labels={LABELS} />)
    expect(container.innerHTML).not.toMatch(PHYSICAL)
  })
})

describe('NavDropdown, a parent that is also a link', () => {
  it('navigates from the label and opens from a separate control', async () => {
    /*
     * The awkward case §5 names, resolved. Taken literally — one element that is both a
     * link and a disclosure — a tap navigates and the panel never opens, which strands
     * /partners behind the footer on a phone. So the label stays a link and the ▾ beside
     * it is its own button.
     */
    const user = userEvent.setup()
    render(<NavDropdown node={strategy} labels={LABELS} />)

    const label = screen.getByRole('link', { name: 'Strategy' })
    expect(label.getAttribute('href')).toBe('/strategy')

    const toggle = screen.getByRole('button', { name: /open the strategy menu/i })
    expect(toggle.getAttribute('aria-expanded')).toBe('false')
    await user.pointer({ target: toggle, keys: '[TouchA]' })
    expect(toggle.getAttribute('aria-expanded')).toBe('true')
  })

  it('names the disclosure control for a screen reader', () => {
    // A button whose only content is "▾" has no accessible name at all. Its label has to
    // say which menu it opens, because there are two of them in the bar.
    render(<NavDropdown node={strategy} labels={{ ...LABELS, strategy: 'Our Plan' }} />)
    expect(screen.getByRole('button', { name: 'Open the Our Plan menu' })).toBeDefined()
  })

  it('repeats /strategy as the panel’s first child', async () => {
    // §5's mitigation, rendered: the destination is reachable from inside the panel too,
    // so it does not depend on how the parent behaves under a tap.
    const user = userEvent.setup()
    render(<NavDropdown node={strategy} labels={LABELS} />)
    await user.click(screen.getByRole('button', { name: /open the strategy menu/i }))

    const links = screen.getAllByRole('link').map((a) => [a.textContent, a.getAttribute('href')])
    expect(links).toEqual([
      ['Strategy', '/strategy'],
      ['Why Midwest', '/strategy'],
      ['Partners', '/partners'],
    ])
  })
})
```

- [ ] **Step 2: Run it and watch it fail**

Run: `npx vitest run tests/unit/navDropdown.test.tsx`

Expected: FAIL — `Failed to resolve import "@/components/layout/NavDropdown"`. The file
errors at collection.

- [ ] **Step 3: Write the component**

Create `src/components/layout/NavDropdown.tsx`:

```tsx
'use client'

import { useRef, useState } from 'react'
import Link from 'next/link'
import type { NavKey, NavLabels, NavNode } from '@/lib/navigation'

/**
 * One navigation parent and its panel.
 *
 * The requirements here are accessibility requirements rather than styling ones (spec §5),
 * and every one of them is a case that a panel which merely looks right gets wrong:
 *
 *   - Pointer: opens on hover, and on focus for keyboard users.
 *   - Touch: opens on tap. A hover-only panel does not exist on a phone, and a phone is
 *     the review surface.
 *   - Escape closes and returns focus to the parent. Arrow keys move within the panel.
 *     Tab leaves it — a menu is not a dialog, and trapping focus in navigation is worse
 *     than not opening it, because there is no visible way out.
 *   - `aria-expanded` on the control, `aria-controls` pointing at the panel that exists.
 *   - The panel is never the only route to a page: every destination is in the footer too,
 *     which `navigation.test.ts` asserts against the footer's source.
 *
 * **Open state is React state, not CSS `:hover`.** The obvious implementation —
 * `hidden md:group-hover:block` — costs nothing and cannot work: with hover in CSS,
 * Escape has nothing to close, and `group-focus-within` re-opens the panel the moment
 * Escape returns focus to the parent. So hover is `onPointerEnter`/`onPointerLeave` and
 * every other route in and out is the same piece of state.
 *
 * **The children stay mounted and carry `hidden`.** Render once, reveal — the pattern the
 * header has used since the mobile nav was fixed. A second copy for a second breakpoint
 * puts two nodes with the same accessible name in the tree, which breaks `getByRole` for
 * every consumer and makes the nav ambiguous to a screen reader. `hidden` rather than a
 * `display:none` class because `[hidden]` keeps the subtree out of the accessibility tree
 * AND out of the tab order; a class can be overridden by a later rule and silently leave
 * focusable links inside a closed panel.
 *
 * **Two shapes of parent, and the asymmetry is spec §5's.** `About Us` has no destination
 * of its own, so one button carries the label and the disclosure. `Strategy` has one, so
 * its label is a link and the `▾` beside it is a separate button. §5 proposed one element
 * that was both; taken literally a tap on it navigates and the panel never opens, which
 * leaves /partners reachable only from the footer — the complaint this PR answers,
 * recreated one level down. The link and the extra control keep both.
 *
 * Colours: `text-ink` on `bg-ground` with a `border-rule` edge. Deliberately not
 * `text-white` on anything — spec §9 lists seven `text-white`-on-a-moving-token pairings
 * the dark re-theme has to unpick, the colour-literal lint rule cannot see any of them,
 * and this is a new surface with no reason to become the eighth.
 */
export function NavDropdown({
  node,
  labels,
  hiddenKeys,
  onNavigate,
}: {
  node: NavNode
  labels: NavLabels
  /**
   * Children to leave out. Task 8 passes `['whyEm8']` while `aboutPage.whyEm8.body` is
   * empty: §5 says a section whose body is absent takes its nav entry with it, and on the
   * day this ships that section is empty, so this is the live case.
   */
  hiddenKeys?: readonly NavKey[]
  /** Called when a child link is followed, so the header can close its own row state. */
  onNavigate?: () => void
}) {
  const [open, setOpen] = useState(false)
  const toggleRef = useRef<HTMLButtonElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)

  const panelId = `nav-panel-${node.key}`
  const label = labels[node.key]
  const children = (node.children ?? []).filter((c) => !hiddenKeys?.includes(c.key))

  const close = (refocus: boolean) => {
    setOpen(false)
    if (refocus) toggleRef.current?.focus()
  }

  /**
   * Arrow keys inside the panel, and Escape from anywhere in it.
   *
   * Focus is moved by querying the panel for its links rather than by holding an index in
   * state: the list changes with `hiddenKeys`, and an index would go stale against it
   * without anything failing.
   */
  const onKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Escape') {
      if (open) {
        event.preventDefault()
        close(true)
      }
      return
    }
    if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return

    event.preventDefault()
    if (!open) {
      // ArrowDown on a closed parent opens it and lands on the first child, so the panel
      // is one key away rather than a tab sequence away.
      setOpen(true)
      requestAnimationFrame(() =>
        panelRef.current?.querySelector<HTMLAnchorElement>('a')?.focus(),
      )
      return
    }

    const links = [...(panelRef.current?.querySelectorAll<HTMLAnchorElement>('a') ?? [])]
    if (links.length === 0) return
    const at = links.indexOf(document.activeElement as HTMLAnchorElement)
    const next =
      event.key === 'ArrowDown'
        ? Math.min(at + 1, links.length - 1)
        : Math.max(at - 1, 0)
    links[at === -1 ? 0 : next]!.focus()
  }

  /**
   * Closes when focus leaves the whole group.
   *
   * `relatedTarget` is where focus is going, so this distinguishes tabbing out of the
   * panel — which must close it — from moving between its own children, which must not.
   * A bare `onBlur` closes on every internal move and makes the arrow keys unusable.
   */
  const onBlur = (event: React.FocusEvent<HTMLDivElement>) => {
    if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setOpen(false)
  }

  return (
    <div
      className="relative"
      onPointerEnter={(e) => e.pointerType === 'mouse' && setOpen(true)}
      onPointerLeave={(e) => e.pointerType === 'mouse' && setOpen(false)}
      onKeyDown={onKeyDown}
      onBlur={onBlur}
    >
      <span className="flex items-center gap-1">
        {node.href ? (
          <>
            <Link href={node.href} onClick={() => onNavigate?.()} className="hover:text-ink">
              {label}
            </Link>
            <button
              ref={toggleRef}
              type="button"
              onClick={() => setOpen((v) => !v)}
              aria-expanded={open}
              aria-controls={panelId}
              // The label names which menu, because there are two of them in the bar, and
              // a button whose only content is a glyph has no accessible name at all.
              aria-label={`Open the ${label} menu`}
              className="p-1 text-ink-secondary hover:text-ink"
            >
              <Chevron open={open} />
            </button>
          </>
        ) : (
          <button
            ref={toggleRef}
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            aria-controls={panelId}
            className="flex items-center gap-1 hover:text-ink"
          >
            {label}
            <Chevron open={open} />
          </button>
        )}
      </span>

      {/*
        Static below md and absolute from md up: on a phone the group opens as a sheet that
        pushes the rest of the bar down, and on a pointer device it floats over the page.
        §5 asks for both. One element in both cases, so the accessible names stay unique.
      */}
      <div
        ref={panelRef}
        id={panelId}
        hidden={!open}
        className="mt-2 flex w-full flex-col gap-2 ps-3 md:absolute md:top-full md:z-50 md:mt-1 md:w-44 md:gap-0 md:rounded-card md:border md:border-rule md:bg-ground md:p-2 md:shadow-sm md:ps-2"
      >
        {children.map((child) => (
          <Link
            key={child.key}
            href={child.href!}
            onClick={() => {
              setOpen(false)
              onNavigate?.()
            }}
            className="rounded-control px-1 py-1.5 text-ink-secondary hover:bg-panel hover:text-ink md:px-2"
          >
            {labels[child.key]}
          </Link>
        ))}
      </div>
    </div>
  )
}

/** `aria-hidden`, because `aria-expanded` on the control already says which way it points. */
function Chevron({ open }: { open: boolean }) {
  return (
    <svg
      width="8"
      height="8"
      viewBox="0 0 8 8"
      aria-hidden="true"
      fill="none"
      className={open ? 'rotate-180' : ''}
    >
      <path d="M1 2.5L4 5.5L7 2.5" stroke="currentColor" strokeWidth="1.2" />
    </svg>
  )
}
```

- [ ] **Step 4: Run the tests and watch them pass**

Run: `npx vitest run tests/unit/navDropdown.test.tsx`

Expected: PASS, all sixteen. Two are worth watching specifically:

- `lets Tab leave the panel rather than trapping focus in it` — if this fails, `onKeyDown`
  is intercepting Tab. It must not.
- `moves focus down and up the panel with the arrow keys` — the `requestAnimationFrame` in
  the open-then-focus path is what makes this work, because the panel is still `hidden`
  when the state update is queued and a `hidden` element's children cannot take focus. If
  it fails intermittently, that is the cause, and `flushSync` is the fix rather than a
  longer wait.

- [ ] **Step 5: Prove the hidden panel is really unreachable**

The `hidden` attribute is doing accessibility work that a class would not, and the test
asserts the attribute rather than the behaviour. Close the gap: temporarily replace
`hidden={!open}` with `className={open ? '' : 'hidden'}` plus the rest of the classes, and
re-run. Expected: `lets Tab leave the panel` still passes, but
`keeps the children in the tree while collapsed` fails on `hasAttribute('hidden')` — and,
more importantly, the Tab test now walks *through* the closed panel's three links on the
way out, which is the real defect. Restore `hidden={!open}`.

- [ ] **Step 6: Typecheck and lint**

Run: `npx tsc --noEmit && npm run lint`

Expected: both silent. Note that the long `className` on the panel contains `ps-3` and
`ps-2` rather than `pl-`, and `md:top-full` rather than a `left`/`right` inset — the
logical-properties rule scans class strings wherever they are written, including inside a
variable, and it will fail the build on a physical direction.

- [ ] **Step 7: Commit**

```bash
git add src/components/layout/NavDropdown.tsx tests/unit/navDropdown.test.tsx
git commit -m "Add the nav dropdown, with the keyboard contract §5 asks for"
```

Body: list the five accessibility requirements and say why open state is React state
rather than CSS hover — Escape cannot close a `:hover`, and `group-focus-within` re-opens
the panel the moment Escape returns focus. Record the deviation from §5 on `Strategy`: the
link stays and gains an adjacent disclosure button, because one element that is both would
strand `/partners` behind the footer on a phone.

---

# Task 6: The phone bar — two rows, no hamburger, and a hero that still clears it

**The highest-risk item in §5**, and the one the spec's own risk table says is most likely
to need a second measurement pass. Hunter's decision: "the nav items are right as they are,
and they have to be visible on mobile."

**This task is not split, and the reason is that neither half ships alone.** A two-row
header without a bigger hero reservation puts the eyebrow under the header at 320px — the
baseline has exactly 28px of clearance and the second row costs about 32px. A bigger
reservation without the second row is just extra whitespace. A reviewer judging "the phone
bar" needs both halves in front of them, so they are one task with one review gate.

**Files:**
- Create: `src/lib/headerReservation.ts`
- Modify: `src/components/layout/SiteHeader.tsx` (rewritten)
- Modify: `src/app/(site)/layout.tsx:76-79`
- Modify: `src/components/layout/HeroCarousel.tsx:395`
- Modify: `src/components/layout/PageHero.tsx:135`
- Test: `tests/unit/header.test.tsx` (rewritten in part), `tests/unit/mobileNav.test.tsx` (rewritten), `tests/e2e/site.spec.ts`

**Interfaces:**
- Consumes: `NAV_TREE`, `NavLabels` from `@/lib/navigation`; `NavDropdown` from Task 5; `SITE_SETTINGS_QUERY_RESULT.navLabels` from Task 4.
- Produces: `SiteHeader` props become
  `{ agoraUrl: string; cta: HeaderCta; labels: NavLabels; sections?: { whyEm8: boolean } }`.
  `sections` is optional here and supplied in Task 8, so this task does not depend on one that follows it.
  `HEADER_RESERVATION: string` from `@/lib/headerReservation`, consumed by `HeroCarousel` and `PageHero`.

- [ ] **Step 1: Write the failing tests**

Replace the body of `tests/unit/mobileNav.test.tsx` — the whole file, because every
assertion in it pins the design being removed: a hamburger, `aria-controls="site-nav"`, and
a nav that is `hidden` until tapped.

```tsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { SiteHeader } from '@/components/layout/SiteHeader'
import type { NavLabels } from '@/lib/navigation'

/**
 * The phone header, rewritten for spec §5.
 *
 * What this file used to pin: one flex row, a hamburger, and a nav that was `hidden` until
 * tapped. That shipped because the header before it had no responsive behaviour at all and
 * painted "About", "Investor Login" and "Get Started" past the right edge — a real fix, and
 * the reason the render-once-reveal-with-CSS pattern is still here.
 *
 * What replaced it, and why: Etamar reviewed the site on a phone and reported that the nav
 * was empty. It was not — every link was one tap away inside the panel — but a header
 * reading `EM8 Properties · Menu` is indistinguishable from a site with no navigation.
 * Hunter's decision of 2026-09-08: the items are right and they have to be visible.
 *
 * So the hamburger is gone. There is nothing left for it to hold: the four parents are in
 * the bar and their children are in their own panels, each with its own disclosure.
 */
const CTA = { label: 'Invest With Us', href: '/investors' }

const LABELS: NavLabels = {
  aboutUs: 'About Us',
  aboutEm8: 'About EM8',
  whyEm8: 'Why EM8',
  ourTeam: 'Our Team',
  strategy: 'Strategy',
  whyMidwest: 'Why Midwest',
  partners: 'Partners',
  portfolio: 'Portfolio',
  insights: 'Insights',
}

const props = { agoraUrl: 'https://x.test', cta: CTA, labels: LABELS }

describe('the phone header', () => {
  it('shows all four nav parents without a tap', () => {
    /*
     * The assertion that answers the actual feedback. Every one of these is in the
     * document and none of them is behind a disclosure — which is the whole difference
     * between this header and the one that prompted "add case studies and insights to the
     * upper bar" for links that were already there.
     */
    render(<SiteHeader {...props} />)
    expect(screen.getByRole('button', { name: /about us/i })).toBeDefined()
    expect(screen.getByRole('link', { name: 'Strategy' })).toBeDefined()
    expect(screen.getByRole('link', { name: 'Portfolio' })).toBeDefined()
    expect(screen.getByRole('link', { name: 'Insights' })).toBeDefined()
  })

  it('offers no hamburger at all', () => {
    // Not "hides it on desktop" — it is gone. A menu button beside a visible nav is a
    // control with nothing behind it, and it is the thing that made the nav look empty.
    render(<SiteHeader {...props} />)
    expect(screen.queryByRole('button', { name: /^menu$/i })).toBeNull()
  })

  it('puts the nav on its own row from the phone up to the md breakpoint', () => {
    /*
     * Two rows rather than one because the wordmark, Investor Login and the CTA already
     * fill a 390px row between them. `basis-full` is what forces the break; `md:basis-auto`
     * is what returns the header to a single row on a desktop, where it has always been
     * one.
     */
    const { container } = render(<SiteHeader {...props} />)
    const nav = container.querySelector('#site-nav')!
    expect(nav.className).toContain('basis-full')
    expect(nav.className).toContain('md:basis-auto')
    // And it is never hidden. This is the assertion that fails if someone reinstates a
    // breakpoint-gated `hidden`, which is how this header looked empty in the first place.
    expect(nav.className).not.toMatch(/\bhidden\b/)
  })

  it('keeps Investor Login and the CTA reachable on a phone', () => {
    /*
     * §5's sketch of the phone header shows only the wordmark and Invest With Us on row
     * one, and omits Investor Login. Dropping it would re-open the exact defect the mobile
     * nav work closed — "the primary CTA and the investor portal were both
     * mobile-inaccessible" — so it stays on row one, which is also what em-8.com's phone
     * header does (§1: "wordmark + Investor Portal + hamburger"). The header wraps rather
     * than overflowing if all three do not fit; Step 6 measures whether they do.
     */
    render(<SiteHeader {...props} />)
    expect(screen.getByRole('link', { name: /investor login/i })).toBeDefined()
    expect(screen.getByRole('link', { name: 'Invest With Us' })).toBeDefined()
  })

  it('renders every destination exactly once, panels included', () => {
    /*
     * The duplicate-DOM regression guard, kept verbatim from the file this replaces and
     * now covering nine labels instead of five. A second copy of the nav for a second
     * breakpoint would put two nodes with the same accessible name in the tree, break
     * `getByRole` for every consumer, and make the nav ambiguous to a screen reader.
     *
     * getAllBy plus a length assertion rather than getBy, because getBy throws on a
     * duplicate before it can be asserted on.
     */
    render(<SiteHeader {...props} />)
    for (const name of [
      'About EM8',
      'Why EM8',
      'Our Team',
      'Why Midwest',
      'Partners',
      'Portfolio',
      'Insights',
      'Investor Login',
      CTA.label,
    ]) {
      expect(screen.getAllByRole('link', { name, hidden: true }), name).toHaveLength(1)
    }
    // Strategy appears twice on purpose and with two different accessible names — the bar
    // link and the panel's first child, which §5 requires so the destination survives a
    // tap on the parent. Both point at the same place.
    expect(
      screen
        .getAllByRole('link', { hidden: true })
        .filter((a) => a.getAttribute('href') === '/strategy'),
    ).toHaveLength(2)
  })
})
```

In `tests/unit/header.test.tsx`, replace `exposes every primary route` — it asserts the
five old literal labels — and add the label-provenance test:

```ts
  it('exposes every primary route', () => {
    render(<SiteHeader {...props} />)
    // About Us is a button, not a link: it has no destination of its own. Its three
    // children are in its panel, which mobileNav.test.tsx covers.
    expect(screen.getByRole('button', { name: 'About Us' })).toBeDefined()
    for (const label of ['Strategy', 'Portfolio', 'Insights']) {
      expect(screen.getByRole('link', { name: label })).toBeDefined()
    }
  })

  it('bakes in no nav label of its own', () => {
    /*
     * The same test `headerCta` has, for the same reason and now over nine more strings.
     * Rendering the real labels would pass just as happily against a component that
     * ignores the prop and hardcodes them, so this renders different copy and asserts the
     * seeded wording is gone.
     */
    render(
      <SiteHeader
        {...props}
        labels={{ ...LABELS, portfolio: 'Our Assets', insights: 'Writing' }}
      />,
    )
    expect(screen.getByRole('link', { name: 'Our Assets' }).getAttribute('href')).toBe(
      '/portfolio',
    )
    expect(screen.getByRole('link', { name: 'Writing' }).getAttribute('href')).toBe('/insights')
    expect(screen.queryByRole('link', { name: 'Portfolio' })).toBeNull()
    expect(screen.queryByRole('link', { name: 'Insights' })).toBeNull()
  })
```

Add the same `import type { NavLabels } from '@/lib/navigation'`, the same `LABELS`
constant and the same `props` object to `header.test.tsx`, and update its existing four
tests to spread `props` instead of passing `agoraUrl` and `cta` alone. Do the same in
`tests/unit/overlayHeader.test.tsx`, which renders `SiteHeader` seven times in a loop and
will not compile without `labels`.
Correct the file's docblock too: it says "The nav labels and *Investor Login* stay literals
on purpose", which is now half true — Investor Login still does and the nav labels do not.

- [ ] **Step 2: Run them and watch them fail**

```bash
npx vitest run tests/unit/mobileNav.test.tsx tests/unit/header.test.tsx
```

Expected: every new test fails. `SiteHeader` does not accept a `labels` prop, so `tsc`
inside vitest reports it and the renders produce the old header — `getByRole('button', {
name: /about us/i })` finds nothing, and `queryByRole('button', { name: /^menu$/i })` finds
the hamburger it asserts is absent.

- [ ] **Step 3: Extract the header reservation**

Create `src/lib/headerReservation.ts`:

```ts
/**
 * The top padding the hero reserves for the header that sits over it.
 *
 * In one place because two files must agree on it and did not: `HeroCarousel`'s overlay and
 * `PageHero`'s no-photograph fallback each spelled `pt-24 sm:pt-28` in their own class
 * string, with a paragraph in each explaining why. The number is a function of the
 * header's height, the header just changed height, and a shared constant is the difference
 * between that being one edit and being two — one of which would have been found by a
 * reader rather than by a test.
 *
 * Why it is a plain string of class names: Tailwind v4 scans source files for class tokens,
 * and it finds them in a string literal in a `.ts` file exactly as it finds them in JSX. A
 * computed class name would not be found and would silently produce no padding at all.
 *
 * The measurements, taken at 2026-09-08 on the two-row phone header this exists for:
 *
 *   header 68px (one row, before §5) · pt-24 = 96px · /about eyebrow at y=96 · 28px clear
 *   header 100px (two rows, after)   · pt-24 = 96px · eyebrow UNDER the header by 4px
 *   header 100px (two rows, after)   · pt-32 = 128px · 28px clear, as before
 *
 * 28px was the whole budget at 320, 360 and 375px, and it is identical at all three because
 * below 375px the band's overlay has grown to fill the band — bottom-alignment leaves no
 * slack, so the reservation minus the header IS the margin. The E2E assertion at 320px on
 * /about is what proves this number is still right; it is the tightest case on the site and
 * the first thing that fails if the header grows again.
 *
 * The breakpoint is `md`, not `sm`, and that matters. The header is two rows all the way up
 * to `md` (768px), which is where its own layout collapses to one. Relaxing the reservation
 * at `sm` (640px) would shrink it from 128px to 112px while the header was still at its
 * tallest — tightening the clearance at exactly the widths that need it most. So the
 * reservation changes where the header changes, and `md:pt-28` leaves the desktop case
 * identical to what it has always been against a 68px single-row header.
 *
 * Measure 640-767px as well as the phone widths. That band is where the header is two rows
 * and a reservation keyed to `sm` would already have relaxed, so it is the range that shows
 * this decision being right or wrong.
 */
export const HEADER_RESERVATION = 'pt-32 md:pt-28'
```

In `src/components/layout/HeroCarousel.tsx`, add the import beside the others:

```tsx
import { HEADER_RESERVATION } from '@/lib/headerReservation'
```

and replace `pt-24 sm:pt-28` in the overlay's class string:

```tsx
          className={`pointer-events-none relative w-full pb-12 sm:pb-14 ${HEADER_RESERVATION} ${SHAPE[variant].copy}`}
```

Trim the paragraph in the comment above it that recites the clearance measurements, leaving
the sentence that says the reservation clears the header and a pointer to
`headerReservation.ts` for the numbers — they now live there, and two copies of a
measurement is how one of them goes stale.

In `src/components/layout/PageHero.tsx`, add the same import and do the same to the
fallback:

```tsx
import { HEADER_RESERVATION } from '@/lib/headerReservation'
```

```tsx
      <div className={`mx-auto max-w-[1200px] px-6 pb-10 ${HEADER_RESERVATION}`}>
```

Its comment above that line explains `pt-24, not pt-14` and the ~68px header — the number
has moved, so point it at `headerReservation.ts` and keep the sentence that says why this
branch needs a reservation at all: `showsHero` is decided by path while this branch is
decided by content, so the header is still absolutely positioned over a page with no
photograph under it.

- [ ] **Step 4: Rewrite `SiteHeader`**

Replace `src/components/layout/SiteHeader.tsx`. The `NAV` array of five literals goes; the
hamburger and its `open` state go with it.

```tsx
'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { showsHero } from '@/lib/heroPages'
import { NAV_TREE, type NavKey, type NavLabels } from '@/lib/navigation'
import { NavDropdown } from '@/components/layout/NavDropdown'

/**
 * The header's own call to action: its words and its destination, both from the CMS.
 *
 * The label and the href travel together because rewording a button usually means
 * re-aiming it — "Invest With Us" and "Book a Call" do not want the same page — and
 * splitting them into two props would let one change without the other.
 */
export type HeaderCta = { label: string; href: string }

/**
 * Two rows on a phone, one from `md` up, and no hamburger anywhere.
 *
 * **Why it changed.** Etamar reviewed the live site on a phone and reported that the upper
 * bar was missing Case Studies and Insights. Both were in it — every link was one tap away
 * inside the panel — but a phone header reading `EM8 Properties · Menu` is
 * indistinguishable from a site with no navigation, so the report was accurate about what
 * he could see. Hunter's decision, 2026-09-08: the items are right as they are and they
 * have to be visible on mobile. Spec §5.
 *
 * **Why two rows.** The wordmark, Investor Login and the CTA already fill a 390px row
 * between them, so the nav gets its own: `basis-full md:basis-auto` on the `<nav>`, inside
 * the `flex-wrap` container that has always been here. Nothing about the desktop layout
 * changes — from `md` it is the single row it has always been.
 *
 * **What it costs, and where that is paid.** The header goes from 68px to roughly 100px on
 * a phone, and the hero reserves space for it because it sits *over* the photograph. At
 * 320px on a band page the eyebrow had 28px of clearance and nothing else, so the
 * reservation grew with the header — see `src/lib/headerReservation.ts`, where the
 * measurements are, and the 320px E2E assertion on /about, which is what proves it.
 *
 * **No hamburger.** There is nothing left for it to hold: the four parents are in the bar
 * and each panel has its own disclosure. A menu button beside a visible nav is a control
 * with nothing behind it.
 *
 * The nav labels come from `siteSettings.navLabels`; which nodes exist and where they point
 * comes from `src/lib/navigation.ts`. "Investor Login" is still a literal, deliberately: it
 * names a third-party product rather than carrying copy, which is the same rule stated on
 * `headerCta` in the schema and in the README.
 */
export function SiteHeader({
  agoraUrl,
  cta,
  labels,
  sections,
}: {
  agoraUrl: string
  cta: HeaderCta
  labels: NavLabels
  /**
   * Which optional sections exist, so a panel link to one that does not can be left out.
   *
   * §5: "A section whose body is absent renders nothing, and its nav entry goes with it."
   * Optional, and defaulting to present, so this component can be rendered without it —
   * the layout supplies it, and every test that does not care about the gate can omit it.
   */
  sections?: { whyEm8: boolean }
}) {
  /*
   * On the pages that open on a photograph, the header sits over it so the image runs to
   * the very top of the page. Everywhere else it stays in normal flow — overlaying a page
   * with no photo behind it would drop the header onto body copy.
   */
  const overlay = showsHero(usePathname())

  // A panel link to a section that is not on the page is worse than no link: it scrolls
  // nowhere and reports nothing. On the day this ships `whyEm8` has no body, so this is
  // the live case rather than a hypothetical.
  const hiddenKeys: NavKey[] = sections?.whyEm8 === false ? ['whyEm8'] : []

  return (
    <header
      className={
        overlay
          ? /*
             * 0.85, not 1: the header sits over a photograph on the hero pages, and a
             * fully opaque bar would cut a hard line across it. `bg-ground/85` rather than
             * an inline rgba, so the ground token carries it.
             */
            `absolute inset-x-0 top-0 z-40 backdrop-blur-sm bg-ground/85`
          : `border-b border-rule`
      }
    >
      <div className="mx-auto flex max-w-[1200px] flex-wrap items-center justify-between gap-y-3 px-6 py-4">
        <Link
          href="/"
          className="font-display text-lg font-bold uppercase tracking-wide text-ink"
        >
          EM8 <span className="font-light text-teal-text">Properties</span>
        </Link>

        {/*
          Row one's two actions, ordered as em-8.com orders them. They stay on the phone
          because the defect the mobile nav work closed was precisely that these two were
          unreachable there.
        */}
        <div className="flex items-center gap-3 text-xs font-medium">
          {/*
            Agora is a separate product on its own domain and handles accreditation
            verification. It opens in a new tab; rel="noopener noreferrer" keeps the opened
            page from reaching back into this one via window.opener.
          */}
          <a
            href={agoraUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-control border border-rule px-3 py-1.5 text-ink hover:border-teal"
          >
            Investor Login
          </a>
          <Link
            href={cta.href}
            className="rounded-control bg-ink px-3 py-1.5 font-semibold uppercase tracking-wide text-white"
          >
            {cta.label}
          </Link>
        </div>

        {/*
          Row two on a phone, part of row one from md up.

          `basis-full` forces the break and `md:basis-auto` releases it. Never `hidden`:
          this nav being invisible without a tap is the whole defect §5 exists to fix, and
          `mobileNav.test.tsx` asserts the class is absent for that reason.

          `order-last md:order-none` keeps it after the two actions in the source — so a
          screen reader and a keyboard reach the wordmark, then the actions, then the nav —
          while placing it visually between the wordmark and the actions on a desktop.
        */}
        <nav
          id="site-nav"
          className="order-last flex basis-full flex-wrap items-center gap-x-5 gap-y-2 text-[11px] font-semibold uppercase tracking-wide text-ink-secondary md:order-none md:basis-auto md:text-xs md:font-medium md:normal-case md:tracking-normal"
        >
          {NAV_TREE.map((node) =>
            node.children ? (
              <NavDropdown
                key={node.key}
                node={node}
                labels={labels}
                hiddenKeys={hiddenKeys}
              />
            ) : (
              <Link key={node.key} href={node.href!} className="hover:text-ink">
                {labels[node.key]}
              </Link>
            ),
          )}
        </nav>
      </div>
    </header>
  )
}
```

- [ ] **Step 5: Pass the labels in from the layout**

In `src/app/(site)/layout.tsx`, extend the `SiteHeader` call:

```tsx
        <SiteHeader
          agoraUrl={site.agoraPortalUrl!}
          cta={{ label: site.headerCta!.label!, href: site.headerCta!.href! }}
          // Non-null for the same reason the two above are: `missingLeaves` returns every
          // navLabels leaf for a null document or a null or empty field, so the throw
          // above covers all nine. TypeScript cannot see that through the array.
          labels={site.navLabels as NavLabels}
        />
```

Import the type: `import type { NavLabels } from '@/lib/navigation'`.

The cast is doing real work and is worth understanding rather than copying: typegen types
every projected leaf as `string | null` because the schema's `required()` is invisible to
it, while `NavLabels` is `Record<NavKey, string>`. The guard immediately above is what makes
the cast true, and it is the same reasoning as the seven `!`s already in this file — which
is why this is a cast to the shared type rather than nine more `!`s.

`sections` is not passed yet. Task 8 adds it, and the prop is optional so this compiles and
renders correctly in between — with the `whyEm8` link shown, which is the pre-gate state.

- [ ] **Step 6: Run the unit tests, then measure the header on a phone**

```bash
npx vitest run tests/unit/mobileNav.test.tsx tests/unit/header.test.tsx tests/unit/navDropdown.test.tsx && npm test
```

Expected: those three green. The wider suite will report failures in
`tests/unit/overlayHeader.test.tsx` and anywhere else that renders `SiteHeader` without the
new required `labels` prop — fix each by spreading a `LABELS` constant, not by making the
prop optional. A `labels` prop that may be absent is a header that can render nine blank
tabs, which is what the required leaves exist to prevent.

Then measure, because this is the acceptance evidence §11 asks for and a class assertion
cannot see a header's height:

```bash
netstat -ano | grep :3000            # kill any listener first — npm start does NOT replace one
MSYS_NO_PATHCONV=1 taskkill /PID <pid> /F
rm -rf .next/cache/fetch-cache && npm run build && npm start &
```

Two scripts, both in the scratchpad rather than the repo. The first is `phone.mjs`, carried
over from the PR 1 plan and extended — page length, header height, and the screenshot §11
asks for:

```js
// phone.mjs — page length, header height and a screenshot at the review viewport.
// Usage: MSYS_NO_PATHCONV=1 node phone.mjs /about [http://localhost:3000]
import { createRequire } from 'node:module'
const require = createRequire(process.cwd() + '/package.json')
const { chromium } = require('@playwright/test')

const route = process.argv[2] ?? '/'
const origin = process.argv[3] ?? 'http://localhost:3000'
const browser = await chromium.launch()
const ctx = await browser.newContext({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 3,
  isMobile: true,
  hasTouch: true,
  userAgent:
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 ' +
    '(KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
})
const page = await ctx.newPage()
await page.goto(origin + route, { waitUntil: 'networkidle' })
console.log(
  route,
  JSON.stringify(
    await page.evaluate(() => {
      const header = document.querySelector('header')?.getBoundingClientRect()
      const visible = [...document.querySelectorAll('header a, header button')].filter((el) => {
        const r = el.getBoundingClientRect()
        return r.width > 0 && r.height > 0 && getComputedStyle(el).visibility !== 'hidden'
      })
      return {
        screens: +(document.documentElement.scrollHeight / window.innerHeight).toFixed(2),
        headerHeight: header ? Math.round(header.height) : null,
        headerItems: visible.map((el) => (el.textContent || '').trim().replace(/\s+/g, ' ')),
      }
    }),
  ),
)
await page.screenshot({ path: `phone-${route.replace(/\//g, '-') || '-home'}.png` })
await browser.close()
```

The second is the clearance-and-rows measurement this task turns on. Run both with
`MSYS_NO_PATHCONV=1` exported, so Git Bash does not turn `/about` into
`C:/Program Files/Git/about`:

```js
// header-height.mjs — the four numbers §11 asks for, at both review widths.
import { createRequire } from 'node:module'
const require = createRequire(process.cwd() + '/package.json')
const { chromium } = require('@playwright/test')

const browser = await chromium.launch()

for (const [w, h, dpr] of [[390, 844, 3], [360, 800, 3], [320, 720, 2]]) {
  const ctx = await browser.newContext({
    viewport: { width: w, height: h },
    deviceScaleFactor: dpr,
    isMobile: true,
    hasTouch: true,
  })
  const page = await ctx.newPage()
  for (const route of ['/', '/about']) {
    await page.goto('http://localhost:3000' + route, { waitUntil: 'networkidle' })
    const m = await page.evaluate(() => {
      const header = document.querySelector('header').getBoundingClientRect()
      const eyebrow = document.querySelector('[data-hero-overlay] p')?.getBoundingClientRect()
      const visible = [...document.querySelectorAll('header a, header button')].filter((el) => {
        const r = el.getBoundingClientRect()
        return r.width > 0 && r.height > 0 && getComputedStyle(el).visibility !== 'hidden'
      })
      return {
        headerHeight: Math.round(header.height),
        rows: new Set(visible.map((el) => Math.round(el.getBoundingClientRect().top))).size,
        items: visible.map((el) => (el.textContent || '').trim().replace(/\s+/g, ' ')),
        clearance: eyebrow ? Math.round(eyebrow.y - header.height) : null,
        screens: +(document.documentElement.scrollHeight / window.innerHeight).toFixed(2),
      }
    })
    console.log(`${route.padEnd(8)} ${w}px`, JSON.stringify(m))
  }
  await ctx.close()
}
await browser.close()
```

Record every number in the PR description against the baseline table. The acceptance
conditions, and what to do when one fails:

| condition | if it fails |
|---|---|
| the four nav labels appear in `items` at 390px and 320px | the nav is still gated on a breakpoint — the defect is unfixed |
| `rows` is 2 at 390px and 320px, 1 at ≥768px | `basis-full` / `md:basis-auto` is wrong |
| `clearance` on `/about` is **> 0** at 320px, 360px and 390px | raise `HEADER_RESERVATION`'s base value one step and re-measure |
| `headerHeight` at 390px is within ~10px of 100px | over that, row one is wrapping — see the note below |
| `/about` `screens` has not grown by more than ~0.1 | the header is eating scroll §6 has to reclaim; record it either way |

**If row one wraps at 320px, that is when a menu button earns its place back.**

Hunter asked, 2026-09-08, whether the hamburger should still exist on mobile. With the nav
visible it has nothing to hold: all four parents are in row two, each panel carries its own
disclosure, both actions are in row one, and every destination is in the footer as well. To
be *useful* it would have to repeat destinations already in the bar — which puts two nodes
with the same accessible name in the tree, breaks `getByRole` for every consumer and makes
the nav ambiguous to a screen reader. That is the exact regression `mobileNav.test.tsx` was
written to catch, and it is why the default here is no hamburger.

There is one shape where a menu button is the cheaper answer, and it is a measurement rather
than a preference: if `EM8 PROPERTIES` + `Investor Login` + `Invest With Us` will not fit a
320px row, `flex-wrap` puts the header on a **third** row and it grows again — spending more
of the clearance and more of the scroll §6 has to reclaim. In that case move **Investor
Login alone** behind a small labelled menu button on row one, keeping the four nav labels and
the CTA visible. That is a control with something real behind it, it duplicates no
accessible name, and Investor Login stays reachable from the footer either way.

Record the measured row count at 320px and say which branch you took. Do not take the
fallback pre-emptively: a third row may simply not happen, and an unnecessary menu button is
the thing Etamar complained about.

- [ ] **Step 7: Measure the worst case an editor can type**

The cap is 12 characters and §5 says to confirm it by measurement rather than by its own
arithmetic. The labels come from Sanity, so the honest way to test the cap without writing
to production is to render the real page and replace the four bar labels in place:

```js
// worst-case-labels.mjs — the header at the cap, which is what the cap has to survive.
import { createRequire } from 'node:module'
const require = createRequire(process.cwd() + '/package.json')
const { chromium } = require('@playwright/test')

const browser = await chromium.launch()
for (const [w, h] of [[390, 844], [360, 800], [320, 720]]) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, isMobile: true, hasTouch: true })
  const page = await ctx.newPage()
  await page.goto('http://localhost:3000/about', { waitUntil: 'networkidle' })
  const m = await page.evaluate(() => {
    const nav = document.querySelector('#site-nav')
    // Twelve characters each, which is the schema's cap for a bar label.
    const twelve = ['Who We Are12', 'Our Plan1234', 'Assets123456', 'Writing12345']
    ;[...nav.children].forEach((child, i) => {
      const el = child.querySelector('a, button')
      if (el && twelve[i]) el.childNodes[0].textContent = twelve[i]
    })
    const header = document.querySelector('header').getBoundingClientRect()
    const eyebrow = document.querySelector('[data-hero-overlay] p')?.getBoundingClientRect()
    return {
      headerHeight: Math.round(header.height),
      navRows: new Set(
        [...nav.querySelectorAll(':scope > *')].map((el) => Math.round(el.getBoundingClientRect().top)),
      ).size,
      clearance: eyebrow ? Math.round(eyebrow.y - header.height) : null,
    }
  })
  console.log(`${w}px at the 12-char cap`, JSON.stringify(m))
}
await browser.close()
```

Expected, and the decision rule: `navRows` should be 1 at 390px. At 320px §5's arithmetic
says 12 characters "just" fits, so **if `navRows` is 2 at 320px, lower the cap to 10** in
`src/sanity/schema/siteSettings.ts` and in `schema.test.ts`, re-run, and record both
numbers — the arithmetic being wrong is a finding worth writing down, not a detail to
quietly correct. `clearance` must stay positive in every case: a wrapped nav row is
graceful only if the hero still clears it.

- [ ] **Step 8: Add the E2E assertions**

In `tests/e2e/site.spec.ts`, add beside the existing hero-clearance loop:

```ts
/*
 * The nav is visible on a phone without a tap.
 *
 * This is the assertion that would have caught what Etamar reported, and nothing in the
 * suite could have: the links were all in the DOM and all one tap away, so every unit test
 * passed while the rendered header showed two items. Asserted on the rendered page at the
 * review viewport for that reason (spec §11).
 */
test('the four nav parents are visible on a phone without a tap', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/')

  const header = page.locator('header')
  const nav = header.locator('#site-nav')
  await expect(nav).toBeVisible()

  // Four children of the nav: two dropdown groups and two plain links. Counted on the nav
  // rather than by label, because the labels are CMS content now and a test that pins
  // wording fails when someone edits their own copy.
  await expect(nav.locator(':scope > *')).toHaveCount(4)

  for (const child of await nav.locator(':scope > *').all()) {
    await expect(child).toBeVisible()
    const box = (await child.boundingBox())!
    expect(box.width, 'a nav item painted at zero width is invisible while "visible"').toBeGreaterThan(0)
    expect(box.x + box.width).toBeLessThanOrEqual(390)
  }

  // And the two actions, which the earlier header painted off the edge of the screen.
  await expect(header.getByRole('link', { name: /investor login/i })).toBeVisible()
})

/*
 * The panel opens on a tap and does not navigate on that tap.
 *
 * §5's requirement for a touch device, and the case a hover-only panel fails silently:
 * on a phone there is no hover, so a CSS-driven panel simply never opens and its children
 * are reachable only from the footer.
 */
test('a nav panel opens on tap without leaving the page', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/')

  const toggle = page.locator('#site-nav button[aria-controls="nav-panel-aboutUs"]')
  await expect(toggle).toHaveAttribute('aria-expanded', 'false')
  await toggle.tap()
  await expect(toggle).toHaveAttribute('aria-expanded', 'true')
  await expect(page).toHaveURL(/\/$/)
  await expect(page.locator('#nav-panel-aboutUs a')).toHaveCount(2)
})
```

`toHaveCount(2)` on the About Us panel, not 3: `whyEm8` has no body in the dataset, so
Task 8's gate removes that child. Until Task 8 lands, `sections` is not passed and all
three render — so **write this assertion as 3 now and change it to 2 in Task 8**, where the
gate arrives. Leave a comment saying so, or the number looks arbitrary.

Playwright's `tap()` needs a touch-enabled context. If the project's config does not set
`hasTouch`, use `dispatchEvent('touchstart')` followed by `click()`, or add
`test.use({ hasTouch: true })` to these two tests — check `playwright.config.ts` and say
which you did.

- [ ] **Step 9: Run everything**

```bash
npm test && npx tsc --noEmit && npm run lint && npm run test:content
rm -rf .next/cache/fetch-cache && npm run build
# kill the listener, then:
npm start & npx playwright test
```

Expected: unit suite green apart from Task 1's remaining footer assertion; `tsc` silent;
lint clean; content gate 13; build 29 pages; Playwright **24** — the 22 from the baseline
plus the two added here. The 320px clearance test on `/about` is the one that matters most:
it is the tightest case on the site, and it passing is what proves `HEADER_RESERVATION`
grew enough.

- [ ] **Step 10: Screenshot the phone**

```bash
MSYS_NO_PATHCONV=1 node phone.mjs / && MSYS_NO_PATHCONV=1 node phone.mjs /about
```

Two screenshots at 390x844 DPR-3, attached to the PR beside the baseline pair. This is the
evidence Hunter and Etamar will actually look at, and the change is the one Etamar asked
for, so the screenshot is the deliverable rather than a nicety.

- [ ] **Step 11: Commit**

```bash
git add src/lib/headerReservation.ts src/components/layout/SiteHeader.tsx "src/app/(site)/layout.tsx" src/components/layout/HeroCarousel.tsx src/components/layout/PageHero.tsx tests/unit/header.test.tsx tests/unit/mobileNav.test.tsx tests/unit/overlayHeader.test.tsx tests/e2e/site.spec.ts
git commit -m "Make the phone nav visible: two rows, no hamburger, a taller hero reservation"
```

Body: the before and after numbers — 68px and two items against the measured two-row height
and six; the clearance at 320px before and after; and the worst-case measurement at the
12-character cap with whatever the cap ended up being. Say that the hamburger is gone
rather than hidden, and why: there is nothing left for it to hold. Note that
`HEADER_RESERVATION` exists because the number was spelled in two files that must agree.

---

# Task 7: `/strategy`, the one new route

One new route against the four an earlier draft of §5 would have created. Its document and
heading are already in production from Task 3, so this task is code only.

**Files:**
- Create: `src/app/(site)/strategy/page.tsx`
- Modify: `src/sanity/queries.ts` (add `STRATEGY_PAGE_QUERY`)
- Modify: `src/lib/heroPages.ts:26-34`
- Modify: `src/app/sitemap.ts:25-37`
- Test: `tests/unit/strategyPage.test.tsx` (create), `tests/unit/pageHero.test.tsx:389-398`, `tests/unit/overlayHeader.test.tsx:38-47`, `tests/unit/ctaCoverage.test.ts:41-52`, `tests/unit/seo.test.ts:117-129`, `tests/integration/content-integrity.test.ts`

**Interfaces:**
- Consumes: `strategyPage` from Task 2; the seeded document from Task 3; `HEADER_RESERVATION` indirectly through `PageHero`.
- Produces: the route `/strategy`; `STRATEGY_PAGE_QUERY` and `STRATEGY_PAGE_QUERY_RESULT`; `/strategy` in `HERO_PATHS` and in the sitemap.

- [ ] **Step 1: Write the failing test**

Create `tests/unit/strategyPage.test.tsx`:

```tsx
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { stripComments } from '../shared/sourceScan'
import { STRATEGY_PAGE_QUERY } from '@/sanity/queries'
import { HERO_PATHS } from '@/lib/heroPages'

/**
 * The one new route in spec §5. Asserted against its source and its query rather than by
 * rendering it: it is an async server component that fetches from Sanity, and the three
 * pages shaped like it are covered the same way.
 */
const source = stripComments(
  readFileSync(
    resolve(import.meta.dirname, '../../src/app/(site)/strategy/page.tsx'),
    'utf8',
  ),
).replace(/\r\n/g, '\n')

describe('the strategy page', () => {
  it('projects its heading, seo and body', () => {
    // Fields inlined and named, because typegen only discovers queries written that way
    // and cannot resolve an interpolated fragment — written otherwise it reports "0
    // queries" and the type safety this CMS was chosen for disappears.
    expect(STRATEGY_PAGE_QUERY).toContain('_id == "strategyPage"')
    expect(STRATEGY_PAGE_QUERY).toContain('seo { title, description }')
    expect(STRATEGY_PAGE_QUERY).toContain('heading { eyebrow, title, intro }')
    expect(STRATEGY_PAGE_QUERY).toContain('body')
  })

  it('throws on a missing heading title rather than rendering a titleless page', () => {
    /*
     * The same guard /portfolio and /insights carry, and it checks `heading.title` rather
     * than `heading`: GROQ projects an all-null heading into a truthy object, which a
     * shallow check waves through as an empty <h1>. Sanity's required() is Studio-side
     * only, so this throw is the real guard.
     */
    expect(source).toMatch(/!copy\?\.heading\?\.title/)
    expect(source).toMatch(/throw new Error/)
  })

  it('renders nothing at all when the body is empty', () => {
    /*
     * The live state on the day this ships. The Why Midwest argument is copy EM8 owes
     * (§3), so the field is optional and the page is a hero and a call to action until it
     * arrives. A `<PortableText>` handed `null` throws, and an unguarded empty section
     * renders a bare rule across the page — neither is acceptable for the normal state of
     * a shipped page.
     */
    expect(source).toMatch(/copy\.body\s*&&/)
  })

  it('closes with the call to action every page closes with', () => {
    // ctaCoverage.test.ts enumerates the route files and asserts this for all of them, so
    // this is the same claim stated where a reader of this file will see it.
    expect(source).toContain('<CtaBand')
    expect(source).toMatch(/copy=\{settings\?\.ctaBand\}/)
  })

  it('opens on the shared photograph band, like the other six section pages', () => {
    expect([...HERO_PATHS]).toContain('/strategy')
    expect(source).toContain('<PageHero')
  })
})
```

Then extend the four existing route lists. In each, **`/track-record` stays for now** —
Task 10 removes it — and `/strategy` is added, keeping each list sorted:

- `tests/unit/pageHero.test.tsx`, the `HERO_PATHS` list, and its test name says "all seven
  section pages": it is eight until Task 10 makes it seven again. Update the wording in
  both places rather than leaving a name that contradicts its own list.
- `tests/unit/overlayHeader.test.tsx`, the path list in
  `overlays every section page, the homepage and /investors included`.
- `tests/unit/ctaCoverage.test.ts`, the route list in
  `covers every route, so the assertions below cannot go vacuous`.
- `tests/unit/seo.test.ts`, the route list in the same-named test.

The last two enumerate `src/app/(site)/**/page.tsx` from disk, so they fail the moment the
file exists and pass once the list names it — which is the check working, and the reason
both lists are named rather than counted.

- [ ] **Step 2: Run them and watch them fail**

```bash
npx vitest run tests/unit/strategyPage.test.tsx tests/unit/pageHero.test.tsx tests/unit/overlayHeader.test.tsx tests/unit/ctaCoverage.test.ts tests/unit/seo.test.ts
```

Expected: `strategyPage.test.tsx` fails at collection —
`ENOENT: no such file or directory, open '.../src/app/(site)/strategy/page.tsx'` — and
`STRATEGY_PAGE_QUERY` does not exist, so the import fails too. The other four fail with a
list diff naming `/strategy` as expected and absent.

- [ ] **Step 3: Add the query**

In `src/sanity/queries.ts`, after `INSIGHTS_PAGE_QUERY`:

```ts
/**
 * The Strategy page: spec §5's one new route.
 *
 * Shaped like `PORTFOLIO_PAGE_QUERY` above, plus `body` — the Why Midwest argument, which
 * is the reason the page exists and which ships empty. Written out rather than built from
 * a shared string for the same typegen reason as everywhere else in this file.
 */
export const STRATEGY_PAGE_QUERY = defineQuery(`
  *[_id == "strategyPage"][0] {
    seo { title, description },
    heading { eyebrow, title, intro },
    body
  }
`)
```

- [ ] **Step 4: Write the page**

Before writing it, read `node_modules/next/dist/docs/01-app` on metadata and on async
server components if you have not already — `AGENTS.md` is explicit that this is not the
Next.js in your training data, and `generateMetadata` and `params` in particular have
changed shape between versions.

Create `src/app/(site)/strategy/page.tsx`:

```tsx
import type { Metadata } from 'next'
import { PortableText } from 'next-sanity'
import { seoMetadata } from '@/lib/pageSeo'
import { fetchSanity } from '@/sanity/client'
import { STRATEGY_PAGE_QUERY, SITE_SETTINGS_QUERY } from '@/sanity/queries'
import type {
  STRATEGY_PAGE_QUERY_RESULT,
  SITE_SETTINGS_QUERY_RESULT,
} from '@/sanity/types.generated'
import { CtaBand } from '@/components/ui/CtaBand'
import { PageHero } from '@/components/layout/PageHero'
import type { CarouselSlide } from '@/components/layout/HeroCarousel'

export async function generateMetadata(): Promise<Metadata> {
  const [copy, settings] = await Promise.all([
    fetchSanity<STRATEGY_PAGE_QUERY_RESULT>(STRATEGY_PAGE_QUERY),
    fetchSanity<SITE_SETTINGS_QUERY_RESULT>(SITE_SETTINGS_QUERY),
  ])
  return seoMetadata({
    seo: copy?.seo,
    path: '/strategy',
    documentName: 'strategyPage',
    shareImage: settings?.defaultShareImage,
  })
}

/**
 * Why the Midwest — spec §5's one new route, against the four an earlier draft would have
 * created.
 *
 * Hunter's instruction of 2026-09-08 put Why Midwest and Partners under a Strategy tab.
 * Why Midwest is not a page of its own under it: it is *this* page's body, which is what
 * "fold" meant and what §12 records as the improvement — a section of a page that has
 * content rather than a second thin page.
 *
 * The body ships empty and that is the normal state for now. §3 lists the copy under "Owed
 * by people", so the structure is here and the words arrive in the Studio without a
 * developer. Until then the page is its title and its call to action, which is a real page
 * — a hero with an eyebrow, a headline and an intro — rather than a shell.
 */
export default async function StrategyPage() {
  const [copy, settings] = await Promise.all([
    fetchSanity<STRATEGY_PAGE_QUERY_RESULT>(STRATEGY_PAGE_QUERY),
    fetchSanity<SITE_SETTINGS_QUERY_RESULT>(SITE_SETTINGS_QUERY),
  ])

  // Missing required content fails the build loudly rather than rendering a titleless
  // page. Sanity's `required()` is Studio-side only, so this throw is the real guard, and
  // it checks `title` rather than `heading` — GROQ projects an all-null heading into a
  // truthy object, which a shallow check would wave through as an empty <h1>.
  if (!copy?.heading?.title) {
    throw new Error(
      'The strategyPage document has no heading title. Add one in the Studio under ' +
        'Strategy page.',
    )
  }

  return (
    <div>
      <PageHero
        copy={copy.heading}
        slides={(settings?.heroCarousel ?? []) as CarouselSlide[]}
      />

      {/*
        Guarded, and the guard is the point rather than defensive habit: this field is
        empty today. `PortableText` handed null throws, and an unguarded wrapper renders an
        empty bordered section, so the page has to be correct with nothing here — which is
        how it ships.
      */}
      {copy.body && (
        <section className="mx-auto max-w-[1200px] px-6 py-12">
          <div className="max-w-[68ch] text-sm leading-relaxed text-ink-secondary">
            <PortableText value={copy.body} />
          </div>
        </section>
      )}

      <CtaBand bookACallUrl={settings?.bookACallUrl} copy={settings?.ctaBand} />
    </div>
  )
}
```

- [ ] **Step 5: Add it to the hero band and the sitemap**

In `src/lib/heroPages.ts`, add `'/strategy'` to `HERO_PATHS` after `'/portfolio'`. Leave
`'/track-record'` for Task 10. The docblock says "all seven section pages" — it is eight
until Task 10, so say so rather than leaving a stale count.

In `src/app/sitemap.ts`, add after the `/portfolio` entry:

```ts
    { url: `${base}/strategy`, changeFrequency: 'monthly', priority: 0.7 },
```

0.7, matching `/partners`: it is a positioning page rather than an index of assets.

- [ ] **Step 6: Gate the new document on the live dataset**

In `tests/integration/content-integrity.test.ts`, add `"strategyPage"` to `CONTENT_TYPES`
and to `PAGE_IDS`, and add `'strategyPage'` to the `ids` array in
`has a complete heading on the three pages that render one from the CMS`. Rename that test
— it is four pages now, and a name that says three while asserting four is the kind of
thing nobody re-reads:

```ts
  it('has a complete heading on the four pages that render one from the CMS', async () => {
    const ids = ['portfolioPage', 'insightsPage', 'trackRecordPage', 'strategyPage']
```

`trackRecordPage` stays in that list until Task 10, which removes it from all four places
at once.

- [ ] **Step 7: Regenerate types, then run everything**

```bash
npm run typegen
npx vitest run tests/unit/strategyPage.test.tsx && npm test && npx tsc --noEmit && npm run lint && npm run test:content
rm -rf .next/cache/fetch-cache && npm run build
```

Expected: `strategyPage.test.tsx` green; suite green apart from Task 1's footer assertion;
`tsc` silent; lint clean; content gate **13**, now covering `strategyPage` because the
document is already in production from Task 3 — if this fails saying `strategyPage` is
missing entirely, Task 3's apply did not happen or did not land, and the fix is there
rather than here.

The build is now **30 pages**, not 29. Record the number: it goes to 29 again in Task 10
when `/track-record` is deleted, so a reader seeing 29 at the end of the PR should be able
to find where 30 was.

- [ ] **Step 8: Read the page, do not trust the build**

```bash
# kill any listener on 3000 first
npm start &
curl -s http://localhost:3000/strategy | grep -o "<h1[^>]*>.*</h1>" | head -1
curl -s http://localhost:3000/strategy | grep -c "Why the Midwest"
curl -s http://localhost:3000/sitemap.xml | grep -o "[^<]*strategy[^<]*"
```

Expected: an `<h1>` containing the seeded title, and the URL in the sitemap. Then take the
phone screenshot, because §11 accepts on a phone:

```bash
MSYS_NO_PATHCONV=1 node phone.mjs /strategy
```

Check the screenshot for the thing no assertion covers: a page whose body is empty should
look deliberate — hero, then the call to action — rather than broken. If it reads as a
truncated page, that is worth raising with Hunter before merge, because it is the state the
page ships in and it is the first thing Etamar will click.

- [ ] **Step 9: Commit**

```bash
git add "src/app/(site)/strategy/page.tsx" src/sanity/queries.ts src/lib/heroPages.ts src/app/sitemap.ts src/sanity/types.generated.ts tests/unit/strategyPage.test.tsx tests/unit/pageHero.test.tsx tests/unit/overlayHeader.test.tsx tests/unit/ctaCoverage.test.ts tests/unit/seo.test.ts tests/integration/content-integrity.test.ts
git commit -m "Add /strategy, whose Why Midwest body ships empty on purpose"
```

Body: one new route against four, because Why EM8 and Why Midwest are sections rather than
pages. Say the build is 30 pages here and returns to 29 in the commit that deletes
`/track-record`. Note that the body is empty by design and what the page looks like without
it.

---

# Task 8: The `whyEm8` section, the two anchors, and the nav gate

Three small things that belong together because they are one destination: `/about#why-em8`
has to exist before a nav entry may point at it, and `/about#team` has to have an anchor
before "Our Team" can reach it.

**Files:**
- Modify: `src/sanity/queries.ts` (`ABOUT_PAGE_QUERY`, add `NAV_SECTIONS_QUERY`)
- Modify: `src/app/(site)/about/page.tsx:71-143`
- Modify: `src/app/(site)/layout.tsx`
- Modify: `src/components/layout/SiteHeader.tsx` (nothing — the `sections` prop exists from Task 6)
- Test: `tests/unit/aboutSections.test.tsx` (create), `tests/unit/mobileNav.test.tsx`, `tests/e2e/site.spec.ts`

**Interfaces:**
- Consumes: `aboutPage.whyEm8` from Task 2; `SiteHeader`'s optional `sections` prop from Task 6; `NavDropdown`'s `hiddenKeys` from Task 5.
- Produces: `NAV_SECTIONS_QUERY` and `NAV_SECTIONS_QUERY_RESULT`; `id="why-em8"` and `id="team"` on `/about`; the layout passes `sections={{ whyEm8: … }}`.

**Why a second query and not one more field on `SITE_SETTINGS_QUERY`.** The obvious version
folds `"hasWhyEm8": defined(*[_id=="aboutPage"][0].whyEm8.body)` into the query the layout
already runs, at no extra round trip. It is the wrong call for one specific reason:
`tests/unit/requiredContent.test.ts` proves each required leaf is projected by looking for
each dotted path segment as a substring of `SITE_SETTINGS_QUERY`, and its own comment
concedes that "a coincidental segment name elsewhere in the query would satisfy it
wrongly." Putting the string `whyEm8` into that query for an unrelated reason manufactures
exactly that coincidence, for exactly the leaf it would hide — `navLabels.whyEm8`. A
separate query keeps the guard honest, and the cost is one extra build-time fetch that
Next's data cache serves from the same request.

- [ ] **Step 1: Write the failing test**

Create `tests/unit/aboutSections.test.tsx`:

```tsx
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { stripComments } from '../shared/sourceScan'
import { ABOUT_PAGE_QUERY, NAV_SECTIONS_QUERY } from '@/sanity/queries'
import { navDestinations } from '@/lib/navigation'

const about = stripComments(
  readFileSync(resolve(import.meta.dirname, '../../src/app/(site)/about/page.tsx'), 'utf8'),
).replace(/\r\n/g, '\n')

const layout = stripComments(
  readFileSync(resolve(import.meta.dirname, '../../src/app/(site)/layout.tsx'), 'utf8'),
).replace(/\r\n/g, '\n')

describe('/about carries the anchors the nav points at', () => {
  it('has an element for every #anchor in the nav tree', () => {
    /*
     * The failure this prevents is a menu link that scrolls nowhere — valid HTML, no
     * console error, no failing test, and a reader who taps "Our Team" and stays where
     * they were. The nav tree is the source of truth, so this derives the list from it
     * rather than restating it: a fourth anchor added there fails here until the page has
     * somewhere to land.
     */
    const anchors = navDestinations()
      .filter((href) => href.includes('#'))
      .map((href) => href.split('#')[1]!)
    expect(anchors.length, 'the nav has no anchors — this test has gone vacuous').toBeGreaterThan(0)

    for (const id of anchors) {
      expect(about, `/about has no id="${id}" for a nav link that points at it`).toContain(
        `id="${id}"`,
      )
    }
  })
})

describe('the Why EM8 section', () => {
  it('is projected with both of its leaves', () => {
    expect(ABOUT_PAGE_QUERY).toContain('whyEm8 { heading { eyebrow, title, intro }, body }')
  })

  it('renders only when both the title and the body are there', () => {
    /*
     * Guarded per leaf, because a `whyEm8` object with null fields is still a truthy
     * object and a shallow check would render an empty <h2> with a rule under it. §5: "a
     * half-filled one renders nothing rather than an empty <h2>".
     *
     * Both leaves, not either: a heading with no body is a title over blank space, and a
     * body with no heading is prose with no idea what it is.
     */
    expect(about).toMatch(/whyEm8\?\.heading\?\.title\s*&&\s*copy\.whyEm8\?\.body/)
  })
})

describe('the nav is told which optional sections exist', () => {
  it('asks the dataset in its own query, not in SITE_SETTINGS_QUERY', () => {
    /*
     * Deliberately separate. `requiredContent.test.ts` proves each required leaf is
     * projected by finding its path segments as substrings of SITE_SETTINGS_QUERY, and it
     * documents that a coincidental match elsewhere would satisfy it wrongly. Putting the
     * string "whyEm8" into that query for an unrelated reason manufactures that
     * coincidence for the very leaf it would hide — navLabels.whyEm8. So this lives apart,
     * and this assertion is what stops someone folding it in for the round trip.
     */
    expect(NAV_SECTIONS_QUERY).toContain('_id == "aboutPage"')
    expect(NAV_SECTIONS_QUERY).toContain('defined(whyEm8.body)')
  })

  it('is passed to the header by the layout', () => {
    expect(layout).toContain('NAV_SECTIONS_QUERY')
    expect(layout).toMatch(/sections=\{/)
  })

  it('treats a missing document as a missing section rather than crashing', () => {
    /*
     * `*[_id == "aboutPage"][0]{...}` is null when the document is absent, and the nav
     * renders on all 29 pages. A `!` here would take the whole site down over an optional
     * section on one page — so the fallback is "the section is not there", which is true.
     */
    expect(layout).toMatch(/whyEm8:\s*(?:!!)?navSections\?\./)
  })
})
```

Then change the About Us panel count in `tests/e2e/site.spec.ts` from `3` to `2`, which is
the change Task 6 Step 8 left a note for. And in `tests/unit/mobileNav.test.tsx`, add:

```tsx
  it('drops the Why EM8 link while that section has no body', () => {
    // The live state on the day this ships, not a hypothetical: §3 lists the copy under
    // "Owed by people". A menu link to an anchor that is not on the page scrolls nowhere.
    render(<SiteHeader {...props} sections={{ whyEm8: false }} />)
    expect(screen.queryByRole('link', { name: 'Why EM8', hidden: true })).toBeNull()
    expect(screen.getByRole('link', { name: 'Our Team', hidden: true })).toBeDefined()
  })

  it('shows it once the section has a body', () => {
    render(<SiteHeader {...props} sections={{ whyEm8: true }} />)
    expect(screen.getByRole('link', { name: 'Why EM8', hidden: true })).toBeDefined()
  })
```

- [ ] **Step 2: Run them and watch them fail**

```bash
npx vitest run tests/unit/aboutSections.test.tsx tests/unit/mobileNav.test.tsx
```

Expected: `aboutSections.test.tsx` fails on the import of `NAV_SECTIONS_QUERY`, which does
not exist. Once that is added it fails on `/about has no id="why-em8"` and
`id="team"`. The two `mobileNav` tests fail because `sections` is not yet wired — the
`whyEm8: false` case still renders the link, since Task 6 left the prop optional and
unwired.

- [ ] **Step 3: Extend `ABOUT_PAGE_QUERY` and add `NAV_SECTIONS_QUERY`**

In `src/sanity/queries.ts`, add to `ABOUT_PAGE_QUERY` after `factorsHeading { … }`:

```
    whyEm8 { heading { eyebrow, title, intro }, body },
```

And after it, a query of its own:

```ts
/**
 * Which optional sections exist, for the navigation.
 *
 * One boolean today. It is here rather than folded into `SITE_SETTINGS_QUERY` — where it
 * would cost no extra round trip — for a specific reason:
 * `tests/unit/requiredContent.test.ts` proves that every required leaf is projected by
 * looking for each dotted path segment as a substring of `SITE_SETTINGS_QUERY`, and its own
 * comment concedes that a coincidental segment name elsewhere in the query would satisfy it
 * wrongly. The string `whyEm8` appearing there for an unrelated reason manufactures exactly
 * that coincidence, for exactly the leaf it would hide: `navLabels.whyEm8`. Keeping this
 * apart keeps that guard honest, and Next's data cache serves the second fetch from the
 * same request.
 *
 * `defined(whyEm8.body)` rather than the value: the layout needs to know whether to show a
 * menu link, and pulling a whole portable-text array into the layout of all 29 pages to
 * answer a yes-or-no question would be a real cost for no gain.
 */
export const NAV_SECTIONS_QUERY = defineQuery(`
  *[_id == "aboutPage"][0] {
    "whyEm8": defined(whyEm8.body)
  }
`)
```

- [ ] **Step 4: Render the section and add the anchors**

In `src/app/(site)/about/page.tsx`, add after the success-factors `<section>` and before
the team groups:

```tsx
      {/*
        Why EM8 — a section rather than a page, which is what Hunter's "fold" meant and
        what §12 records as the improvement over an earlier draft's four new routes.

        Guarded on BOTH leaves. A `whyEm8` object with null fields is still a truthy
        object, so a shallow check renders an empty <h2> with a rule under it; a heading
        with no body is a title over blank space, and a body with no heading is prose with
        no idea what it is. §5: "a half-filled one renders nothing rather than an empty
        <h2>".

        It renders nothing today, deliberately — the copy is owed (§3) — and the "Why EM8"
        link in the About Us menu is hidden to match, via NAV_SECTIONS_QUERY. The id is
        here rather than on an inner element so the anchor survives the section's own
        layout changing.
      */}
      {copy.whyEm8?.heading?.title && copy.whyEm8?.body && (
        <section id="why-em8" className="border-t border-rule bg-panel">
          <div className="mx-auto max-w-[1200px] px-6 py-14">
            <SectionHeading {...copy.whyEm8.heading} />
            <div className="mt-6 max-w-[68ch] text-sm leading-relaxed text-ink-secondary">
              <PortableText value={copy.whyEm8.body} />
            </div>
          </div>
        </section>
      )}
```

Import `PortableText` from `next-sanity` at the top of the file.

Then wrap the two team sections so `#team` lands on the first of them:

```tsx
      {/*
        The anchor "Our Team" points at, on a wrapper rather than on either section: the
        leadership group renders only if it has members, so an id on it would disappear
        with it and the menu link would scroll nowhere. A wrapper is always here.
      */}
      <div id="team">
        {GROUP_SECTIONS.map(
          ({ group, eyebrow, title }) =>
            byGroup(group).length > 0 && (
              // ... unchanged
            ),
        )}
      </div>
```

- [ ] **Step 5: Wire it through the layout**

In `src/app/(site)/layout.tsx`, add the query to the imports and fetch it alongside the
settings:

```tsx
  const [settings, navSections] = await Promise.all([
    fetchSanity<SITE_SETTINGS_QUERY_RESULT>(SITE_SETTINGS_QUERY),
    fetchSanity<NAV_SECTIONS_QUERY_RESULT>(NAV_SECTIONS_QUERY),
  ])
```

Leave the `missingLeaves(settings)` guard exactly where it is — it must still run on the
settings and it must not start guarding `navSections`, which is optional content by design.

Then pass it:

```tsx
          labels={site.navLabels as NavLabels}
          {/*
            A missing aboutPage projects to null, and this layout renders on all 29 pages —
            so the fallback is "the section is not there", which is true and which keeps an
            optional section on one page from taking the site down. `!!` because
            `defined()` returns a boolean but the projection types it nullable.
          */}
          sections={{ whyEm8: !!navSections?.whyEm8 }}
```

- [ ] **Step 6: Regenerate types and run the tests**

```bash
npm run typegen
npx vitest run tests/unit/aboutSections.test.tsx tests/unit/mobileNav.test.tsx && npm test
```

Expected: green apart from Task 1's footer assertion.

- [ ] **Step 7: Prove the gate works in both directions, against real data**

The section is empty in production, so the negative case is the one that ships and the
positive case is untested by anything real. Test both:

```bash
# kill any listener, then
rm -rf .next/cache/fetch-cache && npm run build && npm start &
curl -s http://localhost:3000/about | grep -c 'id="why-em8"'      # expect 0 — no body yet
curl -s http://localhost:3000/about | grep -c 'id="team"'         # expect 1
curl -s http://localhost:3000/about | grep -c 'href="/about#why-em8"'  # expect 0 — link gated off
curl -s http://localhost:3000/about | grep -c 'href="/about#team"'     # expect 1
```

Then fill the section in the Studio — a heading and one paragraph on the **published**
`aboutPage` document — rebuild, and confirm the four numbers become `1, 1, 1, 1`. Then
**unset it again**, because the real copy is Hunter's to write and this was a probe:

```bash
node --env-file=.env.local -e '
const [pid, ds, tok] = [process.env.NEXT_PUBLIC_SANITY_PROJECT_ID, process.env.NEXT_PUBLIC_SANITY_DATASET, process.env.SANITY_API_WRITE_TOKEN]
const r = await fetch(`https://${pid}.api.sanity.io/v2024-01-01/data/mutate/${ds}`, {
  method: "POST",
  headers: { Authorization: `Bearer ${tok}`, "Content-Type": "application/json" },
  body: JSON.stringify({ mutations: [{ patch: { id: "aboutPage", unset: ["whyEm8"] } }] }),
})
console.log(r.status, await r.text())
'
```

**This unset is safe and it is the one exception to this PR being additions-only**, because
the field is optional, nothing deployed reads it, and the value being removed is one this
probe wrote thirty seconds earlier. It is not the shape of removal
`docs/deploys-and-migrations.md` warns about — that is a field the deployed build reads.
Say in the report that you did it, and confirm the four numbers are back to `0, 1, 0, 1`
before moving on. If you would rather not write to production at all, an equally good
version of this probe is to point `NEXT_PUBLIC_SANITY_DATASET` at `preview` for one build;
record which you chose.

- [ ] **Step 8: Run everything**

```bash
npm test && npx tsc --noEmit && npm run lint && npm run test:content
rm -rf .next/cache/fetch-cache && npm run build
# kill the listener, then
npm start & npx playwright test
```

Expected: suite green apart from the footer assertion; `tsc` silent; lint clean; content
gate 13; build 30 pages; Playwright 24.

- [ ] **Step 9: Commit**

```bash
git add src/sanity/queries.ts "src/app/(site)/about/page.tsx" "src/app/(site)/layout.tsx" src/sanity/types.generated.ts tests/unit/aboutSections.test.tsx tests/unit/mobileNav.test.tsx tests/e2e/site.spec.ts
git commit -m "Add the Why EM8 section, its anchor, and the nav gate that hides it while empty"
```

Body: the section and its nav entry appear and disappear together, which is §5's rule, and
today both are absent because the copy is owed. Record the probe: filled in the Studio,
verified all four numbers, unset again — and why that unset is not the dangerous kind. Say
why `NAV_SECTIONS_QUERY` is separate from `SITE_SETTINGS_QUERY` rather than folded in for
the round trip.

---

# Task 9: `DealStory` onto the property page — before the route goes, not after

**The precondition for Task 10, and the reason §8 stopped being a PR of its own.**
`/track-record` is the *only* consumer of `dealStory`: `PROPERTY_BY_SLUG_QUERY` already
selects it and the property page never renders it, so deleting the route as it stands would
take the Acquired → Executed → Exited narrative and the 1.99x and 1.37x multiples off the
site entirely — the very return metrics Etamar asked for.

Verified against the live dataset on 2026-09-08: Burbank Manor Apartments (1.99x, exited
2022) and Embassy Apartments (1.37x, exited 2023), both `status: 'sold'`, both with a
populated `dealStory`, both `showInPortfolio: true`.

**Files:**
- Modify: `src/sanity/queries.ts` (`SITE_SETTINGS_QUERY` gains `dealStoryHeading`)
- Modify: `src/app/(site)/portfolio/[slug]/page.tsx:106-117`
- Modify: `src/components/property/DealStory.tsx:26-33`
- Test: `tests/unit/dealStory.test.tsx:17-21` — both the component change and the new call site, because there is no property-page scanner today and the component and its one remaining call site are now the same concern

**Interfaces:**
- Consumes: `DealStory` from `@/components/property/DealStory`; `p.dealStory` and `p.status`, both already projected by `PROPERTY_BY_SLUG_QUERY`; `siteSettings.dealStoryHeading` from Tasks 2 and 3, which this task adds to `SITE_SETTINGS_QUERY`.
- Produces: nothing importable. `DealStory`'s stage labels become `h3` rather than `h4`.

- [ ] **Step 1: Write the failing test**

There is no property-page source scanner today, so add these to
`tests/unit/dealStory.test.tsx` — it is the file a reader looking for this behaviour will
open, and the component and its one call site are now the same concern.

```tsx
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { stripComments } from '../shared/sourceScan'

const propertyPage = stripComments(
  readFileSync(
    resolve(import.meta.dirname, '../../src/app/(site)/portfolio/[slug]/page.tsx'),
    'utf8',
  ),
).replace(/\r\n/g, '\n')

describe('where the deal story renders', () => {
  it('is on the canonical property page', () => {
    /*
     * It used to be on /track-record and nowhere else, which made deleting that route a
     * content deletion rather than a route deletion: PROPERTY_BY_SLUG_QUERY already
     * selected `dealStory` and the property page never rendered it, so the 1.99x and
     * 1.37x multiples would have left the site with the page. §8: one import and one line,
     * because the data is already fetched.
     */
    expect(propertyPage).toContain('<DealStory')
    expect(propertyPage).toMatch(/from '@\/components\/property\/DealStory'/)
  })

  it('is gated on the deal actually being closed', () => {
    /*
     * §5 asks for `status == 'sold'`, and the gate is a compliance matter rather than a
     * cosmetic one. DealStory's labels say "Realized", so rendering it for a property that
     * has not exited would describe an open position as a completed result — on the same
     * page where OfferingBlock carefully labels every figure as targeted. The status check
     * is what keeps those two vocabularies apart.
     *
     * And `dealStory` itself is checked too: a sold property whose narrative has not been
     * written yet would otherwise render an empty three-column grid with a rule above it.
     */
    expect(propertyPage).toMatch(/status === 'sold'/)
    expect(propertyPage).toMatch(/p\.dealStory\s*&&/)
  })

  it('sits under a heading from the CMS, at the level below it', () => {
    /*
     * The page's other two blocks — "The business plan" and "Location" — are h2s under the
     * property's h1, so a block of content with no heading between them reads as a
     * continuation of the one above it.
     *
     * And the words come from `siteSettings.dealStoryHeading`, not from this file. Hunter's
     * instruction of 2026-09-08: every string this PR writes has to be editable in the
     * Studio, and this was the only one that would not have been. Asserted as the absence
     * of the literal as well as the presence of the field, because reading the field would
     * pass just as happily against a component that also hardcoded a fallback.
     */
    // No `?.` inside the element: the `settings?.dealStoryHeading &&` guard wrapping it is
    // what makes the inner access safe, so the JSX renders `{settings.dealStoryHeading}`.
    expect(propertyPage).toMatch(/<h2[^>]*>\s*\{settings\.dealStoryHeading\}/)
    expect(propertyPage).not.toContain('Realized results')
  })

  it('renders the figures with no heading when that field is blank', () => {
    /*
     * The field is optional, so this is a state an editor can produce in one keystroke —
     * and it is how these figures looked on /track-record, which had no heading above them
     * at all. So the guard is on the heading alone: clearing the words must not take the
     * 1.99x multiple off the site with them.
     */
    expect(propertyPage).toMatch(/settings\?\.dealStoryHeading\s*&&/)
  })
})
```

Then change the level in the existing test at the top of that file — `getAllByRole(
'heading', { level: 4 })` becomes `level: 3` — and say why:

```tsx
  it('tells the deal in acquired, executed, exited order', () => {
    /*
     * h3, not h4. On /track-record this sat inside a card whose title was a link rather
     * than a heading, so h4 skipped a level from the page's h1 and nothing minded. On the
     * property page it sits directly under an h2, so h3 is the level that follows it —
     * heading order is an accessibility requirement and one of the few Lighthouse actually
     * audits.
     */
    render(<DealStory story={story} />)
    const headings = screen.getAllByRole('heading', { level: 3 }).map((h) => h.textContent)
    expect(headings).toEqual(['Acquired', 'Executed', 'Exited'])
  })
```

- [ ] **Step 2: Run it and watch it fail**

Run: `npx vitest run tests/unit/dealStory.test.tsx`

Expected: four failures. The three new ones fail on the property page's source, which
contains no `DealStory`. The level-3 one fails with
`Unable to find an accessible element with the role "heading"` — `getAllByRole` with a
level that matches nothing throws rather than returning an empty array, so read the message
rather than the assertion.

- [ ] **Step 3: Project the heading, or it reads as blank forever**

`settings` on the property page is the result of `SITE_SETTINGS_QUERY`, so a field that is
not in that projection arrives as `undefined` however well it is filled in the Studio — and
because `dealStoryHeading` is deliberately *optional*, **nothing would report it**. The
layout's guard only walks `REQUIRED_SITE_SETTINGS`, the release gate builds its projection
from the same array, and the section simply renders headingless. That is the three-edit trap
from Task 4 in its quieter form: two edits instead of three, and no failure at all rather
than a loud one.

So add it to `SITE_SETTINGS_QUERY` in `src/sanity/queries.ts`, after `navLabels { … }`:

```
    dealStoryHeading,
```

And assert it, because no guard will:

```ts
  it('projects the realized-results heading, which no guard would miss for you', () => {
    /*
     * `dealStoryHeading` is optional by design, so it is not in REQUIRED_SITE_SETTINGS —
     * which means the layout's throw and the release gate both ignore it. Left out of the
     * projection it is `undefined` on every property page no matter what the Studio holds,
     * and the only symptom is a heading that never appears. This assertion is the whole of
     * the protection.
     */
    expect(SITE_SETTINGS_QUERY).toContain('dealStoryHeading')
  })
```

Put it in `tests/unit/queries.test.ts`, beside
`selects both leaves of the header button, not just the object`, which exists for the same
reason about the same query.

- [ ] **Step 4: Render it on the property page**

In `src/app/(site)/portfolio/[slug]/page.tsx`, add the import beside the others:

```tsx
import { DealStory } from '@/components/property/DealStory'
```

And add after the `businessPlan` block, before `<OfferingBlock>`:

```tsx
          {/*
            The realized arc, which lived on /track-record until that route was deleted.
            That page was the only consumer of `dealStory` — this query already selected
            the field and this page never rendered it — so moving it here is what made
            deleting the route a route deletion rather than a content deletion. Spec §8.

            Gated on the deal being closed, and that gate is compliance rather than
            styling: these labels say "Realized", so showing them for a property that has
            not exited would describe an open position as a completed result, on the same
            page where OfferingBlock labels every figure as targeted. `dealStory` is
            checked too, or a sold property whose narrative is unwritten renders an empty
            three-column grid.

            Above OfferingBlock rather than below it because the two are mutually
            exclusive in practice — `publiclyOffered` and `status == 'sold'` do not
            co-occur — and this order reads chronologically if they ever did.
          */}
          {p.status === 'sold' && p.dealStory && (
            <>
              {/*
                The heading is CMS copy and the figures are not conditional on it. The
                field is optional, so an editor can clear it in one keystroke — and that
                is how these figures looked on /track-record, which carried no heading
                above them. Clearing the words must not take the multiple with them.
              */}
              {settings?.dealStoryHeading && (
                <h2 className="mt-8 text-lg font-bold tracking-tight text-ink">
                  {settings.dealStoryHeading}
                </h2>
              )}
              <DealStory story={p.dealStory} />
            </>
          )}
```

Also fix the docblock on the default export, which reads "The canonical URL for an asset,
whatever its status. /track-record links back here." — nothing links back here any more,
because this is now the only place a realized deal is described:

```tsx
/**
 * The canonical URL for an asset, whatever its status — and, since /track-record was
 * deleted, the only place a realized deal's figures appear. Non-negotiable #4.
 */
```

- [ ] **Step 5: Move `DealStory`'s labels down a level**

In `src/components/property/DealStory.tsx`, change the `<h4>` to `<h3>` and extend the
docblock:

```tsx
/**
 * The Acquired → Executed → Exited arc for a realized deal.
 *
 * Every figure here describes something that already happened, so the labels say
 * "Realized". Forward-looking words — targeted, projected, underwritten — belong on live
 * offerings and would misstate a closed result if used here.
 *
 * The stage labels are h3. They were h4 while this rendered on /track-record, inside a
 * card whose title was a link rather than a heading — so the level skipped from the page's
 * h1 and nothing minded. On /portfolio/[slug] it sits directly under an h2, and heading
 * order is one of the few accessibility rules Lighthouse actually audits.
 */
```

- [ ] **Step 6: Regenerate types, then run the tests and watch them pass**

```bash
npm run typegen
npx vitest run tests/unit/dealStory.test.tsx tests/unit/queries.test.ts && npm test
```

Expected: green apart from Task 1's footer assertion.

- [ ] **Step 7: Read the rendered page, on both a sold property and an unsold one**

The gate is the part worth verifying against real data, and both directions matter:

```bash
# kill any listener, then
rm -rf .next/cache/fetch-cache && npm run build && npm start &
curl -s http://localhost:3000/portfolio/burbank-manor-apartments | grep -c "Realized Equity Multiple"   # expect 1
curl -s http://localhost:3000/portfolio/burbank-manor-apartments | grep -o "1\.99x"                      # expect 1.99x
curl -s http://localhost:3000/portfolio/embassy-apartments | grep -o "1\.37x"                            # expect 1.37x
curl -s http://localhost:3000/portfolio/oak-forest-k | grep -c "Realized"                                # expect 0 — not sold
curl -s http://localhost:3000/portfolio/antioch-shopping-plaza | grep -c "Realized"                       # expect 0 — under contract
```

Antioch is the important negative: it is the one `publiclyOffered` property, it is
`under-contract` rather than sold, and it is the page where a "Realized" label next to
targeted figures would be a compliance problem rather than a layout one.

Then check the heading order on a sold property, which is the thing the level change was
for:

```bash
curl -s http://localhost:3000/portfolio/burbank-manor-apartments | grep -o "<h[1-4]" | sort | uniq -c
```

Expected: one `h1`, several `h2`, three `h3`, and **no `h4`**. An `h4` still present means
the component change did not land or something else on the page uses one.

- [ ] **Step 8: Commit**

```bash
git add "src/app/(site)/portfolio/[slug]/page.tsx" src/components/property/DealStory.tsx src/sanity/queries.ts src/sanity/types.generated.ts tests/unit/dealStory.test.tsx tests/unit/queries.test.ts
git commit -m "Render the realized deal story on the property page, gated on sold"
```

Body: this is the precondition for deleting `/track-record` — that route was the only
consumer of `dealStory`, so without this the 1.99x and 1.37x multiples would leave the site
with the page. Quote the curl output for both sold properties and for Antioch. Note the h4
to h3 change and why.

---

# Task 10: Delete `/track-record`

**The least reversible thing in this PR**, and the mitigations are already in place:
`DealStory` moved in Task 9, so no content is lost, and the `trackRecordPage` **document
stays in the dataset**, so restoring the page is a revert rather than a rewrite.

**No redirect**, on Hunter's call: nothing links to the site externally yet. The route
leaves `sitemap.ts` in the same change, so the 404 is never advertised. If an inbound link
ever turns up, a redirect is a two-line addition to `next.config.ts`.

**No migration.** The document is not deleted — "an unread document costs nothing and is
the cheapest possible rollback" (§5). So this task removes nothing from production, and the
dangerous direction of `docs/deploys-and-migrations.md` is never entered.

**Files:** thirty, which is why this is its own task. `grep` first, then work the list:

```bash
grep -rln "track-record" src/ tests/ && grep -rln "trackRecord\|TRACK_RECORD" src/ tests/ scripts/ sanity.config.ts
```

| file | change |
|---|---|
| `src/app/(site)/track-record/page.tsx` | **delete** |
| `src/sanity/queries.ts` | delete `SOLD_PROPERTIES_QUERY` and `TRACK_RECORD_PAGE_QUERY` |
| `src/sanity/schema/pages.ts` | delete `trackRecordPage` |
| `src/sanity/schema/index.ts` | drop it from the import, `schemaTypes`, `SINGLETON_TYPES` |
| `sanity.config.ts` | drop the `['trackRecordPage', 'Track record page']` list item |
| `src/lib/heroPages.ts` | drop `'/track-record'` from `HERO_PATHS`; fix the count in the docblock |
| `src/app/sitemap.ts` | drop the URL; fix the docblock, which explains the route |
| `src/components/layout/SiteFooter.tsx` | `Track Record` → `Strategy`, `/track-record` → `/strategy` |
| `src/lib/seo.ts` · `src/lib/rateLimit.ts` · `src/components/ui/SectionHeading.tsx` · `src/components/property/PropertyCard.tsx` · `src/components/property/OfferingBlock.tsx` · `src/sanity/schema/property.ts` | doc comments naming the route |
| `src/sanity/types.generated.ts` | regenerated, not hand-edited |
| `scripts/content/em8-content.mjs` | drop `PAGE_COPY.trackRecordPage` and `PAGE_SEO.trackRecordPage` |
| `scripts/migrate-content.mjs` | drop it from `backfillPageHeadings`'s `ids` |
| `tests/e2e/site.spec.ts` | delete the track-record test; two route lists |
| `tests/integration/content-integrity.test.ts` | four places |
| `tests/unit/footer.test.tsx` | the label list |
| `tests/unit/pageCopy.test.tsx` | three lists plus the pinned heading |
| `tests/unit/pageSeo.test.ts` | the key list |
| `tests/unit/ctaCoverage.test.ts` | the route list and a comment |
| `tests/unit/seo.test.ts` | the route list |
| `tests/unit/overlayHeader.test.tsx` · `tests/unit/pageHero.test.tsx` | the path lists |
| `tests/unit/queries.test.ts` | delete the `SOLD_PROPERTIES_QUERY` test |
| `tests/unit/headings.test.tsx` · `tests/unit/propertyCard.test.tsx` · `tests/unit/offeringBlock.test.tsx` · `tests/unit/portfolioVisibility.test.ts` | comments |
| `README.md` | non-negotiable #4 names the route; the `--only` step list |

**Interfaces:**
- Consumes: Task 9's `DealStory` on the property page — this task must not start before that commit exists.
- Produces: nothing. `HERO_PATHS` returns to seven entries, the build returns to 29 pages, and `navigation.test.ts`'s last deliberate failure closes when the footer gains `/strategy`.

- [ ] **Step 1: Write the failing test**

Add to `tests/unit/navigation.test.ts` — the footer assertion from Task 1 is about to pass,
and this is the assertion that keeps the route gone:

```ts
  it('no longer offers a route that was deleted', () => {
    /*
     * Hunter's instruction, 2026-09-08: remove Case Studies from the header and put those
     * properties in the portfolio. Two-thirds of it was already shipped — both realized
     * deals are in the /portfolio grid with a Sold chip, because ALL_PROPERTIES_QUERY
     * filters on showInPortfolio rather than on status — so this was only ever a removal.
     *
     * Asserted here rather than left to a 404: a nav or footer entry pointing at a route
     * that does not exist is a link a crawler follows and a reader taps, and nothing else
     * in the suite looks at both lists at once.
     */
    for (const href of navDestinations()) {
      expect(href).not.toContain('track-record')
    }
    const footer = stripComments(
      readFileSync(
        resolve(import.meta.dirname, '../../src/components/layout/SiteFooter.tsx'),
        'utf8',
      ),
    ).replace(/\r\n/g, '\n')
    expect(footer).not.toContain('track-record')
  })
```

In `tests/unit/footer.test.tsx`, change the label list from
`['Portfolio', 'Track Record', 'Insights', 'Partners', 'About', 'Investors']` to
`['Portfolio', 'Strategy', 'Insights', 'Partners', 'About', 'Investors']`.

- [ ] **Step 2: Run it and watch it fail**

Run: `npx vitest run tests/unit/navigation.test.ts tests/unit/footer.test.tsx`

Expected: the new test fails on the footer still containing `track-record`;
`footer.test.tsx` fails on `Strategy` not being found. Task 1's
`keeps every destination in the footer` still fails on `/strategy`, which the next step
fixes — three failures, all pointing at the same one-line change.

- [ ] **Step 3: Swap the footer entry**

In `src/components/layout/SiteFooter.tsx`:

```tsx
const NAV = [
  { href: '/portfolio', label: 'Portfolio' },
  { href: '/strategy', label: 'Strategy' },
  { href: '/insights', label: 'Insights' },
  { href: '/partners', label: 'Partners' },
  { href: '/about', label: 'About' },
  { href: '/investors', label: 'Investors' },
]
```

Add to the docblock why this list is hand-maintained beside `navigation.ts` rather than
derived from it:

```
 * These labels are literals where the header's come from Sanity, and that is not an
 * oversight: this list is the fallback route to every page — spec §5, "The panel must not
 * be the only route to a page. Every destination stays in the footer, which is where a
 * reader with JavaScript disabled and a crawler both find them." A fallback that reads its
 * labels from the same document as the thing it backs up is not a fallback. It also
 * carries /investors, which is not in the nav tree at all.
 *
 * `navigation.test.ts` is what keeps the two in step: it asserts that every nav
 * destination appears here, so a node added to the tree fails until this list has it.
```

- [ ] **Step 4: Run the three tests and watch them pass**

Run: `npx vitest run tests/unit/navigation.test.ts tests/unit/footer.test.tsx`

Expected: **all green, including Task 1's footer assertion** — the last of the two
deliberate failures that PR has been carrying since its first commit. Say so in the commit
body; a reader tracking those two needs to see them close.

- [ ] **Step 5: Delete the route and its queries**

```bash
git rm "src/app/(site)/track-record/page.tsx"
```

In `src/sanity/queries.ts`, delete `SOLD_PROPERTIES_QUERY` with its docblock and
`TRACK_RECORD_PAGE_QUERY`. Both had exactly one consumer, the page just deleted — confirm
that rather than assuming it:

```bash
grep -rn "SOLD_PROPERTIES_QUERY\|TRACK_RECORD_PAGE_QUERY" src/ tests/
```

Expected after the deletions: only `tests/unit/queries.test.ts`, whose
`track record does not create a second set of property URLs` test goes with them. Delete
that test — the claim it protected has moved to `propertyCard.test.tsx`, which asserts a
sold property still links to `/portfolio/[slug]`, and to `navigation.test.ts`'s
`mints no URL of its own for a property`. Say that in the deletion's commit rather than
leaving a gap where a test used to be.

- [ ] **Step 6: Delete the schema type and its registrations**

In `src/sanity/schema/pages.ts`, delete the `trackRecordPage` `defineType`. In
`src/sanity/schema/index.ts`, drop it from the `./pages` import, from `schemaTypes` and
from `SINGLETON_TYPES`. In `sanity.config.ts`, drop its list item.

Note what this does and does not do. It removes the *editing surface*: after the Studio is
redeployed from merged code, "Track record page" is gone from the Content list. It does not
remove the *document*, which stays in production unread — §5: "Delete the document
afterwards, or leave it: an unread document costs nothing and is the cheapest possible
rollback." So a revert of this PR restores the type, the query and the route, and finds its
document exactly where it was.

- [ ] **Step 7: Remove it from the route lists and the seeds**

- `src/lib/heroPages.ts`: drop `'/track-record'`. The docblock says "all seven section
  pages" — with `/strategy` added in Task 7 and this removed, it is seven again, so that
  sentence is correct once more. Make sure the count you left in Task 7 is undone.
- `src/app/sitemap.ts`: drop the URL. Its docblock explains that "/track-record is a view
  over sold properties and mints no URLs of its own" — rewrite it, keeping the claim that
  matters: every property appears once, at `/portfolio/[slug]`.
- `scripts/content/em8-content.mjs`: delete `PAGE_COPY.trackRecordPage` and
  `PAGE_SEO.trackRecordPage`. The docblock above `PAGE_COPY`'s last three entries names
  `/track-record` among the pages whose headings moved out of TSX — reword rather than
  delete the paragraph; it explains the straight-versus-typographic apostrophes that are
  still pinned for the other two.
- `scripts/migrate-content.mjs`: drop `'trackRecordPage'` from `backfillPageHeadings`'s
  `ids` array and from its docblock, which names the three pages. Add `'strategyPage'` in
  its place — that page now carries a heading the same way, and leaving it out means a
  future `--only=headings` cannot repair it.
- `README.md`: non-negotiable #4 ends "`/track-record` is a view over sold properties and
  mints no URLs of its own." Replace that sentence — the rule survives and its example
  does not:

  > **One canonical URL per property:** `/portfolio/[slug]`, whatever the status. A sold
  > asset carries a **Sold** chip in the same grid rather than living at a second address;
  > `/track-record` was a view over `status == "sold"` and was deleted on 2026-09-08, with
  > its realized deal story moved onto the property page.

- [ ] **Step 8: Remove it from the tests**

Work the grep list. Nine files hold a route or id list and four hold only a comment.

The one that is more than a list edit is `tests/unit/pageCopy.test.tsx`: delete the
`expect(headings.trackRecordPage.heading).toEqual({...})` block from
`reproduces the three moved headings exactly as they shipped`, and rename that test to two.
Keep the other two assertions and the paragraph about the apostrophes — that reasoning is
still load-bearing for `/portfolio` and `/insights`.

In `tests/integration/content-integrity.test.ts`, four places: `CONTENT_TYPES`, `PAGE_IDS`,
the `ids` array in the heading test, and that test's name — now three pages again
(`portfolioPage`, `insightsPage`, `strategyPage`).

In `tests/e2e/site.spec.ts`, delete the whole
`track record links back to canonical property URLs, not its own` test. Its second
assertion — no property is addressable under `/track-record/` — is worth keeping in spirit,
and it now has a better home:

```ts
/*
 * The deleted route stays deleted, and nothing points at it.
 *
 * Replaces `track record links back to canonical property URLs, not its own`, whose page
 * no longer exists. The assertion worth keeping was its second one — that no property is
 * addressable under a second path — and this is that claim in the form it can still take.
 */
test('the deleted track-record route is gone and unadvertised', async ({ page }) => {
  const res = await page.goto('/track-record')
  expect(res?.status(), '/track-record should not resolve').toBe(404)

  await page.goto('/')
  await expect(page.locator('a[href*="track-record"]')).toHaveCount(0)

  const sitemap = await page.goto('/sitemap.xml')
  expect(await sitemap!.text()).not.toContain('track-record')
})
```

- [ ] **Step 9: Regenerate types and run everything**

```bash
npm run typegen
npm test && npx tsc --noEmit && npm run lint && npm run test:content
rm -rf .next/cache/fetch-cache && npm run build
```

Expected: **the whole unit suite green, with no deliberate failures left.** `tsc` silent.
Lint clean. Content gate 13. Build **29 pages** — back to the baseline, having been 30
after Task 7, which is the arithmetic of one route added and one removed.

Then confirm nothing references the route anywhere:

```bash
grep -rn "track-record\|trackRecord\|TRACK_RECORD" src/ tests/ scripts/ sanity.config.ts README.md
```

Expected: matches only in prose that describes the deletion as history — `README.md`'s
non-negotiable #4, `heroPages.ts` or `sitemap.ts` if you kept a sentence there, and this
plan. **A match in a query, a list, a route or a component is a miss**, and it is the
outcome the 25-versus-8 discrepancy at the top of this plan exists to prevent.

- [ ] **Step 10: E2E, and read the deployed-shaped pages**

```bash
# kill the listener, then
npm start & npx playwright test
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000/track-record   # expect 404
curl -s http://localhost:3000/ | grep -c "track-record"                        # expect 0
curl -s http://localhost:3000/sitemap.xml | grep -c "track-record"             # expect 0
curl -s http://localhost:3000/about | grep -o "Strategy" | head -1             # footer + nav
```

Expected: Playwright **24** — 22 at baseline, plus the two nav tests from Task 6, plus the
deleted-route test from this task, minus the track-record test it replaces.

- [ ] **Step 11: Commit**

```bash
git add -A
git commit -m "Delete /track-record, its queries, its schema type and its document seeds"
```

Body: the route is gone with no redirect, on Hunter's call that nothing links in yet, and
it left the sitemap in the same change so the 404 is never advertised. State the two
mitigations plainly: `DealStory` moved first, so no content was lost, and the
`trackRecordPage` **document stays in the dataset**, so restoring the page is a revert
rather than a rewrite. Note that the file count was **30, not the 8 §5's table lists**.
Record that both of Task 1's deliberate failures are now closed and the build is back to 29
pages.

---

# Task 11: Close the PR

- [ ] **Step 1: Run everything, from a clean cache**

```bash
npm test && npx tsc --noEmit && npm run lint && npm run test:content
rm -rf .next/cache/fetch-cache && npm run build
```

Expected: unit suite green with the ~30 new tests; `tsc` silent; lint clean; content gate
13; build **29 pages**.

Record the unit count. The baseline was 468; this PR adds `navigation.test.ts`,
`navDropdown.test.tsx`, `strategyPage.test.tsx` and `aboutSections.test.tsx` plus additions
to eight existing files, and removes three. Whatever the number is, it goes in the PR
description and into the handover — "468" is what the next session will otherwise re-derive
by hand.

- [ ] **Step 2: E2E against a local production build**

```bash
netstat -ano | grep :3000
MSYS_NO_PATHCONV=1 taskkill /PID <pid> /F
npm run build && npm start &
npx playwright test
```

Expected: **24 passed.** `npm start` does not replace a server already on port 3000 — the
old process keeps serving the previous build, which silently makes every assertion here a
lie about a build that is no longer running.

- [ ] **Step 3: The phone measurement, which is the acceptance evidence**

Spec §11: every PR is accepted on a 390x844 DPR-3 measurement, not a desktop one.

```bash
export MSYS_NO_PATHCONV=1
for r in / /about /strategy /portfolio /portfolio/burbank-manor-apartments; do node phone.mjs "$r"; done
node header-height.mjs
node worst-case-labels.mjs
```

Fill in the table for the PR description, against the baseline at the top of this plan:

| | baseline | this PR |
|---|---|---|
| phone header height, 390px | 68px | |
| phone header height, 320px | 68px | |
| items visible without a tap | 2 | |
| nav rows, 390px / 768px | — | |
| `/about` eyebrow clearance, 320px | 28px | |
| `/about` clearance at the 12-char cap, 320px | — | |
| `/` page length | 8.23 screens | |
| `/about` page length | 7.45 screens | |
| `/strategy` page length | — (no route) | |
| build | 29 pages | |
| Playwright | 22 | |

The header is expected to *cost* a little scroll — §5 estimates about 32px a page against
the ~3,000px §6 will remove — so a small increase in the screen counts is the expected
outcome and not a regression. Report it either way; PR 3's target is a number, and it is
measured from wherever this PR leaves things.

- [ ] **Step 4: Screenshot the phone, before and after**

The five `phone-*.png` files from Step 3, beside the baseline pair captured before any of
this. The header is the change Etamar asked for, so the screenshot is the deliverable
rather than an attachment.

Check each one for what no assertion covers:
- The four nav labels are legible at 11px and do not run into each other.
- `/strategy` with an empty body reads as a deliberate page rather than a truncated one.
- The About Us panel, tapped open, sits over content rather than pushing the hero down
  unpleasantly.
- The `▾` beside Strategy is big enough to hit. **It is 8px inside a `p-1` button, so the
  hit area is about 24px** — at the WCAG 2.2 minimum, and worth measuring rather than
  eyeballing, because Lighthouse already fails `target-size` on the 10px carousel dots and
  a second failure there would be new rather than pre-existing.

- [ ] **Step 5: Lighthouse, to confirm the one thing that could regress**

```bash
npm run lighthouse || node scripts/lighthouse-report.mjs
```

`npm run lighthouse` dies on Windows *after* it finishes — `chrome-launcher` throws `EPERM`
removing its temp directory, and `lh.json` is already written by then, so run the reporter
against it rather than concluding the audit failed.

Expected: accessibility **96**, the same as the baseline, failing only `target-size` on the
10px carousel dots — pre-existing and present on the live site. **If accessibility moves,
read which audit changed**: this PR adds a heading level, two disclosure buttons and a
`hidden` panel, so `heading-order`, `aria-*` and `target-size` are the three that could
plausibly move, and a drop is a real finding rather than noise. Do not chase the
performance score — seven runs of one commit returned 87, 87, 87, 97, 98, 87, 87, so it
takes five samples before a delta means anything.

- [ ] **Step 6: Request a code review**

**REQUIRED SUB-SKILL:** `superpowers:requesting-code-review`, before anything merges.
Hunter's standing instruction and this plan's premise.

Give the reviewer these five, because they are where this PR is most likely to be wrong and
least likely to fail a test:

1. **Nine versus ten nav labels**, and whether leaving Investor Login a literal is right.
   The plan's reasoning is that nine is the reversible choice; Hunter has been asked.
2. **The `Strategy` deviation from §5.** The spec wants one element that is both a link and
   a parent; this ships a link plus an adjacent disclosure button, because the literal
   reading strands `/partners` behind the footer on a phone. Is the extra control worth it?
3. **Removing the hamburger entirely** rather than keeping it for the panels. Nothing is
   left for it to hold, but it is a control users may reach for.
4. **`HEADER_RESERVATION` as a shared class string.** Tailwind finds class tokens in a
   `.ts` literal, so this works — but it is a pattern this repo has not used before, and a
   reviewer should say whether it earns its place against two files agreeing by comment.
5. **Whether `whyEm8` should have been required.** It is the only optional block on any
   page document, and the gate that hides its nav entry is the complexity that buys it.

- [ ] **Step 7: Open the PR**

Title: `Make the phone nav visible, add /strategy, and delete /track-record`

The description must carry:

- **The phone table from Step 3**, before and after, and the two screenshots. This is the
  acceptance evidence, not a nicety.
- **The header measurement at the 12-character cap**, and whether the cap stayed at 12 or
  came down to 10. §5 proposed 12 "and confirm by measurement"; say which happened.
- **The three-edit note**: nine required leaves, each needing the schema, the array and the
  query, and the 29-page failure reproduced deliberately in Task 4 Step 6 to prove the
  guard fires.
- **The migration record**: two additions, applied to production *before* the code that
  requires them, with the dry-run output, the dataset query confirming all nine labels and
  the `strategyPage` document, `drafts: []`, and the confirmation that the live site was
  unchanged afterwards. This is the first migration since 2026-08-31 and the description is
  where that gets shown rather than asserted.
- **The `/track-record` deletion**: 30 files, not the 8 §5's table lists; no redirect, on
  Hunter's call; `DealStory` moved first so no content was lost; the document left in the
  dataset so a revert restores the page.
- **The two spec corrections** — nine labels rather than ten, and the `Strategy` control —
  each with its reasoning, flagged as decisions for Hunter rather than as details.
- **What ships empty and who owns it**: `strategyPage.body` and `aboutPage.whyEm8`, both
  from §3's "Owed by people", plus the four `teamMember.role` edits and the Oak Forest
  partnership copy that are Studio work and unblocked by this PR.

- [ ] **Step 8: CI, then merge**

```bash
export PATH="/c/Program Files/GitHub CLI:$PATH"
gh pr checks <n>
```

`gh pr checks --watch` exits early — it settles on whichever checks exist when it starts,
and the `build` job registers later, so it can exit `0` while `build` is still pending.
**Poll until no row reads `pending`.** Two workflows run and both must pass. A `build`
failure with `ECONNRESET` from the Sanity API is a known flake: `gh run rerun <id> --failed`
rather than debugging it.

Then squash-merge, which is this repo's convention:

```bash
gh pr merge <n> --squash
gh pr view <n> --json state,mergeCommit
```

`gh pr merge` fails locally with `fatal: 'main' is already used by worktree`. **The merge
still succeeds on GitHub** — confirm with the `view` call rather than concluding it failed.

---

# Deploy — because merging ships nothing

Railway auto-deploy is **off**. Every step below is required, in this order, and the last
two are the ones this project has learned to distrust.

- [ ] **Step 1: Confirm what `main` now is**

```bash
git fetch origin && git log --oneline -1 origin/main
```

Read it. Do not copy a SHA forward from anywhere, including this plan.

- [ ] **Step 2: Redeploy the Studio, from merged code**

```bash
git checkout main 2>/dev/null || git checkout -B main-sync origin/main
bash scripts/deploy-studio.sh
```

Required, and this PR is the reason the rule exists: `navLabels`, `strategyPage` and
`aboutPage.whyEm8` are new fields, and until the Studio is redeployed no editor can see any
of them — including the nine labels this PR just made required. Confirm
`SANITY_STUDIO_PROJECT_ID` appears in the script's inlined-variables list; without it the
hosted Studio builds and deploys fine and then dies in the browser with "Configuration must
contain `projectId`".

**From merged code, not from the branch.** A Studio deployed from a feature branch once
showed the CTA field on Site settings while the live code still read it from Home page —
nothing broken, and an editing surface that lied about the site.

- [ ] **Step 3: Trigger the deploy**

```bash
node --env-file=/c/Users/Kathy/Claude/em8-website/.env.local -e '
const q = `mutation { serviceInstanceDeploy(serviceId: "5d00810f-87c2-4254-963e-b654812d53fd", environmentId: "4260bc70-c3ea-448f-ad04-6541f3acc773", latestCommit: true) }`
const r = await fetch("https://backboard.railway.com/graphql/v2", {
  method: "POST",
  headers: { "Content-Type": "application/json", "Project-Access-Token": process.env.RAILWAY_API_TOKEN },
  body: JSON.stringify({ query: q }),
})
console.log(JSON.stringify(await r.json()))
'
```

`RAILWAY_API_TOKEN` lives in the **repo root's** `.env.local`, not the worktree's — the two
files differ, and this is the variable that is only in one of them. The header is
`Project-Access-Token`, not `Authorization: Bearer`.

- [ ] **Step 4: Poll for a deployment whose commit hash is yours**

```bash
node --env-file=/c/Users/Kathy/Claude/em8-website/.env.local -e '
const q = `query { deployments(first: 5, input: { projectId: "4225ede5-e320-4a62-8ccb-42a437d708a3", environmentId: "4260bc70-c3ea-448f-ad04-6541f3acc773", serviceId: "5d00810f-87c2-4254-963e-b654812d53fd" }) { edges { node { status createdAt meta } } } }`
const r = await fetch("https://backboard.railway.com/graphql/v2", {
  method: "POST",
  headers: { "Content-Type": "application/json", "Project-Access-Token": process.env.RAILWAY_API_TOKEN },
  body: JSON.stringify({ query: q }),
})
const j = await r.json()
for (const e of j.data.deployments.edges) {
  console.log(e.node.status, e.node.createdAt, String(e.node.meta?.commitHash ?? "").slice(0, 7))
}
'
```

**`SUCCESS` is not evidence.** The status query
returns the most recent deployment, which may be the *previous* one, so a poll started too
early reports the last success and looks like the new one. Poll until a row shows
`SUCCESS` **and** a `meta.commitHash` matching the squash commit from Step 1.

- [ ] **Step 5: Read the deployed site**

Every real defect in this project has been invisible to the build, the tests, lint and
Lighthouse, and showed up only by fetching the deployed page. So fetch it:

```bash
LIVE=https://em-8-properties-website-production.up.railway.app
curl -s $LIVE/ | grep -o "Investor Login" | head -1                    # the header rendered
curl -s $LIVE/ | grep -o 'id="site-nav"' | head -1                     # the nav is in the markup
curl -s $LIVE/ | grep -o 'nav-panel-aboutUs' | head -1                 # the panels are there
curl -s $LIVE/ | grep -c "track-record"                                 # expect 0
curl -s -o /dev/null -w "%{http_code}\n" $LIVE/track-record             # expect 404
curl -s -o /dev/null -w "%{http_code}\n" $LIVE/strategy                 # expect 200
curl -s $LIVE/strategy | grep -o "<h1[^>]*>[^<]*" | head -1             # its title from the CMS
curl -s $LIVE/portfolio/burbank-manor-apartments | grep -o "1\.99x"      # the multiple survived
curl -s $LIVE/about | grep -c 'id="team"'                               # expect 1
curl -s $LIVE/about | grep -c 'href="/about#why-em8"'                    # expect 0 — gated off
curl -s $LIVE/sitemap.xml | grep -o "[^<]*strategy[^<]*"                 # in, and track-record out
```

Then measure the deployed page on a phone, because the whole point of this PR is what a
phone shows:

```bash
E2E_BASE_URL=$LIVE npx playwright test
MSYS_NO_PATHCONV=1 node phone.mjs / "$LIVE"
MSYS_NO_PATHCONV=1 node phone.mjs /strategy "$LIVE"
```

`phone.mjs` takes the origin as its second argument for exactly this — the deployed
measurement is the one that counts, and comparing a `localhost` number against a deployed
one is a mistake this project has already had to retract once.

The `1.99x` check is the one to run first. If it is absent, the deal story did not survive
the route deletion, and that is the failure this PR's whole ordering was designed to
prevent.

- [ ] **Step 6: Open the Studio and look**

`https://em-8-properties.sanity.studio`. Not optional, and not covered by anything above:
the 2026-09-03 fault was placeholder text sitting over two live testimonials, visible only
here, with every automated check green for three days.

Confirm:
- **Site settings** shows **Navigation labels** with nine filled fields.
- **Strategy page** is in the Content list, with its heading filled and its Why Midwest
  body empty.
- **Track record page** is **gone** from the list.
- **About page** shows a collapsed, empty **Why EM8 section**.
- Nothing shows a "Missing keys" banner, and no document shows draft scaffolding over real
  content.

- [ ] **Step 7: Write the handover**

`docs/handover-2026-09-08.md`, superseding `docs/handover-2026-09-03.md`, committed —
untracked handovers went stale in place and were then handed to a fresh session as current,
which is what the 2026-09-03 file exists to stop.

It must carry: the merged SHA and the deployed SHA, both read rather than copied; the
verified-green counts from Step 1 of Task 11; the phone table; what PR 2b changed and what
is still owed from spec §10 — **PR 3** (homepage compression and Current Offerings, which
contains the `homePage.offeringsHeading` **field move**, the only migration shape that has
taken this site down) and **PR 4** (typography and hero resolution); the content still owed
by people from §3, with the four `teamMember.role` edits named; and the two spec
corrections this PR made, so the next reader does not re-derive them.

Add to `README.md`'s trap list anything found in execution that cost time — that file is
where these go, and every entry in it was paid for once already.
