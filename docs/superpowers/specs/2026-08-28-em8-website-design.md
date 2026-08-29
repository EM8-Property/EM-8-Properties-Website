# EM8 Properties Website — Design Spec

**Date:** 2026-08-28
**Status:** Approved design, pending spec review
**Repo:** `github.com/EM8-Property/EM-8-Properties-Website`

---

## 1. Why we're building this

em-8.com today is a portfolio brochure: a single 7,364px page that says *we own $100M of buildings*, ending in a contact form. It is built as a Vite SPA loading Tailwind from a CDN, with 10–20MB camera-original photos and a stock Unsplash image of Cloud Gate as its hero.

Three problems drove the rebuild:

1. **It doesn't win capital.** Every comparable sponsor site (BAM Capital, Gray Capital, Roers) is built to move a stranger toward a commitment. EM8's is built to describe a company.
2. **It doesn't say what EM8 is actually good at.** The August 2026 strategy session settled on a far more ownable position: *transit-oriented development in partnership with municipalities*, with reputation pulling capital in rather than the firm chasing it. The current site argues none of that.
3. **It can't hold what's needed** — per-property pages, realized track record, a blog to link from LinkedIn, and a real investor front door.

A fourth, unstated but decisive: **the current site is stranded on a departed employee's personal GitHub account.** It cannot be cloned by anyone at EM8 today. Whatever replaces it must survive its author.

## 2. Decisions

### 2.1 Build fresh, don't inherit

New repository. The existing code is inaccessible (`botanalagoz/em8-properties` returns *Repository not found*), and its own documentation warns of a `constants.ts` shadow copy, a destructive `sanity:sync` command, a hidden duplicate form, and a `docs/archive/` folder that "will send you the wrong direction." Salvage value is content and photography, both already recovered.

**Not carried forward:** `constants.ts` fallback content, `npm run sanity:sync`, CDN-loaded Tailwind, `docs/archive/`.

### 2.2 Stack

| Layer | Choice | Reasoning |
|---|---|---|
| Framework | **Next.js (App Router) + TypeScript** | Pre-rendered per-property URLs — the capability the SPA fundamentally lacks. Most common stack for this use case, so a future developer can pick it up. |
| Styling | **Tailwind, compiled** | Same utility model as today without shipping the compiler to visitors. |
| CMS | **Sanity** | Image pipeline, field-level localization, structured content, no infrastructure to maintain. |
| Hosting | **Railway, EM8-owned team** | Already used and understood by the team; account ownership stays with the company. |
| Domain | **Wix (DNS only)** | Unchanged. Point at Railway at cutover. |
| Portal | **Agora** (external link) | Handles accreditation verification. No API on the current subscription. |

