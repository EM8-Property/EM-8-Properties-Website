# Typography and Hero Resolution — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Answer Etamar's "it just looks better (fonts, resolution)" with two measured changes — a larger type scale led by the phone, and a sharper hero crop — without spending the image budget or undoing PR 3's compression.

**Architecture:** This is PR 4 from spec §10, and it is **strictly downstream of PR 3**. Both PRs inflate the same box: PR 3 puts five stats inside the homepage hero overlay, PR 4 grows the headline inside it. The hero has a finite amount of slack and they are competing for it, so PR 4's type scale is chosen against the hero PR 3 actually shipped, not against today's. Task 1 re-baselines before anything else.

**Tech Stack:** Next.js 16 (App Router, RSC), TypeScript strict, Tailwind v4 (`@theme`), Sanity v6, Vitest, Playwright, ESLint flat config.

**Spec:** `docs/superpowers/specs/2026-09-08-em8-feedback-design.md` — §7 (the whole of it), §1 (the em-8.com comparison the complaint comes from), §11 (accepted on a phone; the bitmap width served to a DPR-3 phone is named acceptance evidence), §13 (the resolution-vs-budget risk).

**Budget authority:** `docs/resource-budget.md`. It says in terms **not to raise a budget to make something pass**, and the 1600px crop cap is what holds the image budget. This PR raises that cap, which is the one lever that document identifies as load-bearing — so it is measured, and the budget is not touched.

---

## Global Constraints

Copied from `README.md` "Non-negotiables" and the spec. Every task's requirements implicitly include these.

- **Small teal text is `#2C7A74`, never `#4ABDB5`.** The accent measures ~2.2:1 on white. `titleAccent` on a photograph uses `text-teal` and on white uses `text-teal-text`; `PageHero` already switches between them on `hasPhoto` and that logic must survive a type-scale change.
- **The `titleAccent` token has a documented contract that this PR moves inside.** `PageHero`'s comment scopes `text-teal` to 24px and up and records the measurement: ~5.9:1 on a dark photograph, ~1.7:1 on a pale one, at 30px. **A larger headline makes that better, not worse** — it is the one contrast relationship in this PR that improves. Re-state the measured number at the new size rather than deleting the comment.
- **CSS logical properties only.** `ms-`/`me-`/`ps-`/`pe-`/`text-start`. ESLint enforces this across all of `src/`.
- **No colour literal under `src/`** — three exemptions only.
- **`text-white` is invisible to that lint rule**, and spec §9 lists seven `text-white`-on-a-moving-token pairings the dark re-theme must fix. **Do not add an eighth.** This PR changes sizes, not colours; if a task finds itself adding a colour, that is the signal it has gone out of scope.
- **Never phrase returns as promises.** Scanned in source and in every CMS document.
- **`quality` is silently ignored unless allowlisted.** `next.config.ts` currently declares `qualities: [68, 75]`, so both values are live — **68 is genuinely being served today**, confirmed by reading `q=68` off the deployed hero URL. §7's first lever is therefore a real change and not a no-op, and the generic warning in `docs/resource-budget.md` does not apply here. **Verify the bytes actually change anyway** — that trap cost three rebuilds once.
- **Clear `.next/cache`, not just `.next/cache/fetch-cache`.** Optimised images cache separately under `.next/cache/images`, so a measurement after changing image options reports the old numbers.
- **Do not run `npx prettier`.** Match the quoting of the file you are in.
- **`AGENTS.md`:** read the relevant guide in `node_modules/next/dist/docs/01-app` before writing App Router code.
- Accepted on a **390x844 DPR-3 phone** measurement, with desktop as the regression check (spec §11).

---

## Baseline, measured 2026-09-09 against the deployed site at `e4fbfd1`

This is the **pre-PR-3** baseline. It is recorded because it is what §7's numbers were written
against, and Task 1 replaces it with the post-PR-3 one before any decision is taken.

### Type

`h1` is `text-3xl ... sm:text-4xl lg:text-5xl` = **30 / 36 / 48px**, `leading-[1.1]`.

Measured `h1` box, homepage and `/about`, at DPR 3:

