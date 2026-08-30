# EM8 Properties Website — Phase 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the complete English-language em-8.com replacement — ten routes, Sanity-backed, lead capture working — live on Railway.

**Architecture:** Next.js App Router statically generates every page from Sanity at build time, revalidating on a publish webhook. Sanity Studio is embedded at `/studio` on EM8's own domain. Both forms write a `lead` document to Sanity first and send email second, so a mail outage never loses a lead. All layout uses CSS logical properties so Phase 2 (Hebrew/RTL) is additive rather than a rewrite.

**Tech Stack:** Next.js 16 (App Router), TypeScript (strict), Tailwind CSS v4, Sanity v6 (`next-sanity` v13), Vitest + Testing Library, Playwright, Resend, Railway. *(Revised 2026-08-30 — see Revisions R1.)*

**Spec:** `docs/superpowers/specs/2026-08-28-em8-website-design.md`

## Revisions — 2026-08-30 plan audit

Before implementation began, this plan was audited against the spec, against internal consistency, and against the current state of its dependencies. Fifteen issues were found; four were confirmed by execution rather than inspection. Each is recorded here with its resolution. Task bodies below are amended in place as each task is reached; this section is the record of *why*.

### R1 — Stack versions had aged out (resolved: build on current)

The plan specified Next.js 15 + Sanity v3, but Step 1 of Task 1 also said `create-next-app@latest`. Those now contradict each other: `latest` is Next 16.3.3, Sanity is 6.11.0, and `next-sanity@13` *requires* `next ^16` and `sanity ^5 || ^6`. The plan's literal pairing tops out at `next-sanity@9.12.3`, three majors behind.

**Decision:** build on Next 16 + Sanity 6 + `next-sanity` 13 + React 19. The architecture is unchanged — App Router, embedded `/studio`, GROQ-at-build, typegen. Only version numbers and the small API deltas move. Rationale is the spec's own §2.1: this rebuild exists because the last site was stranded on an inaccessible, unmaintainable stack. Launching a new one already three majors behind repeats the mistake.

Consequent scaffold changes, all verified against `create-next-app@16.3.3 --help`:
- `--no-turbopack` no longer exists (Turbopack is the default bundler; the only opt-out is `--rspack`). Flag dropped.
- The scaffold directory cannot be named `.em8-scaffold` — npm naming rules forbid a leading period. Used `em8-scaffold`.
- Scaffolded with `--skip-install`, then installed once after the move. Copying a populated `node_modules` between directories on Windows is slow and failure-prone.
- Next 16's scaffold emits `AGENTS.md` and `CLAUDE.md`. Both kept — a future developer picking this up is an explicit spec goal.

### R2 — Confirmed defects (fix in the task where each lands)

| # | Defect | Where | Resolution |
|---|---|---|---|
| A1 | `createClient` throws `Configuration must contain \`projectId\`` when env is unset, so any unit test importing a module that transitively builds the Sanity client dies at import. Breaks `image.test.ts`, `propertyCard.test.tsx`, `postCard.test.tsx`, `homepage.test.tsx`. **Verified by execution.** | Task 1 config, surfaces in Tasks 3/6/9/13 | Vitest `test.env` supplies dummy Sanity vars. Fixed in Task 1. |
| A2 | `toHaveTextContent` (jest-dom) is used in Task 11 but no `setupFiles` ever registers the matchers. | Task 1 config, surfaces in Task 11 | `tests/setup.ts` imports `@testing-library/jest-dom/vitest`; wired via `setupFiles`. Fixed in Task 1. |
| A3 | `formatDate` omits `timeZone`, so `2026-08-12T00:00:00Z` renders as **Aug 11, 2026** in `America/Chicago` — the author's own timezone — while the test asserts Aug 12. **Verified by execution.** | Task 9 | Pass `timeZone: 'UTC'`. |
| A4 | The Dockerfile passes no build-time env, but `next build` runs `generateStaticParams`, which fetches GROQ and needs `NEXT_PUBLIC_SANITY_PROJECT_ID` at build time. Deploy fails. | Task 16 | `ARG`/`ENV` for both `NEXT_PUBLIC_*` vars. |
| A5 | An E2E test asserts `meta[property="og:title"]` on an insights article, but that route's `generateMetadata` sets only `title`/`description`, and Next does not synthesize `og:title`. | Task 9 / Task 16 | Add `openGraph` to the insights metadata. |
| A6 | `opengraph-image.tsx` types `params` as a sync object while its sibling `generateMetadata` correctly uses `Promise<{slug}>`. Next 15+ passes a Promise. | Task 9 | Await `params`. |
| A7 | `await import('leaflet/dist/leaflet.css')` inside `useEffect` is not a supported bundler path, and Leaflet's default marker icons are separately known to break under bundlers. | Task 7 | Verify concretely at Task 7; expect a static CSS import plus an explicit icon fix. |

### R3 — Security and compliance (fix in the task where each lands)

| # | Issue | Where | Resolution |
|---|---|---|---|
| B1 | **Mass assignment → document-type forgery.** `parseLead` validates three fields then returns the raw request body; `submitLead` spreads it *after* `_type`, so `{"_type":"siteSettings",...}` writes a `siteSettings` document with the write token. The site reads `*[_type=="siteSettings"][0]` for `agoraPortalUrl` — the Investor Login destination. An attacker can repoint the investor login at a phishing host. | Task 10 | Whitelist fields explicitly; never spread untrusted input into a document. |
| B2 | `accreditedConfirmed` is declared `boolean` in the schema, but `FormData` yields the string `"on"` for a checked box and `parseLead` never validates it. This field is the 506(c) artifact. | Tasks 10, 11 | Coerce to a real boolean; validate server-side. |
| B3 | No spam protection on a public endpoint that writes to the CMS and sends email. | Tasks 10, 11 | Honeypot field plus basic rate limiting. |
| B4 | The Playwright "Keep in Touch" test submits against the live dataset, writing real lead documents and firing a real Resend email to the notification address on every CI push. | Task 16 | Route E2E submissions away from production data and email. |
| B5 | **The placeholder gate does not gate spec §9.** It greps for `Lorem / TODO / TBD / placeholder / example.com` — none of which match `2.1x`, `1.7x`, `0 zoning litigations`, `5 municipalities`, `90 units entitled`, `4 suites`, `6,200 SF`, or any invented Metra walk time. Every figure §9 forbids would ship green. | Task 15 | Hard-code §9's figures as an explicit denylist the content test rejects. |
| B6 | The promissory-language check scans only `property` and `post` documents — not `siteSettings`/`focusCard`/`testimonial`, and not the hardcoded copy in TSX, which is where most prose actually lives. | Task 15 | Extend to all document types and add a source-level check. |

### R4 — Specified in the spec, absent from the plan (scope decisions)

