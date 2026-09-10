# Homepage Compression and Current Offerings on `/portfolio` — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Take the homepage from 8.23 phone screens toward spec §6's 4.5, by removing three bands and absorbing a fourth — and give Current Offerings its own section on `/portfolio`, moving its heading from `homePage` to `portfolioPage` without repeating the 2026-08-31 outage.

**Architecture:** This is PR 3 from spec §10. It is one PR because its two halves are the same change seen from both ends: the homepage cannot drop the offerings band until `/portfolio` renders one, and the heading cannot move until both sides exist. The dataset work is split into an **addition** (safe ahead of code, Task 3) and an **unset** (cleanup, strictly after the deploy is verified, Task 11) — those are two migration steps in this plan, not one, and that is the single most important structural decision in it. `moveCtaBandToSettings` conflates the two and is therefore the wrong model to copy.

**Tech Stack:** Next.js 16 (App Router, RSC), TypeScript strict, Tailwind v4 (`@theme`), Sanity v6, Vitest, Playwright, ESLint flat config.

**Spec:** `docs/superpowers/specs/2026-09-08-em8-feedback-design.md` — §6 (the whole of it), §11 (accepted on a phone), §12 (why Current Offerings is a section and not a badge), §13 (the field-MOVE risk).

**Migration authority:** `docs/deploys-and-migrations.md`. This PR contains the **only field MOVE in the workstream**, and that document exists because the last one took the live homepage's call to action down. The add / ship / verify / unset order in §6 is not optional and is enforced here by making the unset a separate, separately-invoked step that this plan does not run until Task 11.

---

## Global Constraints

Copied from `README.md` "Non-negotiables" and the spec. Every task's requirements implicitly include these.

- **Small teal text is `#2C7A74`, never `#4ABDB5`.** Teal-filled buttons carry **ink** text, not white. `tests/unit/chipContrast.test.ts` pins this.
- **CSS logical properties only.** `ms-`/`me-`/`ps-`/`pe-`/`text-start`. Never `ml-`/`mr-`/`text-left`. ESLint enforces this across all of `src/`, including class strings built in variables.
- **No colour literal under `src/`** — no hex, no `rgba(`, three exemptions (`src/lib/tokens.ts`, `src/lib/chipColors.ts`, `src/app/global-error.tsx`). The rule also fires on strings like `"Unit #204"`; the remedy is a one-line `eslint-disable`, not a pattern change.
- **`text-white` is invisible to that lint rule**, and spec §9 lists seven `text-white`-on-a-moving-token pairings the dark re-theme must fix. **Do not add an eighth.** The stats moving onto the hero land on a photograph, so they will want white — see Task 7, which routes them through the same `onPhoto` treatment `Eyebrow` already has rather than inventing a new pairing.
- **Never phrase returns as promises.** Permitted: *targeted, projected, underwritten, estimated, pro forma*. Banned: *guaranteed, will return, assured, risk-free*. Scanned in source and in every CMS document. The five hero stats include `1.79x Realized Equity Multiple` and `36.2% Average Annual Return on Equity`; moving them onto the hero does not change their wording and must not.
- **No placeholder figures ship.** The denylist is `tests/shared/placeholders.ts`.
- **Queries use `defineQuery` with fields inlined.** Typegen cannot resolve interpolated fragments; written otherwise it silently reports "0 queries".
- **An OPTIONAL leaf still needs projecting, and nothing will tell you.** `portfolioPage.offeringsHeading` is optional by design (the section renders nothing when empty), so neither the layout's throw nor the release gate will notice it missing from `PORTFOLIO_PAGE_QUERY`. `siteSettings.dealStoryHeading` is the worked example and one assertion in `tests/unit/queries.test.ts` is the whole of its protection. **Task 5 adds the matching assertion.**
- **`npm run typegen` after every schema change**; it must not report "0 queries". `bash scripts/deploy-studio.sh` after every schema change, **from merged code**.
- **Do not run `npx prettier`** — no config, and it rewrites files to double quotes and semicolons. `eslint.config.mjs` uses double quotes and semicolons; the `.ts`/`.tsx` sources use single quotes and no semicolons. Match the file you are in.
- **Do not use Next's generated global types** (`LayoutProps`, `PageProps`) — they exist only after a build and fail `tsc --noEmit` on a clean checkout.
- **`AGENTS.md` is explicit:** read the relevant guide in `node_modules/next/dist/docs/01-app` before writing App Router code.
- Accepted on a **390x844 DPR-3 phone** measurement, with desktop as the regression check (spec §11).

