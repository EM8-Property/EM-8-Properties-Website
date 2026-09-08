# Etamar's feedback — design, 2026-09-08

Etamar Deshe reviewed the live Railway site against **em-8.com**, the site this rebuild
replaces, and sent a list. He also had Claude build an artifact showing the changes he
wants; that artifact could not be read from this session (`claude.ai` returns "reading
public artifacts as a non-member reader is not enabled").

**Hunter closed that on 2026-09-08: the artifact is not needed.** It mattered while the
layout here was inferred from em-8.com and from buligocapital.com, which Etamar named as
his reference. It stopped mattering once he gave the information architecture directly —
the two dropdowns, the sections rather than pages, the deleted `/track-record`, the
Current Offerings section. §§5–6 are now built from instructions rather than from
inference, which is why the artifact is no longer the first risk in this document.

This document records what was decided, what was declined, what is held, and what is
owed by people rather than by code. It supersedes nothing; it extends
`2026-08-28-em8-website-design.md`, whose §2.3 palette is directly contradicted by the
held workstream in §9 and by nothing else here.

---

## 1. The reframe that matters

"Review the website; the structure of the original one is more solid — it just looks
better (fonts, resolution)" reads as praise until you know which site is "the original
one". It is **em-8.com**, not the artifact. So this is a complaint about the new site, and
it is measurable rather than a matter of taste:

| | em-8.com | live site |
|---|---|---|
| headline | Inter 700 at **72px** | 30 / 36 / **48px** |
| hero source | Unsplash at **w=2070** | Sanity crop capped at **1600** |
| ground | `#1A1A1A` | `#FFFFFF` |
| wordmark | "EM8" white + "Properties" `#4ABDB5`, Oswald 300 24px | "EM8" ink + "PROPERTIES" `#2C7A74` |
| hero stats | inside the hero, over the photograph | a separate band below it |

Two of his five notes are therefore one note: our headline is a third smaller than his,
and our hero photograph is genuinely undersampled — **about 2.8× short of the device
pixels on a DPR-3 phone**, because the painted width of a full-screen `object-cover` box
is the viewport height times 1.78 while the crop caps at 1600px. (Measured 2.71× at
375×812 on 2026-09-02 and 2.8× at 390×844 here; the number moves with the viewport, the
shortfall does not.) He is describing an artefact that exists.

## 2. He was reviewing on a phone

Confirmed by Hunter on 2026-09-08, and it is the single most useful fact in this document:
**the review surface was a phone, and the requirement is that the site look equally good
on a phone and on a desktop.** Measured on a 390×844 viewport at DPR 3 with an iOS user
agent:

| | Buligo (his reference) | ours | em-8.com ("the original") |
|---|---|---|---|
| homepage length | **4.3 screens** | **8.2 screens** | **15.8 screens** |
| phone header | wordmark + hamburger | wordmark + hamburger | wordmark + Investor Portal + hamburger |
| `h1` | — | **30px** | **60px** |
| hero bitmap served | — | 1600px (cap) | 2070px |
| hero image quality | — | `q=68` | `q=80` |

Four things follow, and two of them contradict what §§5–6 of this document said before
this measurement:

1. **He genuinely could not see the nav.** Our phone header is `EM8 Properties · Menu` —
   two items. Every link he asked us to add is already there, one tap away, inside the
   panel: Portfolio · Track Record · Insights · Partners · About · Investor Login · Invest
   With Us. "Add case studies and insights to the upper bar" is a report that the bar is
   empty on a phone, not that the site lacks those pages.
2. **"More options on the upper bar" cannot be answered on a phone by copying Buligo.**
   Buligo's phone header is *also* wordmark + hamburger. Their minimalism is a
   dropdown-rich bar on the desktop and a page half our length on the phone.
3. **"Less scroll down" is not a comparison with em-8.com.** The old site is 15.8 screens
   on a phone, nearly twice ours. The reference is Buligo at 4.3.
4. **The resolution gap is narrower than it looks, and partly about compression.** On a
   DPR-3 phone both sites undersample — ours about 2.8× short of the device pixels, the old
   site about 2.5× — because a full-height `object-cover` box paints far wider than the
   viewport. The difference he can actually see is more likely `q=68` against `q=80`.
   Quality is therefore a third lever alongside the crop cap and `sizes`, and it is the
   cheapest: 75 is already allowlisted in `next.config.ts`, so raising 68→75 needs no
   config change. Measure the bytes; do not assume.

## 3. Sorting the feedback

### Already true on the live site — show him, do not build

- **Track Record and Insights are already in the top bar.** So are Portfolio, Partners and
  About.
- **Nir Dror and Ilan Lior are already board members** — `group: 'partner-board'`,
  `role: 'Board Member'`, both with photographs and bios.
- **Team names are already all one size** — `text-sm font-semibold` in both groups.

He saw otherwise because he was on a phone, where the bar collapses to a hamburger and
none of those five links is visible — see §2. That is the whole explanation for "more
options on the upper bar" arriving alongside items that were already in it, and it is why
§5 fixes visibility rather than adding destinations.

### Studio edits — no deploy, no developer

| change | field |
|---|---|
| Etamar Deshe → "Founder & CEO" | `teamMember.role` |
| Michael Gallant → "Founder & Board Member" | `teamMember.role` |
| Alexander Riegler off the IR title | `teamMember.role` |
| Oak Forest K's city involvement and partnership | `property.overview` |
| The trailer park, when it is ready to name | new `property` |

### Owed by people

- The **Deshe prior-sales spreadsheet**. Deferred by Hunter on 2026-09-08 — those deals go
  in later, so §8's second half is held rather than blocked, and nothing waits on it.
- **Oak Forest partnership copy** — the city involvement Etamar says is missing.
- **"Why EM8" and "Why Midwest" body copy.** §5 ships both as Sanity-backed sections —
  `whyEm8` on the About page, and the `/strategy` page's body — with the structure in place
  and the copy empty, so this needs no developer.
- **The ten nav labels.** They become Studio fields in §5. They can ship with the labels
  this document proposes and be edited later; nothing is blocked on them.
- **Antioch's target-return figures.** Hunter confirmed on 2026-09-08 that the live
  offering, the deals in progress and the realized results may all be public. The figures
  themselves are still not in the dataset.

### Declined

**Property categories as Acquisition / Development.** Etamar's words were "categories
should be acquisition or development in my opinion". Hunter decided on 2026-09-08 to keep
`assetClass` and `status` as they are — "it is good as is" — and to add no strategy field
and no third filter row.

Recorded because it is the one item on his list that is being consciously not done. The
shape it would have taken, if it returns: `strategy: 'acquisition' | 'development'` as a
**new** field beside `assetClass`, which is what buligocapital.com does — their case study
pages carry Type and Strategy as separate facts ("Type: Multifamily, Strategy:
Development"). As an added field it could go to production ahead of its code under the
rule in `docs/deploys-and-migrations.md`; replacing `assetClass` could not. A display-only
chip with no filter is the cheap middle ground.

### Decided, with the reasoning recorded so nobody "fixes" it

**Antioch Shopping Plaza stays out of the portfolio grid.** It is the only property with
`showInPortfolio: false`, which looks like an oversight — it is the one publicly offered
deal, and Hunter has said the live offering may be public. It is deliberate: EM8 is under
contract, not on title, and a portfolio is a claim of ownership. Hunter confirmed on
2026-09-08. It keeps its own page at `/portfolio/antioch-shopping-plaza` and its offering
block; it simply is not listed among assets EM8 owns.

This looks like it collides with the Current Offerings section §6 puts on `/portfolio` —
Antioch is the only publicly offered property, so that section is Antioch. It does not
collide, because the two sections make different claims. §6 has the reasoning.

### Held

**The dark re-theme (§9).** Specced here, deliberately not scheduled. Hunter's call on
2026-09-08: Etamar sees PRs 1–4 first. It is the largest item, the least reversible, and
the only one that rewrites an approved design decision.

**The founder's prior deals (§8's second half).** Deferred by Hunter on 2026-09-08 — the
spreadsheet comes later and those deals go in then. It is the only new schema this document
would have added.

---

## 4. Centralize the palette before the theme moves

The sequence chosen is cheap-wins-first, theme-last, so every component built in §§5–8
gets re-touched by §9. The mitigation is that the re-theme should be a token swap.

**It is not one today, and an earlier draft of this section was wrong to say so.** The
grounds and the ink are centralized in `@theme` and mirrored in `tokens.ts`. Seven colour
decisions are not — they live as Tailwind arbitrary values and inline styles in eleven
files, so a token swap would miss every one of them, silently, on a dark ground:

| colour | where | on white | on `#1A1A1A` |
|---|---|---|---|
| `#C0392B` | `LeadForm` error text | 5.44 ✓ | **3.20 ✗ (text needs 4.5)** |
| `#3AA8A0` | `Button`, `OfferingBlock` teal hover | 2.88 ✗ | 6.04 ✓ |
| `#00707F` | Chip, multifamily | 5.79 ✓ | 3.00 ✓ |
| `#01579B` | Chip, mixed-use | 7.40 ✓ | **2.35 ✗** |
| `#2E7D32` | Chip, townhomes | 5.13 ✓ | 3.39 ✓ |
| `#2C7A74` / `#4ABDB5` | `PropertyMap` marker | mixed | mixed |

The first row is the one that matters: **the lead form's error message falls below the
text bar on a dark ground**, on the site's only conversion path, and nothing would catch
it — it is an arbitrary value in a component, invisible to `tokens.test.ts` and to
`chipContrast.test.ts` alike. The second row is a hover state that already fails on white
today.

So the prerequisite is a task, not a claim: **move those seven into `@theme` and
`tokens.ts`** — as `danger`, `teal-hover`, the chip fills, and the map's two marker
colours — and only then is the swap real. `PropertyMap` needs its values as JS strings
rather than classes, because Leaflet draws its vectors through an API; importing them from
`tokens.ts` is what keeps them in the swap.

Once the palette is whole, a lint rule keeps it whole: **no hex literal in `src/`**, with
three exceptions — `src/lib/tokens.ts`, `src/lib/chipColors.ts` (where the implementation
plan moves the chip fills, so the rule needs no exception shaped like a component) and
`src/app/global-error.tsx`. Two notes on scope, because an earlier draft got
this wrong too — ESLint does not read `globals.css`, so listing it as an exception was
meaningless; and `global-error.tsx` must keep its inline hex, because it is the boundary
that renders when the stylesheet itself has failed to load.

`text-white` stays legal: hero copy sits on a photographic scrim, so that is a colour
chosen against an image rather than against the ground.

---

## 5. Navigation

Two dropdowns, two plain links, and the two actions:

```
About Us ▾        Strategy ▾        Portfolio   Insights      Investor Login  [Invest With Us]
  About EM8         Why Midwest
  Why EM8           Partners
  Our Team
```

Hunter's instruction, 2026-09-08. Why Midwest appears in both halves of how he phrased it
— "Why EM8 and why midwest should fold into the about us", then "Why midwest and partners
should go under a tab called Strategy" — and the second is read as the correction, so
Midwest sits under Strategy. About Us is a tab in its own right, which it already was in
this design; he may have been reading the mobile panel, where About sits directly above
Investor Login and Invest With Us and can look nested under them.

### Two routes, not five

**Why EM8 and Why Midwest are sections, not pages.** Hunter's word was "fold", and folding
is what happens:

| bar item | destination | new? |
|---|---|---|
| About Us ▾ | button, not a link | |
| — About EM8 | `/about` | exists |
| — Why EM8 | `/about#why-em8` | **new section on an existing page** |
| — Our Team | `/about#team` | exists, needs an `id` |
| Strategy ▾ | `/strategy` | **new page** |
| — Why Midwest | `/strategy` | its content |
| — Partners | `/partners` | exists |
| Portfolio | `/portfolio` | exists, now includes the realized deals |
| Insights | `/insights` | exists |
| Investor Login | `siteSettings.agoraPortalUrl` | off-site |
| Invest With Us | `siteSettings.headerCta` | |

So **one new route** — `/strategy` — against the four an earlier draft would have created.
The two pages that would have started empty are now sections of pages that already have
content, which is the difference between a thin page and a fuller one.

`Strategy ▾` is a link *and* a parent, where `About Us ▾` is a button. That asymmetry is
deliberate, and it is the awkward case the dropdown spec below has to handle: a parent that
navigates cannot also open on first tap. It resolves the same way — the panel's first child
is the parent's own page, so the destination is reachable without depending on how the
parent behaves under a tap.

### Everything on these pages is Sanity content

Hunter's note: "these things need to be connected to Sanity.io". They are, and the pattern
is established rather than invented here.

`/strategy` gets a `strategyPage` document shaped like the others — `heading` (eyebrow,
title, intro), a `body` for the Why Midwest argument, and `seo`. `/about` gains a `whyEm8`
block with its own heading and body, guarded per leaf so a half-filled one renders nothing
rather than an empty `<h2>`. Both are **added** fields and documents, so they can go to
production ahead of the code that reads them under the rule in
`docs/deploys-and-migrations.md`, and both are backfilled by a scoped `--only=` step.

**A section whose body is absent renders nothing, and its nav entry goes with it.** An
empty page in the bar is worse than a missing one — the same rule an earlier draft stated
for the pages that are now sections.

### Nav labels come from Sanity; the structure and the destinations do not

Hunter's choice, 2026-09-08, over the recommendation to keep labels in code. So:

- **In Sanity:** the visible text of each tab and child — `siteSettings.navLabels`, one
  field per node.
- **In code:** which nodes exist, how they nest, and where each points.

The nodes carry stable keys and hrefs in code; Sanity supplies a label per key. That keeps
the failure mode small: a bad edit makes a tab read oddly, but it cannot make a tab point
somewhere else or drop out of the site's structure.

Three consequences, and the first is the one to watch:

- **A label can lie about its destination.** "Insights" pointing at `/partners` is a defect
  no test can catch, because both halves are individually valid. Mitigated by keeping the
  hrefs in code and by each Studio field description naming the destination it labels.
  That is cheap, and it is the only guard available.
- **Label length stops being a build-time fact**, which matters because the phone bar is
  measured in characters. See below.
- **Phase 2 gets easier**, unplanned but real: field-level localization makes the nav
  translatable for Hebrew with no code change, where today the five labels are literals.

**This is the change that should finally merge the two guard lists.** The 2026-09-03
handover records that `(site)/layout.tsx`'s per-leaf guards and `content-integrity`'s gate
list "are maintained separately and will drift", and that deriving both from one exported
array "would make the next required field free". Adding ten nav labels and two documents to
two hand-maintained lists is exactly the cost that note predicted. Do the derivation first.

### The dropdown component

The one genuinely new interactive piece, and its requirements are accessibility
requirements rather than styling ones:

- Pointer: opens on hover, and on focus for keyboard users.
- Touch: opens on tap; a parent that is also a link must not navigate on that first tap.
  `About Us` sidesteps this by being a button; `Strategy` cannot, so its panel repeats
  `/strategy` as the first child.
- Escape closes and returns focus to the parent. Arrow keys move within the panel. Tab
  leaves it.
- `aria-expanded` on the parent, `aria-controls` pointing at the panel.
- The panel must not be the only route to a page. Every destination stays in the footer,
  which is where a reader with JavaScript disabled and a crawler both find them.
- On a phone the same group opens as a sheet rather than a hover panel — see below.

`SiteHeader` becomes a client component only if it must. It already is one — it calls
`usePathname()` for the overlay decision — so this adds no boundary.

### The phone bar — the nav must be visible without a tap

**Hunter's decision, 2026-09-08: the nav items are right as they are, and they have to be
visible on mobile.** That settles the open question, and it overrides the caution an earlier
draft carried here — that Buligo hides its phone nav too, so hiding ours was defensible.
It is what he asked for; the design problem is fitting it.

**The phone header becomes two rows:**

```
EM8 PROPERTIES                    [Invest With Us]
About Us    Strategy    Portfolio    Insights
```

Row one is the wordmark and the primary action; row two is the nav. Two rows rather than
one because the wordmark and the button already fill a 390px row between them.

**Four labels, and now of unknown length.** `About Us · Strategy · Portfolio · Insights` is
42 characters — more than the 38 an earlier draft called tight, and more than the 28 it had
once Case Studies came out. And because the labels are Sanity fields now, the count is not
knowable at build time: "Our Investment Strategy" is a legal edit.

So the labels need a cap, the way `headerCta.label` already carries one for the same
reason. The arithmetic, at the 11px semibold the bar uses and roughly 5.5px a character:

| cap | four labels + gaps | fits 390px? | fits 320px? |
|---|---|---|---|
| 14 chars | ~356px | yes | no |
| 12 chars | ~312px | yes | just |
| 10 chars | ~268px | yes | yes |

**Propose 12 and confirm by measurement.** The header is already `flex-wrap gap-y-3`, so an
over-long set wraps to a third row rather than overflowing — graceful, but it grows the
header again. Like `headerCta.label`'s cap, this is a guardrail on the design rather than on
correctness.

Two consequences, both to be measured rather than assumed:

- **The header grows from 68px to roughly 100px.** The hero reserves `pt-24` (96px) for it,
  and at 320px a band page has only 28px of clearance between the header and the eyebrow
  today. A 100px header spends all of it. **The reservation has to grow with the header**,
  and the E2E assertion at 320px is what proves it did.
- **A taller header costs a little of the scroll §6 is trying to reclaim** — about 32px per
  page, against the 3,000-odd px §6 removes.

A horizontally scrolling strip is **not** proposed at any width. It reads as a tab bar,
which misrepresents a small marketing site, and horizontal scroll containers are a known
accessibility problem.

### `/track-record` is deleted, and the realized deals live in the portfolio

Hunter's instruction, 2026-09-08: remove Case Studies from the header, put those properties
in the portfolio, keep the Sold label. An earlier draft of this section proposed renaming
`/track-record` to "Case Studies" in the bar. That is replaced by deleting it.

**Two-thirds of the instruction is already shipped, verified on the live site:** both
realized deals are already in the `/portfolio` grid — `ALL_PROPERTIES_QUERY` filters on
`showInPortfolio != false`, not on status — each carrying a **Sold** chip, and the status
filter already offers "Sold". So there is nothing to add, only something to remove.

**What must move before the route goes.** `/track-record` is the *only* consumer of
`dealStory`: `PROPERTY_BY_SLUG_QUERY` already selects it and the property page never
renders it, so deleting the route as it stands would take the Acquired → Executed → Exited
narrative and the 1.99× / 1.37× multiples off the site entirely — the very "return metrics"
Etamar asked for. So `DealStory` moves onto `/portfolio/[slug]`, gated on `status == 'sold'`,
which is one import and one line because the data is already fetched.

**No redirect.** Hunter's call: nothing links to the site externally yet. The route leaves
`sitemap.ts` in the same change, so the 404 is never advertised. If an inbound link ever
turns up, a redirect is a two-line addition.

The file list, since a route deletion touches more than a route:

| file | change |
|---|---|
| `app/(site)/track-record/page.tsx` | delete |
| `SiteHeader.tsx` · `SiteFooter.tsx` | drop the entry; add Strategy |
| `sitemap.ts` | drop the URL (currently priority 0.9), add `/strategy` |
| `lib/heroPages.ts` | drop it, add `/strategy` — the hero-band list |
| `lib/seo.ts` · `lib/rateLimit.ts` | update the doc comments listing routes |
| `sanity/queries.ts` | delete `SOLD_PROPERTIES_QUERY` and `TRACK_RECORD_PAGE_QUERY` |
| `tests/e2e/site.spec.ts` | three references, including the test asserting no property is addressable under `/track-record/` |
| `portfolio/[slug]/page.tsx` | render `DealStory` |

**Ordering, because this removes CMS reads.** The `trackRecordPage` document stays in the
dataset until the code that reads it is deployed — removing it first is the mistake
`docs/deploys-and-migrations.md` exists to prevent. Delete the document afterwards, or leave
it: an unread document costs nothing and is the cheapest possible rollback.

One consequence worth stating: **`/portfolio` becomes the only index of EM8's assets**, so
non-negotiable #4 gets stronger rather than weaker — one canonical URL per property, and now
one place that lists them.
## 6. Homepage and portfolio

**The target is a number, not a feeling: 8.2 screens on a phone down to roughly 4.5,
which is where Buligo sits.** Desktop is 5.0 screens today and matters less — he was on a
phone, and a phone is where a band costs the most, because every grid collapses to one
column.

Nine bands become five.

- **The five stats move onto the hero photograph**, as em-8.com does — the one change here
  that removes a band without removing any content. Whether it removes any *scroll* is a
  separate question, answered by measurement two paragraphs down.
- **The Insights and Partners teasers come out.** Both are one click away in the bar, and
  the insights teaser currently renders three cards of a feed that has three articles in
  it.
- **Current offerings comes out too**, and moves to `/portfolio` — see below.
- What remains: hero with stats → the four factors → portfolio → testimonials → CTA.

Removing the two teasers and absorbing the stat band should recover something like 2.5–3
screens on a phone, landing near 5.4. **That is short of the 4.5 target, so one more lever
is needed** and the honest candidate is the portfolio band: it renders its cards in one
column on a phone, so each card is close to half a screen. Capping the homepage grid at
three cards with a "View all" link — the full grid is one tap away at `/portfolio`, which
is in the bar — is what closes the gap. Decide it against a measurement, not in advance.

**Measure before committing to stats-on-hero.** The hero copy is bottom-aligned inside a
`min-h-svh` box with a `pt-24` header reservation, and at 375px wide the overlay already
renders 477px tall. Five stats below the buttons is perhaps another 200px in an 812px
viewport. It fits on paper and paper is not the test — the E2E suite already asserts
header clearance at 320px on a band page, where there is 28px of it, and that assertion is
the one that will fail first.

There is also a real chance stats-on-hero **costs** scroll on a phone rather than saving
it: the hero is `min-h-svh`, so it grows with its content, and five stats inside it may
simply make the first screen taller instead of removing a band. Measure the phone screen
count before and after; if it does not fall, keep the stat band where it is and take the
scroll out of the portfolio grid instead.

### Current Offerings moves to `/portfolio`, as its own section

Hunter's instruction, 2026-09-08: merge current offerings into the portfolio, visible
there, in a separate section called **Current Offerings**. So it is a section on
`/portfolio` rather than the badge-on-one-grid that §12 proposed — two groups on one page,
not one grid with a marker.

**Order on the page: Current Offerings first, then the filters, then the portfolio grid.**
Offerings are the actionable content and the reason a reader arriving from "Invest With Us"
is on the page at all. The filters sit directly above the grid they belong to, so nothing
about them appears to apply to the offerings above.

**A section with nothing in it renders nothing** — no heading, no empty grid. Today
`publiclyOffered == true` matches exactly one property, so this section will hold one card,
and it will hold none the day Antioch closes.

### This resolves the Antioch tension rather than reopening it

§3 records that Antioch Shopping Plaza stays out of the portfolio grid because EM8 is under
contract and not on title. That decision and this instruction look like they collide —
Antioch is the *only* publicly offered property, so "offerings visible on /portfolio" means
Antioch on `/portfolio`.

They do not collide, because the two sections make different claims:

| section | the claim it makes | source |
|---|---|---|
| Current Offerings | this is open to invest in | `publiclyOffered == true` |
| the portfolio grid | EM8 owns this | `showInPortfolio != false` |

Antioch belongs in the first and not the second, and needs no field change to land that
way. `CURRENT_OFFERINGS_QUERY` already exists and already filters on `publiclyOffered`,
which the code comments correctly describe as the Rule 506(c) gate.

One follow-on: **`showInPortfolio` becomes a misleading field name** once a property can be
absent from the grid and present on the page. Its meaning is "list among the assets EM8
owns". Sharpen its Studio title and description to say so — **do not rename the field**, as
a rename is a remove plus an add and therefore a breaking migration under the rule in
`docs/deploys-and-migrations.md`.

### The heading is a field MOVE, which is the dangerous kind

The section's copy is `homePage.offeringsHeading` today. On `/portfolio` it belongs to
`portfolioPage`. That is a move, and moves are what
`docs/deploys-and-migrations.md` exists for — the last one took the live homepage's call to
action down on 2026-08-31.

The sequence is not optional:

1. **Add** `portfolioPage.offeringsHeading` and fill it. An addition is safe ahead of code;
   the deployed build ignores a field it does not know about.
2. **Ship** the code that reads the new location and stops reading the old one, written to
   tolerate the old field still being present.
3. **Verify** on the live site that `/portfolio` renders the heading and the homepage has
   lost the band.
4. **Then** unset `homePage.offeringsHeading`, as a scoped `--only=` step.

Doing 4 before 2 is precisely the failure that document records. The unset is cleanup and
can wait indefinitely; an unread field costs nothing.

## 7. Typography and resolution

This is the "it just looks better (fonts, resolution)" note, and it is a **mobile change
first** — the gap is widest on the phone he was holding.

### Type scale

| | ours | em-8.com |
|---|---|---|
| phone | **30px** | **60px** |
| desktop | 48px | 72px |

The headline goes to roughly **40 / 60 / 72px** from today's 30 / 36 / 48. The mobile step
is the important one: doubling 30 to 60 at 390px is a bigger change than it sounds, since
the headline is CMS copy of unbounded length sitting in a bottom-aligned box under a 68px
overlaid header. Re-measure header clearance at 320px, where a band page has 28px of it
today, and expect the phone value to land below 60 if the measurement says so.

### Resolution — three levers, cheapest first

1. **`quality` 68 → 75.** 75 is already in `next.config.ts`'s `qualities` allowlist, so
   this is a one-word change with no config edit. It is also the lever most likely to
   explain what he saw, since em-8.com serves its hero at `q=80` and we serve 68. Note the
   trap recorded in `docs/resource-budget.md`: a quality not on the allowlist is silently
   ignored and falls back to 75, so verify the bytes actually change.
2. **`sizes`** — already honest for the `screen` variant since 2026-09-02, and already
   asking for the cap on a phone.
3. **The 1600px crop cap**, which carries the real tension. `docs/resource-budget.md` says
   in terms not to raise a budget to make something pass, and the cap is what holds the
   image budget: a 2400px crop of the detailed 4160×3117 source roughly doubles its 314KB.

Expect to land on quality 75 plus a cap near **2048**, measured rather than promised. And
measure on the **phone** form factor — it is both the review surface and where Lighthouse's
CI budget already runs (412×823 at DPR 1.75).

## 8. Return metrics

Hunter's decision, 2026-09-08: the live offering, the deals in progress and the realized
results may all be public.

**No new schema. Both halves already exist**, and an earlier draft of this section
proposed a `returns` object that would have duplicated them — the most expensive kind of
mistake to make in a CMS, because two fields holding the same figure eventually disagree.

| | field | renderer | data today |
|---|---|---|---|
| realized | `property.dealStory` — narrative, `equityMultiple`, `exitYear` | `DealStory` | **populated**: 1.99× / 2022, 1.37× / 2023 |
| targeted | `property.offering` — `targetIrr`, `targetEquityMultiple`, `targetHoldYears`, `dealRoomUrl` | `OfferingBlock` | schema present, figures empty |

Both are already better designed than what was proposed for them. `dealStory` is hidden in
the Studio unless `status == 'sold'`; `offering` is hidden unless `publiclyOffered`;
`DealStory`'s own comment records why its labels say "Realized" and why forward-looking
words would misstate a closed result. `OfferingBlock` is already rendered on the property
page and already gated.

So the whole of the realized half is **one import and one line** — render `DealStory` on
`/portfolio/[slug]`, which §5 requires anyway before `/track-record` can be deleted. The
targeted half is **zero code**: the fields, the renderer and the gate all exist, and what
is missing is the figures, which is Studio work.

The permitted vocabulary — *targeted, projected, underwritten, estimated, pro forma* — is
enforced by the compliance scan in `tests/shared/placeholders.ts` and the source-and-CMS
promissory-language check. Both already cover these fields and must stay green.
- **No figure is invented.** The denylist in §9 of `2026-08-28-em8-website-design.md`
  ("Placeholders requiring real values") is unchanged, and the fields ship empty.

### The founder's prior deals need their own frame

Etamar's personal past sales are not EM8's track record, and deleting `/track-record`
makes this sharper rather than softer: `/portfolio` becomes the site's only index of
assets, so anything listed in it reads as EM8's. Buligo's case studies are all Buligo's
deals.

So these do **not** go in the portfolio grid, and they are not `property` documents. They
render on their own page or section, under a heading naming the sponsor — "Prior experience
of our founder" or similar — and never merge into EM8's realized results.

Modelled from the spreadsheet's real columns when it arrives, not from a guess at them.

### One consequence to record

Publishing targeted returns on deals that are not `publiclyOffered` changes what that
toggle means. Today it is the thing that decides whether an offering is publicly
solicited, and only Antioch Shopping Plaza has it on. After this change it gates the
offering *block* and not the *figures*, which is a 506(c)-relevant distinction. It makes
open item 3 in the 2026-09-03 handover — counsel's version of the footer disclaimer — more
load-bearing, not less.

## 9. Dark re-theme — specced, not scheduled

Always dark. No `prefers-color-scheme` block, for the same reason `globals.css` currently
gives for not having one: one palette, half the contrast surface, and no split between the
site and the deck treatment.

### The teal rule mirrors rather than breaking

Measured with the repo's own `contrastRatio`:

| | on `#FFFFFF` | on `#1A1A1A` |
|---|---|---|
| `#4ABDB5` accent | **2.27** ✗ | **7.66** ✓ |
| `#2C7A74` teal-text | **5.07** ✓ | **3.43** ✗ |

On a dark ground the accent teal becomes the correct colour for small text and the dark
teal becomes the forbidden one. So README non-negotiable #1 is not weakened, it is
inverted — and Etamar's "return the EM8 logo colors to the upper left" is satisfied by the
theme itself, at any size, with no exception carved out. Ink on a teal-filled button still
measures 7.66, so that half of the rule survives verbatim.

### Tokens

| token | now | dark | note |
|---|---|---|---|
| ground | `#FFFFFF` | `#1A1A1A` | |
| panel | `#F5F5F3` | `#232323` | |
| ink | `#1A1A1A` | `#EDEDEB` | 14.85:1 on ground |
| ink-secondary | `#555555` | `#B8B8B4` | **8.75:1. A naive inversion ships 2.33:1** |
| rule | `#D8D8D4` | `#333333` | matches the light palette's own ratio — see below |
| teal | `#4ABDB5` | `#4ABDB5` | unchanged, now legal at any size |
| teal-text | `#2C7A74` | retired | repointed at `teal` |

Token *names* do not change. They are role names — "ink" is the body-text colour — and
renaming them would touch every file for no gain.

### Two things a token swap alone gets wrong

1. **`#555555` secondary text measures 2.33:1 on the dark ground.** Every
   `text-ink-secondary` on the site is unreadable until this value is replaced. This is the
   single highest-risk line of the re-theme, because nothing fails: the build passes, the
   tests pass, and the page renders grey-on-grey.
2. **Half the chip fills lose their edge against the dark ground.** Measured against the
   real palette in `Chip.tsx` — an earlier draft of this line quoted a range computed from
   the wrong values and overstated the problem. There are **eight unique fills**, not
   seven. White-on-fill is untouched by the re-theme (5.07–9.39 and it stays). Against the
   *ground* they run **1.85 to 3.43**, and four fall below the 3:1 that WCAG 1.4.11 asks
   of a non-text boundary:

   | fill | kinds | vs white ground | vs `#1A1A1A` |
   |---|---|---|---|
   | `#6A1B9A` | retail | 9.39 | **1.85** ✗ |
   | `#01579B` | mixed-use, under-construction | 7.40 | **2.35** ✗ |
   | `#455A64` | senior, sold | 7.24 | **2.40** ✗ |
   | `#8C5000` | under-contract | 6.44 | **2.70** ✗ |
   | `#00707F` | multifamily | 5.79 | 3.00 ✓ |
   | `#A64B00` | industrial | 5.79 | 3.01 ✓ |
   | `#2E7D32` | townhomes, renovation-complete | 5.13 | 3.39 ✓ |
   | `#2C7A74` | stabilized, lease-up | 5.07 | 3.43 ✓ |

   Note the inversion: the fills that read best on white read worst on dark, because
   contrast against a white ground and contrast against a dark one are opposites.
   `chipContrast.test.ts` asserts text-on-fill only, so **it would stay green while four
   chips lost their edges.** Extend it to assert fill-against-ground on whichever ground
   is current, then re-derive those four.

### The rule colour: match the ratio, not an absolute bar

`#333333` measures **1.38:1** against the dark ground, which looks alarming until you
measure the value it replaces: **`#D8D8D4` is 1.43:1 against white.** This palette already
treats rules as decorative hairlines well below the WCAG 1.4.11 bar, and that is correct —
1.4.11 governs boundaries that convey information, not dividers. So the dark rule
preserves the *relationship* rather than meeting a bar the light one never met. Anything
brighter reads as a visible grid the design does not want.

### A pre-existing gap this uncovered, in both themes

`LeadForm`'s inputs are `border border-rule` — and an input's border *is* a boundary that
conveys information, so 1.4.11's 3:1 does apply to it. At `#D8D8D4` on white it measures
**1.43:1** today. That is a real defect in the light theme, found while speccing the dark
one, and it is not caused by the re-theme.

Fix it by splitting the token rather than brightening every divider on the site:

| | decorative dividers | interactive boundaries |
|---|---|---|
| token | `--color-rule` | `--color-field-border` (new) |
| light | `#D8D8D4` (1.43, fine) | `#959590` (3.01) |
| dark | `#333333` (1.38, fine) | `#666666` (3.03) |

Used by `LeadForm`'s inputs and anything else that draws a control's edge. It is a live
defect in the theme we ship today and does not depend on the re-theme, so it lands in
**PR 1** alongside the palette centralization in §4 — the same PR, because both are "make
the colours honest before moving them".

Also: re-tune `.em8-basemap`, whose `grayscale/contrast/brightness` filter was chosen to
sit quietly on a white page; and darken the two `next/og` share cards, which render their
own background.

---

## 10. Sequence

| | workstream | blocked on |
|---|---|---|
| PR 1 | Palette centralization (§4) · `field-border` (§9) · team bios on click | — |
| PR 2a | Derive the guard list and the release gate from one array (§5) | — |
| PR 2b | Nav: two dropdowns, Sanity labels, two-row phone bar, `/strategy` page, `whyEm8` section, delete `/track-record`, `DealStory` onto the property page (§5) | copy, but ships empty |
| PR 3 | Homepage compression · Current Offerings section on `/portfolio` (§6) | — |
| PR 4 | Typography + hero resolution (§7) | — |
| — | The founder's prior deals (§8) | deferred by Hunter; the spreadsheet comes later |
| — | Dark re-theme (§9) | Etamar seeing PRs 1–4 |

PR 1 leads with the colours because §4 is a prerequisite rather than a nicety: the no-hex
lint rule cannot be turned on until the seven stragglers are centralized, and everything
after PR 1 should be written against that rule rather than retrofitted to it. Team bios
ride along because they are small and touch nothing the others touch.

**PR 2 split in two**, and the small half goes first. PR 2b adds ten required nav labels
and two documents; adding those to two hand-maintained guard lists is the drift the
2026-09-03 handover predicted, so PR 2a derives both from one array first. It is a
refactor with no visible effect, which is why it is worth doing while it is still cheap —
and it is the difference between the nav change costing twelve careful edits and costing
one.

**Return metrics stopped being a PR at all.** §8 established that both fields already exist
with renderers and gates: the realized half is one line and lives in PR 2b, where it is a
precondition for deleting `/track-record`, and the targeted half is Studio work. What was
left — the founder's prior deals, the only genuinely new schema in this document — Hunter
deferred on 2026-09-08. So four PRs, and every one of them is unblocked.

## 11. Every PR is reviewed on a phone

He was on a phone, and the requirement Hunter set is that it look equally good on both. So
for each of these PRs the acceptance evidence is a **390×844 DPR-3 measurement and
screenshot, not a desktop one** — and the E2E suite already runs its hero assertions at
375×812, so the habit exists.

Specifically: the screen count before and after for §6, header clearance at 320px for
§7, the phone header's item count and height for §5, and the bitmap width served to a
DPR-3 phone for §7. Desktop stays a regression check rather than the primary one.

## 12. Both simplifications were decided — and neither survived as proposed

Kept here because what replaced them is the useful part.

**"Fold Why Midwest into Why EM8" — superseded.** This proposed collapsing two thin new
pages into one. Hunter's instruction went further and better: neither is a page at all. Why
EM8 is a section of `/about`, Why Midwest is the body of `/strategy`, and four proposed
routes became one.

**"Merge current offerings into the portfolio band" — adopted, in a different shape.** The
proposal was one grid where an offered property carries a badge. Hunter's instruction is a
separate section on `/portfolio` titled Current Offerings, which is better: a badge on a
grid of owned assets would have implied EM8 owns the thing it is offering, and Antioch is
under contract rather than on title. Two sections make two different claims where one grid
would have blurred them. §6 carries it.

So the lesson worth keeping from this section is that both proposals were aimed at the
right target — fewer pages, fewer bands — and both were improved by someone who knew what
the content actually asserts. Propose the cut; let the person who owns the claim shape it.

Not proposed, and worth saying why: **dropping the two dropdowns for a flat bar.** It
sounds more minimal and it is the opposite here. The two panels collapse seven destinations
into two tabs; flat, the bar would carry eight items, and §5's mobile requirement already
makes four a tight fit at 42 characters. The dropdowns are what let the nav be visible on a
phone at all, so they earn their complexity.

## 13. Risks

- **Etamar has not seen this design; Hunter is relaying it.** The artifact risk is closed —
  §§5–6 come from Hunter's instructions rather than from inference — but the person whose
  feedback this answers has not reviewed the answer. Two of his notes are being handled
  differently from how he phrased them: "more options on the upper bar" becomes a visible
  two-row phone bar rather than more destinations, and "categories should be acquisition or
  development" is declined. Both are better raised before the work than after it.
- **The two-row phone header spends the hero's clearance.** It grows the header from 68px
  to roughly 100px against a `pt-24` (96px) reservation, and at 320px a band page has 28px
  of clearance today. The reservation grows with it, and the 320px E2E assertion is what
  proves it did. This is the highest-risk item in §5 and the one most likely to need a
  second measurement pass.
- **Stats-on-hero may increase phone scroll rather than reduce it.** See §6.
- **A Sanity-editable nav label can disagree with where it points.** "Insights" over a link
  to `/partners` is valid on both halves and catchable by no test. Hrefs stay in code and
  each Studio field description names its destination; beyond that it is a trust decision,
  taken knowingly on 2026-09-08.
- **Label length is no longer a build-time fact.** The phone bar is measured in characters,
  and an editor can now change the count. §5 proposes a 12-character cap and the header
  wraps rather than overflowing, so the failure is a taller header rather than a broken
  one — but it is a failure nobody will be told about.
- **Ten new required leaves land in two hand-maintained guard lists.** The 2026-09-03
  handover predicted this drift. §5 makes deriving both from one array a precondition
  rather than a cleanup, and if that slips, the nav labels are where the two lists first
  disagree.
- **PR 3 contains a field MOVE**, which is the only shape of migration that has taken this
  site down. `homePage.offeringsHeading` becomes `portfolioPage.offeringsHeading`, and the
  add / ship / verify / unset order in §6 is not optional. The last time it was done in the
  wrong order the live homepage lost its call to action.
- **Deleting a route is the least reversible thing in this document.** `/track-record` goes
  with no redirect on Hunter's call that nothing links in yet. The mitigations are that
  `DealStory` moves to the property page first, so no content is lost, and that the
  `trackRecordPage` document stays in the dataset — restoring the page is a revert rather
  than a re-write.
- **Hero resolution against the image budget.** `docs/resource-budget.md` says in terms
  not to raise a budget to make something pass, and the 1600px crop cap is what holds the
  image budget. Raising it to 2400 roughly doubles the 314KB detailed crop. Expect to land
  near 2048 with a narrower `sizes`, and measure rather than promise.
- **A 72px headline against the 320px header clearance.** There are 28px of clearance on a
  band page today. A larger headline eats into it, and the copy is CMS text that can grow.
- **Stats on the hero at 375px.** See §6.
- **Every intermediate PR gets re-touched by §9** unless §4's rule holds.