| # | Gap | Decision |
|---|---|---|
| C1 | `/portfolio` filter by asset class and status (spec §3). Task 6 renders a plain grid. | **In Phase 1.** Client-side filter over already-fetched data — no new queries, no routing. |
| C2 | `/insights` category filter (spec §3, and this plan's own file structure line). Task 9 renders a plain grid. | **In Phase 1.** Same approach as C1. |
| C3 | **No revalidation webhook.** The architecture promises publish → webhook → live in ~1 min, and `fetchSanity` tags every request `['sanity']` — but no `/api/revalidate` route exists anywhere, so the tags are dead code and Task 16 silently substitutes a full Railway redeploy. | **In Phase 1, done early.** Without it every content correction during Task 15 costs a full rebuild. |
| C4 | No `sitemap.ts` / `robots.ts`, on a site whose blog exists to be linked and ranked. | **In Phase 1.** Small, and it serves a stated goal. |
| C5 | Spec §6 asks for `error.tsx`/`not-found.tsx` per route segment; Task 16 ships root-only. | **Partially.** Root `error.tsx` + `not-found.tsx`, plus `not-found.tsx` on the two dynamic segments where a stale slug is the realistic 404. Six near-identical boundaries is ceremony. |

### R5 — Improvements adopted

- **D1 — Logical properties enforced repo-wide.** The rule was enforced by a single assertion inside `StatBand`'s test; nothing stopped `ml-4` in the other ~20 components. This is the constraint that makes Phase 2 cheap, so it gets an ESLint rule covering every file, not one test. Added in Task 1.
- **D3 — `StatBand` responsive columns.** It emitted N inline grid columns with no breakpoint; five stats on a 375px viewport gives ~75px columns. Fixed in Task 4.
- **D5 — `scripts/seed.ts`** is listed under Task 15's Files but no step ever writes it. Removed from the file list.
- **D6 — `LEAD_EXPORT_TOKEN`** is still required by Task 16 Step 7, orphaned by Task 14's descoping. Removed.

### R7 — Found during implementation, not during the audit

These four surfaced only by running the code. Recorded because the plan is the handover artifact, and each would otherwise cost a successor the same hour.

| # | Issue | Where | Resolution |
|---|---|---|---|
| R7-A | **`options: { maxLength: N }` is not a real Sanity option on string or text fields** — it exists only on `SlugOptions`, and TypeScript rejects it outright. The plan set it on `cardBlurb`, `excerpt`, and `bio`, *and* asserted it in three tests. So the plan tested a decorative property while the mechanism that actually enforces the cap went untested. | Task 2 | Removed the inert option. The cap is `validation: (r) => r.max(n)`, which is also what drives the Studio's live character counter — the guardrail spec §4 actually asks for. Tests now run the validation callback against a recording stand-in for `Rule` and assert the chain, so they verify enforcement rather than shape. |
| R7-B | **The Studio 500s without `'use client'` in `sanity.config.ts`.** Next pulls `sanity` into the RSC graph, where `swr` resolves to its `react-server` build, which has no default export. | Task 2 | Directive added as the first statement. See Task 2 Step 7. |
| R7-C | **`siteSettings` was a singleton in name only.** Nothing stopped an editor creating a second one, which `[0]` would silently ignore. | Task 2 | Pinned to a fixed document id via a custom structure; removed from the "create new" menu. |
| R7-D | **A new Sanity project trusts no origins**, so the Studio stops at "Connect this Studio to your project" no matter how correct the code is. The plan never mentions CORS. | Task 2, again at Task 16 | `npx sanity cors add <origin> --credentials`, once per origin. |

Two further notes for a successor:

- **Do not use Next 16's generated global types** (`LayoutProps`, `PageProps`) in this project. They exist only after `.next/types` is produced by a build, so they fail `tsc --noEmit` on a clean checkout — including in CI, which typechecks before it builds. Type route props explicitly.
- **The plan's stated test counts are unreliable.** Task 2 claims "PASS, 8 tests" for a file containing nine `it` blocks. Trust the runner, not the prose.

### R6 — Noted, deliberately not changed

- **D2 — teal contrast at point of use.** The palette constants are tested, but nothing stops `text-teal` on 11px text, which is the actual failure mode. A reliable lint rule would need to correlate colour and font-size utilities across a `className` string; not worth the complexity now. Guarded by review instead.
- **D4 — hardcoded marketing copy.** The Partners cards, the Investors "how an investment works" steps, and the homepage hero live in TSX, not Sanity. This is not the `constants.ts` fallback pattern the spec forbids — there is no shadow copy of CMS content — but it does mean the team cannot edit its own investor-facing copy without a developer. Recorded as a conscious Phase 1 tradeoff; revisit in Phase 3.
- **D7 — Node version drift.** Dockerfile and CI pin Node 20; the development machine runs Node 24. Both satisfy Next 16's floor. Left alone.

---

## Global Constraints

Every task's requirements implicitly include this section. Values are copied verbatim from the spec.

- **Node:** 20 or newer.
- **Ground:** `#FFFFFF`; alt panel `#F5F5F3`.
- **Text:** `#1A1A1A`; secondary `#555555`. **Rules:** `#D8D8D4`.
- **Accent:** `#4ABDB5` for fills, buttons, and figures 24px and above.
- **Small teal text:** `#2C7A74` is **required** below 24px. `#4ABDB5` measures ~2.2:1 on white and fails WCAG.
- **Teal occupies roughly 5–10% of any composition.** It is an accent, not a ground.
- **Type:** Inter everywhere. Oswald **only** for the wordmark and property titles, always uppercase.
- **Logical properties only.** Use `ms-`/`me-`/`ps-`/`pe-`/`text-start`/`text-end`. Never `ml-`/`mr-`/`pl-`/`pr-`/`text-left`/`text-right`. This is what makes Phase 2 cheap.
- **Max content width:** 1200px. **Radius:** 4px chips, 8px buttons and inputs, 12px cards.
- **Return language:** *targeted / projected / underwritten / estimated / pro forma* only. Never *guaranteed / will return / assured / risk-free*. Compliance rule, not style.
- **No `constants.ts` fallback content and no `sanity:sync` script.** Sanity is the single source of truth. Missing required content fails the build loudly.
- **Every property has exactly one canonical URL:** `/portfolio/[slug]`, regardless of status.
- **No placeholder figures ship.** Spec §9 lists every invented number; Task 15 replaces them.

## File Structure

```
sanity.config.ts                     Studio config, schema registration
sanity.cli.ts                        typegen + CLI config
src/app/
  layout.tsx                         Root shell, fonts, header/footer
  globals.css                        Tailwind v4 @theme tokens
  page.tsx                           Homepage
  portfolio/page.tsx                 Portfolio index
  portfolio/[slug]/page.tsx          Canonical property page
  track-record/page.tsx              View over sold properties
  insights/page.tsx                  Single feed, category filter
  insights/[slug]/page.tsx           Article
  insights/[slug]/opengraph-image.tsx  LinkedIn share card
  investors/page.tsx                 Agora login, how it works, Keep in Touch
  partners/page.tsx                  Kinzie/Advantage/municipalities, site submission
  about/page.tsx                     Purpose, four factors, team
  studio/[[...tool]]/page.tsx        Embedded Sanity Studio
  api/lead/route.ts                  Lead capture endpoint
src/sanity/
  client.ts                          Read client
  writeClient.ts                     Server-only write client
  image.ts                           Image URL builder
  queries.ts                         All GROQ, one place
  schema/                            One file per document type
src/components/
  ui/                                Eyebrow, Button, Chip, StatBand, SectionHeading, Card
  layout/                            SiteHeader, SiteFooter
  property/                          PropertyCard, FactRail, PropertyMap
  insights/                          PostCard, PostBody
  forms/                             KeepInTouchForm, SiteSubmissionForm
src/lib/
  tokens.ts                          Palette constants, single source
  email.ts                           Sender interface + Resend implementation
  leads.ts                           Lead validation and persistence
  agoraCsv.ts                        Agora import-format export
tests/unit/                          Vitest
tests/e2e/                           Playwright
```

Files that change together live together: each page owns its route folder; shared primitives live in `ui/`; domain components sit beside the domain they serve.

---

### Task 1: Scaffold, design tokens, and the test harness

Establishes the project and encodes the contrast rule as an executable test, so it can never quietly regress.

**Files:**
- Create: `package.json`, `tsconfig.json`, `next.config.ts`, `vitest.config.ts`, `postcss.config.mjs`
- Create: `src/app/globals.css`, `src/app/layout.tsx`, `src/app/page.tsx`
- Create: `src/lib/tokens.ts`
- Test: `tests/unit/tokens.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: `palette` — a frozen object with keys `ground`, `panel`, `ink`, `inkSecondary`, `rule`, `teal`, `tealText`, each a `#RRGGBB` string. `contrastRatio(hex1: string, hex2: string): number`.

- [x] **Step 1: Scaffold the project**

The repo is **not empty** — it already holds `README.md`, `.gitignore`, and `docs/`. `create-next-app` refuses to scaffold into a directory with conflicting files, so scaffold into a temp directory and move the result in:

```bash
npx create-next-app@16.3.3 em8-scaffold \
  --typescript --tailwind --app --src-dir --use-npm \
  --import-alias "@/*" --eslint --disable-git --skip-install --yes

# move everything except the scaffold's own README and .gitignore
rm -f em8-scaffold/README.md em8-scaffold/.gitignore
cp -r em8-scaffold/. . && rm -rf em8-scaffold

npm install -D vitest @vitejs/plugin-react jsdom @testing-library/react @testing-library/jest-dom
```

`--import-alias "@/*"` is required — every import in this plan uses `@/`, and the default without it would break all of them.

**Amended 2026-08-30 (R1).** Four changes from the original command, each forced:
- Pinned to `@16.3.3` rather than `@latest`, so this plan stays reproducible as `latest` moves again.
- `--no-turbopack` was removed — the flag no longer exists in Next 16, where Turbopack is the default bundler.
- The target is `em8-scaffold`, not `.em8-scaffold`: npm naming rules reject a leading period and `create-next-app` refuses to run.
- `--skip-install` plus a single `npm install` after the move, instead of copying a populated `node_modules` across directories.

Then merge the Next-specific ignores (`next-env.d.ts`, `*.tsbuildinfo`, `/coverage`, Playwright output, `schema.json`) into the repo's existing `.gitignore`, and set `package.json`'s `name` to `em8-website`.

- [x] **Step 2: Configure Vitest**

```ts
// vitest.config.ts
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'node:path'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    include: ['tests/**/*.test.{ts,tsx}'],
    setupFiles: ['./tests/setup.ts'],
    // A1: `createClient` throws "Configuration must contain `projectId`" when these are
    // unset, which kills any test importing a module that builds the Sanity client at
    // module scope. These are dummies — no unit test may reach the network.
    env: {
      NEXT_PUBLIC_SANITY_PROJECT_ID: 'test-project',
      NEXT_PUBLIC_SANITY_DATASET: 'test',
    },
  },
  resolve: { alias: { '@': path.resolve(__dirname, './src') } },
})
```

```ts
// tests/setup.ts
// A2: registers toHaveTextContent and the rest of the jest-dom matchers, which
// Task 11 asserts against. Without this, those matchers do not exist.
import '@testing-library/jest-dom/vitest'
```

Add to `package.json` scripts: `"test": "vitest run --dir tests/unit"`, `"test:watch": "vitest --dir tests/unit"`. Scoping to `tests/unit` from the start keeps Task 15's networked content suite out of the default run.

**Amended 2026-08-30 (A1, A2).** The original config had neither `env` nor `setupFiles`. Both were load-bearing and both were missing: without `env`, four of the plan's thirteen test files fail at import; without `setupFiles`, Task 11's assertions reference matchers that were never registered.

- [x] **Step 3: Write the failing test**

```ts
// tests/unit/tokens.test.ts
import { describe, it, expect } from 'vitest'
import { palette, contrastRatio } from '@/lib/tokens'

describe('brand palette', () => {
  it('uses the exact EM8 teal', () => {
    expect(palette.teal).toBe('#4ABDB5')
  })

  it('small teal text passes WCAG AA on white', () => {
    expect(contrastRatio(palette.tealText, palette.ground)).toBeGreaterThanOrEqual(4.5)
  })

  it('accent teal does NOT pass as body text — this is why tealText exists', () => {
    expect(contrastRatio(palette.teal, palette.ground)).toBeLessThan(4.5)
  })

  it('body text passes on both grounds', () => {
    expect(contrastRatio(palette.ink, palette.ground)).toBeGreaterThanOrEqual(4.5)
    expect(contrastRatio(palette.inkSecondary, palette.panel)).toBeGreaterThanOrEqual(4.5)
  })
})
```

- [x] **Step 4: Run it and watch it fail**

Run: `npm test`
Expected: FAIL — `Failed to resolve import "@/lib/tokens"`.

- [x] **Step 5: Implement the tokens**

```ts
// src/lib/tokens.ts
export const palette = Object.freeze({
  ground: '#FFFFFF',
  panel: '#F5F5F3',
  ink: '#1A1A1A',
  inkSecondary: '#555555',
  rule: '#D8D8D4',
  teal: '#4ABDB5',
  tealText: '#2C7A74',
})

function channel(v: number): number {
  const s = v / 255
  return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
}

function luminance(hex: string): number {
  const n = parseInt(hex.slice(1), 16)
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255]
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b)
}

export function contrastRatio(a: string, b: string): number {
  const [la, lb] = [luminance(a), luminance(b)]
  const [hi, lo] = la > lb ? [la, lb] : [lb, la]
  return (hi + 0.05) / (lo + 0.05)
}
```

- [x] **Step 6: Run the tests and confirm they pass**

Run: `npm test`
Expected: PASS, 4 tests.

- [x] **Step 7: Wire the tokens into Tailwind**

```css
/* src/app/globals.css */
@import "tailwindcss";

@theme {
  --color-ground: #FFFFFF;
  --color-panel: #F5F5F3;
  --color-ink: #1A1A1A;
  --color-ink-secondary: #555555;
  --color-rule: #D8D8D4;
  --color-teal: #4ABDB5;
  --color-teal-text: #2C7A74;
  --radius-chip: 4px;
  --radius-control: 8px;
  --radius-card: 12px;
}

/* `inline` so these resolve against the next/font variables set on <html> at runtime. */
@theme inline {
  --font-sans: var(--font-inter), system-ui, sans-serif;
  --font-display: var(--font-oswald), sans-serif;
}

body { background: var(--color-ground); color: var(--color-ink); }
```

**Amended 2026-08-30.** Two changes. Fonts moved into a separate `@theme inline` block referencing the `next/font` CSS variables — the original `'Inter', system-ui` names a family that `next/font` never registers globally, so it would have silently fallen through to `system-ui`. And the scaffold's `prefers-color-scheme` block was deleted rather than kept: spec §2.3 chose a light ground and accepted losing the dark LinkedIn match, so an automatic dark mode would reintroduce exactly the split that decision settled.

- [x] **Step 8: Enable strict TypeScript**

In `tsconfig.json`, confirm `"strict": true` and add `"noUncheckedIndexedAccess": true`.

**Note (2026-08-30).** Next 16 scaffolds `layout.tsx` using its generated global `LayoutProps<'/'>`. That type only exists once `.next/types` has been produced by a build, so it fails `tsc --noEmit` on a clean checkout — including in CI, which typechecks *before* building. Type route and layout props explicitly throughout this project; do not use the generated globals.

- [x] **Step 9: Enforce logical properties in the linter** *(added 2026-08-30, R5/D1)*

The original plan enforced the logical-properties rule with a single assertion inside `StatBand`'s test. That leaves ~20 other components unguarded, and this is the constraint that decides whether Phase 2 is additive or a rewrite. Add a `no-restricted-syntax` rule to `eslint.config.mjs` matching physical-direction utilities inside `className` — `ml-`/`mr-`/`pl-`/`pr-`/`left-`/`right-`/`border-l`/`border-r`/`rounded-l`/`rounded-r`/`text-left`/`text-right` — allowing variant prefixes (`sm:`, `hover:`) and negative values.

Verified against a probe file: catches all six violation forms including `sm:pl-6` and a template literal, and does not false-positive on `rounded-lg`, `prose`, `px-5`, `last:border-e-0`, or `start-0`.

Known gap: the rule is scoped to `className` attributes, so class strings assembled in intermediate variables (as `Button.tsx` does) are not covered. Review catches those.

- [x] **Step 10: Commit**

```bash
git add -A
git commit -m "feat: scaffold Next.js app with brand tokens and contrast tests"
```

---

### Task 2: Sanity schema and the embedded Studio

The content backbone. Every guardrail from spec §4 lives here — this is where the old guide's written warnings become rules the software enforces.

**Files:**
- Create: `sanity.config.ts`, `sanity.cli.ts`
- Create: `src/sanity/schema/{index,property,post,teamMember,heroStat,focusCard,testimonial,lead,siteSettings}.ts`
- Create: `src/app/studio/[[...tool]]/page.tsx`
- Test: `tests/unit/schema.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: `schemaTypes: SchemaTypeDefinition[]`. Document type names: `property`, `post`, `teamMember`, `heroStat`, `focusCard`, `testimonial`, `lead`, `siteSettings`. Property field names relied on by later tasks: `title`, `slug`, `assetClass`, `status`, `city`, `state`, `coordinates`, `metraStation`, `walkMinutes`, `unitCount`, `yearBuilt`, `cardBlurb`, `overview`, `businessPlan`, `gallery`, `dealStory`, `publiclyOffered`, `order`, `featured`.

- [x] **Step 1: Install Sanity**

```bash
npm install sanity next-sanity @sanity/vision @sanity/image-url styled-components
```

- [x] **Step 2: Write the failing schema tests**

```ts
// tests/unit/schema.test.ts
import { describe, it, expect } from 'vitest'
import { schemaTypes } from '@/sanity/schema'

const byName = (n: string) => schemaTypes.find((t: any) => t.name === n) as any
const field = (doc: any, n: string) => doc.fields.find((f: any) => f.name === n)

describe('property schema', () => {
  const property = byName('property')

  it('exists with a required unique slug', () => {
    expect(property).toBeDefined()
    expect(field(property, 'slug').validation).toBeDefined()
  })

  it('carries Metra station and walk minutes as first-class fields', () => {
    expect(field(property, 'metraStation')).toBeDefined()
    expect(field(property, 'walkMinutes').type).toBe('number')
  })

  it('caps the card blurb so it cannot overrun the card', () => {
    expect(field(property, 'cardBlurb').options?.maxLength).toBe(180)
  })

  it('hides deal story fields unless the property is sold', () => {
    expect(field(property, 'dealStory').hidden).toBeInstanceOf(Function)
    expect(field(property, 'dealStory').hidden({ parent: { status: 'stabilized' } })).toBe(true)
    expect(field(property, 'dealStory').hidden({ parent: { status: 'sold' } })).toBe(false)
  })

  it('defaults publiclyOffered to false so a 506(b) deal is never public by accident', () => {
    expect(field(property, 'publiclyOffered').initialValue).toBe(false)
  })
})

describe('teamMember schema', () => {
  it('caps bios at 200 characters', () => {
    expect(field(byName('teamMember'), 'bio').options?.maxLength).toBe(200)
  })

  it('enables hotspot cropping so portrait headshots keep their subject', () => {
    expect(field(byName('teamMember'), 'photo').options?.hotspot).toBe(true)
  })
})

describe('schema completeness', () => {
  it('registers every document type the site needs', () => {
    const names = schemaTypes.map((t: any) => t.name)
    for (const n of ['property', 'post', 'teamMember', 'heroStat', 'focusCard', 'testimonial', 'lead', 'siteSettings']) {
      expect(names).toContain(n)
    }
  })

  it('does not register pullQuote — the Buffett quote was cut', () => {
    expect(schemaTypes.map((t: any) => t.name)).not.toContain('pullQuote')
  })
})
```

- [x] **Step 3: Run and watch it fail**

Run: `npm test tests/unit/schema.test.ts`
Expected: FAIL — cannot resolve `@/sanity/schema`.

- [x] **Step 4: Implement the property schema**

```ts
// src/sanity/schema/property.ts
import { defineType, defineField } from 'sanity'

export const ASSET_CLASSES = ['multifamily', 'mixed-use', 'townhomes', 'industrial', 'senior'] as const
export const STATUSES = ['stabilized', 'lease-up', 'under-construction', 'renovation-complete', 'sold'] as const

export const property = defineType({
  name: 'property', title: 'Property', type: 'document',
  fields: [
    defineField({ name: 'title', type: 'string', validation: (r) => r.required() }),
    defineField({
      name: 'slug', type: 'slug', options: { source: 'title', maxLength: 96 },
      validation: (r) => r.required(),
    }),
    defineField({
      name: 'assetClass', type: 'string',
      options: { list: ASSET_CLASSES.map((v) => ({ title: v, value: v })) },
      validation: (r) => r.required(),
    }),
    defineField({
      name: 'status', type: 'string',
      options: { list: STATUSES.map((v) => ({ title: v, value: v })) },
      validation: (r) => r.required(),
    }),
    defineField({ name: 'city', type: 'string', validation: (r) => r.required() }),
    defineField({ name: 'state', type: 'string', initialValue: 'IL', validation: (r) => r.required() }),
    defineField({
      name: 'coordinates', title: 'Map location', type: 'geopoint',
      description: 'Right-click the spot in Google Maps and click the numbers to copy.',
      validation: (r) => r.required(),
    }),
    defineField({ name: 'metraStation', title: 'Nearest Metra station', type: 'string' }),
    defineField({
      name: 'walkMinutes', title: 'Walk to station (minutes)', type: 'number',
      validation: (r) => r.min(0).max(60),
    }),
    defineField({ name: 'unitCount', title: 'Units', type: 'number' }),
    defineField({ name: 'squareFeet', type: 'number' }),
    defineField({ name: 'yearBuilt', type: 'number' }),
    defineField({ name: 'yearRenovated', type: 'number' }),
    defineField({
      name: 'cardBlurb', title: 'Card blurb', type: 'text', rows: 3,
      options: { maxLength: 180 },
      validation: (r) => r.required().max(180),
    }),
    defineField({ name: 'overview', type: 'array', of: [{ type: 'block' }] }),
    defineField({ name: 'businessPlan', type: 'array', of: [{ type: 'block' }] }),
    defineField({
      name: 'gallery', type: 'array',
      of: [{
        type: 'image', options: { hotspot: true },
        fields: [defineField({
          name: 'alt', type: 'string', title: 'Alt text',
          validation: (r) => r.required(),
        })],
      }],
    }),
    defineField({
      name: 'dealStory', title: 'Deal story', type: 'object',
      hidden: ({ parent }: any) => parent?.status !== 'sold',
      fields: [
        defineField({ name: 'acquired', type: 'text', rows: 3 }),
        defineField({ name: 'executed', type: 'text', rows: 3 }),
        defineField({ name: 'exited', type: 'text', rows: 3 }),
        defineField({ name: 'equityMultiple', title: 'Realized equity multiple', type: 'string' }),
        defineField({ name: 'exitYear', type: 'number' }),
      ],
    }),
    defineField({
      name: 'publiclyOffered', title: 'Show offering publicly', type: 'boolean',
      description: 'Only enable for offerings filed under Rule 506(c). Hides target returns and the deal room when off.',
      initialValue: false,
    }),
    defineField({ name: 'featured', type: 'boolean', initialValue: false }),
    defineField({ name: 'order', type: 'number', initialValue: 100 }),
  ],
  preview: {
    select: { title: 'title', subtitle: 'city', media: 'gallery.0' },
  },
})
```

- [x] **Step 5: Implement the remaining schemas**

```ts
// src/sanity/schema/teamMember.ts
import { defineType, defineField } from 'sanity'

export const teamMember = defineType({
  name: 'teamMember', type: 'document',
  fields: [
    defineField({ name: 'name', type: 'string', validation: (r) => r.required() }),
    defineField({ name: 'role', type: 'string', validation: (r) => r.required() }),
    defineField({
      name: 'bio', type: 'text', rows: 3, options: { maxLength: 200 },
      validation: (r) => r.max(200),
    }),
    defineField({
      name: 'photo', type: 'image', options: { hotspot: true },
      fields: [defineField({ name: 'alt', type: 'string', validation: (r) => r.required() })],
    }),
    defineField({ name: 'linkedin', title: 'LinkedIn URL', type: 'url' }),
    defineField({ name: 'order', type: 'number', initialValue: 100 }),
  ],
})
```

```ts
// src/sanity/schema/testimonial.ts
import { defineType, defineField } from 'sanity'

export const testimonial = defineType({
  name: 'testimonial', type: 'document',
  fields: [
    defineField({ name: 'quote', type: 'text', rows: 4, validation: (r) => r.required() }),
    defineField({ name: 'attribution', title: 'Name', type: 'string', validation: (r) => r.required() }),
    defineField({ name: 'descriptor', title: 'Role or descriptor', type: 'string' }),
    defineField({ name: 'investorSince', type: 'number' }),
    defineField({
      name: 'consentOnRecord', title: 'Written consent on file', type: 'boolean',
      description: 'Do not publish an investor name without it.',
      initialValue: false, validation: (r) => r.required(),
    }),
    defineField({ name: 'featured', type: 'boolean', initialValue: false }),
    defineField({ name: 'order', type: 'number', initialValue: 100 }),
  ],
})
```

```ts
// src/sanity/schema/post.ts
import { defineType, defineField } from 'sanity'

export const POST_CATEGORIES = ['municipal-partnership', 'design', 'operations', 'market', 'announcement'] as const

export const post = defineType({
  name: 'post', type: 'document',
  fields: [
    defineField({ name: 'title', type: 'string', validation: (r) => r.required() }),
    defineField({ name: 'slug', type: 'slug', options: { source: 'title' }, validation: (r) => r.required() }),
    defineField({ name: 'publishedAt', type: 'datetime', validation: (r) => r.required() }),
    defineField({
      name: 'category', type: 'string',
      options: { list: POST_CATEGORIES.map((v) => ({ title: v, value: v })) },
      validation: (r) => r.required(),
    }),
    defineField({ name: 'excerpt', type: 'text', rows: 3, options: { maxLength: 200 }, validation: (r) => r.required().max(200) }),
    defineField({
      name: 'heroImage', type: 'image', options: { hotspot: true },
      fields: [defineField({ name: 'alt', type: 'string', validation: (r) => r.required() })],
    }),
    defineField({ name: 'body', type: 'array', of: [{ type: 'block' }, { type: 'image', options: { hotspot: true } }] }),
    defineField({ name: 'relatedProperty', type: 'reference', to: [{ type: 'property' }] }),
  ],
})
```

```ts
// src/sanity/schema/heroStat.ts
import { defineType, defineField } from 'sanity'

export const heroStat = defineType({
  name: 'heroStat', type: 'document',
  fields: [
    defineField({
      name: 'figure', type: 'string',
      description: 'Exactly as it should appear, including $ , + and %.',
      validation: (r) => r.required(),
    }),
    defineField({ name: 'label', type: 'string', validation: (r) => r.required() }),
    defineField({ name: 'order', type: 'number', initialValue: 100 }),
  ],
})
```

```ts
// src/sanity/schema/focusCard.ts
import { defineType, defineField } from 'sanity'

export const focusCard = defineType({
  name: 'focusCard', title: 'Success factor', type: 'document',
  fields: [
    defineField({ name: 'title', type: 'string', validation: (r) => r.required() }),
    defineField({ name: 'description', type: 'text', rows: 4, validation: (r) => r.required() }),
    defineField({ name: 'order', type: 'number', initialValue: 100 }),
  ],
})
```

```ts
// src/sanity/schema/lead.ts
import { defineType, defineField } from 'sanity'

export const lead = defineType({
  name: 'lead', type: 'document',
  fields: [
    defineField({ name: 'source', type: 'string', options: { list: ['keep-in-touch', 'site-submission'] }, readOnly: true }),
    defineField({ name: 'firstName', type: 'string', readOnly: true }),
    defineField({ name: 'lastName', type: 'string', readOnly: true }),
    defineField({ name: 'email', type: 'string', readOnly: true }),
    defineField({ name: 'phone', type: 'string', readOnly: true }),
    defineField({ name: 'investorType', type: 'string', readOnly: true }),
    defineField({ name: 'checkSize', type: 'string', readOnly: true }),
    defineField({ name: 'accreditedConfirmed', type: 'boolean', readOnly: true }),
    defineField({ name: 'propertyAddress', type: 'string', readOnly: true }),
    defineField({ name: 'message', type: 'text', readOnly: true }),
    defineField({ name: 'submittedAt', type: 'datetime', readOnly: true }),
    defineField({ name: 'exportedToAgora', type: 'boolean', initialValue: false }),
  ],
  preview: { select: { title: 'email', subtitle: 'source' } },
})
```

```ts
// src/sanity/schema/siteSettings.ts
import { defineType, defineField } from 'sanity'

export const siteSettings = defineType({
  name: 'siteSettings', type: 'document',
  fields: [
    defineField({ name: 'agoraPortalUrl', title: 'Investor Login URL', type: 'url', validation: (r) => r.required() }),
    defineField({ name: 'contactEmail', type: 'string', validation: (r) => r.required() }),
    defineField({ name: 'defaultShareImage', type: 'image' }),
    defineField({ name: 'disclaimer', type: 'text', rows: 5, validation: (r) => r.required() }),
  ],
})
```

```ts
// src/sanity/schema/index.ts
import type { SchemaTypeDefinition } from 'sanity'
import { property } from './property'
import { post } from './post'
import { teamMember } from './teamMember'
import { heroStat } from './heroStat'
import { focusCard } from './focusCard'
import { testimonial } from './testimonial'
import { lead } from './lead'
import { siteSettings } from './siteSettings'

export const schemaTypes: SchemaTypeDefinition[] = [
  property, post, teamMember, heroStat, focusCard, testimonial, lead, siteSettings,
]
```

- [x] **Step 6: Run the tests and confirm they pass**

Run: `npm test tests/unit/schema.test.ts`
Expected: PASS, 8 tests.

- [x] **Step 7: Configure Sanity and embed the Studio**

Create the project at sanity.io/manage under an EM8-owned organisation, then put the IDs in `.env.local`:

```
NEXT_PUBLIC_SANITY_PROJECT_ID=<from sanity.io/manage>
NEXT_PUBLIC_SANITY_DATASET=production
```

```ts
// sanity.config.ts
'use client'

import { defineConfig } from 'sanity'
import { structureTool } from 'sanity/structure'
import { visionTool } from '@sanity/vision'
import { schemaTypes } from './src/sanity/schema'

const SINGLETONS = ['siteSettings'] as const

export default defineConfig({
  basePath: '/studio',
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID!,
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET!,
  schema: { types: schemaTypes },
  plugins: [
    structureTool({
      structure: (S) =>
        S.list().title('Content').items([
          S.listItem().title('Site settings').id('siteSettings')
            .child(S.document().schemaType('siteSettings').documentId('siteSettings')),
          S.divider(),
          ...S.documentTypeListItems().filter(
            (item) => !SINGLETONS.includes(item.getId() as (typeof SINGLETONS)[number]),
          ),
        ]),
    }),
    visionTool(),
  ],
  document: {
    newDocumentOptions: (prev) =>
      prev.filter((t) => !SINGLETONS.includes(t.templateId as (typeof SINGLETONS)[number])),
  },
})
```

**Amended 2026-08-30 (R7-B, R7-C).** Two changes, both found by running it:

**`'use client'` is mandatory and must be the first statement.** Without it the Studio returns HTTP 500. Next pulls the whole `sanity` package into the React Server Component graph, where `swr` resolves via its `react-server` export condition to a build with no default export — while Sanity does `import useSWR from "swr"`. The failure reads `Export default doesn't exist in target module`, names `swr`, and gives ten import traces, none of which point at anything you wrote. Sanity's own embedding guide requires the directive; the original plan omitted it.

**`siteSettings` is pinned as a singleton.** Spec §4 calls it a singleton but nothing enforced that. The default Studio lets an editor create a second `siteSettings` document, and `SITE_SETTINGS_QUERY` takes `[0]` — so edits would land in a document the site never reads, with no error anywhere. The custom structure binds it to one known id and drops it from the global "create new" menu.

```tsx
// src/app/studio/[[...tool]]/page.tsx
import { NextStudio } from 'next-sanity/studio'
import config from '../../../../sanity.config'

export const dynamic = 'force-static'
export { metadata, viewport } from 'next-sanity/studio'

export default function StudioPage() {
  return <NextStudio config={config} />
}
```

- [ ] **Step 8: Register the CORS origin, then verify the Studio loads**

**Added 2026-08-30 (R7-D).** The original step went straight to "open the Studio and create a property". It cannot: a new Sanity project trusts no origins, so the Studio boots and then stops on its own *"Connect this Studio to your project"* screen. This is project configuration, not code, and it is invisible until you run it.

```bash
npx sanity cors add http://localhost:3000 --credentials
```

Add the deployed Railway origin the same way at Task 16, and the production domain at cutover. Each origin must be registered separately.

Then run: `npm run dev`, open `http://localhost:3000/studio`.
Expected: Studio renders with all eight document types in the sidebar, and `Site settings` pinned above a divider as a singleton. Create one property and confirm the deal-story fields stay hidden until status is set to `sold`.

**Status 2026-08-30.** Verified automatically: the route serves HTTP 200 on a cleared `.next` cache with zero bundler errors, the CORS origin is registered (`sanity cors list` shows `http://localhost:3000`), and the Studio boots to Sanity's login provider chooser. All eight document types are asserted as registered by `tests/unit/schema.test.ts`, and the deal-story conditional is asserted directly — `hidden({ parent: { status: 'stabilized' } })` is `true`, `'sold'` is `false` — so that guardrail is covered by test regardless of the Studio walkthrough.

Outstanding and **owned by a human**: signing in to Sanity and clicking through the Studio once. That confirms the sidebar and singleton render as intended, which no automated check here covers.

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "feat: add Sanity schema with editor guardrails and embedded Studio"
```

---

### Task 3: Sanity client, typed queries, and the image builder

One place for all GROQ. Generated types mean a renamed field breaks the build instead of blanking a section in production.

**Files:**
- Create: `src/sanity/client.ts`, `src/sanity/image.ts`, `src/sanity/queries.ts`
- Test: `tests/unit/image.test.ts`, `tests/unit/queries.test.ts`

**Interfaces:**
- Consumes: schema from Task 2.
- Produces: `sanityClient`, `urlForImage(source): ImageUrlBuilder`, and named query constants `ALL_PROPERTIES_QUERY`, `PROPERTY_BY_SLUG_QUERY`, `SOLD_PROPERTIES_QUERY`, `ALL_POSTS_QUERY`, `POST_BY_SLUG_QUERY`, `TEAM_QUERY`, `HERO_STATS_QUERY`, `FOCUS_CARDS_QUERY`, `TESTIMONIALS_QUERY`, `SITE_SETTINGS_QUERY`. Also `fetchSanity<T>(query, params?): Promise<T>`.

- [ ] **Step 1: Write the failing tests**

```ts
// tests/unit/queries.test.ts
import { describe, it, expect } from 'vitest'
import {
  ALL_PROPERTIES_QUERY, SOLD_PROPERTIES_QUERY, POST_BY_SLUG_QUERY,
} from '@/sanity/queries'

describe('GROQ queries', () => {
  it('orders properties by their order field', () => {
    expect(ALL_PROPERTIES_QUERY).toContain('order(order asc)')
  })

  it('track record selects only sold properties', () => {
    expect(SOLD_PROPERTIES_QUERY).toContain('status == "sold"')
  })

  it('a post resolves its related property slug for cross-linking', () => {
    expect(POST_BY_SLUG_QUERY).toContain('relatedProperty->')
  })
})
```

```ts
// tests/unit/image.test.ts
import { describe, it, expect } from 'vitest'
import { urlForImage } from '@/sanity/image'

const ref = { asset: { _ref: 'image-abc123-2000x1500-jpg' } }

describe('urlForImage', () => {
  it('serves a resized, auto-format image rather than the original', () => {
    const url = urlForImage(ref).width(800).url()
    expect(url).toContain('w=800')
    expect(url).toContain('auto=format')
  })
})
```

- [ ] **Step 2: Run and watch them fail**

Run: `npm test tests/unit/queries.test.ts tests/unit/image.test.ts`
Expected: FAIL — modules not found.

- [ ] **Step 3: Implement the client and image builder**

```ts
// src/sanity/client.ts
import { createClient } from 'next-sanity'

export const sanityClient = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID!,
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET!,
  apiVersion: '2026-01-01',
  useCdn: true,
})

