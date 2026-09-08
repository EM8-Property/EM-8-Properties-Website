# Etamar's feedback — design, 2026-09-08

Etamar Deshe reviewed the live Railway site against **em-8.com**, the site this rebuild
replaces, and sent a list. He also had Claude build an artifact showing the changes he
wants; that artifact could not be read from this session (`claude.ai` returns "reading
public artifacts as a non-member reader is not enabled"), so **the layout decisions below
are derived from em-8.com and from buligocapital.com, which he named as his reference.**
Reconcile against the artifact when it is available.

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

- The **Deshe prior-sales spreadsheet** (Hunter). Blocks §8's second half.
- **Oak Forest partnership copy** — the city involvement Etamar says is missing.
- **"Why EM8" and "Why Midwest" body copy.** §5 ships both pages with the structure in
  place and the copy empty in the Studio, so this needs no developer.
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

### Held

**The dark re-theme (§9).** Specced here, deliberately not scheduled. Hunter's call on
2026-09-08: Etamar sees PRs 1–5 first. It is the largest item, the least reversible, and
the only one that rewrites an approved design decision.

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
`src/lib/tokens.ts` the only exception. Two notes on scope, because an earlier draft got
this wrong too — ESLint does not read `globals.css`, so listing it as an exception was
meaningless; and `global-error.tsx` must keep its inline hex, because it is the boundary
that renders when the stylesheet itself has failed to load.

`text-white` stays legal: hero copy sits on a photographic scrim, so that is a colour
chosen against an image rather than against the ground.

---

## 5. Navigation

```
About ▾        Portfolio      Insights                        Investor Login   [Invest With Us]
  About EM8
  Our Team
  Why EM8
  Why Midwest
  Partners
```

The routes, so nothing about this is inferred at implementation time:

| bar item | destination |
|---|---|
| About ▾ | *(a button, not a link — see below)* |
| — About EM8 | `/about` |
| — Our Team | `/about#team` |
| — Why EM8 | `/why-em8` **(new)** |
| — Why Midwest | `/why-midwest` **(new)** |
| — Partners | `/partners` |
| Portfolio | `/portfolio` — now includes the realized deals |
| Insights | `/insights` |
| Investor Login | `siteSettings.agoraPortalUrl`, off-site |
| Invest With Us | `siteSettings.headerCta` |

`/about#team` needs an `id` on the team section, which `/about` does not carry today.

**Three top-level items where there are five today** — Hunter's instruction on 2026-09-08
removed Case Studies from the bar entirely, and Track Record goes with it (see below). Seven
destinations are reachable from the bar against five now, nine counting Investor Login and
the button. This is Buligo's mechanism: they fit About Us ▾, Strategy,
Portfolio, Sectors ▾, Case Studies, Shareholders, Media ▾, Investor Login, a Hebrew
toggle and Contact Us into one narrow bar, and the minimalism Etamar admires comes from the
dropdowns rather than from having fewer pages.

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
Etamar asked for. So `DealStory` moves onto `/portfolio/[slug]`, gated on `status ==
'sold'`, which is one import and one line because the data is already fetched.

**No redirect.** Hunter's call: nothing links to the site externally yet. The route is
removed from `sitemap.ts` in the same change, so the 404 is never advertised. If an inbound
link ever turns up, a redirect is a two-line addition.

The file list, since a route deletion touches more than a route:

| file | change |
|---|---|
| `app/(site)/track-record/page.tsx` | delete |
| `SiteHeader.tsx` · `SiteFooter.tsx` | drop the nav entry |
| `sitemap.ts` | drop the URL (currently priority 0.9) |
| `lib/heroPages.ts` | drop from `HERO_PATHS` — it is one of the seven hero pages |
| `lib/seo.ts` · `lib/rateLimit.ts` | drop from the doc comments listing routes |
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

**Why EM8 and Why Midwest** are new routes with new page documents — but read §12 before
building two of them, which proposes folding Midwest into EM8 as a section. Following the
established pattern: a `page`-shaped document carrying `heading` (eyebrow, title, intro)
and `seo`, guarded per leaf in `(site)/layout.tsx`, gated in `content-integrity`, backfilled
by a scoped `--only=` step. They ship with empty copy for the team to write. **A page whose
`heading.title` is absent must not appear in the nav or the sitemap** — an empty page in the
bar is worse than a missing one, and `heroPages.ts` already demonstrates the shape of a
list two consumers share.

### The dropdown component

The one genuinely new interactive piece, and the requirements are accessibility
requirements rather than styling ones:

- Pointer: opens on hover, and on focus for keyboard users.
- Touch: opens on tap; the parent must not navigate away on first tap if it is also a link.
  Simplest correct answer — **the parent is a button, not a link**, and "About EM8" is the
  first child.
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
visible on mobile.** That settles the open question and it overrides the caution an earlier
draft carried here — that Buligo hides its phone nav too, so hiding ours was defensible.
It is what he asked for; the design problem is fitting it.

**Removing Case Studies from the bar made this much easier**, and that is worth noticing
rather than passing over. An earlier draft sized this for four labels at 38 characters and
concluded the fit was tight enough to need fallbacks. There are now three —
`About · Portfolio · Insights`, **28 characters** — which is comfortable at 390px and still
fits at 320px.

**The phone header becomes two rows:**

```
EM8 PROPERTIES                    [Invest With Us]
About      Portfolio      Insights
```

Row one is the wordmark and the primary action; row two is the nav. `About` opens the group
as a sheet rather than a hover panel, since there is no hover on a phone.

Two rows rather than one because the wordmark and the button already fill a 390px row on
their own — three short labels are not what makes a single row impossible. Two consequences,
both to be measured rather than assumed:

- **The header grows from 68px to roughly 100px.** The hero reserves `pt-24` (96px) for it,
  and at 320px a band page has only 28px of clearance between the header and the eyebrow
  today. A 100px header spends all of it. **The reservation has to grow with the header**,
  and the E2E assertion at 320px is what proves it did.
- **A taller header costs a little of the scroll §6 is trying to reclaim** — about 32px per
  page, against the 3,000-odd px §6 removes.

A horizontally scrolling strip is **not** proposed at any width. It reads as a tab bar,
which misrepresents a small marketing site, and horizontal scroll containers are a known
accessibility problem. With three labels there is no width at which it is needed.

## 6. Homepage

**The target is a number, not a feeling: 8.2 screens on a phone down to roughly 4.5,
which is where Buligo sits.** Desktop is 5.0 screens today and matters less — he was on a
phone, and a phone is where a band costs the most, because every grid collapses to one
column.

Nine bands become six.

- **The five stats move onto the hero photograph**, as em-8.com does — the one change here
  that removes a band without removing any content. Whether it removes any *scroll* is a
  separate question, answered by measurement two paragraphs down.
- **The Insights and Partners teasers come out.** Both are one click away in the bar, and
  the insights teaser currently renders three cards of a feed that has three articles in
  it.
- What remains: hero with stats → the four factors → portfolio → current offerings →
  testimonials → CTA.

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
2. **The chip fills vanish against the dark ground.** White-on-fill stays fine (6.12–9.20
   across all seven), but fill-against-ground falls to **1.89–2.85**, so every chip loses
   its edge. `chipContrast.test.ts` asserts text-on-fill only — **it would stay green while
   the chips became invisible.** Extend it to assert fill-against-ground at ≥3:1, then
   re-derive the seven fills.

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
| PR 2 | Nav: dropdowns, two-row phone bar, delete `/track-record`, `DealStory` onto the property page, Why EM8 page (§5) | copy, but ships empty |
| PR 3 | Homepage compression (§6) | — |
| PR 4 | Typography + hero resolution (§7) | — |
| PR 5 | The founder's prior deals (§8) | the spreadsheet |
| — | Dark re-theme (§9) | Etamar seeing PRs 1–5 |

PR 1 leads with the colours because §4 is a prerequisite rather than a nicety: the no-hex
lint rule cannot be turned on until the seven stragglers are centralized, and everything
after PR 1 should be written against that rule rather than retrofitted to it. Team bios
ride along because they are small and touch nothing the others touch.

**PR 5 shrank to almost nothing** once §8 established that both return-metric fields
already exist with renderers and gates. Its realized half is one line and has moved into
PR 2, where it is a precondition for deleting `/track-record`; its targeted half is Studio
work. What is left is the founder's prior deals, which is the only genuinely new schema in
this document and is blocked on the spreadsheet.

## 11. Every PR is reviewed on a phone

He was on a phone, and the requirement Hunter set is that it look equally good on both. So
for each of these PRs the acceptance evidence is a **390×844 DPR-3 measurement and
screenshot, not a desktop one** — and the E2E suite already runs its hero assertions at
375×812, so the habit exists.

Specifically: the screen count before and after for §6, header clearance at 320px for
§7, the phone header's item count and height for §5, and the bitmap width served to a
DPR-3 phone for §7. Desktop stays a regression check rather than the primary one.

## 12. Two simplifications worth taking

Both cut a thing rather than adding one, and neither is required for anything above to
work.

**Fold "Why Midwest" into "Why EM8".** Two new routes, both empty, both answering a
question that starts with "why", and one of them — why suburban Chicago — is the strongest
argument the other one makes. One page with two sections is less to write, less to keep
current, one fewer entry in the About group, and one fewer page that can sit empty in the
sitemap. If it grows long enough to split later, splitting it is trivial; un-splitting two
pages that have both been indexed is not.

**Merge "current offerings" into the portfolio band.** The homepage carries them as two
bands, but an offering is not a different kind of thing — it is a property with
`publiclyOffered` on. One grid where an offered property carries a badge is one band
instead of two, one concept instead of two, and it removes the case where the same property
appears twice on one page. This also takes §6 closer to its 4.5-screen target without
touching the card count.

Not proposed, and worth saying why: **dropping the About dropdown for a flat five-item
bar.** It sounds more minimal and it is worse here, because the mobile requirement in §5
pulls the other way — four labels barely fit one row at 390px and five do not fit at all.
The dropdown is what keeps the phone bar legible, so it earns its complexity.

## 13. Risks

- **The artifact is unread.** Every layout decision here is inferred from em-8.com and
  Buligo. If the artifact disagrees, §§5–6 change.
- **The two-row phone header spends the hero's clearance.** It grows the header from 68px
  to roughly 100px against a `pt-24` (96px) reservation, and at 320px a band page has 28px
  of clearance today. The reservation grows with it, and the 320px E2E assertion is what
  proves it did. This is the highest-risk item in §5 and the one most likely to need a
  second measurement pass.
- **Stats-on-hero may increase phone scroll rather than reduce it.** See §6.
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