| viewport | `/` h1 | `/about` h1 | `/` overlay | `/` hero | **`/` slack** | `/about` slack |
|---|---|---|---|---|---|---|
| 390x844 | 66px / 2 lines | 99px / 3 lines | 470px | 844px | **375px** | **0px** |
| 375x812 | 99px / 3 lines | 99px / 3 lines | 573px | 812px | **239px** | **0px** |
| 360x844 | 99px / 3 lines | 99px / 3 lines | 573px | 844px | **271px** | **0px** |
| 320x844 | 132px / 4 lines | 132px / 4 lines | 678px | 844px | **167px** | **0px** |
| 375x667 | 99px / 3 lines | 99px / 3 lines | 573px | 667px | **94px** | **0px** |

### Clearance — and the handoff's central fear does not survive this measurement

| viewport | `/` clearance | `/about` clearance | header | reservation |
|---|---|---|---|---|
| 320px | +245.5px | **+79px** | 113px | `pt-48` = 192px |
| 360px | +349.8px | **+79px** | 113px | `pt-48` = 192px |
| 375px | +317.8px | **+79px** | 113px | `pt-48` = 192px |
| 390px | +430px | **+55.5px** | 88.5px | `pt-36` = 144px |

`/about`'s clearance is **exactly `reservation − header`** at every width: 192 − 113 = 79,
144 − 88.5 = 55.5. And `/about`'s slack is **zero** at every phone width — its overlay
already exceeds the `min-h-[420px]` floor, so the box is content-driven.

**That is the finding, and it corrects the handoff.** The handoff warns that a bigger
headline is "the single riskiest thing left in the spec, because the copy is bottom-aligned
CMS text that climbs as it grows, into a margin much thinner than §7 assumed". Measured, the
copy does **not** climb. The box is `min-h`, the overlay is in flow, and the reservation is
fixed top padding — so when the headline grows the box grows **downward** and the eyebrow
stays put. Clearance is invariant to headline size and is bounded below by
`reservation − header` on every page.

The homepage confirms it from the other side: it has 375px of slack, so as the headline
grows the overlay's top edge rises and clearance falls — but only until slack reaches zero,
at which point clearance settles at 144 − 88.5 = **55.5px**, the same floor `/about` already
sits on. It cannot go below it.

**So the real cost of a bigger headline is scroll, not clearance** — which puts §7 in direct
competition with §6 rather than with `headerReservation.ts`. This holds only while the box
stays `min-h` and the overlay stays in flow, which is exactly the invariant
`src/lib/headerReservation.ts` already exists to protect. **Do not make the hero a fixed
height, and do not take the overlay out of flow.** Task 4 asserts the invariant directly so
that a future change cannot quietly break the reasoning above.

### The invariant, derived from 40 measurements rather than argued

Measured 2026-09-09 on `npm run build && npm start` at `e4fbfd1`, four routes × five
viewports × fonts loaded and blocked, via `node scripts/measure-phone.mjs --local`:

> **`clearance = (reservation − header) + slack`,  with `slack ≥ 0`**

It holds in every one of the forty rows. `/portfolio` at 390px with fonts blocked is the
clearest check because it is the only phone row with both a non-zero slack and a wrapped
header: `144 − 113 + 51 = 82`, measured `+81.8`.

Two consequences, and they are what PR 4 is allowed to rely on:

1. **Clearance is floored at `reservation − header`**, reached when slack hits zero. A
   taller headline drives slack toward zero and then grows the box; it cannot push copy
   under the bar. The floor is **+31px at 390px with fonts blocked** — the tightest value
   on the site, matching `headerReservation.ts`'s docblock exactly.
2. **Slack is the whole budget, and it is what PR 3 spends.** Homepage slack with fonts
   loaded: 375px at 390x844, 271px at 360px, 239px at 375x812, 167px at 320px and **94px at
   375x667**. That short-phone figure is the binding constraint on the phone headline, not
   any clearance number.

The fonts-blocked baseline, which is the case CI renders and a cold visitor sees first:

| viewport | header | `/about` clearance | `/` slack |
|---|---|---|---|
| 390x844 | 113px | **+31px** ← tightest on the site | 375px |
| 375x812 | 113px | +79px | 272px |
| 375x667 | 113px | +79px | **127px** |
| 360x844 | 113px | +79px | 222px |
| 320x844 | **153px** | +39px | 167px |

### Resolution