export async function fetchSanity<T>(query: string, params: Record<string, unknown> = {}): Promise<T> {
  return sanityClient.fetch<T>(query, params, { next: { tags: ['sanity'] } })
}
```

```ts
// src/sanity/image.ts
import imageUrlBuilder from '@sanity/image-url'
import { sanityClient } from './client'

const builder = imageUrlBuilder(sanityClient)

export function urlForImage(source: unknown) {
  return builder.image(source as never).auto('format').fit('max')
}
```

- [ ] **Step 4: Implement the queries**

```ts
// src/sanity/queries.ts
const PROPERTY_CARD_FIELDS = `
  _id, title, "slug": slug.current, assetClass, status, city, state,
  metraStation, walkMinutes, unitCount, yearBuilt, cardBlurb,
  "image": gallery[0]
`

export const ALL_PROPERTIES_QUERY = `
  *[_type == "property"] | order(order asc) { ${PROPERTY_CARD_FIELDS} }
`

export const PROPERTY_BY_SLUG_QUERY = `
  *[_type == "property" && slug.current == $slug][0] {
    ${PROPERTY_CARD_FIELDS}, squareFeet, yearRenovated, overview, businessPlan,
    gallery, coordinates, dealStory, publiclyOffered,
    "relatedPosts": *[_type == "post" && relatedProperty._ref == ^._id] | order(publishedAt desc) {
      title, "slug": slug.current, publishedAt
    }
  }
`

export const PROPERTY_SLUGS_QUERY = `*[_type == "property" && defined(slug.current)].slug.current`

export const SOLD_PROPERTIES_QUERY = `
  *[_type == "property" && status == "sold"] | order(dealStory.exitYear desc) {
    ${PROPERTY_CARD_FIELDS}, dealStory
  }
`

export const ALL_POSTS_QUERY = `
  *[_type == "post"] | order(publishedAt desc) {
    _id, title, "slug": slug.current, publishedAt, category, excerpt, heroImage
  }
`

export const POST_BY_SLUG_QUERY = `
  *[_type == "post" && slug.current == $slug][0] {
    title, "slug": slug.current, publishedAt, category, excerpt, heroImage, body,
    relatedProperty-> { title, "slug": slug.current, city, unitCount, walkMinutes, "image": gallery[0] }
  }
`

export const POST_SLUGS_QUERY = `*[_type == "post" && defined(slug.current)].slug.current`

export const TEAM_QUERY = `*[_type == "teamMember"] | order(order asc) { _id, name, role, bio, photo, linkedin }`

export const HERO_STATS_QUERY = `*[_type == "heroStat"] | order(order asc) { _id, figure, label }`

export const FOCUS_CARDS_QUERY = `*[_type == "focusCard"] | order(order asc) { _id, title, description }`

export const TESTIMONIALS_QUERY = `
  *[_type == "testimonial" && consentOnRecord == true] | order(order asc) {
    _id, quote, attribution, descriptor, investorSince, featured
  }
`

export const SITE_SETTINGS_QUERY = `*[_type == "siteSettings"][0] { agoraPortalUrl, contactEmail, disclaimer, defaultShareImage }`
```

Note the testimonials query filters on `consentOnRecord` — an investor's name cannot reach the site without it.

- [x] **Step 5: Run the tests and confirm they pass**

Run: `npm test tests/unit/queries.test.ts tests/unit/image.test.ts`
Expected: PASS, 4 tests.

- [ ] **Step 6: Generate types**

```bash
npx sanity@latest schema extract --path=schema.json
npx sanity@latest typegen generate
```

Add to `package.json`: `"typegen": "sanity schema extract --path=schema.json && sanity typegen generate"`.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat: add Sanity client, GROQ queries, and generated types"
```

---

### Task 4: UI primitives

The shared vocabulary every page uses. Building these once is what keeps the site consistent when a future developer adds a page.

**Files:**
- Create: `src/components/ui/{Eyebrow,Button,Chip,SectionHeading,StatBand,Card}.tsx`
- Test: `tests/unit/ui.test.tsx`

**Interfaces:**
- Consumes: `palette` from Task 1.
- Produces:
  - `<Eyebrow>{children}</Eyebrow>`
  - `<Button href: string, variant?: 'primary' | 'secondary', children>`
  - `<Chip kind: AssetClass | Status>` — maps to the status colour set
  - `<SectionHeading eyebrow: string, title: string, intro?: string>`
  - `<StatBand stats: { figure: string; label: string }[]>`
  - `<Card>` wrapper with the 12px radius and rule border

- [ ] **Step 1: Write the failing tests**

```tsx
// tests/unit/ui.test.tsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Eyebrow } from '@/components/ui/Eyebrow'
import { Chip } from '@/components/ui/Chip'
import { StatBand } from '@/components/ui/StatBand'

describe('Eyebrow', () => {
  it('renders uppercase with the accessible teal, not the accent teal', () => {
    const { container } = render(<Eyebrow>Portfolio</Eyebrow>)
    const el = container.firstChild as HTMLElement
    expect(el.className).toContain('text-teal-text')
    expect(el.className).toContain('uppercase')
  })
})

describe('Chip', () => {
  it('colours a sold chip with the neutral status colour', () => {
    const { container } = render(<Chip kind="sold" />)
    expect((container.firstChild as HTMLElement).style.backgroundColor).toBe('rgb(96, 125, 139)')
  })

  it('renders a readable label rather than the raw slug', () => {
    render(<Chip kind="mixed-use" />)
    expect(screen.getByText('Mixed-Use')).toBeDefined()
  })
})

describe('StatBand', () => {
  it('renders every stat with its figure and label', () => {
    render(<StatBand stats={[{ figure: '$100M+', label: 'Assets Under Management' }]} />)
    expect(screen.getByText('$100M+')).toBeDefined()
    expect(screen.getByText('Assets Under Management')).toBeDefined()
  })

  it('uses logical padding so RTL mirrors correctly in Phase 2', () => {
    const { container } = render(<StatBand stats={[{ figure: '1', label: 'x' }]} />)
    expect(container.innerHTML).not.toMatch(/\bpl-|\bpr-|\bml-|\bmr-/)
  })
})
```

