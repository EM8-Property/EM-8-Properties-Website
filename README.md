# EM8 Properties — em-8.com

Capital-raising website for a suburban Chicago real estate sponsor. Replaces a
single-page Vite brochure that could not hold per-property pages, a realized track
record, or a blog.

**Stack:** Next.js 16 (App Router) · TypeScript strict · Tailwind v4 · Sanity v6 · Railway

---

## Read these first

| Document | What it is |
|---|---|
| `docs/superpowers/specs/2026-08-28-em8-website-design.md` | The approved design. Every product decision and its reasoning. |
| `docs/superpowers/plans/2026-08-28-em8-website-phase-1.md` | The 16-task implementation plan **and its Revisions section** — ~25 defects found in the plan itself, each with why it mattered and how it was resolved. Read the Revisions before trusting any code block in the task bodies. |
| `docs/disclaimer-draft.md` | Unreviewed draft footer disclaimer, pending securities counsel. |
| `docs/deploys-and-migrations.md` | How the dataset and the code ship separately, and the ordering rule that keeps the live site up. Read before applying any migration. |
| `docs/resource-budget.md` | Why the Lighthouse budget is where it is, and two image traps. |

## Getting started

```bash
npm install
cp .env.example .env.local   # then fill it in — see "Environment" below
npm run dev                  # production dataset
```

| Command | What it does |
|---|---|
| `npm run dev` | Dev server against the `production` dataset |
| `bash scripts/dev-preview.sh` | Dev server against `preview` — sample content for design review |
| `npm run build` | Production build. **Fails if `siteSettings` is missing** — that is deliberate |
| `npm test` | Unit suite (422 tests). Never touches the network |
| `npm run test:content` | Content gate against the live dataset. Run before any content release |
| `npm run test:e2e` | Playwright. Set `E2E_BASE_URL` to run against a deployed URL |
| `npm run lighthouse` | Lighthouse + resource budget against a running `npm start` |
| `npm run typegen` | Regenerate Sanity types. **Run after every schema change** |
| `node --env-file=.env.local scripts/migrate-content.mjs` | Re-write content from `scripts/content/em8-content.mjs`. Dry run; add `--apply` to write |
| `… scripts/migrate-content.mjs --only=<step>` | Run **one** backfill: `carousel`, `pages`, `seo`, `headings`, `cta`. Prefer this after the initial load — see below |
| `bash scripts/deploy-studio.sh` | Redeploy the hosted Studio. **Run after every schema change** |

## Environment

`.env.example` lists every variable. Notes that are easy to get wrong:

- **Never prefix a secret with `NEXT_PUBLIC_`** — that ships it to every visitor.
- `SANITY_API_READ_TOKEN` is **required**: the dataset is private, and without it every
  page renders empty and the build fails.
- The read token must exist in **three** places: `.env.local`, Railway, and GitHub secrets.
  Missing it in CI fails the build in a way that looks unrelated.
- Build-time vs runtime: `next build` prerenders every route, so the two `NEXT_PUBLIC_`
  Sanity values plus the read token are needed at **build** time, not just runtime. The
  Dockerfile passes them as `ARG`/`ENV` for this reason.

## Content

Sanity is the single source of truth. There is no `constants.ts` fallback and no
`sanity:sync` script — both were failure modes on the old site. Missing required content
fails the build loudly rather than rendering a broken shell.

- **Hosted Studio:** https://em-8-properties.sanity.studio
- **Embedded Studio:** `/studio` on this app

Same project, same dataset, same schema, two front doors. Redeploy the hosted one with
`bash scripts/deploy-studio.sh` whenever the schema changes, or editors will be filling in
a stale set of fields.

`siteSettings` is a pinned singleton — one document, not creatable twice.

## Non-negotiables

These are enforced by tests or lint, not by memory. If one seems inconvenient, read why it
exists before working around it.

1. **Small teal text is `#2C7A74`, never `#4ABDB5`.** The accent teal is ~2.2:1 on white.
   Teal-filled buttons carry **ink** text, not white — white on the accent measures 2.27:1
   and failed the accessibility audit. `tests/unit/chipContrast.test.ts` pins this.
2. **CSS logical properties only.** `ms-`/`me-`/`ps-`/`pe-`/`text-start`. Never `ml-`/`mr-`/
   `text-left`. Enforced by ESLint across all of `src/`, including class strings built in
   variables and inline styles. This is what makes Phase 2 (Hebrew RTL) additive instead of
   a rewrite.
