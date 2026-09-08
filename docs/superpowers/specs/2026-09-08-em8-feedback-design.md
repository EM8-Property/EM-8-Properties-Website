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
held workstream in §7 and by nothing else here.

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
and our hero photograph is genuinely undersampled — measured on 2026-09-02 at **2.71×
short at DPR 3**, because the painted width of a full-screen `object-cover` box is the
viewport height times 1.78 and the crop caps at 1600px. He is describing an artefact that
exists.

## 2. Sorting the feedback

### Already true on the live site — show him, do not build

- **Track Record and Insights are already in the top bar.** So are Portfolio, Partners and
  About.
- **Nir Dror and Ilan Lior are already board members** — `group: 'partner-board'`,
  `role: 'Board Member'`, both with photographs and bios.
- **Team names are already all one size** — `text-sm font-semibold` in both groups.

If he saw otherwise, he was on a phone, where the bar collapses to a hamburger and none of
those five links is visible. That is worth checking with him, because it would also explain
"more options on the upper bar" arriving alongside items that are already there.

### Studio edits — no deploy, no developer

| change | field |
|---|---|
| Etamar Deshe → "Founder & CEO" | `teamMember.role` |
| Michael Gallant → "Founder & Board Member" | `teamMember.role` |
| Alexander Riegler off the IR title | `teamMember.role` |
| Oak Forest K's city involvement and partnership | `property.overview` |
| The trailer park, when it is ready to name | new `property` |
| "Case Studies" as `/track-record`'s visible heading | `trackRecordPage.heading` |

### Owed by people

- The **Deshe prior-sales spreadsheet** (Hunter). Blocks §6's second half.
- **Oak Forest partnership copy** — the city involvement Etamar says is missing.
- **"Why EM8" and "Why Midwest" body copy.** §4 ships both pages with the structure in
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

### Held

**The dark re-theme (§7).** Specced here, deliberately not scheduled. Hunter's call on
2026-09-08: Etamar sees PRs 1–5 first. It is the largest item, the least reversible, and
the only one that rewrites an approved design decision.

---

## 3. The constraint that makes "theme last" affordable

The sequence chosen is cheap-wins-first, theme-last. The cost of that order is that every
component built in §§4–6 gets re-touched by §7.

**Mitigation, and it is a requirement on all work before §7: no literal colour in
`src/`.** Only the semantic tokens — `bg-ground`, `bg-panel`, `text-ink`,
`text-ink-secondary`, `border-rule`, `text-teal`, `text-teal-text` — and no assumption
about which ground is the lighter one.

Enforced by a new ESLint rule forbidding hex literals under `src/`, with `src/lib/tokens.ts`
and `src/app/globals.css` as the only exceptions. This mirrors the logical-properties rule,
which is the thing that makes Phase 2 (Hebrew) additive rather than a rewrite; the same
trick makes the re-theme a token swap rather than five rebuilds.

`text-white` stays legal: hero copy sits on a photographic scrim, and that is a colour
chosen against an image rather than against the ground.

---

## 4. Navigation

```
About ▾        Portfolio     Case Studies    Insights          Investor Login   [Invest With Us]
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
| Portfolio | `/portfolio` |
| Case Studies | `/track-record` — label change only |
| Insights | `/insights` |
| Investor Login | `siteSettings.agoraPortalUrl`, off-site |
| Invest With Us | `siteSettings.headerCta` |

`/about#team` needs an `id` on the team section, which `/about` does not carry today.

Four top-level items where there are five today, with nine destinations reachable in one
glance instead of five. This is Buligo's mechanism: they fit About Us ▾, Strategy,
Portfolio, Sectors ▾, Case Studies, Shareholders, Media ▾, Investor Login, a Hebrew
toggle and Contact Us into one narrow bar, and the minimalism Etamar admires comes from the
dropdowns rather than from having fewer pages.

**"Case Studies" is a label, not a URL.** `/track-record` keeps its path, so no link
breaks and no redirect is needed. Buligo do the same in reverse — nav label "Case Studies",
page heading "Buligo Capital Track Record". The heading is already a Sanity field, so the
visible title is a Studio edit.

**Why EM8 and Why Midwest** are new routes with new page documents, following the
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
- Mobile keeps the existing hamburger; the groups render as headed sections inside it, not
  as nested disclosures.

`SiteHeader` becomes a client component only if it must. It already is one — it calls
`usePathname()` for the overlay decision — so this adds no boundary.

## 5. Homepage

Nine bands become six.

- **The five stats move onto the hero photograph**, as em-8.com does. This is the single
  change that most directly answers "less scroll down": it removes a full band without
  removing any content.
- **The Insights and Partners teasers come out.** Both are one click away in the bar, and
  the insights teaser currently renders three cards of a feed that has three articles in
  it.