- [ ] **Step 2: Run and watch them fail**

Run: `npm test tests/unit/ui.test.tsx`
Expected: FAIL — components not found.

- [ ] **Step 3: Implement the primitives**

```tsx
// src/components/ui/Eyebrow.tsx
export function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-teal-text uppercase text-[10px] font-semibold tracking-[0.24em]">
      {children}
    </p>
  )
}
```

```tsx
// src/components/ui/Chip.tsx
const CHIP_COLORS: Record<string, string> = {
  'multifamily': '#00BCD4',
  'mixed-use': '#0288D1',
  'townhomes': '#4CAF50',
  'industrial': '#FF9800',
  'senior': '#607D8B',
  'stabilized': '#4ABDB5',
  'lease-up': '#4ABDB5',
  'under-construction': '#0288D1',
  'renovation-complete': '#4CAF50',
  'sold': '#607D8B',
}

const LABELS: Record<string, string> = {
  'multifamily': 'Multifamily', 'mixed-use': 'Mixed-Use', 'townhomes': 'Townhomes',
  'industrial': 'Industrial', 'senior': 'Senior Living', 'stabilized': 'Stabilized',
  'lease-up': 'In Lease-Up', 'under-construction': 'Under Construction',
  'renovation-complete': 'Renovation Complete', 'sold': 'Sold',
}

export function Chip({ kind }: { kind: string }) {
  return (
    <span
      className="inline-block rounded-chip px-2 py-1 text-[8px] font-semibold uppercase tracking-[0.13em] text-white"
      style={{ backgroundColor: CHIP_COLORS[kind] ?? '#607D8B' }}
    >
      {LABELS[kind] ?? kind}
    </span>
  )
}
```

```tsx
// src/components/ui/StatBand.tsx
export function StatBand({ stats }: { stats: { figure: string; label: string }[] }) {
  return (
    <div className="grid border-y border-rule bg-panel" style={{ gridTemplateColumns: `repeat(${stats.length}, minmax(0, 1fr))` }}>
      {stats.map((s) => (
        <div key={s.label} className="border-e border-rule px-5 py-5 last:border-e-0">
          <div className="text-2xl font-bold tracking-tight text-ink">{s.figure}</div>
          <div className="mt-1 text-[8px] font-semibold uppercase tracking-[0.16em] text-ink-secondary">{s.label}</div>
        </div>
      ))}
    </div>
  )
}
```

```tsx
// src/components/ui/Button.tsx
import Link from 'next/link'

export function Button({ href, variant = 'primary', children }: {
  href: string; variant?: 'primary' | 'secondary'; children: React.ReactNode
}) {
  const base = 'inline-block rounded-control px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wide'
  const style = variant === 'primary'
    ? 'bg-teal text-white hover:bg-[#3AA8A0]'
    : 'border border-rule text-ink hover:border-teal'
  return <Link href={href} className={`${base} ${style}`}>{children}</Link>
}
```

```tsx
// src/components/ui/SectionHeading.tsx
import { Eyebrow } from './Eyebrow'

export function SectionHeading({ eyebrow, title, intro }: {
  eyebrow: string; title: string; intro?: string
}) {
  return (
    <div className="max-w-2xl">
      <Eyebrow>{eyebrow}</Eyebrow>
      <h2 className="mt-3 text-3xl font-bold leading-tight tracking-tight text-ink">{title}</h2>
      {intro && <p className="mt-3 text-sm leading-relaxed text-ink-secondary">{intro}</p>}
    </div>
  )
}
```

```tsx
// src/components/ui/Card.tsx
export function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <div className={`overflow-hidden rounded-card border border-rule bg-ground ${className}`}>{children}</div>
}
```

- [x] **Step 4: Run the tests and confirm they pass**

Run: `npm test tests/unit/ui.test.tsx`
Expected: PASS, 4 tests.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: add UI primitives with logical-property layout"
```

---

### Task 5: Layout shell

**Files:**
- Create: `src/components/layout/SiteHeader.tsx`, `src/components/layout/SiteFooter.tsx`
- Modify: `src/app/layout.tsx`
- Test: `tests/unit/header.test.tsx`

**Interfaces:**
- Consumes: `SITE_SETTINGS_QUERY`, `fetchSanity` from Task 3; `Button` from Task 4.
- Produces: `<SiteHeader agoraUrl: string />`, `<SiteFooter disclaimer: string />`.

- [x] **Step 1: Write the failing test**

```tsx
// tests/unit/header.test.tsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { SiteHeader } from '@/components/layout/SiteHeader'

describe('SiteHeader', () => {
  it('links Investor Login straight to Agora, opening off-site', () => {
    render(<SiteHeader agoraUrl="https://em8.agorareal.com" />)
    const link = screen.getByRole('link', { name: /investor login/i })
    expect(link.getAttribute('href')).toBe('https://em8.agorareal.com')
    expect(link.getAttribute('rel')).toContain('noopener')
  })

  it('exposes every primary route', () => {
    render(<SiteHeader agoraUrl="https://x.test" />)
    for (const label of ['Portfolio', 'Track Record', 'Insights', 'Partners', 'About']) {
      expect(screen.getByRole('link', { name: label })).toBeDefined()
    }
  })
})
```

- [x] **Step 2: Run and watch it fail**

Run: `npm test tests/unit/header.test.tsx`
Expected: FAIL — `SiteHeader` not found.

- [ ] **Step 3: Implement the header and footer**

```tsx
// src/components/layout/SiteHeader.tsx
import Link from 'next/link'

const NAV = [
  { href: '/portfolio', label: 'Portfolio' },
  { href: '/track-record', label: 'Track Record' },
  { href: '/insights', label: 'Insights' },
  { href: '/partners', label: 'Partners' },
  { href: '/about', label: 'About' },
]

export function SiteHeader({ agoraUrl }: { agoraUrl: string }) {
  return (
    <header className="border-b border-rule">
      <div className="mx-auto flex max-w-[1200px] items-center justify-between px-6 py-4">
        <Link href="/" className="font-display text-lg font-bold uppercase tracking-wide text-ink">
          EM8 <span className="font-light text-teal-text">Properties</span>
        </Link>
        <nav className="flex items-center gap-5 text-xs font-medium text-ink-secondary">
          {NAV.map((n) => (
            <Link key={n.href} href={n.href} className="hover:text-ink">{n.label}</Link>
          ))}
          <a
            href={agoraUrl} target="_blank" rel="noopener noreferrer"
            className="rounded-control border border-rule px-3 py-1.5 text-ink hover:border-teal"
          >
            Investor Login
          </a>
          <Link href="/investors" className="rounded-control bg-ink px-3 py-1.5 font-semibold uppercase tracking-wide text-white">
            Get Started
          </Link>
        </nav>
      </div>
    </header>
  )
}
```

```tsx
// src/components/layout/SiteFooter.tsx
export function SiteFooter({ disclaimer }: { disclaimer: string }) {
  return (
    <footer className="mt-16 border-t border-rule bg-panel">
      <div className="mx-auto max-w-[1200px] px-6 py-10">
        <p className="max-w-4xl text-[10px] leading-relaxed text-ink-secondary">{disclaimer}</p>
        <p className="mt-6 text-[10px] text-ink-secondary">
          © {new Date().getFullYear()} EM8 Properties. All rights reserved.
        </p>
      </div>
    </footer>
  )
}
```

- [ ] **Step 4: Wire them into the root layout**

```tsx
// src/app/layout.tsx
import './globals.css'
import { Inter, Oswald } from 'next/font/google'
import { SiteHeader } from '@/components/layout/SiteHeader'
import { SiteFooter } from '@/components/layout/SiteFooter'
import { fetchSanity } from '@/sanity/client'
import { SITE_SETTINGS_QUERY } from '@/sanity/queries'

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' })
const oswald = Oswald({ subsets: ['latin'], variable: '--font-oswald' })

type Settings = { agoraPortalUrl: string; disclaimer: string }

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const settings = await fetchSanity<Settings>(SITE_SETTINGS_QUERY)
  if (!settings) throw new Error('siteSettings document is missing — publish it in the Studio.')

  return (
    <html lang="en" dir="ltr" className={`${inter.variable} ${oswald.variable}`}>
      <body className="font-sans antialiased">
        <SiteHeader agoraUrl={settings.agoraPortalUrl} />
        <main>{children}</main>
        <SiteFooter disclaimer={settings.disclaimer} />
      </body>
    </html>
  )
}
```

The thrown error is deliberate: missing required content fails loudly rather than rendering a broken shell.

- [x] **Step 5: Run the tests and confirm they pass**

Run: `npm test tests/unit/header.test.tsx`
Expected: PASS, 2 tests.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: add site header and footer shell"
```

---

### Task 6: Property card and the portfolio index

**Files:**
- Create: `src/components/property/PropertyCard.tsx`, `src/app/portfolio/page.tsx`
- Create: `src/lib/format.ts`
- Test: `tests/unit/propertyCard.test.tsx`, `tests/unit/format.test.ts`

**Interfaces:**
- Consumes: `ALL_PROPERTIES_QUERY`, `urlForImage`, `Chip`, `Card`.
- Produces: `formatWalk(minutes?: number, station?: string): string | null`; `<PropertyCard property={PropertyCardData} />` where `PropertyCardData = { title, slug, assetClass, status, city, state, unitCount, walkMinutes, metraStation, cardBlurb, image }`.

- [ ] **Step 1: Write the failing tests**

```ts
// tests/unit/format.test.ts
import { describe, it, expect } from 'vitest'
import { formatWalk } from '@/lib/format'

describe('formatWalk', () => {
  it('renders the TOD claim as a countable fact', () => {
    expect(formatWalk(2, 'Tinley Park')).toBe('2 min walk · Tinley Park Metra')
  })

  it('returns null when the property is not near a station', () => {
    expect(formatWalk(undefined, undefined)).toBeNull()
    expect(formatWalk(5, undefined)).toBeNull()
  })

  it('handles the one-minute singular', () => {
    expect(formatWalk(1, 'Oak Forest')).toBe('1 min walk · Oak Forest Metra')
  })
})
```

```tsx
// tests/unit/propertyCard.test.tsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { PropertyCard } from '@/components/property/PropertyCard'

const base = {
  title: '157 & Cicero', slug: '157-and-cicero', assetClass: 'mixed-use', status: 'stabilized',
  city: 'Oak Forest', state: 'IL', unitCount: 90, cardBlurb: 'Ground-up mixed-use.',
  walkMinutes: 6, metraStation: 'Oak Forest', image: null,
}

describe('PropertyCard', () => {
  it('links to the single canonical property URL', () => {
    render(<PropertyCard property={base} />)
    expect(screen.getByRole('link').getAttribute('href')).toBe('/portfolio/157-and-cicero')
  })

  it('shows the Metra walk distance', () => {
    render(<PropertyCard property={base} />)
    expect(screen.getByText(/6 min walk · Oak Forest Metra/)).toBeDefined()
  })

  it('omits the walk line entirely when there is no station', () => {
    render(<PropertyCard property={{ ...base, walkMinutes: undefined, metraStation: undefined }} />)
    expect(screen.queryByText(/min walk/)).toBeNull()
  })

  it('shows a Sold chip for realized deals', () => {
    render(<PropertyCard property={{ ...base, status: 'sold' }} />)
    expect(screen.getByText('Sold')).toBeDefined()
  })
})
```

- [ ] **Step 2: Run and watch them fail**

Run: `npm test tests/unit/format.test.ts tests/unit/propertyCard.test.tsx`
Expected: FAIL — modules not found.

- [ ] **Step 3: Implement the formatter**

```ts
// src/lib/format.ts
export function formatWalk(minutes?: number, station?: string): string | null {
  if (minutes === undefined || minutes === null || !station) return null
  return `${minutes} min walk · ${station} Metra`
}
```

- [ ] **Step 4: Implement the card**

```tsx
// src/components/property/PropertyCard.tsx
import Link from 'next/link'
import Image from 'next/image'
import { Card } from '@/components/ui/Card'
import { Chip } from '@/components/ui/Chip'
import { urlForImage } from '@/sanity/image'
import { formatWalk } from '@/lib/format'

export type PropertyCardData = {
  title: string; slug: string; assetClass: string; status: string
  city: string; state: string; unitCount?: number; cardBlurb: string
  walkMinutes?: number; metraStation?: string; image?: unknown
}

export function PropertyCard({ property: p }: { property: PropertyCardData }) {
  const walk = formatWalk(p.walkMinutes, p.metraStation)
  return (
    <Card>
      <Link href={`/portfolio/${p.slug}`} className="block">
        {p.image ? (
          <Image
            src={urlForImage(p.image).width(800).height(500).url()}
            alt={p.title} width={800} height={500}
            className="h-32 w-full object-cover"
          />
        ) : (
          <div className="h-32 w-full bg-panel" />
        )}
        <div className="p-4">
          <div className="flex gap-2">
            <Chip kind={p.assetClass} />
            {p.status === 'sold' && <Chip kind="sold" />}
          </div>
          <h3 className="mt-2 font-display text-sm font-medium uppercase tracking-wide text-ink">{p.title}</h3>
          <p className="mt-1 text-[11px] font-medium text-ink-secondary">
            {p.city}, {p.state}{p.unitCount ? ` · ${p.unitCount} Units` : ''}
          </p>
          {walk && (
            <p className="mt-2 inline-block rounded-chip bg-teal/10 px-2 py-1 text-[9px] font-semibold uppercase tracking-wide text-teal-text">
              {walk}
            </p>
          )}
        </div>
      </Link>
    </Card>
  )
}
```

- [ ] **Step 5: Implement the portfolio index**

```tsx
// src/app/portfolio/page.tsx
import { fetchSanity } from '@/sanity/client'
import { ALL_PROPERTIES_QUERY } from '@/sanity/queries'
import { PropertyCard, type PropertyCardData } from '@/components/property/PropertyCard'
import { SectionHeading } from '@/components/ui/SectionHeading'

export const metadata = {
  title: 'Portfolio | EM8 Properties',
  description: 'Multifamily and mixed-use assets across the Chicago MSA and southern Wisconsin.',
}

export default async function PortfolioPage() {
  const properties = await fetchSanity<PropertyCardData[]>(ALL_PROPERTIES_QUERY)
  return (
    <div className="mx-auto max-w-[1200px] px-6 py-14">
      <SectionHeading
        eyebrow="Portfolio"
        title="Ten assets across the Chicago MSA"
        intro="Value-add renovations, ground-up development, and stabilized operations — all self-managed."
      />
      <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {properties.map((p) => <PropertyCard key={p.slug} property={p} />)}
      </div>
    </div>
  )
}
```

- [x] **Step 6: Run the tests and confirm they pass**

Run: `npm test tests/unit/format.test.ts tests/unit/propertyCard.test.tsx`
Expected: PASS, 7 tests.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat: add property card and portfolio index"
```

---

### Task 7: The property page

The route that didn't exist before, and the reason for the whole rebuild.

**Files:**
- Create: `src/app/portfolio/[slug]/page.tsx`
- Create: `src/components/property/FactRail.tsx`, `src/components/property/PropertyMap.tsx`
- Test: `tests/unit/factRail.test.tsx`

**Interfaces:**
- Consumes: `PROPERTY_BY_SLUG_QUERY`, `PROPERTY_SLUGS_QUERY`, `urlForImage`.
- Produces: `<FactRail property={PropertyDetail} />`, `<PropertyMap lat, lng, title />`.

- [x] **Step 1: Write the failing test**

```tsx
// tests/unit/factRail.test.tsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { FactRail } from '@/components/property/FactRail'

const p = { unitCount: 66, yearBuilt: 2021, walkMinutes: 2, metraStation: 'Tinley Park', squareFeet: undefined, publiclyOffered: false }

describe('FactRail', () => {
  it('gives the Metra walk the same weight as unit count', () => {
    render(<FactRail property={p} />)
    expect(screen.getByText('66')).toBeDefined()
    expect(screen.getByText('2 min')).toBeDefined()
    expect(screen.getByText(/Walk to Metra/i)).toBeDefined()
  })

  it('hides the offering block when publiclyOffered is false', () => {
    render(<FactRail property={p} />)
    expect(screen.queryByText(/deal room/i)).toBeNull()
  })

  it('shows the offering block only for a 506(c) property', () => {
    render(<FactRail property={{ ...p, publiclyOffered: true }} />)
    expect(screen.getByText(/deal room/i)).toBeDefined()
  })
})
```

- [x] **Step 2: Run and watch it fail**

Run: `npm test tests/unit/factRail.test.tsx`
Expected: FAIL — `FactRail` not found.

- [ ] **Step 3: Implement the fact rail**

```tsx
// src/components/property/FactRail.tsx
import { Eyebrow } from '@/components/ui/Eyebrow'