3. **Never phrase returns as promises.** Permitted: *targeted, projected, underwritten,
   estimated, pro forma*. Banned: *guaranteed, will return, assured, risk-free*. This is a
   compliance rule. Scanned in source and in every CMS document.
4. **One canonical URL per property:** `/portfolio/[slug]`, whatever the status.
   `/track-record` is a view over sold properties and mints no URLs of its own.
5. **No placeholder figures ship.** Spec §9 lists every invented number. The denylist is
   `tests/shared/placeholders.ts`, checked against both source and CMS content.
6. **Queries use `defineQuery` with fields inlined.** Typegen only discovers queries
   declared that way and cannot resolve interpolated fragments. Written otherwise, typegen
   silently reports "0 queries" and the type safety this CMS was chosen for disappears.

## Traps that cost time

All of these bit during the build and are documented in the plan's Revisions section.

- `sanity.config.ts` needs **`'use client'`** as its first statement, or the Studio 500s
  with a `swr` error naming files you did not write.
- It also needs **`SANITY_STUDIO_*`** env names, not `NEXT_PUBLIC_*`. The Sanity CLI only
  inlines its own prefix — the hosted Studio builds and deploys fine, then dies in the
  browser with "Configuration must contain `projectId`".
- **Do not import from `src/sanity/schema/*` in a component.** Those files import the
  `sanity` package and will drag the whole Studio into the RSC graph. Shared vocabulary
  lives in `src/lib/propertyTaxonomy.ts`, which imports nothing.
- **Do not use Next's generated global types** (`LayoutProps`, `PageProps`). They exist
  only after a build, so they fail `tsc --noEmit` on a clean checkout and in CI.
- **CORS is per-origin.** `npx sanity cors add <origin> --credentials`, once each for
  localhost, Railway, and the production domain.
- Git Bash mangles a bare `/` in an env var into `C:/Program Files/Git/`. Pass flags, not
  paths.
- **A content edit does not appear on the next `npm run build`.** Next's Data Cache in
  `.next/cache/fetch-cache` serves the previous Sanity response, so the rebuild is
  silently stale. In production the publish webhook purges it; locally, delete that
  directory. This is why `/api/revalidate` exists and is not optional.
- **Portable Text needs `_key` on every block *and* every span.** Sanity accepts a write
  without them and the site renders fine — the Studio is where it breaks, with a "Missing
  keys" banner and reordering disabled. Nothing in build, lint, tests, or Lighthouse sees
  it.
- `sanity schema extract` refuses to overwrite `schema.json` without `--force`, so a
  `typegen` script lacking that flag fails on every run after the first.
- If `scripts/dev-preview.sh` is still running, Playwright will silently reuse it
  (`reuseExistingServer`) and test the **preview** dataset instead of your build. Check
  port 3000 before trusting an E2E result.

### Found on 2026-08-31

- **A migration is not deployable code.** Adding a field to the dataset ahead of the branch
  that reads it is safe; removing or moving one is a breaking change to production, because
  the deployed build still reads the old location and the publish webhook re-renders within
  seconds. This took the live homepage's call to action down. See
  `docs/deploys-and-migrations.md`.
- **A private dataset answers an unauthenticated query with `200` and an empty result**, not
  `401`. `count(*)` returns `0` for every type. A probe checking for a 4xx concludes the
  dataset is public when it is not — and seeing `200` and concluding investor PII is exposed
  is the same mistake in reverse.
- **Sanity's `required()` is Studio-side only.** It greys out Publish and gates nothing
  else — not the API, not a query, not `next build`. If the site cannot render without a
  field, the guard belongs in the code, and the pre-deploy check belongs in
  `content-integrity.test.ts`.
- **`setIfMissing` on an object is all-or-nothing.** A half-filled object is "present", so a
  backfill keyed on the parent skips it forever while the build keeps failing. Patch per
  leaf.
- **Next's `opengraph-image` file convention does not cascade to sibling routes.** Placed at
  `(site)/opengraph-image.tsx` it applied to `/` alone — `(site)` is a route group whose own
  page is the homepage — and the six sibling routes silently kept shipping with no card. A
  route handler at a fixed URL is what actually covers every page.