- What remains: hero with stats → the four factors → portfolio → current offerings →
  testimonials → CTA.

**Measure before committing to stats-on-hero.** The hero copy is bottom-aligned inside a
`min-h-svh` box with a `pt-24` header reservation, and at 375px wide the overlay already
renders 477px tall. Five stats below the buttons is perhaps another 200px in an 812px
viewport. It fits on paper and paper is not the test — the E2E suite already asserts
header clearance at 320px on a band page, where there is 28px of it, and that assertion is
the one that will fail first.

## 6. Return metrics

Hunter's decision, 2026-09-08: the live offering, the deals in progress and the realized
results may all be public.

- **Realized deals** already carry real figures — Burbank 1.99× exiting 2022, Embassy
  1.37× exiting 2023 — and already render on `/track-record`. They gain a fact rail on the
  property page itself.

The field shape, on `property`, so the schema is not invented during implementation:

```
returns {
  basis: 'realized' | 'targeted'      // decides the label and the tense
  equityMultiple: string              // "1.99x"
  irr: string                         // optional
  holdPeriod: string                  // optional, "2019-2022"
  cashOnCash: string                  // optional
  note: text                          // optional qualifying sentence
}
```

Strings rather than numbers, deliberately: these are published figures whose formatting
carries meaning ("1.99x", "12-14%", "~18%"), and a number field would force the component
to reinvent that formatting and lose the range. The trade is that no arithmetic can be done
on them, which is correct — nothing on this site should compute a return.

`basis` is the field that keeps the compliance line: `realized` renders in the past tense
under a "Realized" heading, `targeted` renders under "Targeted" with the qualifying
language the permitted vocabulary requires. A property with `basis: 'targeted'` and no
`note` should fail the content gate rather than render an unqualified projection.
- **In-progress and offered deals** gain targeted figures, in the permitted vocabulary
  only: *targeted, projected, underwritten, estimated, pro forma*. The compliance scan in
  `tests/shared/placeholders.ts` and the source-and-CMS promissory-language check both
  already cover this and must stay green.
- **No figure is invented.** Spec §9's denylist is unchanged and the fields ship empty.

### The founder's prior deals need their own frame

Etamar's personal past sales are not EM8's track record. A reader on `/track-record`
fairly assumes every deal there is the firm's; Buligo's case studies are all Buligo's.
These render under an explicit heading naming the sponsor — "Prior experience of our
founder" or similar — and never merge into EM8's realized results.

Modelled from the spreadsheet's real columns when it arrives, not from a guess at them.

### One consequence to record

Publishing targeted returns on deals that are not `publiclyOffered` changes what that
toggle means. Today it is the thing that decides whether an offering is publicly
solicited, and only Antioch Shopping Plaza has it on. After this change it gates the
offering *block* and not the *figures*, which is a 506(c)-relevant distinction. It makes
open item 3 in the 2026-09-03 handover — counsel's version of the footer disclaimer — more
load-bearing, not less.

## 7. Dark re-theme — specced, not scheduled

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

Used by `LeadForm`'s inputs and anything else that draws a control's edge. Worth doing as
its own small PR in the light theme before §7, since it is a live accessibility defect and
does not depend on the re-theme at all.

Also: re-tune `.em8-basemap`, whose `grayscale/contrast/brightness` filter was chosen to
sit quietly on a white page; and darken the two `next/og` share cards, which render their
own background.

---

## 8. Sequence

| | workstream | blocked on |
|---|---|---|
| PR 1 | Team bios on click · the no-hex ESLint rule · the `field-border` fix from §7 | — |
| PR 2 | Nav dropdowns · Case Studies label · Why EM8 + Why Midwest pages | copy, but ships empty |
| PR 3 | Homepage compression | — |
| PR 4 | Typography + hero resolution | — |
| PR 5 | Return metrics | figures; the spreadsheet for the second half |
| — | Dark re-theme | Etamar seeing PRs 1–5 |

The ESLint no-hex-literals rule from §3 lands in PR 1, so everything after it is written
against the constraint rather than retrofitted to it.

## 9. Risks

- **The artifact is unread.** Every layout decision here is inferred from em-8.com and
  Buligo. If the artifact disagrees, §§4–5 change.
- **Hero resolution against the image budget.** `docs/resource-budget.md` says in terms
  not to raise a budget to make something pass, and the 1600px crop cap is what holds the
  image budget. Raising it to 2400 roughly doubles the 314KB detailed crop. Expect to land
  near 2048 with a narrower `sizes`, and measure rather than promise.
- **A 72px headline against the 320px header clearance.** There are 28px of clearance on a
  band page today. A larger headline eats into it, and the copy is CMS text that can grow.
- **Stats on the hero at 375px.** See §5.
- **Every intermediate PR gets re-touched by §7** unless §3's rule holds.