type Props = {
  unitCount?: number; yearBuilt?: number; squareFeet?: number
  walkMinutes?: number; metraStation?: string; publiclyOffered?: boolean
}

function Fact({ figure, label }: { figure: string; label: string }) {
  return (
    <div className="border-e border-b border-rule p-4 last:border-e-0">
      <div className="text-xl font-bold tracking-tight text-ink">{figure}</div>
      <div className="mt-1 text-[8px] font-semibold uppercase tracking-[0.15em] text-ink-secondary">{label}</div>
    </div>
  )
}

export function FactRail({ property: p }: { property: Props }) {
  return (
    <aside>
      <div className="grid grid-cols-2 rounded-card border border-rule">
        {p.unitCount !== undefined && <Fact figure={String(p.unitCount)} label="Units" />}
        {p.yearBuilt !== undefined && <Fact figure={String(p.yearBuilt)} label="Built" />}
        {p.walkMinutes !== undefined && p.metraStation && (
          <Fact figure={`${p.walkMinutes} min`} label="Walk to Metra" />
        )}
        {p.squareFeet !== undefined && <Fact figure={p.squareFeet.toLocaleString()} label="Square Feet" />}
      </div>

      {p.publiclyOffered && (
        <div className="mt-4 rounded-card border border-rule p-5">
          <Eyebrow>Interested in this asset?</Eyebrow>
          <p className="mt-2 text-xs leading-relaxed text-ink-secondary">
            Offering materials are available to verified accredited investors through our portal.
          </p>
          <a href="/investors" className="mt-3 block rounded-control bg-teal px-4 py-2.5 text-center text-[11px] font-semibold uppercase tracking-wide text-white">
            Enter the deal room
          </a>
        </div>
      )}
    </aside>
  )
}
```

- [ ] **Step 4: Implement the map (client-only)**

```tsx
// src/components/property/PropertyMap.tsx
'use client'
import { useEffect, useRef } from 'react'

export function PropertyMap({ lat, lng, title }: { lat: number; lng: number; title: string }) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let map: { remove: () => void } | undefined
    ;(async () => {
      const L = await import('leaflet')
      await import('leaflet/dist/leaflet.css')
      if (!ref.current) return
      map = L.map(ref.current).setView([lat, lng], 15)
      L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors © CARTO',
      }).addTo(map as never)
      L.marker([lat, lng]).addTo(map as never).bindPopup(title)
    })()
    return () => map?.remove()
  }, [lat, lng, title])

  return <div ref={ref} className="h-64 w-full rounded-card border border-rule" />
}
```

```bash
npm install leaflet && npm install -D @types/leaflet
```

Note the light CARTO tiles — the current site uses `dark_all`, which would fight the new ground.

- [ ] **Step 5: Implement the page**

```tsx
// src/app/portfolio/[slug]/page.tsx
import { notFound } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { PortableText } from 'next-sanity'
import { fetchSanity } from '@/sanity/client'
import { PROPERTY_BY_SLUG_QUERY, PROPERTY_SLUGS_QUERY } from '@/sanity/queries'
import { urlForImage } from '@/sanity/image'
import { FactRail } from '@/components/property/FactRail'
import { PropertyMap } from '@/components/property/PropertyMap'
import { Chip } from '@/components/ui/Chip'
import { Eyebrow } from '@/components/ui/Eyebrow'

export async function generateStaticParams() {
  const slugs = await fetchSanity<string[]>(PROPERTY_SLUGS_QUERY)
  return slugs.map((slug) => ({ slug }))
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const p = await fetchSanity<any>(PROPERTY_BY_SLUG_QUERY, { slug })
  if (!p) return {}
  return {
    title: `${p.title} | EM8 Properties`,
    description: p.cardBlurb,
    openGraph: { images: p.image ? [urlForImage(p.image).width(1200).height(630).url()] : [] },
  }
}