---

## Baseline, measured 2026-09-09 against the deployed site at `e4fbfd1`

`origin/main` is `e4fbfd1`; the Railway deployment is `e4fbfd1`, `SUCCESS`, confirmed by
**commit hash** from the API rather than by the word. Captured before anything changed,
because §6 is a scroll-reduction target and it cannot be proved after the fact.

| | 390x844 DPR-3 |
|---|---|
| `/` page length | **8.23 screens** (6946px) |
| `/about` | 7.51 screens (6336px) |
| `/portfolio` | 5.38 screens (4537px) |
| `/strategy` | 1.84 screens (1552px) |
| `h1` font size | 30px |
| phone header height | 88.5px at 390px · 113px at 320/360/375 |

**The homepage band inventory — the number this PR is built on.** Measured on the deployed
page at 390x844, every direct child of `<main>`:

| | band | height | fate under §6 |
|---|---|---|---|
| 1 | hero (`min-h-svh`, overlay 470px) | **844px** | kept, absorbs the stats |
| 2 | stat band | **278px** | absorbed into the hero |
| 3 | How We Operate (four factors) | 685px | kept |
| 4 | Insights teaser (3 cards) | **1088px** | **removed** |
| 5 | Assets across the Chicago MSA (3 cards) | 1130px | kept |
| 6 | What our partners say (3 testimonials) | 829px | kept |
| 7 | Currently accepting commitments (1 card) | **529px** | **moves to `/portfolio`** |
| 8 | Partners teaser | **434px** | **removed** |
| 9 | Keep in touch (CTA) | 631px | kept |
| | footer | 498px | kept |
| | **total** | **6946px = 8.23 screens** | |

Every `Band` carries `py-14` — 112px of the height above is padding, per band — so removing
a band is worth its content *plus* 112px.

**The arithmetic §6 asks for.** Removing bands 4, 7 and 8 is −2051px. Absorbing band 2 into
the hero is −278px **if and only if the stats fit in the hero's existing slack**, which is
the measurement §6 says to take rather than assume:

> the hero box is 844px and its overlay is 470px, so there are **374px of slack** above the
> bottom-aligned copy. Five stats need roughly 250px. They fit, with ~124px to spare, and
> the hero does **not** grow.

So stats-on-hero saves scroll here rather than costing it. **§6's worry does not survive the
measurement — but it is only settled at 390x844.** Task 7 re-takes it at 320/360/375 and on
a short phone (375x667, where `min-h-svh` is 667px and the slack is 197px, not 374px), and
the fallback is exactly what §6 says: keep the stat band where it is.

Projected landing: 6946 − 2051 − 278 = **4617px = 5.47 screens.** That is §6's own "near
5.4", and it is **short of the 4.5 target** — see the next section, which is where this plan
disagrees with the spec.

Eyebrow clearance below the overlaid header, deployed, webfonts loaded:

| width | `/` | `/about` | `/portfolio` | header |
|---|---|---|---|---|
| 320px | +245.5px | +79px | +79px | 113px |
| 360px | +349.8px | +79px | +79px | 113px |
| 375px | +349.8px | +79px | +79px | 113px |
| 390px | +430px | +55.5px | +106.3px | 88.5px |