- **`openGraph.images: []` is not a fallback.** An empty array is an explicit "no image", so
  Next emits `twitter:card = summary` (the small variant that renders as a bare link)
  instead of falling through to a default. Omit the key.
- **`Band` owns its ground and measure.** Nesting it inside a page's own `max-w-[…] px-6`
  container stops its panel and rules short of the viewport, doubles the horizontal padding,
  and collapses its two-column layout. Render it as a sibling of the measure, never inside
  it.
- **The logical-properties ESLint rule matches ordinary prose.** It scans every string
  literal under `src/`, so a user-facing sentence containing "right" or "left" fails the
  build with a message about Tailwind utilities. Reword, or use the one-line disable the
  config sanctions.
- **`next/og` embeds only `Geist-Regular`.** `fontWeight: 700` in a share card selects a face
  that is not there, so it renders at regular weight — silently, and invisibly to every
  check. Pass a `fonts` array or drop the property.
- **CRLF comes back after a branch switch.** `core.autocrlf` is on, so a file that was LF in
  your working tree can be CRLF after `git checkout` — and a multi-line replacement keyed on
  `\n` then silently matches nothing. Normalise, edit, restore.
- **`gh pr checks --watch` exits early.** It settles on whichever checks exist when it
  starts, and the `build` job registers later — so it can exit `0` while `build` is still
  pending. Poll until no row reads `pending`.
- **Do not switch the worktree's branch while a review agent is running.** There is one
  working tree; moving it out from under a reader makes its job much harder. Let it finish,
  or give it a separate checkout.
- **`performance.getEntriesByType('resource')` accumulates across soft navigations.**
  Measuring page weight without a fresh load totals a previous page state as well — it
  reported 2046KB for a page that actually loads 817KB. Reload before measuring.

- **A bare `--apply` is not a backfill, it is a full content reset.** It runs
  `createOrReplace` over every property, team member, post and testimonial from the seed
  constants, so any wording the team has changed in the Studio since the last run is
  silently reverted. That is correct for the initial load and wrong for everything after
  it. Use `--only=<step>` to apply a single backfill; each step is independently
  idempotent, and the scoped run prints exactly which documents it will touch.

### Found on 2026-09-01

- **`npm start` does not replace a server already on port 3000.** The old process keeps the
  port and keeps serving the **previous build**, while the new one exits quietly. Two
  measurements were taken against stale markup before this was spotted — the unit tests were
  green the whole time, because they never touch the server. Kill the listener first:
  `netstat -ano | grep :3000`, then `taskkill //PID <pid> //F`. If a change you just made is
  not in the page, check this before you debug the change.
- **An overlaid header clips hero copy that is bottom-aligned.** The copy grows upward as it
  wraps, so it collides with the header only on a narrow viewport and only once the copy is
  long enough — at 375px the eyebrow began at y=62 while the header ran to y=68. Nothing in
  the build, tsc, lint or Lighthouse sees a 6px overlap, and desktop looks perfect. The
  overlay reserves `pt-24` for this. The copy is CMS text, so it can get longer at any time.
- **Full-bleed photography costs LCP, not bytes.** Going edge to edge *reduced* payload —
  703–717KB total against 725KB, images 362KB against 405KB — with no budget overage. A
  bigger photograph is nonetheless a bigger largest-contentful element by definition, so
  expect LCP to rise. Do not go looking for a byte regression that is not there.
- **One Lighthouse run against the deployed site tells you almost nothing.** Seven runs of
  the same commit on Railway returned `87, 87, 87, 97, 98, 87, 87`. Both clusters ship an
  identical payload (5 images, largest 125KB), so the ~10-point spread is container and CDN
  warmth, not the build. The slow cluster is LCP 3.7s / SI 3.9s, the fast one 2.4s / 2.3s.
  **Take at least five samples before believing a performance delta**, and never compare a
  `localhost` run against a deployed one — that mistake was made here and had to be
  retracted on PR #17.
- **Measure the same build you are reasoning about.** An intermediate build read 89 and
  LCP 3.8s locally. That was a real defect — the outgoing carousel slide's image was being
  unmounted the moment its fade began — not the cost of full-bleed. Re-measure after every
  fix, and re-measure the *baseline* too if you intend to quote a delta.
- **Lighthouse's `target-size` failure predates all of this.** The carousel dots are 10px,
  below the 24px WCAG 2.2 minimum, which is why accessibility scores 96 rather than 100 —
  on the live site too. Confirm against the deployed URL before attributing it to a change.