export default async function PropertyPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const p = await fetchSanity<any>(PROPERTY_BY_SLUG_QUERY, { slug })
  if (!p) notFound()

  return (
    <article>
      {p.gallery?.[0] && (
        <Image
          src={urlForImage(p.gallery[0]).width(1800).height(700).url()}
          alt={p.gallery[0].alt ?? p.title} width={1800} height={700} priority
          className="h-[340px] w-full object-cover"
        />
      )}
      <div className="mx-auto grid max-w-[1200px] gap-10 px-6 py-10 lg:grid-cols-[1.45fr_1fr]">
        <div>
          <div className="flex gap-2">
            <Chip kind={p.assetClass} /><Chip kind={p.status} />
          </div>
          <h1 className="mt-3 font-display text-3xl font-medium uppercase tracking-wide text-ink">{p.title}</h1>
          <p className="mt-1 text-sm font-medium text-ink-secondary">{p.city}, {p.state}</p>

          {p.overview && <div className="prose mt-5 text-sm leading-relaxed text-ink-secondary"><PortableText value={p.overview} /></div>}

          {p.businessPlan && (
            <>
              <h2 className="mt-8 text-lg font-bold tracking-tight text-ink">The business plan</h2>
              <div className="prose mt-2 text-sm leading-relaxed text-ink-secondary"><PortableText value={p.businessPlan} /></div>
            </>
          )}

          {p.coordinates && (
            <>
              <h2 className="mt-8 text-lg font-bold tracking-tight text-ink">Location</h2>
              <div className="mt-3">
                <PropertyMap lat={p.coordinates.lat} lng={p.coordinates.lng} title={p.title} />
              </div>
            </>
          )}
        </div>

        <div>
          <FactRail property={p} />
          {p.relatedPosts?.length > 0 && (
            <div className="mt-4 rounded-card border border-rule bg-panel p-4">
              <Eyebrow>Written about this property</Eyebrow>
              <ul className="mt-3 space-y-2">
                {p.relatedPosts.map((post: any) => (
                  <li key={post.slug}>
                    <Link href={`/insights/${post.slug}`} className="text-xs font-semibold text-ink hover:text-teal-text">
                      {post.title}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </article>
  )
}
```

- [x] **Step 6: Run the tests and confirm they pass**

Run: `npm test tests/unit/factRail.test.tsx`
Expected: PASS, 3 tests.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat: add canonical property page with map and fact rail"
```

---

### Task 8: Track record

A view over sold properties. It creates no new URLs.

**Files:**
- Create: `src/app/track-record/page.tsx`, `src/components/property/DealStory.tsx`
- Test: `tests/unit/dealStory.test.tsx`

**Interfaces:**
- Consumes: `SOLD_PROPERTIES_QUERY`.
- Produces: `<DealStory story={{ acquired, executed, exited, equityMultiple, exitYear }} />`.

- [x] **Step 1: Write the failing test**

```tsx
// tests/unit/dealStory.test.tsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { DealStory } from '@/components/property/DealStory'

const story = {
  acquired: '2016 — below replacement cost', executed: 'Interior modernization',
  exited: 'Full-cycle sale', equityMultiple: '2.1x', exitYear: 2019,
}

describe('DealStory', () => {
  it('tells the deal in acquired, executed, exited order', () => {
    render(<DealStory story={story} />)
    const headings = screen.getAllByRole('heading', { level: 4 }).map((h) => h.textContent)
    expect(headings).toEqual(['Acquired', 'Executed', 'Exited'])
  })

  it('labels the multiple as realized, never as a projection', () => {
    render(<DealStory story={story} />)
    expect(screen.getByText(/Realized Equity Multiple/i)).toBeDefined()
  })
})
```

- [x] **Step 2: Run and watch it fail**

Run: `npm test tests/unit/dealStory.test.tsx`
Expected: FAIL — `DealStory` not found.

- [ ] **Step 3: Implement it**

```tsx
// src/components/property/DealStory.tsx
type Story = {
  acquired?: string; executed?: string; exited?: string
  equityMultiple?: string; exitYear?: number
}

export function DealStory({ story }: { story: Story }) {
  const stages: [string, string | undefined][] = [
    ['Acquired', story.acquired], ['Executed', story.executed], ['Exited', story.exited],
  ]
  return (
    <div className="mt-4 border-t border-rule pt-4">
      <div className="grid gap-4 sm:grid-cols-3">
        {stages.map(([label, body]) => (
          <div key={label}>
            <h4 className="text-[8px] font-semibold uppercase tracking-[0.15em] text-teal-text">{label}</h4>
            <p className="mt-1.5 text-[11px] leading-relaxed text-ink-secondary">{body}</p>
          </div>
        ))}
      </div>
      {story.equityMultiple && (
        <div className="mt-4 flex gap-8 border-t border-rule pt-3">
          <div>
            <div className="text-lg font-bold tracking-tight text-teal-text">{story.equityMultiple}</div>
            <div className="mt-1 text-[8px] font-semibold uppercase tracking-[0.15em] text-ink-secondary">
              Realized Equity Multiple
            </div>
          </div>
          {story.exitYear && (
            <div>
              <div className="text-lg font-bold tracking-tight text-ink">{story.exitYear}</div>
              <div className="mt-1 text-[8px] font-semibold uppercase tracking-[0.15em] text-ink-secondary">Exit Year</div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 4: Implement the page**

```tsx
// src/app/track-record/page.tsx
import Link from 'next/link'
import Image from 'next/image'
import { fetchSanity } from '@/sanity/client'
import { SOLD_PROPERTIES_QUERY, HERO_STATS_QUERY } from '@/sanity/queries'
import { urlForImage } from '@/sanity/image'
import { SectionHeading } from '@/components/ui/SectionHeading'
import { StatBand } from '@/components/ui/StatBand'
import { DealStory } from '@/components/property/DealStory'
import { Chip } from '@/components/ui/Chip'

export const metadata = {
  title: 'Track Record | EM8 Properties',
  description: 'Realized results across the Chicago MSA — what we paid, what we did, what we exited at.',
}

export default async function TrackRecordPage() {
  const [sold, stats] = await Promise.all([
    fetchSanity<any[]>(SOLD_PROPERTIES_QUERY),
    fetchSanity<{ figure: string; label: string }[]>(HERO_STATS_QUERY),
  ])

  return (
    <div>
      <div className="mx-auto max-w-[1200px] px-6 py-14">
        <SectionHeading
          eyebrow="Track Record"
          title="Realized results, not projections"
          intro="Every deal we've taken full cycle, with what we paid, what we did, and what we exited at."
        />
      </div>
      <StatBand stats={stats.slice(0, 4)} />
      <div className="mx-auto max-w-[1200px] space-y-5 px-6 py-12">
        {sold.map((p) => (
          <div key={p.slug} className="overflow-hidden rounded-card border border-rule sm:grid sm:grid-cols-[0.85fr_2fr]">
            {p.image && (
              <Image src={urlForImage(p.image).width(600).height(400).url()} alt={p.title}
                width={600} height={400} className="h-full w-full object-cover" />
            )}
            <div className="p-6">
              <div className="flex items-start justify-between">
                <div>
                  <Link href={`/portfolio/${p.slug}`} className="font-display text-base font-medium uppercase tracking-wide text-ink hover:text-teal-text">
                    {p.title}
                  </Link>
                  <p className="mt-1 text-[11px] font-medium text-ink-secondary">
                    {p.city}, {p.state} · {p.unitCount} Units
                  </p>
                </div>
                <Chip kind="sold" />
              </div>
              {p.dealStory && <DealStory story={p.dealStory} />}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
```

- [x] **Step 5: Run the tests and confirm they pass**

Run: `npm test tests/unit/dealStory.test.tsx`
Expected: PASS, 2 tests.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: add track record as a view over sold properties"
```

---

### Task 9: Insights — index, article, and the LinkedIn card

**Files:**
- Create: `src/app/insights/page.tsx`, `src/app/insights/[slug]/page.tsx`, `src/app/insights/[slug]/opengraph-image.tsx`
- Create: `src/components/insights/PostCard.tsx`
- Test: `tests/unit/postCard.test.tsx`

**Interfaces:**
- Consumes: `ALL_POSTS_QUERY`, `POST_BY_SLUG_QUERY`, `POST_SLUGS_QUERY`.
- Produces: `<PostCard post={{ title, slug, publishedAt, category, excerpt, heroImage }} />`, `formatCategory(slug: string): string`.

- [x] **Step 1: Write the failing test**

```tsx
// tests/unit/postCard.test.tsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { PostCard, formatCategory } from '@/components/insights/PostCard'

const post = {
  title: 'Why we stopped treating zoning as a negotiation',
  slug: 'why-we-stopped-treating-zoning-as-a-negotiation',
  publishedAt: '2026-08-12T00:00:00Z', category: 'municipal-partnership',
  excerpt: 'Oak Forest approved 90 units faster than we budgeted.', heroImage: null,
}

describe('PostCard', () => {
  it('links to the article URL used on LinkedIn', () => {
    render(<PostCard post={post} />)
    expect(screen.getByRole('link').getAttribute('href'))
      .toBe('/insights/why-we-stopped-treating-zoning-as-a-negotiation')
  })

  it('renders a readable category, not the slug', () => {
    expect(formatCategory('municipal-partnership')).toBe('Municipal Partnership')
    expect(formatCategory('announcement')).toBe('Announcement')
  })

  it('shows a human-readable date', () => {
    render(<PostCard post={post} />)
    expect(screen.getByText(/Aug 12, 2026/)).toBeDefined()
  })
})
```

- [x] **Step 2: Run and watch it fail**

Run: `npm test tests/unit/postCard.test.tsx`
Expected: FAIL — `PostCard` not found.

- [ ] **Step 3: Implement the card**

```tsx
// src/components/insights/PostCard.tsx
import Link from 'next/link'
import Image from 'next/image'
import { Card } from '@/components/ui/Card'
import { Eyebrow } from '@/components/ui/Eyebrow'
import { urlForImage } from '@/sanity/image'

export type PostData = {
  title: string; slug: string; publishedAt: string
  category: string; excerpt: string; heroImage?: unknown
}

export function formatCategory(slug: string): string {
  return slug.split('-').map((w) => w[0]!.toUpperCase() + w.slice(1)).join(' ')
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export function PostCard({ post }: { post: PostData }) {
  return (
    <Card>
      <Link href={`/insights/${post.slug}`} className="block">
        {post.heroImage && (
          <Image src={urlForImage(post.heroImage).width(800).height(450).url()} alt={post.title}
            width={800} height={450} className="h-28 w-full object-cover" />
        )}
        <div className="p-4">
          <Eyebrow>{formatCategory(post.category)}</Eyebrow>
          <h3 className="mt-2 text-sm font-semibold leading-snug tracking-tight text-ink">{post.title}</h3>
          <p className="mt-1.5 text-[11px] leading-relaxed text-ink-secondary">{post.excerpt}</p>
          <p className="mt-3 text-[10px] font-medium text-ink-secondary">{formatDate(post.publishedAt)}</p>
        </div>
      </Link>
    </Card>
  )
}
```

- [ ] **Step 4: Implement the index and article**

```tsx
// src/app/insights/page.tsx
import { fetchSanity } from '@/sanity/client'
import { ALL_POSTS_QUERY } from '@/sanity/queries'
import { PostCard, type PostData } from '@/components/insights/PostCard'
import { SectionHeading } from '@/components/ui/SectionHeading'

export const metadata = {
  title: 'Insights | EM8 Properties',
  description: 'Notes on transit-oriented development, municipal partnership, and operating suburban multifamily.',
}

export default async function InsightsPage() {
  const posts = await fetchSanity<PostData[]>(ALL_POSTS_QUERY)
  return (
    <div className="mx-auto max-w-[1200px] px-6 py-14">
      <SectionHeading
        eyebrow="Insights"
        title="What we've learned building next to the tracks"
        intro="Notes on transit-oriented development, municipal partnership, and operating suburban multifamily in the Chicago MSA."
      />
      <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {posts.map((p) => <PostCard key={p.slug} post={p} />)}
      </div>
    </div>
  )
}
```

```tsx
// src/app/insights/[slug]/page.tsx
import { notFound } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { PortableText } from 'next-sanity'
import { fetchSanity } from '@/sanity/client'
import { POST_BY_SLUG_QUERY, POST_SLUGS_QUERY } from '@/sanity/queries'
import { urlForImage } from '@/sanity/image'
import { formatCategory, formatDate } from '@/components/insights/PostCard'
import { Eyebrow } from '@/components/ui/Eyebrow'

export async function generateStaticParams() {
  const slugs = await fetchSanity<string[]>(POST_SLUGS_QUERY)
  return slugs.map((slug) => ({ slug }))
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const post = await fetchSanity<any>(POST_BY_SLUG_QUERY, { slug })
  if (!post) return {}
  return { title: `${post.title} | EM8 Properties`, description: post.excerpt }
}

export default async function PostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const post = await fetchSanity<any>(POST_BY_SLUG_QUERY, { slug })
  if (!post) notFound()

  return (
    <article className="mx-auto max-w-[720px] px-6 py-12">
      <p className="text-[11px] font-medium text-ink-secondary">
        <Link href="/insights" className="text-teal-text">Insights</Link> › {formatCategory(post.category)}
      </p>
      <h1 className="mt-3 text-3xl font-bold leading-tight tracking-tight text-ink">{post.title}</h1>
      <p className="mt-4 border-b border-rule pb-5 text-[11px] text-ink-secondary">
        {formatDate(post.publishedAt)}
      </p>

      {post.heroImage && (
        <Image src={urlForImage(post.heroImage).width(1400).height(700).url()}
          alt={post.heroImage.alt ?? post.title} width={1400} height={700}
          className="mt-6 rounded-card" />
      )}

      <div className="prose mt-6 text-[15px] leading-relaxed text-ink-secondary">
        <PortableText value={post.body} />
      </div>

      {post.relatedProperty && (
        <div className="mt-8 flex items-center gap-4 rounded-card border border-rule bg-panel p-4">
          <div>
            <Eyebrow>The property in this piece</Eyebrow>
            <Link href={`/portfolio/${post.relatedProperty.slug}`}
              className="mt-1.5 block font-display text-sm font-medium uppercase tracking-wide text-ink hover:text-teal-text">
              {post.relatedProperty.title}
            </Link>
            <p className="text-[11px] text-ink-secondary">
              {post.relatedProperty.city} · {post.relatedProperty.unitCount} Units
            </p>
          </div>
        </div>
      )}
    </article>
  )
}
```

- [ ] **Step 5: Implement the LinkedIn share card**

```tsx
// src/app/insights/[slug]/opengraph-image.tsx
import { ImageResponse } from 'next/og'
import { fetchSanity } from '@/sanity/client'
import { POST_BY_SLUG_QUERY } from '@/sanity/queries'

export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default async function OgImage({ params }: { params: { slug: string } }) {
  const post = await fetchSanity<any>(POST_BY_SLUG_QUERY, { slug: params.slug })
  return new ImageResponse(
    (
      <div style={{
        width: '100%', height: '100%', display: 'flex', flexDirection: 'column',
        justifyContent: 'space-between', background: '#FFFFFF', padding: 72,
      }}>
        <div style={{ fontSize: 26, fontWeight: 700, letterSpacing: 2, color: '#1A1A1A' }}>
          EM8 <span style={{ color: '#2C7A74' }}>PROPERTIES</span>
        </div>
        <div style={{ fontSize: 60, fontWeight: 700, lineHeight: 1.1, color: '#1A1A1A', maxWidth: 900 }}>
          {post?.title ?? 'EM8 Properties'}
        </div>
        <div style={{ height: 8, width: 160, background: '#4ABDB5' }} />
      </div>
    ),
    size,
  )
}
```

- [x] **Step 6: Run the tests and confirm they pass**

Run: `npm test tests/unit/postCard.test.tsx`
Expected: PASS, 3 tests.

- [ ] **Step 7: Verify the share card renders**

Run: `npm run dev`, open `http://localhost:3000/insights/<slug>/opengraph-image`.
Expected: a 1200×630 PNG with the wordmark, the post title, and a teal rule.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat: add insights index, article, and generated LinkedIn share cards"
```

---

### Task 10: The lead pipeline

Capture-first. The Sanity write is the source of truth; email is best-effort. A mail outage must never lose a lead.

**Files:**
- Create: `src/sanity/writeClient.ts`, `src/lib/leads.ts`, `src/lib/email.ts`, `src/app/api/lead/route.ts`
- Test: `tests/unit/leads.test.ts`

**Interfaces:**
- Consumes: schema `lead` from Task 2.
- Produces: `parseLead(input: unknown): LeadInput` (throws `LeadValidationError`), `submitLead(input, deps): Promise<{ id: string; emailed: boolean }>`, `EmailSender = { send(msg): Promise<void> }`.

- [ ] **Step 1: Write the failing tests**

```ts
// tests/unit/leads.test.ts
import { describe, it, expect, vi } from 'vitest'
import { parseLead, submitLead, LeadValidationError } from '@/lib/leads'

const valid = { source: 'keep-in-touch', firstName: 'Dana', lastName: 'Levi', email: 'dana@example.com' }

describe('parseLead', () => {
  it('accepts a valid submission', () => {
    expect(parseLead(valid).email).toBe('dana@example.com')
  })

  it('rejects a malformed email', () => {
    expect(() => parseLead({ ...valid, email: 'nope' })).toThrow(LeadValidationError)
  })

  it('rejects an unknown source', () => {
    expect(() => parseLead({ ...valid, source: 'spam' })).toThrow(LeadValidationError)
  })
})

describe('submitLead', () => {
  it('persists before emailing', async () => {
    const order: string[] = []
    const create = vi.fn(async () => { order.push('persist'); return { _id: 'lead.1' } })
    const send = vi.fn(async () => { order.push('email') })
    await submitLead(valid, { create, sender: { send } })
    expect(order).toEqual(['persist', 'email'])
  })

  it('still succeeds when email fails — the lead is already saved', async () => {
    const create = vi.fn(async () => ({ _id: 'lead.2' }))
    const send = vi.fn(async () => { throw new Error('SMTP down') })
    const result = await submitLead(valid, { create, sender: { send } })
    expect(result).toEqual({ id: 'lead.2', emailed: false })
  })

  it('propagates a persistence failure — that one is fatal', async () => {
    const create = vi.fn(async () => { throw new Error('Sanity down') })
    const send = vi.fn(async () => {})
    await expect(submitLead(valid, { create, sender: { send } })).rejects.toThrow('Sanity down')
    expect(send).not.toHaveBeenCalled()
  })
})
```

- [ ] **Step 2: Run and watch them fail**

Run: `npm test tests/unit/leads.test.ts`
Expected: FAIL — `@/lib/leads` not found.

- [ ] **Step 3: Implement leads**

```ts
// src/lib/leads.ts
export class LeadValidationError extends Error {}

const SOURCES = ['keep-in-touch', 'site-submission'] as const
export type LeadSource = (typeof SOURCES)[number]

export type LeadInput = {
  source: LeadSource; firstName: string; lastName?: string; email: string
  phone?: string; investorType?: string; checkSize?: string
  accreditedConfirmed?: boolean; propertyAddress?: string; message?: string
}

export type EmailSender = { send(msg: { subject: string; body: string }): Promise<void> }
type CreateFn = (doc: Record<string, unknown>) => Promise<{ _id: string }>

export function parseLead(input: unknown): LeadInput {
  const v = input as Record<string, unknown>
  if (!v || typeof v !== 'object') throw new LeadValidationError('Body must be an object')
  if (!SOURCES.includes(v.source as LeadSource)) throw new LeadValidationError('Unknown source')
  if (typeof v.firstName !== 'string' || !v.firstName.trim()) throw new LeadValidationError('First name required')
  if (typeof v.email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.email)) {
    throw new LeadValidationError('Valid email required')
  }
  return v as unknown as LeadInput
}

export async function submitLead(
  input: LeadInput,
  deps: { create: CreateFn; sender: EmailSender },
): Promise<{ id: string; emailed: boolean }> {
  const doc = await deps.create({
    _type: 'lead', ...input, submittedAt: new Date().toISOString(), exportedToAgora: false,
  })

  let emailed = true
  try {
    await deps.sender.send({
      subject: `New ${input.source} lead: ${input.firstName} ${input.lastName ?? ''}`.trim(),
      body: [
        `Name: ${input.firstName} ${input.lastName ?? ''}`,
        `Email: ${input.email}`,
        input.phone ? `Phone: ${input.phone}` : '',
        input.investorType ? `Investor type: ${input.investorType}` : '',
        input.checkSize ? `Check size: ${input.checkSize}` : '',
        input.propertyAddress ? `Property: ${input.propertyAddress}` : '',
        input.message ? `\n${input.message}` : '',
      ].filter(Boolean).join('\n'),
    })
  } catch {
    emailed = false
  }

  return { id: doc._id, emailed }
}
```

- [ ] **Step 4: Implement the write client, sender, and route**

```ts
// src/sanity/writeClient.ts
import 'server-only'
import { createClient } from 'next-sanity'

export const writeClient = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID!,
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET!,
  apiVersion: '2026-01-01',
  token: process.env.SANITY_API_WRITE_TOKEN,
  useCdn: false,
})
```

```ts
// src/lib/email.ts
import 'server-only'
import type { EmailSender } from './leads'

export const resendSender: EmailSender = {
  async send({ subject, body }) {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'EM8 Website <website@em-8.com>',
        to: [process.env.LEAD_NOTIFICATION_EMAIL],
        subject, text: body,
      }),
    })
    if (!res.ok) throw new Error(`Resend failed: ${res.status}`)
  },
}
```

```ts
// src/app/api/lead/route.ts
import { NextResponse } from 'next/server'
import { parseLead, submitLead, LeadValidationError } from '@/lib/leads'
import { writeClient } from '@/sanity/writeClient'
import { resendSender } from '@/lib/email'

export async function POST(request: Request) {
  try {
    const input = parseLead(await request.json())
    const result = await submitLead(input, {
      create: (doc) => writeClient.create(doc as never),
      sender: resendSender,
    })
    return NextResponse.json({ ok: true, id: result.id })
  } catch (err) {
    if (err instanceof LeadValidationError) {
      return NextResponse.json({ ok: false, error: err.message }, { status: 400 })
    }
    console.error('Lead submission failed', err)
    return NextResponse.json({ ok: false, error: 'Could not save your message' }, { status: 500 })
  }
}
```

Add to `.env.local`: `SANITY_API_WRITE_TOKEN`, `RESEND_API_KEY`, `LEAD_NOTIFICATION_EMAIL`. **Never** prefix these with `NEXT_PUBLIC_` — that would ship them to the browser.

- [x] **Step 5: Run the tests and confirm they pass**

Run: `npm test tests/unit/leads.test.ts`
Expected: PASS, 6 tests.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: add capture-first lead pipeline"
```

---

### Task 11: The forms

**Files:**
- Create: `src/components/forms/LeadForm.tsx`
- Test: `tests/unit/leadForm.test.tsx`

**Interfaces:**
- Consumes: `POST /api/lead` from Task 10.
- Produces: `<LeadForm source: 'keep-in-touch' | 'site-submission' fields: FieldSpec[] submitLabel: string />`.

- [x] **Step 1: Write the failing test**

```tsx
// tests/unit/leadForm.test.tsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { LeadForm } from '@/components/forms/LeadForm'

const fields = [
  { name: 'firstName', label: 'First name', type: 'text' as const, required: true },
  { name: 'email', label: 'Email', type: 'email' as const, required: true },
]

beforeEach(() => { vi.restoreAllMocks() })

describe('LeadForm', () => {
  it('posts the source with the submission', async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ ok: true, id: 'x' })))
    vi.stubGlobal('fetch', fetchMock)
    const user = userEvent.setup()

    render(<LeadForm source="keep-in-touch" fields={fields} submitLabel="Send" />)
    await user.type(screen.getByLabelText('First name'), 'Dana')
    await user.type(screen.getByLabelText('Email'), 'dana@example.com')
    await user.click(screen.getByRole('button', { name: 'Send' }))

    await waitFor(() => expect(fetchMock).toHaveBeenCalled())
    const body = JSON.parse((fetchMock.mock.calls[0]![1] as RequestInit).body as string)
    expect(body.source).toBe('keep-in-touch')
    expect(body.email).toBe('dana@example.com')
  })

  it('surfaces an error instead of failing silently', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ ok: false, error: 'Nope' }), { status: 400 })))
    const user = userEvent.setup()

    render(<LeadForm source="keep-in-touch" fields={fields} submitLabel="Send" />)
    await user.type(screen.getByLabelText('First name'), 'Dana')
    await user.type(screen.getByLabelText('Email'), 'dana@example.com')
    await user.click(screen.getByRole('button', { name: 'Send' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Nope')
  })

  it('confirms success to the user', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ ok: true, id: 'x' }))))
    const user = userEvent.setup()

    render(<LeadForm source="keep-in-touch" fields={fields} submitLabel="Send" />)
    await user.type(screen.getByLabelText('First name'), 'Dana')
    await user.type(screen.getByLabelText('Email'), 'dana@example.com')
    await user.click(screen.getByRole('button', { name: 'Send' }))

    expect(await screen.findByText(/thank you/i)).toBeDefined()
  })
})
```

```bash
npm install -D @testing-library/user-event @testing-library/jest-dom
```

- [x] **Step 2: Run and watch it fail**

Run: `npm test tests/unit/leadForm.test.tsx`
Expected: FAIL — `LeadForm` not found.

- [ ] **Step 3: Implement it**

```tsx
// src/components/forms/LeadForm.tsx
'use client'
import { useState } from 'react'

export type FieldSpec = {
  name: string
  label: string
  type: 'text' | 'email' | 'tel' | 'textarea' | 'select' | 'checkbox'
  required?: boolean
  options?: string[]
}

export function LeadForm({ source, fields, submitLabel }: {
  source: 'keep-in-touch' | 'site-submission'
  fields: FieldSpec[]
  submitLabel: string
}) {
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent'>('idle')
  const [error, setError] = useState<string | null>(null)

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setStatus('sending'); setError(null)
    const data = Object.fromEntries(new FormData(e.currentTarget).entries())
    try {
      const res = await fetch('/api/lead', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...data, source }),
      })
      const json = await res.json()
      if (!json.ok) { setError(json.error ?? 'Something went wrong'); setStatus('idle'); return }
      setStatus('sent')
    } catch {
      setError('Could not reach the server. Please try again.')
      setStatus('idle')
    }
  }

  if (status === 'sent') {
    return <p className="rounded-card border border-rule bg-panel p-5 text-sm text-ink">
      Thank you — we&rsquo;ve got it and someone will be in touch.
    </p>
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-3">
      {fields.map((f) => (
        <label key={f.name} className="grid gap-1.5">
          <span className="text-[10px] font-semibold uppercase tracking-[0.15em] text-ink-secondary">{f.label}</span>
          {f.type === 'textarea' ? (
            <textarea name={f.name} required={f.required} rows={4}
              className="rounded-control border border-rule px-3 py-2 text-xs" />
          ) : f.type === 'select' ? (
            <select name={f.name} required={f.required} className="rounded-control border border-rule px-3 py-2 text-xs">
              <option value="">Select…</option>
              {f.options?.map((o) => <option key={o} value={o}>{o}</option>)}
            </select>
          ) : f.type === 'checkbox' ? (
            <input type="checkbox" name={f.name} required={f.required} className="size-4" />
          ) : (
            <input type={f.type} name={f.name} required={f.required}
              className="rounded-control border border-rule px-3 py-2 text-xs" />
          )}
        </label>
      ))}

      {error && <p role="alert" className="text-xs text-[#C0392B]">{error}</p>}

      <button type="submit" disabled={status === 'sending'}
        className="rounded-control bg-teal px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-white disabled:opacity-60">
        {status === 'sending' ? 'Sending…' : submitLabel}
      </button>
    </form>
  )
}
```

- [x] **Step 4: Run the tests and confirm they pass**

Run: `npm test tests/unit/leadForm.test.tsx`
Expected: PASS, 3 tests.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: add shared lead form with visible error states"
```

---

### Task 12: Investors, Partners, and About pages

Three content pages that consume everything built so far.

**Files:**
- Create: `src/app/investors/page.tsx`, `src/app/partners/page.tsx`, `src/app/about/page.tsx`
- Create: `src/components/ui/Testimonials.tsx`
- Test: `tests/unit/testimonials.test.tsx`

**Interfaces:**
- Consumes: `LeadForm`, `TEAM_QUERY`, `FOCUS_CARDS_QUERY`, `TESTIMONIALS_QUERY`, `SITE_SETTINGS_QUERY`.
- Produces: `<Testimonials items={{ quote, attribution, descriptor, investorSince }[]} />`.

- [x] **Step 1: Write the failing test**

```tsx
// tests/unit/testimonials.test.tsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Testimonials } from '@/components/ui/Testimonials'

const items = [{ quote: 'Best sponsor I have worked with.', attribution: 'Dr. T. S.', descriptor: 'Surgeon', investorSince: 2022 }]

describe('Testimonials', () => {
  it('attributes the quote to a named person and role', () => {
    render(<Testimonials items={items} />)
    expect(screen.getByText(/Best sponsor/)).toBeDefined()
    expect(screen.getByText(/Dr\. T\. S\./)).toBeDefined()
    expect(screen.getByText(/Surgeon/)).toBeDefined()
  })

  it('renders nothing when there are no consented testimonials', () => {
    const { container } = render(<Testimonials items={[]} />)
    expect(container.firstChild).toBeNull()
  })
})
```

- [x] **Step 2: Run and watch it fail**

Run: `npm test tests/unit/testimonials.test.tsx`
Expected: FAIL — `Testimonials` not found.

- [ ] **Step 3: Implement testimonials**

```tsx
// src/components/ui/Testimonials.tsx
export type Testimonial = {
  quote: string; attribution: string; descriptor?: string; investorSince?: number
}

export function Testimonials({ items }: { items: Testimonial[] }) {
  if (items.length === 0) return null
  return (
    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((t) => (
        <figure key={t.attribution} className="rounded-card border border-rule bg-ground p-6">
          <blockquote className="text-sm leading-relaxed text-ink">&ldquo;{t.quote}&rdquo;</blockquote>
          <figcaption className="mt-4 border-t border-rule pt-3">
            <span className="text-xs font-semibold text-ink">{t.attribution}</span>
            {t.descriptor && <span className="block text-[10px] uppercase tracking-[0.15em] text-teal-text">{t.descriptor}</span>}
            {t.investorSince && <span className="block text-[10px] text-ink-secondary">Investor since {t.investorSince}</span>}
          </figcaption>
        </figure>
      ))}
    </div>
  )
}
```

- [ ] **Step 4: Implement the investors page**

```tsx
// src/app/investors/page.tsx
import { fetchSanity } from '@/sanity/client'
import { SITE_SETTINGS_QUERY, TESTIMONIALS_QUERY } from '@/sanity/queries'
import { LeadForm, type FieldSpec } from '@/components/forms/LeadForm'
import { Testimonials, type Testimonial } from '@/components/ui/Testimonials'
import { SectionHeading } from '@/components/ui/SectionHeading'
import { Eyebrow } from '@/components/ui/Eyebrow'

export const metadata = {
  title: 'Investors | EM8 Properties',
  description: 'EM8 partners with accredited investors, family offices, and JV partners across the Chicago MSA.',
}

const STEPS = [
  ['Verify and review', 'Accreditation is verified through our portal. You receive the full offering materials.'],
  ['Commit and fund', 'Subscription documents and capital calls are handled in the portal.'],
  ['Hold and receive', 'Quarterly reporting and distributions, with statements available any time.'],
  ['Exit', 'Refinance or sale, with proceeds distributed per the operating agreement.'],
]

const FIELDS: FieldSpec[] = [
  { name: 'firstName', label: 'First name', type: 'text', required: true },
  { name: 'lastName', label: 'Last name', type: 'text' },
  { name: 'email', label: 'Email', type: 'email', required: true },
  { name: 'phone', label: 'Phone (optional)', type: 'tel' },
  { name: 'investorType', label: 'Investor type', type: 'select', options: ['Individual', 'Family office', 'RIA', 'JV partner'] },
  { name: 'checkSize', label: 'Typical check size', type: 'select', options: ['Under $100k', '$100k–$250k', '$250k–$1M', '$1M+'] },
  { name: 'message', label: 'What are you looking for?', type: 'textarea' },
  { name: 'accreditedConfirmed', label: 'I confirm I am an accredited investor', type: 'checkbox', required: true },
]

export default async function InvestorsPage() {
  const [settings, testimonials] = await Promise.all([
    fetchSanity<{ agoraPortalUrl: string }>(SITE_SETTINGS_QUERY),
    fetchSanity<Testimonial[]>(TESTIMONIALS_QUERY),
  ])

  return (
    <div className="mx-auto max-w-[1200px] px-6 py-14">
      <div className="grid gap-10 lg:grid-cols-[1.3fr_1fr]">
        <div>
          <SectionHeading
            eyebrow="Investors"
            title="We work with patient, mission-aligned capital"
            intro="EM8 partners with accredited investors, family offices, and JV partners on transit-oriented multifamily and mixed-use across the Chicago MSA."
          />
          <a href={settings.agoraPortalUrl} target="_blank" rel="noopener noreferrer"
            className="mt-5 inline-block rounded-control bg-ink px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-white">
            Investor Login →
          </a>

          <h2 className="mt-10 text-lg font-bold tracking-tight text-ink">How an investment works</h2>
          <ol className="mt-4 grid gap-3">
            {STEPS.map(([title, body], i) => (
              <li key={title} className="flex gap-3">
                <span className="flex size-5 shrink-0 items-center justify-center rounded-chip bg-teal-text text-[10px] font-bold text-white">{i + 1}</span>
                <span>
                  <span className="block text-xs font-semibold text-ink">{title}</span>
                  <span className="mt-1 block text-[11px] leading-relaxed text-ink-secondary">{body}</span>
                </span>
              </li>
            ))}
          </ol>
        </div>

        <div className="rounded-card border border-rule bg-panel p-6">
          <Eyebrow>Keep in touch</Eyebrow>
          <h2 className="mt-2 text-lg font-bold tracking-tight text-ink">Tell us what you&rsquo;re looking for</h2>
          <p className="mb-4 mt-1.5 text-[11px] leading-relaxed text-ink-secondary">
            We&rsquo;ll add you to our investor list and reach out when something fits.
          </p>
          <LeadForm source="keep-in-touch" fields={FIELDS} submitLabel="Send" />
        </div>
      </div>

      {testimonials.length > 0 && (
        <section className="mt-16">
          <SectionHeading eyebrow="Our Investors" title="What our partners say" />
          <div className="mt-6"><Testimonials items={testimonials} /></div>
        </section>
      )}
    </div>
  )
}
```

- [ ] **Step 5: Implement the partners page**

```tsx
// src/app/partners/page.tsx
import { LeadForm, type FieldSpec } from '@/components/forms/LeadForm'
import { SectionHeading } from '@/components/ui/SectionHeading'
import { Eyebrow } from '@/components/ui/Eyebrow'
import { Card } from '@/components/ui/Card'

export const metadata = {
  title: 'Partners | EM8 Properties',
  description: 'EM8 works with Kinzie, Advantage, and municipalities across the Chicago MSA as one accountable team.',
}

const PARTNERS = [
  ['Development & Capital', 'EM8 Properties', 'Site selection, entitlement, capital structure, and design direction. We stay the owner — we don’t merchant-build and walk away.'],
  ['Construction', 'Kinzie', 'Our builder across the portfolio. Involved early enough to price design decisions while they can still change.'],
  ['Property Management', 'Advantage', 'Day-to-day operations and resident experience. Monthly walks of every vacant unit, grounds, and amenity — with us present.'],
]

const SITE_FIELDS: FieldSpec[] = [
  { name: 'firstName', label: 'Your name', type: 'text', required: true },
  { name: 'email', label: 'Email', type: 'email', required: true },
  { name: 'investorType', label: 'I am a…', type: 'select', options: ['Broker', 'Municipality', 'Property owner', 'Other'] },
  { name: 'propertyAddress', label: 'Property address or cross streets', type: 'text', required: true },
  { name: 'message', label: 'Anything we should know?', type: 'textarea' },
]

export default function PartnersPage() {
  return (
    <div className="mx-auto max-w-[1200px] px-6 py-14">
      <SectionHeading
        eyebrow="Partners"
        title="One accountable team, start to finish"
        intro="Most developers assemble a new cast for every project and spend the job managing the seams. We work with the same builder and the same manager across the portfolio — so nobody gets to point at somebody else."
      />

      <div className="mt-8 grid gap-5 sm:grid-cols-3">
        {PARTNERS.map(([role, name, body]) => (
          <Card key={name}><div className="p-5">
            <Eyebrow>{role}</Eyebrow>
            <h3 className="mt-2 font-display text-base font-medium uppercase tracking-wide text-ink">{name}</h3>
            <p className="mt-2 text-xs leading-relaxed text-ink-secondary">{body}</p>
          </div></Card>
        ))}
      </div>

      <section className="mt-16 grid gap-10 lg:grid-cols-[1.2fr_1fr]">
        <div>
          <SectionHeading
            eyebrow="Bring Us A Site"
            title="Have land near a Metra station?"
            intro="We look at multifamily and mixed-use sites within walking distance of transit across the Chicago MSA and southern Wisconsin. Brokers, municipalities, and owners — we answer every one."
          />
          <dl className="mt-5 flex flex-wrap gap-8">
            {[['Deal Size', '$10M – $50M'], ['Asset Types', 'Multifamily, Mixed-Use'], ['Geography', 'Chicago MSA, S. Wisconsin']].map(([k, v]) => (
              <div key={k}>
                <dt className="text-[8px] font-semibold uppercase tracking-[0.15em] text-ink-secondary">{k}</dt>
                <dd className="mt-1 text-xs font-semibold text-ink">{v}</dd>
              </div>
            ))}
          </dl>
        </div>
        <div className="rounded-card border border-rule bg-panel p-6">
          <h2 className="mb-4 text-base font-bold tracking-tight text-ink">Submit a site</h2>
          <LeadForm source="site-submission" fields={SITE_FIELDS} submitLabel="Send" />
        </div>
      </section>
    </div>
  )
}
```

- [ ] **Step 6: Implement the about page**

```tsx
// src/app/about/page.tsx
import Image from 'next/image'
import { fetchSanity } from '@/sanity/client'
import { TEAM_QUERY, FOCUS_CARDS_QUERY } from '@/sanity/queries'
import { urlForImage } from '@/sanity/image'
import { SectionHeading } from '@/components/ui/SectionHeading'
import { Eyebrow } from '@/components/ui/Eyebrow'
import { Card } from '@/components/ui/Card'

export const metadata = {
  title: 'About | EM8 Properties',
  description: 'Creating communities people choose to live in — transit-oriented development in suburban Chicago.',
}

type Member = { _id: string; name: string; role: string; bio?: string; photo?: unknown; linkedin?: string }
type Factor = { _id: string; title: string; description: string }

export default async function AboutPage() {
  const [team, factors] = await Promise.all([
    fetchSanity<Member[]>(TEAM_QUERY),
    fetchSanity<Factor[]>(FOCUS_CARDS_QUERY),
  ])

  return (
    <div>
      <div className="mx-auto max-w-[1200px] px-6 py-14">
        <Eyebrow>Our Purpose</Eyebrow>
        <h1 className="mt-3 max-w-[19ch] text-4xl font-bold leading-tight tracking-tight text-ink">
          Creating communities people <span className="text-teal-text">choose to live in</span>.
        </h1>
        <p className="mt-4 max-w-[60ch] text-sm leading-relaxed text-ink-secondary">
          We develop, build, and operate housing in suburban Chicago where the infrastructure for a
          good life already exists — a train, a main street, green space, somewhere to buy groceries.
          Then we try to be the reason people stay.
        </p>
      </div>

      <section className="mx-auto max-w-[1200px] px-6 py-10">
        <SectionHeading eyebrow="How We Operate" title="Four things we refuse to compromise on" />
        <div className="mt-6 grid gap-6 sm:grid-cols-2">
          {factors.map((f, i) => (
            <div key={f._id} className="flex gap-3">
              <span className="flex size-5 shrink-0 items-center justify-center rounded-chip bg-teal-text text-[10px] font-bold text-white">{i + 1}</span>
              <div>
                <h3 className="text-sm font-semibold tracking-tight text-ink">{f.title}</h3>
                <p className="mt-2 text-xs leading-relaxed text-ink-secondary">{f.description}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="border-t border-rule bg-panel">
        <div className="mx-auto max-w-[1200px] px-6 py-14">
          <SectionHeading eyebrow="Team" title="Operators and investors with deep Chicago market experience" />
          <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {team.map((m) => (
              <Card key={m._id}>
                {m.photo ? (
                  <Image src={urlForImage(m.photo).width(600).height(600).url()} alt={m.name}
                    width={600} height={600} className="aspect-square w-full object-cover" />
                ) : <div className="aspect-square w-full bg-rule" />}
                <div className="p-4">
                  <h3 className="text-sm font-semibold text-ink">{m.name}</h3>
                  <Eyebrow>{m.role}</Eyebrow>
                  {m.bio && <p className="mt-2 text-xs leading-relaxed text-ink-secondary">{m.bio}</p>}
                </div>
              </Card>
            ))}
          </div>
        </div>
      </section>
    </div>
  )
}
```

Square portraits with Sanity's hotspot cropping — the circular-crop problem from the old guide cannot recur.

- [x] **Step 7: Run the tests and confirm they pass**

Run: `npm test`
Expected: PASS, all suites.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat: add investors, partners, and about pages"
```

---

### Task 13: The homepage

Built last, because it composes components every other task produced.

**Files:**
- Modify: `src/app/page.tsx`
- Test: `tests/unit/homepage.test.tsx`

**Interfaces:**
- Consumes: every component and query built so far.
- Produces: nothing downstream.

- [x] **Step 1: Write the failing test**

```tsx
// tests/unit/homepage.test.tsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { HomeHero } from '@/app/page'

describe('HomeHero', () => {
  it('leads with the purpose, not the balance sheet', () => {
    render(<HomeHero />)
    const h1 = screen.getByRole('heading', { level: 1 })
    expect(h1.textContent).toMatch(/choose to live in/i)
    expect(h1.textContent).not.toMatch(/\$100M/)
  })

  it('states the TOD thesis in the subhead', () => {
    render(<HomeHero />)
    expect(screen.getByText(/walking distance of Metra/i)).toBeDefined()
  })
})
```

- [x] **Step 2: Run and watch it fail**

Run: `npm test tests/unit/homepage.test.tsx`
Expected: FAIL — `HomeHero` is not exported.

- [ ] **Step 3: Implement the homepage**

```tsx
// src/app/page.tsx
import { fetchSanity } from '@/sanity/client'
import {
  HERO_STATS_QUERY, FOCUS_CARDS_QUERY, ALL_POSTS_QUERY,
  ALL_PROPERTIES_QUERY, TESTIMONIALS_QUERY,
} from '@/sanity/queries'
import { StatBand } from '@/components/ui/StatBand'
import { SectionHeading } from '@/components/ui/SectionHeading'
import { Eyebrow } from '@/components/ui/Eyebrow'
import { Button } from '@/components/ui/Button'
import { PropertyCard, type PropertyCardData } from '@/components/property/PropertyCard'
import { PostCard, type PostData } from '@/components/insights/PostCard'
import { Testimonials, type Testimonial } from '@/components/ui/Testimonials'

export function HomeHero() {
  return (
    <div className="mx-auto max-w-[1200px] px-6 pb-10 pt-14">
      <Eyebrow>Transit-Oriented Development · Suburban Chicago</Eyebrow>
      <h1 className="mt-4 max-w-[19ch] text-5xl font-bold leading-[1.08] tracking-tight text-ink">
        Creating communities people <span className="text-teal-text">choose to live in</span>.
      </h1>
      <p className="mt-5 max-w-[56ch] text-sm leading-relaxed text-ink-secondary">
        We develop and operate multifamily and mixed-use housing within walking distance of Metra
        stations — working with municipalities rather than around them.
      </p>
      <div className="mt-6 flex gap-3">
        <Button href="/portfolio">View Portfolio →</Button>
        <Button href="/insights" variant="secondary">Read Our Thinking</Button>
      </div>
    </div>
  )
}

export default async function HomePage() {
  const [stats, factors, posts, properties, testimonials] = await Promise.all([
    fetchSanity<{ figure: string; label: string }[]>(HERO_STATS_QUERY),
    fetchSanity<{ _id: string; title: string; description: string }[]>(FOCUS_CARDS_QUERY),
    fetchSanity<PostData[]>(ALL_POSTS_QUERY),
    fetchSanity<PropertyCardData[]>(ALL_PROPERTIES_QUERY),
    fetchSanity<Testimonial[]>(TESTIMONIALS_QUERY),
  ])

  return (
    <>
      <HomeHero />
      <StatBand stats={stats.slice(0, 5)} />

      <section className="mx-auto max-w-[1200px] px-6 py-14">
        <SectionHeading eyebrow="How We Operate" title="Four things we refuse to compromise on" />
        <div className="mt-6 grid gap-5 sm:grid-cols-2">
          {factors.map((f) => (
            <div key={f._id} className="border-s-2 border-teal ps-4">
              <h3 className="text-sm font-semibold tracking-tight text-ink">{f.title}</h3>
              <p className="mt-2 text-xs leading-relaxed text-ink-secondary">{f.description}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="border-y border-rule bg-panel">
        <div className="mx-auto max-w-[1200px] px-6 py-14">
          <SectionHeading eyebrow="Insights" title="What we've learned building next to the tracks" />
          <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {posts.slice(0, 3).map((p) => <PostCard key={p.slug} post={p} />)}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[1200px] px-6 py-14">
        <SectionHeading eyebrow="Portfolio" title="Ten assets. Most within a walk of a station." />
        <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {properties.slice(0, 3).map((p) => <PropertyCard key={p.slug} property={p} />)}
        </div>
        <div className="mt-6"><Button href="/portfolio" variant="secondary">View All →</Button></div>
      </section>

      {testimonials.length > 0 && (
        <section className="border-t border-rule bg-panel">
          <div className="mx-auto max-w-[1200px] px-6 py-14">
            <SectionHeading eyebrow="Our Investors" title="What our partners say" />
            <div className="mt-6"><Testimonials items={testimonials.slice(0, 3)} /></div>
          </div>
        </section>
      )}
    </>
  )
}
```

- [x] **Step 4: Run the tests and confirm they pass**

Run: `npm test tests/unit/homepage.test.tsx`
Expected: PASS, 2 tests.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: add homepage composed from the TOD thesis"
```

---

### Task 14: Agora CSV export — DESCOPED 2026-08-29

> **Skip this task.** Hunter will assemble the Agora import sheet from the notification emails instead. The `lead` document is still written by Task 10 as a durable record; only the in-CMS export route is dropped. Kept here so the decision is visible rather than silently absent.

**Files:**
- Create: `src/lib/agoraCsv.ts`, `src/app/api/leads/export/route.ts`
- Test: `tests/unit/agoraCsv.test.ts`

**Interfaces:**
- Consumes: `lead` documents from Task 10.
- Produces: `toAgoraCsv(leads: LeadRecord[]): string`.

- [x] **Step 1: Write the failing test**

```ts
// tests/unit/agoraCsv.test.ts
import { describe, it, expect } from 'vitest'
import { toAgoraCsv } from '@/lib/agoraCsv'

const leads = [
  { firstName: 'Dana', lastName: 'Levi', email: 'dana@example.com', phone: '555-0100',
    investorType: 'Individual', checkSize: '$100k–$250k', submittedAt: '2026-08-28T10:00:00Z' },
]

describe('toAgoraCsv', () => {
  it('emits the Agora header row', () => {
    expect(toAgoraCsv(leads).split('\n')[0])
      .toBe('First Name,Last Name,Email,Phone,Investor Type,Check Size,Date Added')
  })

  it('writes one row per lead', () => {
    expect(toAgoraCsv(leads).split('\n')[1])
      .toBe('Dana,Levi,dana@example.com,555-0100,Individual,$100k–$250k,2026-08-28')
  })

  it('quotes fields containing commas so the CSV does not break', () => {
    const csv = toAgoraCsv([{ ...leads[0]!, lastName: 'Levi, Jr.' }])
    expect(csv.split('\n')[1]).toContain('"Levi, Jr."')
  })

  it('handles missing optional fields as empty columns', () => {
    const csv = toAgoraCsv([{ firstName: 'Sam', email: 's@e.com', submittedAt: '2026-08-28T10:00:00Z' }])
    expect(csv.split('\n')[1]).toBe('Sam,,s@e.com,,,,2026-08-28')
  })
})
```

- [x] **Step 2: Run and watch it fail**

Run: `npm test tests/unit/agoraCsv.test.ts`
Expected: FAIL — `@/lib/agoraCsv` not found.

- [ ] **Step 3: Implement it**

```ts
// src/lib/agoraCsv.ts
export type LeadRecord = {
  firstName?: string; lastName?: string; email?: string; phone?: string
  investorType?: string; checkSize?: string; submittedAt?: string
}

const HEADERS = ['First Name', 'Last Name', 'Email', 'Phone', 'Investor Type', 'Check Size', 'Date Added']

function cell(value: string | undefined): string {
  const v = value ?? ''
  return /[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v
}

export function toAgoraCsv(leads: LeadRecord[]): string {
  const rows = leads.map((l) => [
    cell(l.firstName), cell(l.lastName), cell(l.email), cell(l.phone),
    cell(l.investorType), cell(l.checkSize),
    cell(l.submittedAt ? l.submittedAt.slice(0, 10) : ''),
  ].join(','))
  return [HEADERS.join(','), ...rows].join('\n')
}
```

- [ ] **Step 4: Implement the export route**

```ts
// src/app/api/leads/export/route.ts
import { NextResponse } from 'next/server'
import { writeClient } from '@/sanity/writeClient'
import { toAgoraCsv, type LeadRecord } from '@/lib/agoraCsv'

export async function GET(request: Request) {
  const token = new URL(request.url).searchParams.get('token')
  if (!token || token !== process.env.LEAD_EXPORT_TOKEN) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const leads = await writeClient.fetch<LeadRecord[]>(
    `*[_type == "lead" && source == "keep-in-touch"] | order(submittedAt desc)
      { firstName, lastName, email, phone, investorType, checkSize, submittedAt }`,
  )

  return new NextResponse(toAgoraCsv(leads), {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="em8-leads-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  })
}
```

Add `LEAD_EXPORT_TOKEN` to the environment. The route is token-gated because it returns personal data — never leave it open.

- [x] **Step 5: Run the tests and confirm they pass**

Run: `npm test tests/unit/agoraCsv.test.ts`
Expected: PASS, 4 tests.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: add token-gated Agora CSV export for leads"
```

---

### Task 15: Content migration and placeholder replacement

No invented number ships. This task is content work, gated by a test that fails while placeholders remain.

**Files:**
- Create: `scripts/seed.ts`
- Test: `tests/unit/content-integrity.test.ts`

**Interfaces:**
- Consumes: all schemas and queries.
- Produces: a populated `production` dataset.

- [ ] **Step 1: Write the failing integrity test**

```ts
// tests/unit/content-integrity.test.ts
import { describe, it, expect } from 'vitest'
import { sanityClient } from '@/sanity/client'

const PLACEHOLDERS = ['Lorem', 'TODO', 'TBD', 'placeholder', 'example.com']

describe('published content', () => {
  it('has no placeholder text anywhere', async () => {
    const docs = await sanityClient.fetch<unknown[]>('*[_type in ["property","post","teamMember","focusCard","testimonial"]]')
    const blob = JSON.stringify(docs)
    for (const p of PLACEHOLDERS) expect(blob).not.toContain(p)
  })

  it('gives every property a slug and coordinates', async () => {
    const broken = await sanityClient.fetch<unknown[]>(
      '*[_type == "property" && (!defined(slug.current) || !defined(coordinates))]',
    )
    expect(broken).toHaveLength(0)
  })

  it('publishes no testimonial without recorded consent', async () => {
    const unconsented = await sanityClient.fetch<unknown[]>('*[_type == "testimonial" && consentOnRecord != true]')
    expect(unconsented).toHaveLength(0)
  })

  it('uses no promissory return language', async () => {
    const docs = await sanityClient.fetch<unknown[]>('*[_type in ["property","post"]]')
    const blob = JSON.stringify(docs).toLowerCase()
    for (const banned of ['guaranteed return', 'will return', 'risk-free', 'assured return']) {
      expect(blob).not.toContain(banned)
    }
  })
})
```

- [ ] **Step 2: Separate it from the unit suite**

This test hits the live dataset over the network, so it must not run in the default `npm test`. Move it to `tests/integration/` and add a dedicated script:

```json
"test": "vitest run --dir tests/unit",
"test:content": "vitest run --dir tests/integration"
```

- [x] **Step 3: Run and watch it fail**

Run: `npm run test:content`
Expected: FAIL — the dataset is empty or still carries placeholders.

- [ ] **Step 4: Enter the real content in the Studio**

Working from spec §9. For each of the ten properties: title, slug, asset class, status, city, coordinates from Google Maps, **the real Metra station and walk time**, units, year, card blurb, overview, business plan, gallery with alt text. For sold properties add the deal story with the **real** multiple and exit year.

Then: five hero stats, four success factors, six team members with square photos, site settings including the Agora URL and the disclaimer, and testimonials — **only with `consentOnRecord` ticked.**

Source copy is recoverable from the live site; every figure listed in spec §9 must be replaced with a real one or the field left empty.

- [ ] **Step 5: Run the integrity test until it passes**

Run: `npm run test:content`
Expected: PASS, 4 tests.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "test: add content integrity gate against placeholders and promissory language"
```

---

### Task 16: End-to-end tests, performance budget, and Railway deploy

**Files:**
- Create: `playwright.config.ts`, `tests/e2e/site.spec.ts`, `Dockerfile`, `railway.json`
- Modify: `next.config.ts`, `package.json`

**Interfaces:**
- Consumes: the whole application.
- Produces: a deployed site.

- [ ] **Step 1: Install and configure Playwright**

```bash
npm install -D @playwright/test && npx playwright install chromium
```

```ts
// playwright.config.ts
import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './tests/e2e',
  use: { baseURL: 'http://localhost:3000' },
  webServer: { command: 'npm run build && npm start', url: 'http://localhost:3000', reuseExistingServer: !process.env.CI },
})
```

- [ ] **Step 2: Write the failing E2E suite**

```ts
// tests/e2e/site.spec.ts
import { test, expect } from '@playwright/test'

test('homepage leads with the purpose', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { level: 1 })).toContainText(/choose to live in/i)
})

test('a portfolio card opens its canonical property page', async ({ page }) => {
  await page.goto('/portfolio')
  await page.locator('a[href^="/portfolio/"]').first().click()
  await expect(page).toHaveURL(/\/portfolio\/[a-z0-9-]+$/)
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
})

test('an insights article resolves and carries share metadata', async ({ page }) => {
  await page.goto('/insights')
  await page.locator('a[href^="/insights/"]').first().click()
  await expect(page).toHaveURL(/\/insights\/[a-z0-9-]+$/)
  await expect(page.locator('meta[property="og:title"]')).toHaveCount(1)
})

test('Investor Login points off-site to Agora', async ({ page }) => {
  await page.goto('/')
  const link = page.getByRole('link', { name: /investor login/i }).first()
  await expect(link).toHaveAttribute('target', '_blank')
})

test('Keep in Touch submits and confirms', async ({ page }) => {
  await page.goto('/investors')
  await page.getByLabel('First name').fill('Playwright')
  await page.getByLabel('Email').fill('e2e@example.test')
  await page.getByLabel(/accredited investor/i).check()
  await page.getByRole('button', { name: /send/i }).click()
  await expect(page.getByText(/thank you/i)).toBeVisible()
})

test('a bad URL renders the 404 rather than crashing', async ({ page }) => {
  const res = await page.goto('/portfolio/does-not-exist')
  expect(res?.status()).toBe(404)
})
```

- [ ] **Step 3: Run and watch it fail, then fix what it surfaces**

Run: `npx playwright test`
Expected: initial failures. Fix each until green. Add `"test:e2e": "playwright test"` to scripts.

- [ ] **Step 4: Add the not-found and error boundaries**

```tsx
// src/app/not-found.tsx
import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="mx-auto max-w-[1200px] px-6 py-24 text-center">
      <h1 className="text-3xl font-bold tracking-tight text-ink">We couldn&rsquo;t find that page</h1>
      <p className="mt-3 text-sm text-ink-secondary">It may have moved, or the link may be out of date.</p>
      <Link href="/" className="mt-6 inline-block rounded-control bg-teal px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-white">
        Back to home
      </Link>
    </div>
  )
}
```

```tsx
// src/app/error.tsx
'use client'
export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="mx-auto max-w-[1200px] px-6 py-24 text-center">
      <h1 className="text-3xl font-bold tracking-tight text-ink">Something went wrong</h1>
      <button onClick={reset} className="mt-6 rounded-control bg-teal px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-white">
        Try again
      </button>
    </div>
  )
}
```

- [ ] **Step 5: Configure the image domain and standalone output**

```ts
// next.config.ts
import type { NextConfig } from 'next'