The homepage has 245–430px of clearance; `/about` is the tight page and this PR does not
touch it. **PR 4 is what spends this budget, not PR 3.**

**Dataset facts, confirmed by query rather than by prose.** `homePage.offeringsHeading` is
`{eyebrow: "Open Now", title: "Currently accepting commitments", intro: "Offered to
verified accredited investors. Accreditation is confirmed in the portal, not here."}`.
`portfolioPage.offeringsHeading` **does not exist** — the add in Task 3 is real work, not a
no-op. Five `heroStat` documents with real figures. One `publiclyOffered` property (Antioch
Shopping Plaza, `showInPortfolio: false`, `status: under-contract`). Two `status: 'sold'`
(Burbank Manor, Embassy). 11 properties, 10 in the grid. **No drafts in the dataset.**

**Verified green at `e4fbfd1` on this worktree, re-run rather than trusted:** `npm test`
**534** · `npx tsc --noEmit` · `npm run lint` · `npm run test:content` **13** ·
`npm run build` **29 pages**.

---

## Four things the spec gets wrong or leaves open

Recorded because the plan has to resolve them, and because the last three sessions each lost
time to a spec number that had gone stale.

**1. §6's closing lever has already shipped, so the 4.5 target has no lever left behind it.**
§6 says the gap from ~5.4 to 4.5 is closed by "capping the homepage grid at three cards with
a *View all* link". `src/app/(site)/page.tsx` already renders `properties.slice(0, 3)` and
already renders `copy.portfolioCta` as a `View All →` button beneath it. The lever is spent.
The measured page confirms it: the portfolio band holds three cards, not ten.

So **5.47 screens is the honest landing for the changes §6 actually authorizes**, and
reaching 4.5 requires cutting something §6 does not name. The measured menu, so the choice
is made against numbers:

| lever | saves | what it costs |
|---|---|---|
| Testimonials 3 → 1 | ~400px (0.47 screens) | two of three social proofs, on the page where they work hardest |
| Portfolio grid 3 → 2 cards | ~330px (0.39 screens) | a third of the homepage's asset showcase |
| Four factors into a 2×2 grid on phone | ~300px (0.36 screens) | denser type at 390px; a design change |
| `Band` `py-14` → `py-10` on five bands | ~160px (0.19 screens) | global rhythm change, touches every page |

**No two of these reach 4.5 either** — 5.47 minus the best two is 4.6. Reaching 4.5 needs
three of the four. **This plan does not choose.** It lands 5.47, reports it with the table
above, and puts the choice to Hunter as a follow-on, because every row spends content or a
design decision that is his and not a developer's. Task 8 is where the number is reported.

**2. §6 predicts stats-on-hero may cost scroll. Measured, it does not — at 390x844.** The
hero has 374px of slack above its bottom-aligned overlay against roughly 250px of stats.
§6's fear was reasonable and is answered by the baseline above. It is **not** answered at
375x667, where `min-h-svh` gives 197px of slack, and Task 7 carries that measurement and the
documented fallback.

**3. §6 says "nine bands become five". Counting the rendered page, nine bands become six**
— hero, factors, portfolio, testimonials, CTA, plus the footer §6 is not counting. The five
§6 names are the five `<Band>`s plus the hero; the arithmetic in this plan counts what
`<main>` actually renders, which is the thing a phone scrolls.

**4. `moveCtaBandToSettings` is the wrong template for this move.** It writes the new
location and unsets the old one in **one step**, which is why it sits in `REMOVALS` and must
run after its code. §6 requires the add to happen *ahead* of the code and the unset *after*
it, so one step cannot serve. This plan adds **two** steps: `offerings-heading` (an addition,
safe early, Task 3) and `offerings-heading-cleanup` (in `REMOVALS`, Task 11). Task 3's step
must be idempotent and must never unset anything.

---

## File Structure

**New**