**Rejected:** Vercel (better stack fit, but adds an account and mental model for benefits Sanity's CDN already provides); Netlify (account control is the problem being solved); Astro (simpler, but fights the investor-portal direction); Payload self-hosted (full ownership, but hands a successor a Postgres database to maintain).

### 2.3 Visual direction

**Light institutional** — chosen over the current dark ground and over a dark/light split.

This moves the website into the light context EM8's brand system already defines for deck interiors and one-pagers. Nothing is invented. **Consequence to accept:** the site will no longer visually match LinkedIn graphics and deck covers, which remain dark.

| Token | Value |
|---|---|
| Ground | `#FFFFFF`, alt panel `#F5F5F3` |
| Text | `#1A1A1A`, secondary `#555555` |
| Rules | `#D8D8D4` |
| Accent | `#4ABDB5` — fills, buttons, large figures |
| Small teal text | `#2C7A74` — **required** below 24px; `#4ABDB5` measures ~2.2:1 on white and fails contrast |
| Type | Inter (all), Oswald (wordmark + property titles only), Heebo (Hebrew display — Oswald has no Hebrew glyphs) |

Teal stays at roughly 5–10% of any composition. Photography is architectural, wide, natural light.

### 2.4 Bilingual (English / Hebrew)

Field-level localization with **fallback to English**. An untranslated document renders in English rather than breaking. Hebrew mirrors fully (RTL): nav, card alignment, accent borders.

**Implementation constraint:** use CSS logical properties (`margin-inline-start`, not `margin-left`) throughout from the first component. Retrofitting RTL is expensive; building with it is nearly free.

Hebrew copy requires a native speaker. Placeholder Hebrew in mockups is illustrative only.

## 3. Site architecture

| Route | Purpose |
|---|---|
| `/` | Narrative scroll: hero → stats → four success factors → insights → portfolio → partners → CTA |
| `/portfolio` | Filterable index by asset class and status |
| `/portfolio/[slug]` | Individual asset: gallery, business plan, facts rail, map, related writing |
| `/track-record` | Index of realized deals, *Acquired → Executed → Exited*. Links to canonical property pages — it is a **view**, not a second set of pages. |
| `/insights` | Single feed, announcements and essays, category filter |
| `/insights/[slug]` | Article. **The LinkedIn-linkable URL.** |
| `/investors` | Agora login + how an investment works + Keep in Touch |
| `/partners` | Kinzie, Advantage, municipalities + **site submission** |
| `/about` | Purpose, four success factors, team |
| `/studio` | Sanity Studio on EM8's own domain |

### Three audiences, deliberately separated

- **Limited partners** → `/investors`, `/track-record`
- **Brokers, municipalities, land sellers** → `/partners` and its site-submission form. *This audience is served by nothing on the current site.*
- **The market at large** → `/insights`, which is the mechanism for "reputation brings capital to us."

## 4. Content model (Sanity)

**Singletons:** `siteSettings` (nav, footer, Agora portal URL, default share image), `pullQuote`.

**Collections:**

- **`property`** — name, slug, asset class, status, city/state, coordinates, **`metraStation` + `walkMinutes`**, year built/renovated, units, square footage, card blurb, overview, business plan, gallery, `dealStory` (acquired / executed / exited), `publiclyOffered` toggle, order, featured.
- **`heroStat`** — figure, label, order.
- **`teamMember`** — name, title, bio, photo, optional LinkedIn.
- **`focusCard`** — the four success factors.
- **`post`** — title, slug, date, category, excerpt, hero image, body, optional `relatedProperty`.
- **`testimonial`** — quote, attributed name, role or descriptor (e.g. "Private Equity Consultant"), optional investor-since year, order, `featured`. Renders on `/` and `/investors`.
- **`lead`** — Keep in Touch and site submissions. Write-only from the site.

### Two structural decisions

**Track record and portfolio share the `property` type.** A sold asset is a property with `status: sold` and `dealStory` filled in. No re-entry, no drift between two records.

**Every property has exactly one canonical URL — `/portfolio/[slug]` — regardless of status.** `/track-record` filters and presents sold assets but links back to those same pages. A realized deal never exists at two addresses; duplicate URLs for one asset would split its search ranking and double the editing surface.

**`publiclyOffered`** gates only the offering block: target returns, "Enter the deal room," and the offering's appearance in any current-opportunity module. The property's descriptive content stays public either way.

**Metra walking distance is a first-class field**, not prose. It renders on every card and every property page, turning the TOD claim into a repeated fact.

### Guardrails (the CMS enforces what the old guide asked humans to remember)

- Character limits with live counters on bios and card blurbs
- Hotspot cropping on all images — portrait headshots no longer lose their subject
- Required alt text
- `dealStory` fields appear only when `status: sold`
- Required, unique slugs; required coordinates
- Types generated from the schema, so a renamed field fails the build with a clear message rather than rendering an empty section

## 5. Forms and data flow

Sanity → GROQ at build → static pages. Publish fires a webhook that revalidates. Live in about a minute.

**Both forms follow capture-first:**

1. Write a `lead` document to Sanity
2. Email the team immediately
3. Confirm to the user

**No Agora API** on the current subscription. Kathy exports a CSV in Agora's import format from the Studio. If API access is added later, the push slots in behind step 1 with no change to the form.

Rejected: posting directly to Agora (an outage silently swallows leads) and linking out to Agora's own form (loses drop-offs, can't be bilingual or branded).

**Forms:** Keep in Touch (name, email, phone, investor type, check size, message, accreditation confirmation) and Site Submission (name, email, role, address, notes).