const config: NextConfig = {
  output: 'standalone',
  images: { remotePatterns: [{ protocol: 'https', hostname: 'cdn.sanity.io' }] },
}
export default config
```

- [ ] **Step 6: Add the Railway deploy configuration**

```dockerfile
# Dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
EXPOSE 3000
CMD ["node", "server.js"]
```

```json
// railway.json
{
  "$schema": "https://railway.app/railway.schema.json",
  "build": { "builder": "DOCKERFILE", "dockerfilePath": "Dockerfile" },
  "deploy": { "restartPolicyType": "ON_FAILURE", "restartPolicyMaxRetries": 3 }
}
```

- [ ] **Step 7: Deploy to Railway**

Create the service under the **EM8-owned Railway team** — not a personal account (spec §8, launch blocker 1). Set every variable: `NEXT_PUBLIC_SANITY_PROJECT_ID`, `NEXT_PUBLIC_SANITY_DATASET`, `SANITY_API_WRITE_TOKEN`, `RESEND_API_KEY`, `LEAD_NOTIFICATION_EMAIL`, `LEAD_EXPORT_TOKEN`.

Then add a Sanity webhook pointing at the Railway deploy hook so publishing rebuilds the site.

- [ ] **Step 8: Verify against the deployed URL**

Run: `npx playwright test --config=playwright.config.ts` with `baseURL` set to the Railway URL.
Expected: all six pass. Then run Lighthouse on the homepage and a property page; performance should be 90+ — the old site's failure was 40MB of unoptimised images, and Sanity's pipeline plus `next/image` removes it.

- [ ] **Step 9: Put the test suite and performance budget in CI**

Spec §7 requires the Lighthouse budget to run in CI, not by hand.

```yaml
# .github/workflows/ci.yml
name: CI
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    env:
      NEXT_PUBLIC_SANITY_PROJECT_ID: ${{ secrets.SANITY_PROJECT_ID }}
      NEXT_PUBLIC_SANITY_DATASET: production
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20, cache: npm }
      - run: npm ci
      - run: npx tsc --noEmit
      - run: npm test
      - run: npx playwright install --with-deps chromium
      - run: npm run test:e2e
      - run: npm run build
      - name: Lighthouse budget
        uses: treosh/lighthouse-ci-action@v11
        with:
          urls: http://localhost:3000/
          budgetPath: ./lighthouse-budget.json
          startServerCommand: npm start