The hero `<img>` on `/` at 390x844, all three DPRs:

| DPR | srcset entry chosen | **real bitmap** | painted | device px wanted | short by |
|---|---|---|---|---|---|
| 1 | 1920w | **1600px** | 1500 CSS px | 1500 | — |
| 2 | 3840w | **1600px** | 1500 CSS px | 3000 | 1.88x |
| 3 | 3840w | **1600px** | 1500 CSS px | 4500 | **2.81x** |

The bitmap is 1600px in every case — the Sanity crop cap, `urlForImage(...).width(1600)
.height(900)`. `naturalWidth` reads 649 at DPR 3 and 1299 at DPR 1, which is **density-
corrected CSS-pixel reporting, not the bitmap**: with `w` descriptors the browser divides
the bitmap by `descriptor ÷ sizes-width`, so 1600 ÷ (3840 ÷ 1560) = 649. Anyone re-measuring
this must read the URL or divide back out — **`naturalWidth` alone will send you chasing a
650px image that does not exist.** That is a new trap and belongs in the README.

`q=68` is confirmed on the wire. First paint on `/` at 390x844 DPR-3 is **893 KB of images
across 8 requests**, of which the two hero crops are **492 KB** (106 KB from the 1600x917
source, **386 KB** from the detailed 4160x3117 source). Budget is 1400 KB image / 2200 KB
total, and **Lighthouse in CI audits `/`**.

### The arithmetic that decides this PR's shape

Raising the cap 1600 → 2048 is 1.28x linear and ~1.64x in area. Applied to the two hero
crops, and then q68 → q75 on top:

| | now | cap 2048 | cap 2048 + q75 |
|---|---|---|---|
| 1600x917 crop | 106 KB | ~174 KB | ~200 KB |
| 4160x3117 crop | **386 KB** | ~633 KB | ~730 KB |
| hero subtotal | 492 KB | ~807 KB | ~930 KB |
| **page images** | **893 KB** | ~1208 KB | **~1330 KB** |
| budget | 1400 KB | 1400 KB | 1400 KB |

**Both levers together land inside the budget by roughly 70 KB, on estimates.** That is not
enough headroom to ship on arithmetic — `docs/resource-budget.md` records ~55% headroom as
deliberate, to absorb lobby photography that has not been shot yet, and this would spend
almost all of it. So Task 6 measures rather than predicts, and Task 7 carries a decision
gate with three named outcomes rather than an assumption that both levers ship.

**Verified green at `e4fbfd1`:** `npm test` **534** · `npx tsc --noEmit` · `npm run lint` ·
`npm run test:content` **13** · `npm run build` **29 pages**.

---

## Four things the spec gets wrong or leaves open

**1. §7 contradicts itself on the phone headline size, and the difference is the whole PR.**
Its table says ours 30px against em-8.com's 60px. Its prose says "The headline goes to
roughly **40 / 60 / 72px** from today's 30 / 36 / 48" — which maps phone → **40px**, `sm` →
60px, `lg` → 72px. Then the next sentence says "doubling 30 to 60 at 390px is a bigger
change than it sounds", which is the 60px reading again. The handoff took the 60px reading.

They are different changes. **This plan treats the phone value as a measured output bounded
by §6's scroll target, not as a specced input**, and Task 3 derives it. §7 itself licenses
this: "expect the phone value to land below 60 if the measurement says so."

**2. §7's clearance premise is stale in both directions.** It says a band page has "28px of
clearance at 320px" under "a 68px overlaid header". Both numbers predate PR 2b: the header
is 88.5–113px, the reservation is `pt-48 min-[390px]:pt-36 md:pt-28`, and clearance is
+79px at 320px and +55.5px at 390px. More importantly the *shape* of the risk is wrong —
see the Clearance section above. Clearance is invariant to headline size; scroll is not.

**3. §7's first lever is real, contrary to a reasonable reading of the budget doc.**
`docs/resource-budget.md` warns that Next 16 ships `qualities: [75]` and silently ignores
anything else. `next.config.ts` here declares `[68, 75]`, and the deployed hero really does
serve `q=68`. So 68 → 75 changes bytes. **Confirm it on the wire anyway.**