| file | responsibility |
|---|---|
| `src/components/property/CurrentOfferings.tsx` | the Current Offerings section — heading plus grid, renders nothing when the list is empty |
| `tests/unit/currentOfferings.test.tsx` | the empty-renders-nothing contract and the 506(c) note |

**Modified**

| file | change |
|---|---|
| `src/sanity/schema/pages.ts` | `portfolioPage` gains `offeringsHeading` (optional); `homePage` loses it |
| `src/sanity/schema/property.ts` | `showInPortfolio` title and description sharpened — **not renamed** |
| `src/sanity/queries.ts` | `PORTFOLIO_PAGE_QUERY` gains `offeringsHeading`; `HOME_PAGE_QUERY` loses it |
| `src/app/(site)/portfolio/page.tsx` | fetches `CURRENT_OFFERINGS_QUERY`; renders offerings → filters → grid |
| `src/app/(site)/page.tsx` | insights, offerings and partners bands removed; stats passed into the hero |
| `src/components/layout/PageHero.tsx` | accepts optional `stats`, rendered inside the overlay |
| `src/components/ui/StatBand.tsx` | gains an `onPhoto` tone, or is joined by a sibling — Task 7 decides against a measurement |
| `scripts/content/em8-content.mjs` | `PAGE_COPY.portfolioPage.offeringsHeading`; `homePage.offeringsHeading` out |
| `scripts/migrate-content.mjs` | two new steps, `offerings-heading` and `offerings-heading-cleanup` |
| `tests/unit/queries.test.ts` | the optional-leaf assertion for `portfolioPage.offeringsHeading` |
| `tests/unit/pageCopy.test.tsx` | the seed's shape for the moved heading |
| `tests/unit/homepage.test.tsx` · `tests/unit/portfolioVisibility.test.ts` | band list and offering placement |
| `tests/integration/content-integrity.test.ts` | gates that the moved heading exists at its new address |
| `tests/e2e/site.spec.ts` | homepage band count, offerings on `/portfolio` above the filters, hero clearance unchanged |

**Deleted** — nothing. `homePage.insightsHeading`, `partnersTeaser`, `partnersTeaserCta` and
`portfolioCta` become unread and **stay**: an unread field costs nothing, and a removal waits
for a separate PR. `offeringsHeading` is the one exception and only because its copy now
lives at a second address, which is a drift hazard rather than a dormant field.

---

# Task 1: Branch, and reproduce the baseline locally

**Files:** none — this task writes no code.