## 6. Error handling

- `error.tsx` and `not-found.tsx` per route segment
- Missing optional content degrades gracefully; **missing required content fails the build loudly** — no silent fallback content, which is the failure mode `constants.ts` created
- Form failures surface inline; the `lead` write is the source of truth, email is best-effort
- A failed build leaves the previous deploy serving

## 7. Testing

- **Vitest** — GROQ query shapes, image URL building, locale fallback, Agora CSV formatting
- **Playwright** — homepage renders, property page resolves by slug, insights article resolves, both forms submit and persist, language switch preserves the current page, RTL applies
- **TypeScript strict** + Sanity typegen
- **Lighthouse budget in CI** — performance is a stated goal and the old site's specific failure

## 8. Delivery phasing and launch blockers

This is a large scope for one uninterrupted build. Sequence it so something real is visible early rather than eight weeks of silence:

**Phase 1 — English site, live.** Schema, content migration, all ten routes, both forms, deploy to Railway. Cut over from the current site. This alone is a complete replacement and every stated goal except Hebrew.

**Phase 2 — Hebrew.** Localized fields, RTL, language switch. Built on logical properties from Phase 1, so this is additive rather than a rewrite. Deferring it is safe; designing as though it will never come is not.

**Phase 3 — Refinement.** Real photography swapped in, LP testimonials if available, insights backlog written.

### Launch blockers

1. **Railway account must be an EM8-owned team**, not personal. Building on a personal account and transferring later is acceptable; launching on one is not — it rebuilds the exact trap this project exists to escape.
2. **GitHub org needs a company contact email and a second owner.**
3. **Every placeholder figure replaced** (see §9).
4. **Hebrew copy reviewed by a native speaker.**
5. **Real photography** — or launch with the slots filled by the best existing images and swap after the shoot.

## 9. Placeholders requiring real values

Invented for layout. **None may ship.**

- Deal-level returns: Boulevard target multiple/IRR/cash-on-cash/hold; Burbank 2.1x and 2019 exit; Embassy 1.7x and 2021 exit
- Municipal stats: 5 municipalities, 90 units entitled in Oak Forest, 10+ years in MSA, **0 zoning litigations** — powerful if true, a liability if not
- Metra walk times for all properties
- All three insight article headlines and bodies
- Boulevard retail figures (4 suites, 6,200 SF)

Confirmed real, from EM8's brand reference: $100M+ AUM, 1,350+ units managed, 750+ units sold, 10+ years, 1.79x realized equity multiple, 36.2% average annual return on equity. **The last two appear nowhere on the current site** and are the most LP-relevant proof EM8 owns.

## 10. Assumptions

1. **Offerings are marketed under Rule 506(c)**, with Agora performing accreditation verification. The exemption is elected per offering on its Form D, so `publiclyOffered` is a per-property toggle — a 506(b) raise can never appear publicly by accident. *Hunter has reviewed this and considers a site disclaimer sufficient; recorded as his decision.*
2. ~~Sanity's free-tier user limit accommodates the editing team.~~ **Confirmed 2026-08-28** — Sanity stays, seat count is not a constraint.
3. Kinzie and Advantage consent to being named publicly.
4. English is the primary language; Hebrew is additive.

## 11. Resolved and open

**Resolved 2026-08-28:**

- **Buffett quote is out permanently.** Replaced by attributed LP testimonials. A borrowed quote from someone with no relationship to the firm reads thin next to a real investor saying something specific.
- **LP testimonials are available.** They become a content type and appear on `/` and `/investors`. Attributed by name and role wherever the investor permits it — an anonymous testimonial persuades nobody. Written consent required before publishing any investor's name.
- **Deal-level multiples are public** on `/track-record`. This is the strongest asset on the page and directly serves the transparency the strategy session called essential to investor trust. Every figure carries the realized/targeted distinction; no forward-looking number is stated as a promise.

- **Sanity is confirmed as the CMS.** Seat count is not a constraint.

**Still open:** none. Design is settled.

## 12. Out of scope

Careers, a residents/leasing portal, press, a gated data room (Agora holds it), and any authenticated area of the site.