**4. Raising the crop cap invalidates the `sizes` multipliers, and the budget doc says so
explicitly.** `screen`'s hint is `(max-width: 640px) 400vw, (max-width: 1024px) 200vw,
100vw`, and `docs/resource-budget.md` records that those over-asks "cost nothing while the
1600px cap binds — every over-ask resolves to the same asset... **If that cap is ever
raised, these numbers stop being free and want re-deriving.**" This PR raises the cap, so
Task 5 re-derives them. Skipping that step is how the cap increase turns into a tablet
fetching a 2048px asset it has no use for.

**Also worth putting on the table, because it is the only lever that helps both halves.**
`docs/resource-budget.md` names it and declines it: requesting a **taller crop** — 4:3
rather than 16:9 — makes a portrait phone paint ~1080 CSS px instead of ~1500, which is
sharper *and* fewer bytes. It is declined there as a design decision rather than a
performance one, because it re-frames every photograph on every page. It is not in this
plan's scope, and Task 8 raises it to Hunter if the budget forces a choice.

---

## File Structure

**New**

| file | responsibility |
|---|---|
| `tests/unit/typeScale.test.tsx` | pins the `h1` scale at all three breakpoints, unprefixed token first |

**Modified**

| file | change |
|---|---|
| `src/components/layout/PageHero.tsx` | the `h1` scale, both the photograph branch and the no-photo fallback; the `titleAccent` contrast note re-measured |
| `src/components/layout/HeroCarousel.tsx` | the crop cap in `urlForImage(...)`, `quality`, and `SHAPE.screen.sizes` re-derived |
| `next.config.ts` | `qualities` — only if the measurement lands on a value not already declared |
| `docs/resource-budget.md` | the re-derived `sizes` arithmetic and the new measured byte table |
| `README.md` | the `naturalWidth` density-correction trap |
| `tests/unit/heroCarousel.test.tsx` · `tests/unit/pageHero.test.tsx` · `tests/unit/image.test.ts` | the new cap, quality and scale |
| `tests/e2e/site.spec.ts` | headline size at the review viewport; clearance unchanged with fonts blocked; bitmap width served to a DPR-3 phone |

**Deleted** — nothing.

---

# Task 1: Re-baseline against the hero PR 3 actually shipped

**Files:** none — this task writes no code, and it is the gate on every number below.

PR 3 spends the homepage hero's slack on five stats. Every §7 decision depends on what is
left, so the table in this plan's Baseline is **superseded before it is used**.

- [x] Confirm PR 3 is merged, deployed and verified — check the deployed commit by **hash** from the Railway API, not by `SUCCESS`
- [x] `git fetch origin && git checkout -b typography-and-resolution origin/main`
- [x] Kill anything on port 3000 (`netstat -ano | grep :3000`, then `MSYS_NO_PATHCONV=1 taskkill /PID <pid> /F`) — `npm start` will not replace it and the stale build makes every measurement a lie
- [x] `rm -rf .next/cache` — **the whole cache**, not just `fetch-cache`; optimised images live in `.next/cache/images`
- [x] `npm run build && npm start`
- [x] Re-measure, at 320x844, 360x844, 375x812, **375x667** and 390x844, all DPR 3, **fonts loaded and blocked**: `h1` box height and line count, overlay height, hero height, **slack**, eyebrow clearance, page length in screens
- [x] Record whether PR 3 kept the stats on the hero or fell back to the stat band — **that decision changes the slack this PR has to spend, and therefore its answer**
- [x] Confirm clearance still equals `reservation − header` on `/about` at every width. If it does not, the invariant this plan reasons from has moved and the reasoning must be redone before proceeding.

**Verification:** a post-PR-3 table in the same shape as the Baseline above, and an explicit statement of how much hero slack remains at each viewport.

---

# Task 2: The type scale, on desktop first — where there is no contest

**Files:** `src/components/layout/PageHero.tsx`, `tests/unit/typeScale.test.tsx`

Desktop and `sm` are the uncontested half: `/about`-shaped pages have zero slack and grow
downward, and desktop page length is not what §6 targets. §7's 60px and 72px land here.

- [x] Write the failing test first. Assert the **unprefixed** token separately from the prefixed ones — `toContain('text-3xl')` matches `sm:text-3xl`, and that trap is already in the README from PR 2b.
- [x] Run it. Watch it fail.
- [x] Set the `sm` and `lg` steps to §7's 60px and 72px. Tailwind has no default 60px step — use an arbitrary value (`text-[60px]`) or the nearest scale step, and say in a comment which and why.
- [x] Leave the **phone** step at 30px in this task. Task 3 sets it, against a measurement.
- [x] Apply the same change to the no-photograph fallback branch, which carries its own `h1`. Both branches were a regression once and the docblock says so.
- [x] Re-measure the `titleAccent` contrast at the new size and update the comment's numbers. The relationship improves with size; record it rather than leaving a 30px measurement labelled as current.
- [x] Check desktop page length at 1512x900 as a regression check, and the `md`/`lg` clearance rows — `md:pt-28` = 112px against a 62px header leaves +50px, and desktop pages have slack
- [x] `npm test`, `npx tsc --noEmit`, `npm run lint`

**Verification:** the scale test passes; desktop and tablet headlines are 72px and 60px; desktop page length has not moved materially.

---

# Task 3: The phone headline — derived, not specced

**Files:** `src/components/layout/PageHero.tsx`, `tests/unit/typeScale.test.tsx`

**This is the task the PR turns on.** §7 wants somewhere between 40px and 60px on a phone
and contradicts itself about which. The constraint is §6's scroll target, and PR 3 has
already spent part of the slack.

The mechanism, from the Baseline: growth is absorbed free while the homepage hero has slack,
and costs scroll 1:1 once it does not. `/about` and the five other band pages have **zero**
slack, so every pixel of headline growth is a pixel of scroll on all six, immediately.

- [x] Measure each candidate — **40px, 48px, 56px, 60px** — at 320x844, 360x844, 375x812, 375x667 and 390x844, DPR 3, **fonts loaded and blocked**. For each: `h1` line count, hero height, whether the hero exceeded `min-h-svh` on `/`, eyebrow clearance, and page length in screens for `/`, `/about` and `/portfolio`.
- [x] Do it by editing the one class and rebuilding, clearing `.next/cache` each time. Six viewports × four sizes is 24 measurements and they are the deliverable.
- [x] **The decision rule, written before the numbers so it cannot be fitted to them:** take the largest candidate for which (a) the homepage hero does not exceed `min-h-svh` at 390x844, (b) clearance stays positive at every width with fonts blocked, and (c) `/` page length does not regress past what PR 3 landed. If no candidate satisfies (a), take the largest that satisfies (b) and (c) and report the homepage cost explicitly.
- [x] 320px is the width to watch: the headline is already 4 lines at 30px there, and at 60px it will be 8. `/about` is where that lands hardest.
- [x] Record the chosen value **and the runners-up with their costs**, so Hunter can overrule the rule with numbers in front of him
- [x] `npm test`, `npx tsc --noEmit`, `npm run lint`

**Verification:** the 24-cell measurement table, the applied decision rule, and the chosen phone size with its measured page-length cost on all three routes.

---

# Task 4: Pin the invariant the whole plan reasons from

**Files:** `tests/e2e/site.spec.ts`, `src/lib/headerReservation.ts`

The Baseline's central claim is that clearance is invariant to headline size because the box
is `min-h` and the overlay is in flow. That is currently true by construction and nothing
asserts it. The two faults in the 2026-09-09 handover were both this shape — an invariant
everyone relied on and nothing tested.

- [x] Write an E2E test that renders `/about` at 320px with the fonts blocked and asserts clearance equals `reservation − header` within a pixel. It fails the day someone gives the hero a fixed height or takes the overlay out of flow — which is the change that would silently re-introduce the buried-copy defect at a larger type size.
- [x] Add a headline-size assertion at 390x844 so the scale cannot regress unnoticed
- [x] Extend the existing fonts-blocked clearance loop to cover `/` — it now carries stats *and* a larger headline in the same overlay, and it is not in that loop today
- [x] Add a line to `headerReservation.ts`'s docblock recording that clearance is `reservation − header` and does not depend on the headline, with the measured evidence. It is the natural home for the fact and that file is where the header's rules already live.
- [x] `npx playwright test`

**Verification:** the new tests pass and fail for the right reason — verify by temporarily giving the hero a fixed height and watching the invariant test go red.

---

# Task 5: Resolution — quality, then the cap, then re-derive `sizes`

**Files:** `src/components/layout/HeroCarousel.tsx`, `next.config.ts`, `tests/unit/heroCarousel.test.tsx`, `tests/unit/image.test.ts`

§7's three levers, cheapest first, each measured on the wire rather than assumed.

- [x] Write the failing tests first: the crop request carries the new cap; `quality` is 75; `SHAPE.screen.sizes` holds the re-derived hint
- [x] Run them. Watch them fail.
- [x] **Lever 1 — `quality` 68 → 75.** One word. 75 is already in `qualities`, so no config edit. **Then read `q=` off the deployed hero URL and compare bytes** — this is the lever whose silent failure cost three rebuilds, and the fact that 68 currently works does not prove 75 will be picked up.
- [x] Measure images-only first paint on `/` at 390x844 DPR-3 after lever 1 alone. Record it.
- [x] **Lever 3 — the crop cap 1600 → 2048.** Change `urlForImage(...).width(1600).height(900)` and the `<Image width height>` pair together; they must agree or the aspect ratio breaks. 2048 is already a Next `deviceSizes` entry, which is why §7 names it.
- [x] **Re-derive `SHAPE.screen.sizes`.** `docs/resource-budget.md` is explicit that the current multipliers are free only while the 1600 cap binds. With a 2048 cap, `400vw` at 390px asks for 1560 CSS px × DPR 3 = 4680 device px and lands on the 3840w entry, which now resolves to a genuinely larger asset instead of the same one. Work out what each of the three clauses now costs on a phone, a tablet and a desktop, and write the arithmetic into `docs/resource-budget.md` next to the table it supersedes.
- [x] Confirm the served bitmap really is 2048 by **reading the URL and dividing the density back out** — `naturalWidth` is density-corrected and will read ~830 at DPR 3, not 2048. This is the trap this PR discovered; do not let it re-bite here.
- [x] `npm test`, `npx tsc --noEmit`, `npm run lint`

**Verification:** `q=75` and a 2048px bitmap both confirmed on the wire, and a `sizes` hint whose arithmetic is written down.

---

# Task 6: Measure the budget, five samples, and never against localhost

**Files:** `docs/resource-budget.md`

- [x] `rm -rf .next/cache && npm run build && npm start`
- [x] Images-only and total first-paint bytes on `/` at 390x844 DPR-3, and at Lighthouse's mobile form factor (**412x823 at DPR 1.75**), which is the one CI gates
- [x] The same on `/portfolio` — `docs/resource-budget.md` names it as the page to watch at 1250 KB against a 1400 KB budget, and **Lighthouse in CI only loads `/`, so nothing gates it**. PR 3 added a card there. If the cap increase pushes it over, CI will not tell you and a visitor will.
- [x] `npm run lighthouse` — it dies on Windows *after* it finishes with a `chrome-launcher` EPERM; `lh.json` is already written, so run `node scripts/lighthouse-report.mjs`
- [x] **Five samples before believing any delta.** Seven runs of one commit returned 87, 87, 87, 97, 98, 87, 87. Byte budgets are the stable measurement; the performance score is not. **Never compare localhost to deployed.**
- [x] Update `docs/resource-budget.md` with the measured before/after table and the re-derived `sizes` reasoning

**Verification:** measured byte figures for `/` and `/portfolio` on both form factors, five Lighthouse samples, and a budget table that shows the remaining headroom as a number.

---

# Task 7: The decision gate — three outcomes, named in advance

**Files:** whichever of Task 5's changes survive

`docs/resource-budget.md` says in terms: **do not raise a budget to make something pass.**
The estimates in the Baseline put both levers together at ~1330 KB against 1400 KB, which is
inside but spends nearly all the deliberate headroom. So the outcome is chosen from Task 6's
measurement, not assumed:

- [ ] **Both levers fit with real headroom** — ship both. Record the new headroom figure and what it means for the lobby photography still to be shot.
- [ ] **Both fit but headroom is thin** (under ~15%) — ship quality 75 and a cap between 1600 and 2048, measured. §7 says "expect to land on quality 75 plus a cap near 2048, measured rather than promised", and a cap of 1800 or 1920 is a legitimate answer to that sentence. 1920 is a `deviceSizes` entry, which makes it the natural intermediate.
- [x] **They do not fit** — ship quality 75 alone, which is §7's cheapest and most likely explanation of what Etamar saw, keep the 1600 cap, and put the taller-crop option (4:3 instead of 16:9, ~1080 CSS px painted instead of ~1500 — sharper *and* cheaper) in front of Hunter as the design decision `docs/resource-budget.md` already frames it as.
- [x] **Do not raise `lighthouse-budget.json` in any of the three.** If that seems like the answer, it is the signal to take outcome three.

**Verification:** the chosen outcome stated with the measurement that chose it, and `lighthouse-budget.json` unchanged.

---

# Task 8: Close the PR

- [ ] Re-run every gate: `npm test`, `npx tsc --noEmit`, `npm run lint`, `npm run test:content`, `npm run build`, `npx playwright test`
- [ ] `export PATH="/c/Program Files/GitHub CLI:$PATH"`; open the PR. The body carries Task 3's 24-cell type table, Task 6's byte table and Task 7's decision.
- [ ] **Request a code review before merging** — superpowers:requesting-code-review
- [ ] Poll CI until **no row reads `pending`**; `gh pr checks --watch` exits before the `build` job registers. Four rows. `ECONNRESET` from the Sanity API is a known flake — `gh run rerun <id> --failed`.
- [ ] Squash merge; `gh pr merge` fails locally with `fatal: 'main' is already used by worktree` but the merge succeeds — confirm with `gh pr view <n> --json state`
- [ ] Deploy via the Railway GraphQL API (auto-deploy is off) and **poll for a deployment whose `meta.commitHash` matches**
- [ ] No schema change in this PR, so **no Studio redeploy is needed** — confirm that is still true before skipping it
- [ ] On the **live** site at 390x844 DPR-3: headline size, page length on `/`, `/about` and `/portfolio`, clearance with fonts blocked, and the **bitmap width served to a DPR-3 phone** — §11 names that last one as acceptance evidence
- [ ] Raise to Hunter: the phone headline landed at X rather than §7's 60px, for these measured reasons; and the taller-crop option if Task 7 took outcome three

---

## Risks

- **PR 3 and PR 4 compete for the same hero slack.** The homepage hero has a finite budget and PR 3 spends part of it on stats. Mitigated by Task 1 re-baselining and Task 3 deriving the phone size rather than taking §7's, but the underlying tension is a product decision: **a 60px phone headline and a 4.5-screen homepage are probably not both available.** It belongs in front of Hunter, and the measurements to decide it are Task 3's deliverable.
- **The image budget.** Estimates put both levers at ~70 KB inside a 1400 KB gate, which is inside but spends the headroom `docs/resource-budget.md` reserved for photography not yet shot. Task 7's three named outcomes are the mitigation, and raising the budget is excluded in advance.
- **`/portfolio` is ungated.** CI's Lighthouse run only loads `/`. `/portfolio` was already the heaviest page and PR 3 added a card. Task 6 measures it by hand because nothing else will.
- **`naturalWidth` lies about the bitmap** whenever `srcset` uses `w` descriptors — it is density-corrected. It reads 649 for a 1600px asset at DPR 3. This already sent one measurement down a wrong path in this session and will do it again; Task 5 reads the URL instead, and the README gains the trap.
- **`sizes` stops being free when the cap moves.** Written into `docs/resource-budget.md` in advance by whoever raised it last. Task 5 re-derives it; skipping that is how the cap increase leaks bytes onto tablets.
- **The six band pages have zero slack, so they pay for the headline immediately.** Every pixel of growth is a pixel of scroll on `/about`, `/insights`, `/investors`, `/partners`, `/portfolio` and `/strategy`. `/strategy` is 1.84 screens and still awaiting its body copy, so it can absorb it; `/about` at 7.51 is the one to watch.
- **CI renders with fallback fonts**, and a larger headline wraps differently in a wider face. Every measurement in Tasks 1, 3 and 6 is taken both ways, and Task 4's E2E runs with the fonts blocked.
- **A larger headline makes `titleAccent` contrast better, not worse** — the one relationship here that improves. Recorded so nobody "fixes" it by reaching for `text-teal-text` on a photograph, which is the pairing that all but disappears against a dark scrim.