```

```json
// lighthouse-budget.json
[{
  "path": "/*",
  "resourceSizes": [
    { "resourceType": "image", "budget": 800 },
    { "resourceType": "script", "budget": 350 },
    { "resourceType": "total", "budget": 1600 }
  ]
}]
```

The 800KB image budget is the guardrail against the old site's failure — it fails the build long before anyone ships a 20MB camera original.

Note `npm test` here runs only `tests/unit`. The content integrity suite (`npm run test:content`) needs live dataset credentials and runs manually before a content release, not on every push.

- [ ] **Step 10: Commit and push**

```bash
git add -A
git commit -m "feat: add E2E suite, error boundaries, CI budget, and Railway deployment"
git push
```

---

## Cutover (after Task 16 passes on the deployed URL)

1. Confirm the Railway service belongs to the EM8 team, not an individual.
2. In Wix DNS, point `em-8.com` at the Railway domain.
3. Watch for propagation; the old Netlify site keeps serving until DNS moves, so there is no downtime window.
4. Leave the old site deployed for two weeks as a rollback path.
5. Write the successor handover doc into `README.md` — replacing the stale Word file, in the repo, where it can't get lost.

## Phase 2 and 3

Separate plans, written after Phase 1 ships:

- **Phase 2 — Hebrew:** localized fields with English fallback, `[locale]` routing, `dir` switching, Heebo for display type, translated navigation. Cheap because every component in this plan uses logical properties.
- **Phase 3 — Photography and testimonials:** replace stock imagery with the professional shoot, populate consented LP testimonials, write the insights backlog.
