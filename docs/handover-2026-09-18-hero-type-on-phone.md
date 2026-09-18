# EM8 website — handover, 2026-09-18 (the hero's type on a phone)

One task: Hunter sent a screenshot of a hero and asked for the homepage hero's text to look
more like it on an iPhone — sizing and treatment, not copy. Shipped at `db126c6` (PR #51),
deployed as `915535aa`, and verified on the running site.

**The screenshot was em-8.com.** That is not incidental and it reframes the whole task: this
was making the new site's hero read like the old site's hero, the same source the entrance
animation was sampled from in `docs/handover-2026-09-17-hero-copy-rise.md`. See "em-8.com is
still the old site" below, which is the finding with the longest tail.

**The headline did not get bigger, and that is the result rather than a shortfall.** The
reference only looks larger. Everything else here follows from measuring that instead of
believing it.

## What shipped

Four changes, all scoped to phone widths, on `PageHero`, `Eyebrow` and `StatBand`:

| | before | after |
|---|---|---|
| `h1` | 36px / 1.1 | 36px / **1.0**, `sm:` keeps 1.1 |
| intro | 14px / 1.625 | **16px** / 1.55, `sm:` keeps 14px |
| eyebrow | 10px / 0.24em, bare on the photo | **11px / 0.14em in a dark lozenge** |
| stat figure / label | 24px / **8px**, indented 20px | 26px / **10px**, flush with the headline |

They land on all seven image heroes, not the homepage alone — `PageHero` and `Eyebrow` are
shared, and forking the homepage to avoid it would have been the worse trade. Only the
homepage passes `stats`, so the fourth row is homepage-only by construction.

## The size question, which is the whole finding

The reference hero looks enormous. Measured as a share of viewport width — the only
comparison that survives crossing from a desktop mock to a phone — it is the **smaller** of
the two:

| | size | share of viewport width |
|---|---|---|
| em-8.com | 96px on ~1440 | 6.7% |
| here | 36px on 375 | **9.6%** |
| here, desktop | 64px on 1440 | 4.4% |

What it actually has is a leading near 1.0 against this block's 1.1, and two lines of copy
against four. The first is free. The second is the CMS's.

So the leading moved and the size did not. 40px was costed anyway, and the reason it was not
taken is a wrap cliff rather than a preference:

| | | |
|---|---|---|
| 375x812 | 36px/1.1 → 158px, 4 lines | 40px/1.0 → 157px, 4 lines |
| 390x844 | 36px/1.0 → 108px, **3 lines** | 37px/1.0 → 148px, **4 lines** |

At 375 the two are within 16px and 40px looks like a fair trade. **36px is the last size at
which the longest headline on the site sets in three lines at 390px and at 320px** — one
point of type costs a whole line, 40px of scroll, at exactly the two widths with no slack.
Tightening the leading buys most of the same look and gives 11–18px back.

This corrects the framing in `tests/unit/typeScale.test.tsx`, not its conclusion. The
earlier reading that put the phone step at 36px ("40px costs 110px of `h1` box against 51px
of slack") held `leading-[1.1]` fixed, and the leading was part of what was spending the
slack. 36px survives the re-costing for a second, independent reason.

## The three decisions worth carrying

### 1. The lozenge's padding is on the span, not on the `p`

`Eyebrow`'s `onPhoto` branch renders an **inline** `<span>` inside the `<p>`, with
`box-decoration-break: clone`, so each wrapped line gets its own rounded fill rather than one
ragged full-width rectangle. 46 characters do not fit on a 327px line at any readable size,
so it is built to wrap well instead of pretending it will not.

The padding has to sit on that span. Padding on an inline child does not enter its block
parent's layout box — and the `p` is what `tests/e2e/site.spec.ts` selects
(`[data-hero-overlay] p`) to prove the hero copy clears the overlaid header. Moved onto the
`p`, that box grows upward by 6px on all seven pages, into a clearance measured at 6px of
margin at 320px in `docs/handover-2026-09-16-phone-hero-crop.md`.

`leading-[2]` is load-bearing for the same reason from the other side: an inline background
paints the font's content box plus its padding — 11px × 1.2 + 8px ≈ 21px — and anything
taller than the line box overlaps the line above it. 11px × 2 = 22px clears it by 1px. Lower
the leading or raise `py` and the two pills collide.

### 2. The eyebrow stays white, and the lozenge is why it cannot be teal

The reference sets its eyebrow in teal. This one does not, and the reason is the same one
`PageHero`'s accent-teal docblock already records, one level worse.

`bg-black/40` is translucent, so the ground under that text is still the photograph. On a
pale slide it lands near L=0.48, where `#4ABDB5` measures about **1.6:1** — worse than the
white it would replace, at a size the accent teal's 24px-and-up contract does not cover.

White at 90% on that ground is strictly better than the 80% straight on the photograph that
shipped before, because the lozenge can only add contrast. An **opaque** lozenge would carry
teal safely; a translucent one cannot. Do not "fix" this by reaching for teal without also
making the fill opaque.

### 3. `ps-0` on the stat cells is an alignment, not a padding tweak

The on-photo stat cells went `px-5 py-5` → `py-4 pe-5`. Dropping the inline-start padding is
the visible half: the first column's figure now begins on the same vertical as the eyebrow,
the headline, the intro and the buttons, all at x=24. It was inset 20px from all four, which
on a phone — two columns wide, copy at the full measure — read as a misaligned block rather
than a deliberate indent.

`py-4` over `py-5` is 8px a row, 24px across the three rows five stats wrap to. That is the
budget the 10px label is paid for out of; the row nets +15px.

Physical `pl`/`pr` are banned in the shared primitives and asserted in
`tests/unit/ui.test.tsx`, so this is `pe`, not `pr`. Phase 2 mirrors it.

## What it costs

Hero box height, every phone width the project measures at:

| viewport | before | after | |
|---|---|---|---|
| 320 x 844 | 1040 | 1070 | +30 |
| 360 x 844 | 957 | 1006 | +49 |
| 375 x 812 | 957 | 981 | +24 |
| 375 x 667 | 957 | 981 | +24 |
| 390 x 844 | 846 | 897 | +51 |

Per element at 375x812: eyebrow 30 → 44, `h1` 158 → **144**, intro 114 → 124, stat band
300 → 315. The headline is the only one that gives anything back.

The six band pages are untouched above `sm` — the leading and intro steps are phone-scoped,
so their fold measurements at 1280x720 still hold. `/about` measures **659px** against a 720
viewport after the change, still 61px clear of the fold, against the 652px recorded in
`PageHero`'s own ceiling table. Only the 659 was measured here; the 652 is that table's.

8px stat labels were the only type on the site set under 10px.

## Tests

`tests/unit/typeScale.test.tsx` now pins the phone **leading** next to the size, on both
`h1` branches, because the pair is what was measured. `text-4xl` without `leading-[1]` is
not the thing that was costed, and a later change that drops the leading step should fail
there rather than quietly cost scroll on `/` and six band pages at once.

The no-photograph fallback follows the phone leading too. It is the page's only `h1` when it
renders at all, so the headline must not set at a different rhythm the day the CMS loses its
photography. It keeps its own `sm:leading-[1.08]`; neither `sm` value was measured on a
phone.

## Verified green

- **661 unit tests**, 61 files
- `tsc --noEmit` clean, `eslint` clean
- **46 / 47 Playwright.** The one failure asserts `og:image` resolves to a non-localhost URL,
  which cannot hold against a local dev server whatever the branch — the assertion is about
  `metadataBase`, which nothing here touches. Note it was **not** run against a clean `main`
  to confirm that, so it is reasoned rather than measured; the suite was run twice with these
  changes applied, once on the old branch point and once rebased onto current `main`.
- All 4 GitHub checks green on PR #51 before merge

Then on the deployment, read off the running page rather than the build:

```
hero 981   h1 36px/36px   intro 16px/24.8px   eyebrow 11px/22px
pill box-decoration-break: clone   figure 26px   label 10px   band left 24 = h1 left 24
```

All five slides loaded and the photograph rendered.

## em-8.com is still the old site

Worth writing down plainly, because verifying there first was a dead end and the next person
will do the same thing:

**`em-8.com` serves the old site.** No `data-hero-overlay`, no `data-stat-band`, hero reads
"Building Value in the Midwest". Railway lists **zero custom domains** on the service. The
new site is at:

```
https://em-8-properties-website-production.up.railway.app
```

Cutover has not happened. `NEXT_PUBLIC_SITE_URL` in `.env.example` still says "Set to
https://em-8.com at cutover", which is the accurate description of where this stands.

Two consequences. First, **any instruction to "check the live site" means the Railway domain
until cutover**, and a check against em-8.com will describe the old site while looking like a
pass. Second, the screenshots Hunter sends as references are of a site that is still live and
still his, so they can be measured directly rather than estimated from an image — which is
how the 6.7% figure above was obtained, and how the entrance timings in the 2026-09-17
handover were.

## Three things that cost time, none of them the code

### `RAILWAY_API_TOKEN` is not in every worktree's `.env.local`

`docs/deploys-and-migrations.md` says the token lives in `.env.local`. It lives in the **main
checkout's** `.env.local`, at the repo root. Each worktree carries its own untracked copy,
and the one in `.claude/worktrees/phase-1-implementation` predates the token — so the
documented command finds nothing there.

Worse, that copy still carries the line the previous session disproved:

```
# Railway deploys by connecting to the GitHub repo — no API key is needed.
```

`.env.example` was corrected on 2026-09-17. `.env.local` is untracked, so the correction
could not reach it, and every worktree kept the wrong sentence. **Fix the worktree copies by
hand, or the next session reads the disproved line first.**

### `gh pr merge` reports failure in a worktree when the merge succeeded

```
failed to run git: fatal: 'main' is already used by worktree at 'C:/Users/Kathy/Claude/em8-website'
```

That is `--delete-branch` trying to check out `main` locally after the merge. **The merge
itself had already landed on GitHub.** Check the PR's `merged` field before re-running
anything; deleting the remote branch afterwards with `git push origin --delete` finishes the
job. This will recur on every PR merged from a worktree.

### The in-app browser pane reported the hero images as never decoding

`complete: false`, `naturalWidth: 0` on all six, with the network panel showing 200s — while
`curl` returned a valid 1600x900 WebP with `x-nextjs-cache: HIT` and an independent Chromium
loaded all five and painted the photograph. The pane, not the site.

It belongs with the stale-state failures collected in
`docs/handover-2026-09-16-map-and-lightbox-fixes.md` — not the same cause, but the same
lesson that file already draws: when a tool and the artefact disagree, fetch the artefact.
It very nearly produced a confident, wrong bug report about a site that was working.

## Still open

Unchanged from `docs/handover-2026-09-17-hero-copy-rise.md`. Nothing here touched any of it:

- **Antioch Industrial** still wants a real photograph, and Antioch Shopping Plaza has no
  Advantage Photos folder.
- `uteg-street-apartments` has no gallery at all.
- **No CI coverage of painted crop or of contrast.** A slide swapped in the Studio is
  audited by nothing — and this change added a contrast argument (the translucent lozenge)
  that nothing checks either.
- `/about` → Why EM8 is still empty.

New, from this session:

- **Cutover.** The site has been deployed and verified on a `.up.railway.app` domain for
  weeks. Nothing here blocks it; it just has not been done.
- The eyebrow lozenge is the first element on the site whose contrast depends on a
  translucent fill over CMS photography. If the "photographs must be dark" instruction in the
  Studio is ever relaxed, this is one of the things that breaks.

---

## For Hunter — add anything below this line

Nothing below here is written by Claude.

### Priorities for the next session

-

### Corrections to anything above

-