- **`npm run lighthouse` dies on Windows *after* it finishes.** `chrome-launcher` throws
  `EPERM` removing its own temp directory, so the script exits non-zero with a stack trace.
  `lh.json` has already been written by then — run `node scripts/lighthouse-report.mjs`
  against it rather than concluding the audit failed.

### Found on 2026-09-02

- **`sizes` describes the width the image is PAINTED at, not the width of its box.** With
  `object-cover` on a box taller than the crop is shaped, the photograph is scaled until it
  covers the height and the overflow is cropped off the sides — so the painted width is the
  viewport height times the crop's aspect. Making the hero full-height turned `100vw` from
  accurate into a fourfold understatement on a phone: measured at 375x812, the browser
  fetched the 1200w variant and painted it across 1444 CSS px, a 3.6x upscale over the
  entire first screen. Nothing sees this. Lighthouse's "properly size images" audit only
  looks for images that are too *large*, `tsc` and lint have no opinion, and desktop is
  genuinely unaffected because there the box is wider than the crop and width drives the
  cover. Check `naturalWidth` against the painted width, not against the box.
- **`naturalWidth` is reported in CSS pixels, not bitmap pixels, on an image with a
  `srcset`.** The UA divides by the density it derived from `sizes`, so an image that
  decoded at 1600px wide reports 625. Two measurements were misread as catastrophic
  upscaling before this was spotted. The bitmap width is the `w=` of `currentSrc`, capped by
  the source asset.
- **Use `svh` for a full-screen band, not `vh` or `dvh`.** `vh` ignores mobile browser
  chrome, so the bottom of the band — and anything positioned against it, here the slide
  dots — sits behind the address bar. `dvh` tracks the chrome as it collapses, which resizes
  the band mid-scroll and slides bottom-aligned copy down the screen while the reader is
  moving. `svh` is the viewport as it is when the page loads.
- **A hidden Browser pane never loads a lazily-loaded image.** `loading="lazy"` needs the
  page to be visible, so in a hidden pane every non-priority carousel slide stays at
  `naturalWidth: 0` and the band screenshots as a bare grey scrim. That reads exactly like
  a broken image or an over-dark overlay. Check `tabs_context` for "the Browser pane is
  currently hidden" before diagnosing what you see, or measure with Playwright instead.
- **Two hero source images are too small for a full-screen band**: Antioch Industrial at
  620x426 and Oak Forest K at 1222x811, against 1600x900 requested. Sanity's `fit=max`
  never upscales, so those two slides are served below the crop cap on every viewport.
  Antioch is already on the list of photography EM8 owes.

## Status

Tasks 1–15 complete. Task 14 descoped (see the plan). Task 16's infrastructure is built;
the deploy has not happened.

Content is live in the `production` dataset: ten properties with photography, six team
members, five hero stats, and the four success factors. Two realized deals carry their
real figures — Burbank 1.99x exiting 2022, Embassy 1.37x exiting 2023 — replacing the
invented ones spec §9 listed.

**Still empty on purpose.** Nothing invents a number: the municipal statistics, the
entitlement and zoning-litigation claims, Boulevard's target returns and retail suite
mix, and all three insight articles. The insights feed is therefore empty and one E2E
test skips because of it — that skip is the honest signal, not a bug.

Walk Score and Transit Score were built and then removed on 2026-08-30, pending an API
key. See the commit for the schema fields, query projection, and fact tiles if they come
back.

**Before launch:**

1. ~~Enter real content~~ — done. Supply the remaining spec §9 figures, then re-run
   `npm run test:content`.
2. Replace the draft disclaimer with counsel's version. Nothing automated will catch it —
   the draft reads like finished copy.
3. Deploy to Railway (an **EM8-owned team**, not a personal account — spec §8), add its
   CORS origin, set all env vars including the read token.
4. Point the Sanity publish webhook at `POST /api/revalidate` with an
   `x-revalidate-secret` header.
5. Confirm the Resend sender domain, or lead notifications fail silently to
   `emailed: false` — the lead is saved, but nobody is told.
6. Add a second owner to the GitHub org (spec §8 accepted this risk; it is still a single
   point of failure).
7. DNS cutover in Wix. Leave the old site up two weeks as a rollback path.