The worktree is on `about-us-clickable`, whose content is byte-identical to `origin/main`
(`git diff origin/main..HEAD` is empty; it is the pre-squash side of PR #29). Do not work on
it.

- [ ] `git fetch origin && git checkout -b homepage-compression origin/main`
- [ ] Confirm `git log --oneline -1` reads `e4fbfd1`
- [ ] Confirm the deployed commit is `e4fbfd1` by **hash** from the Railway API, not by `SUCCESS`
- [ ] `netstat -ano | grep :3000`; if anything is listening, `MSYS_NO_PATHCONV=1 taskkill /PID <pid> /F` — `npm start` does not replace a running server and the old build will make every measurement a lie
- [ ] `rm -rf .next/cache` (not just `fetch-cache` — optimised images cache separately under `.next/cache/images`), then `npm run build && npm start`
- [ ] Re-measure the band inventory locally at 390x844 DPR-3 and confirm it matches the deployed table above within a few px. **If it does not, stop and find out why before changing anything** — a local number that disagrees with the deployed one means the measurement rig is wrong, and every "after" in this plan is compared against it.

**Verification:** the local band inventory reproduces the deployed one.

---

# Task 2: The schema, before anything writes to it

**Files:** `src/sanity/schema/pages.ts`, `src/sanity/schema/property.ts`, `tests/unit/schema.test.ts`

Two changes, and they are different shapes. Adding `portfolioPage.offeringsHeading` is an
addition. Removing `homePage.offeringsHeading` from the *schema* is safe the moment the code
stops reading it, because a schema is not a dataset — the stored value survives and Task 11
is what removes it.

- [ ] Write the failing test first: `tests/unit/schema.test.ts` asserts `portfolioPage` has an `offeringsHeading` field of type `headingBlock`, and that it is **not** `required()`
- [ ] Run it. Watch it fail.
- [ ] Add the field to `portfolioPage`. **Optional, deliberately** — §6 says a section with nothing in it renders nothing, and the day Antioch closes there is no section to head. A `required()` here would make the Studio nag for copy that heads an invisible section.
- [ ] Give it a description naming what it heads and that it is optional
- [ ] Remove `offeringsHeading` from `homePage`. Record in a comment *why* this one field goes while `insightsHeading` and `partnersTeaser` stay: its copy now lives at a second address, so leaving the old one editable invites an editor to change words nothing reads.
- [ ] Sharpen `showInPortfolio` — currently title `Show in Assets`, description `Turn off for a property EM8 does not own yet. It keeps its own page and can still be offered.` It needs to say that its meaning is "list among the assets EM8 owns", and that a property can be absent from the grid and present in Current Offerings. **Do not rename the field** — a rename is a remove plus an add, and therefore a breaking migration under `docs/deploys-and-migrations.md`. §6 says this in terms.
- [ ] `npm run typegen` — it must not report "0 queries"
- [ ] `npm test`, `npx tsc --noEmit`, `npm run lint`

**Verification:** the new test passes; typegen reports a non-zero query count; `tsc` is clean.

---

# Task 3: Add the field to production — the safe half, ahead of the code

**Files:** `scripts/migrate-content.mjs`, `scripts/content/em8-content.mjs`, `tests/unit/pageCopy.test.tsx`

This is step 1 of §6's four, and it is an **addition**: the deployed build ignores a field it
does not know about. `docs/deploys-and-migrations.md`'s table says apply freely.

**The copy must come from the live document, not from the seed constant.** The team wrote
those words. `moveCtaBandToSettings` gets this right (`fromHomePage ?? CTA_BAND`) and it is
the one thing about it worth copying.

- [ ] Write the failing test: `pageCopy.test.tsx` expects `PAGE_COPY.portfolioPage.offeringsHeading` to exist and `PAGE_COPY.homePage.offeringsHeading` not to
- [ ] Add an `offerings-heading` step to `STEPS`. It reads `*[_id=="homePage"][0].offeringsHeading`, and writes `portfolioPage.offeringsHeading` with **`setIfMissing` per leaf** — `eyebrow`, `title`, `intro` — not on the object. `setIfMissing` on an object is all-or-nothing and a half-filled heading would be skipped forever while reporting "already has one"; that trap is documented and has already bitten `backfillPageSeo`.
- [ ] It falls back to the seed constant only when `homePage.offeringsHeading` is absent
- [ ] **It must not unset anything.** Do not add it to `REMOVALS`. A reviewer should be able to read the step and see that it cannot remove a field.
- [ ] Move the seed copy in `em8-content.mjs` from `homePage` to `portfolioPage`
- [ ] Dry run against production: `node --env-file=.env.local scripts/migrate-content.mjs --only=offerings-heading`. Read what it says it would touch.
- [ ] Apply: same command with `--apply`
- [ ] Dry run again — it should report nothing pending
- [ ] Query production and confirm `portfolioPage.offeringsHeading` now holds the team's three strings **and** `homePage.offeringsHeading` is still there
- [ ] **Fetch the live homepage and confirm the offerings band still renders.** This is the addition half of the rule working, and it is the check that was skipped on 2026-08-31.

**Verification:** both documents hold the copy; the live site is unchanged; the dry run is clean on a second pass.

---

# Task 4: The Current Offerings section component

**Files:** `src/components/property/CurrentOfferings.tsx`, `tests/unit/currentOfferings.test.tsx`

- [ ] Write the failing tests first: renders nothing at all — no heading, no empty grid — for an empty list; renders the heading and one card for one offering; renders nothing when the heading is absent but offerings exist (a section with no title is the shell this project refuses)
- [ ] Run them. Watch them fail.
- [ ] Build the component from `SectionHeading` and `PropertyCard`, matching the markup the homepage band uses today so nothing about the card changes
- [ ] Carry forward the Rule 506(c) comment from `src/app/(site)/page.tsx` — the filter is the enforcement, not a convenience, and the comment is the only place a reader is told so
- [ ] `npm test`

**Verification:** all three tests pass, including the two negative cases.

---

# Task 5: `/portfolio` renders it — offerings, then filters, then grid

**Files:** `src/app/(site)/portfolio/page.tsx`, `src/sanity/queries.ts`, `tests/unit/queries.test.ts`

§6 is explicit about the order and about why: offerings are the actionable content and the
reason a reader arriving from "Invest With Us" is on the page; the filters sit directly above
the grid they belong to, so nothing about them appears to apply to the offerings above.

- [ ] **Write the optional-leaf assertion first**, in `tests/unit/queries.test.ts`, alongside the `dealStoryHeading` one: `PORTFOLIO_PAGE_QUERY` must project `offeringsHeading`. This single assertion is the whole of the protection — an optional leaf missing from a query reads `undefined` on every render and neither the layout's throw nor the release gate will say a word.
- [ ] Run it. Watch it fail.
- [ ] Add `offeringsHeading { eyebrow, title, intro }` to `PORTFOLIO_PAGE_QUERY`; remove it from `HOME_PAGE_QUERY`
- [ ] `npm run typegen`
- [ ] Fetch `CURRENT_OFFERINGS_QUERY` in the page and render `CurrentOfferings` **above** `PortfolioFilter`
- [ ] Mind the container rule already recorded in this file: `Band` and `PageHero` own their own ground and measure and must be siblings of the `max-w-[1200px]` wrapper, never inside it
- [ ] `npm test`, `npx tsc --noEmit`, `npm run lint`

**Verification:** the queries test passes; `/portfolio` renders Antioch above the filters; the ten-card grid below is untouched and Burbank and Embassy still carry their figures.

---

# Task 6: The homepage loses three bands

**Files:** `src/app/(site)/page.tsx`, `tests/unit/homepage.test.tsx`

- [ ] Write the failing test: the homepage band list contains no `insights`, `offerings` or `partners` key
- [ ] Run it. Watch it fail.
- [ ] Remove the three band entries. Leave the `copy.insightsHeading`, `copy.partnersTeaser`, `copy.partnersTeaserCta` **reads out** of the component but do **not** touch the schema, the query or the dataset for them — an unread field costs nothing and a removal is a separate PR with its own ordering.
- [ ] Drop the now-unused `ALL_POSTS_QUERY` and `CURRENT_OFFERINGS_QUERY` imports from the homepage. `tsc` will find them.
- [ ] The `alternatingTones` call takes `bands.length + 1` and derives the tones from what actually renders — it needs no edit, and that is PR-1-era work paying for itself. Confirm the CTA band still lands on a different ground from the band above it, which is what that helper exists to guarantee.
- [ ] `npm test`, `npx tsc --noEmit`, `npm run lint`

**Verification:** the band test passes; the built homepage has six children of `<main>` plus the footer.

---

# Task 7: The stats onto the hero — measured, with a documented fallback

**Files:** `src/components/layout/PageHero.tsx`, `src/components/ui/StatBand.tsx`, `src/app/(site)/page.tsx`, `tests/unit/pageHero.test.tsx`

**This is the task §6 says to decide against a measurement, and the measurement can go
against it.** The baseline says the hero has 374px of slack at 390x844 against roughly 250px
of stats, so they fit. That is one viewport.

- [ ] Write the failing test: `PageHero` renders stats inside `[data-hero-overlay]` when given them, and renders no stat markup at all when not
- [ ] Run it. Watch it fail.
- [ ] Add an optional `stats` prop to `PageHero`, rendered below the buttons inside the overlay
- [ ] **The stats sit on a photograph now.** They must not become spec §9's eighth `text-white`-on-a-moving-token pairing. Use the same route `Eyebrow` already takes for `tone="onPhoto"`, so the dark re-theme has one thing to change rather than two.
- [ ] `pointer-events` — the overlay disables them so the photograph stays clickable. The stats are not interactive, so they need no opt-in; confirm that is true rather than assuming it.
- [ ] Measure, at 390x844 DPR-3 **and** at 320x844, 360x844, 375x812 and **375x667** (a short phone, where `min-h-svh` is 667px and the slack is ~197px rather than 374px), fonts **loaded and blocked**:
  - hero box height — did it grow past `min-h-svh`?
  - eyebrow clearance below the header — still positive?
  - homepage total screen count
- [ ] **The fallback, and it is not a failure:** if the hero grows, or clearance goes negative at any of those widths, §6 says keep the stat band where it is. Revert this task, keep Task 6's three removals, and report 5.80 screens instead of 5.47. Write down which measurement decided it.

**Verification:** a table of all five viewports × fonts-loaded/blocked, with hero height, clearance and screen count, in the PR body. The decision is whichever the table supports.

---

# Task 8: The E2E guards, and the number this PR is judged on

**Files:** `tests/e2e/site.spec.ts`, `tests/integration/content-integrity.test.ts`

The lesson this project keeps re-learning is that an E2E test that performs a gesture and
asserts no geometry looks like coverage and is not.

- [ ] Homepage band count at 390x844 — pins that the three bands stay gone
- [ ] Current Offerings renders on `/portfolio` **above** the filter row, asserted by comparing bounding-box `y`, not by DOM order
- [ ] The homepage hero still clears the header at 320px and 390px, **with the webfonts blocked** — the existing loop covers `/about`; the homepage now carries stats in the same overlay and needs its own row
- [ ] `content-integrity` gates that `portfolioPage.offeringsHeading` exists in the live dataset. It is optional in the schema, so this is the only thing that will notice it vanish.
- [ ] `npx playwright test` — expect 33 plus the new ones
- [ ] Report the measured page length against the 8.23 baseline, and reproduce §6's lever table from "Four things the spec gets wrong" with the real numbers

**Verification:** the full suite green, and a before/after screen-count table.

---

# Task 9: Close the PR

- [ ] Re-run every gate: `npm test`, `npx tsc --noEmit`, `npm run lint`, `npm run test:content`, `npm run build`, `npx playwright test`
- [ ] `export PATH="/c/Program Files/GitHub CLI:$PATH"`; open the PR with the before/after table and the Task 7 measurement table in the body
- [ ] **Request a code review before merging** — superpowers:requesting-code-review. The whole-branch review is what caught the buried hero copy last session, after a per-task review had passed it.
- [ ] Poll CI until **no row reads `pending`** — `gh pr checks --watch` exits before the `build` job registers. Two workflows, four rows, all must pass. A `build` failure with `ECONNRESET` from the Sanity API is a known flake: `gh run rerun <id> --failed`.
- [ ] Squash merge. `gh pr merge` fails locally with `fatal: 'main' is already used by worktree`; the merge still succeeds on GitHub — confirm with `gh pr view <n> --json state`.

---

# Task 10: Deploy, and verify on the running site

Railway auto-deploy is **off**. Merging to `main` ships nothing.

- [ ] Trigger via GraphQL at `https://backboard.railway.com/graphql/v2`, header `Project-Access-Token` (not `Authorization: Bearer`): project `4225ede5-e320-4a62-8ccb-42a437d708a3` · environment `4260bc70-c3ea-448f-ad04-6541f3acc773` · service `5d00810f-87c2-4254-963e-b654812d53fd` · `serviceInstanceDeploy(serviceId, environmentId, latestCommit: true)`
- [ ] **Poll for a deployment whose `meta.commitHash` is the commit you just merged.** `SUCCESS` is not evidence — the status query can return the previous deployment.
- [ ] `bash scripts/deploy-studio.sh` — the schema changed, and editors cannot see `portfolioPage.offeringsHeading` until the hosted Studio is rebuilt **from merged code**
- [ ] Open the Studio and confirm the field is on **Portfolio page** and gone from **Home page**
- [ ] **This is §6 step 3, and Task 11 must not start until it passes.** On the live site:
  - `/portfolio` renders the Current Offerings heading and the Antioch card, above the filters
  - the homepage has **lost** the offerings band, the insights teaser and the partners teaser
  - Burbank 1.99x and Embassy 1.37x still render on their property pages
  - Antioch is still absent from the portfolio grid
- [ ] Re-measure the deployed homepage at 390x844 DPR-3 and record the real landing number

**Verification:** the four live checks above, by fetching the pages rather than reading the build log.

---

# Task 11: The unset — cleanup, and only now

**This is §6 step 4 and `docs/deploys-and-migrations.md`'s entire reason for existing.
Doing it before Task 10 is the failure that took the homepage's call to action down on
2026-08-31.** It is cleanup; it can wait indefinitely, and an unread field costs nothing.

- [ ] Confirm Task 10's live checks passed
- [ ] Add `offerings-heading-cleanup` to `STEPS` and to **`REMOVALS`**, so the script prints its own warning
- [ ] It unsets `homePage.offeringsHeading` and nothing else. Idempotent — a no-op once the field is gone.
- [ ] Dry run first: `node --env-file=.env.local scripts/migrate-content.mjs --only=offerings-heading-cleanup`
- [ ] Apply
- [ ] **Fetch the live homepage and `/portfolio` again.** The page still rendering is what proves the deployed code reads the new location rather than the leftover.
- [ ] Confirm `portfolioPage.offeringsHeading` is untouched

**Verification:** `homePage.offeringsHeading` is absent; both live pages render exactly as they did before the unset.

---

# Task 12: Hand over

- [ ] Update `docs/handover-2026-09-09.md` or supersede it, with the measured landing number and the lever table
- [ ] Add any new trap to `README.md`
- [ ] Put the 4.5-vs-5.47 decision in front of Hunter with the measured menu, as a decision he owns

---

## Risks

- **The field MOVE.** Mitigated by splitting the migration into two separately-invoked steps, by Task 3 asserting the live site is unchanged after the add, and by Task 11 being gated on Task 10's live verification. The failure mode is doing Task 11 early; the plan's structure is what prevents it.
- **The 4.5 target is not reachable with §6's levers**, because its closing lever already shipped. Surfaced as a decision rather than absorbed as a silent shortfall.
- **Stats-on-hero on a short phone.** 375x667 has 197px of slack, not 374px. Task 7 measures it and §6's own fallback is the answer.
- **The stats become the eighth `text-white` pairing** the dark re-theme has to fix. Routed through the existing `onPhoto` treatment instead.
- **`/portfolio` gets heavier.** `docs/resource-budget.md` already flags it as the page to watch — 1250 KB of images at 1512x900, inside a 1400 KB budget but not by much. Current Offerings adds one card whose thumbnail is already fetched by the carousel, so the delta should be near zero, but Lighthouse in CI only loads `/` and will not tell you. Measure it in Task 8 rather than assuming.
- **An editor blanks `portfolioPage.offeringsHeading`.** The section then renders nothing, silently and by design. `content-integrity` in Task 8 is what turns that into a failed release rather than a missing section nobody notices.
