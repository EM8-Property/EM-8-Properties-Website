# EM8 website — handover, 2026-09-18 (the logo's weight)

Second task of the day, after `docs/handover-2026-09-18-hero-type-on-phone.md`. Hunter asked
for the EM8 logo "at the top and bottom of the page" to be bolder — first "a little bit",
then "even more bold" once he had seen it. Shipped at `2e2b12c` (PR #53), deployed as
`9317ff7e`, and verified on the running site.

**Cormorant Garamond Light (300) → SemiBold (600)**, on the header mark and both lines of the
footer lockup.

## The finding worth carrying: this is two files, and either one alone is a silent no-op

`Wordmark.tsx` is the one place the logo is drawn, so "top and bottom of the page" is one
component with two variants — that part was easy and is the payoff of the 2026-09-15
consolidation. The trap is elsewhere.

`app/layout.tsx` pins the Cormorant subset to **one weight**, deliberately, so that the site
carries a single small font file rather than a family. That means the Tailwind class in
`Wordmark.tsx` cannot bolden anything by itself: with only the 300 file loaded, `font-semibold`
selects that same 300 face and paints the identical old mark.

And a browser will not warn you, because **it does not synthesise a one-step difference.**
Faux-bolding kicks in around a 200-unit gap; ask for 400 against a 300-only subset and you
get the 300 outlines, no complaint, no console message. Nothing in this repo would have
caught it either — the classes would read as bold in every test, the typecheck and the lint
would pass, and a screenshot diff would show nothing because nothing changed.

So the two edits are a pair:

| | |
|---|---|
| `app/layout.tsx` | `Cormorant_Garamond({ weight: '600' })` |
| `Wordmark.tsx` | `font-semibold` on both spans |

`tests/unit/wordmark.test.tsx` now pins both halves, and **its negative assertion is
deliberately general**:

```
expect(layoutSource).not.toMatch(/weight:\s*(?!'600')'\d00'/)
```

It rejects any pinned weight that is not the one the classes ask for, rather than naming the
particular weight that happened to be replaced — otherwise the test goes stale the next time
someone moves the mark and only catches a revert to the one weight it knew about. Comments
are stripped before the scan, because the docblocks in both files discuss the weights they
replaced in order to explain why they must not come back, and a naive grep reads that prose
as the setting itself. That is the same reason `tests/shared/sourceScan.ts` exists.

Reverting each half alone was **run** and confirmed to fail, twice, at 400 and again at 600.
Not reasoned about.

## Why 600, and the ladder that settled it

The first pass took it to 400, on the argument that it was the next weight the family
publishes and therefore the smallest possible step. Hunter looked at it and asked for more.

Rather than step one notch and risk a third round trip, all five weights were rendered from
the running site and compared side by side. That was the cheaper move and it answered a
question the single step could not:

**400 and 500 are near-indistinguishable at the 24px the mark is set at.** 500 would not have
read as "even more bold" either. 700 goes heavy in a way that fights the delicacy of the face.
600 is the weight that answers the request without overshooting it.

`EM8`, measured at each weight:

| weight | 300 | 400 | 500 | 600 | 700 |
|---|---|---|---|---|---|
| `EM8` width | 49.48 | 49.70 | 50.00 | 50.31 | 50.59 |

## It costs nothing in the header, and that is now measured rather than assumed

The wordmark sits in row one of the header, which makes it an input to
`lib/headerReservation.ts` — a table that three sessions have spent measuring and that its own
docblock says goes stale silently. So it was re-measured at all eight widths.

**All five weights produce identical header heights**, fonts loaded:

```
320:113.0  360:113.0  375:113.0  390:88.5  640:88.5  767:88.5  768:62.0  1280:62.0
```

Every row matches the table already recorded there. 1.11px of width across the entire ladder,
against a tightest recorded row-one margin of 23.1px. The ladder is now in that docblock so
the next person choosing a weight does not re-derive it.

Two things make this safer than it looks. The fonts-**blocked** column cannot move here at
all, by construction: a blocked webfont weight paints in the same generated `size-adjust`
fallback whichever weight was asked for, which is also why `adjustFontFallback` staying at its
default matters. And the mark is still 24px, so the `text-teal` `8` is still inside the
`tokens.ts` rule that permits the bright teal at 24px and up — **the weight change does not
touch that argument, but shrinking the mark still would.**

## Verified

Unit, type and lint at 600:

- **663 unit tests**, 61 files (661 on `main`, +2 here)
- `tsc --noEmit` clean, `eslint` clean
- `next build` clean, all 35 static pages generated

Then the artefact rather than the build, at three levels — because a font weight is exactly
the kind of change that can pass every test and still not reach the page:

1. **Built CSS:** `@font-face` for Cormorant Garamond declares `font-weight:600` across all
   five unicode-range subsets, and there is no `font-weight:300` in it.
2. **Served CSS on the deployment:** same, fetched from the live chunk.
3. **Live page in a real browser:** header mark computes to `600` at `24px`, width `50.31px`
   — the ladder's 600 figure exactly — both footer lines compute to `600`, the `8` is still
   `rgb(74, 189, 181)`, and `document.fonts` reports a Cormorant **600** face loaded with no
   other weight present. Header height `62.0` at 1280px and `88.5` at 390px, both matching
   the reservation table.

That third check is the one that would have caught the silent no-op, and it is the one to
repeat if the weight is ever changed again.

## A false alarm worth recording

Mid-session a Playwright run reported a **second** failure: `a bad URL renders the 404 rather
than crashing` got a 500. It was not the change. The dev server's workers had died —
`Jest worker encountered 2 child process exceptions, exceeding retry limit` in
`.next/dev/logs/next-development.log` — after the source was rewritten five times in a row by
the weight-ladder script. A clean `rm -rf .next` and restart returned it to 404 and to 46/47.

This belongs with the stale-state failures in
`docs/handover-2026-09-16-map-and-lightbox-fixes.md` and the browser-pane one in
`docs/handover-2026-09-18-hero-type-on-phone.md`. Same lesson, third time: **when a tool and
the artefact disagree, go and look at the artefact.** Rapid programmatic source edits against
a long-lived dev server are a new way to provoke it, and worth knowing about before writing a
bug report.

## One open question from the last handover is now closed

`docs/handover-2026-09-18-hero-type-on-phone.md` recorded the `og:image` Playwright failure as
"reasoned rather than measured", because it had not been run against a clean `main`.

**It has been now.** The same test was checked out at `d4a0831` in the same worktree and fails
identically. It is environmental — the assertion requires a non-localhost `metadataBase` and
cannot hold against a local dev server on any branch. 46/47 is the clean local result.

## Still open

Carried forward unchanged; nothing here touched any of it:

- **Antioch Industrial** still wants a real photograph, and Antioch Shopping Plaza has no
  Advantage Photos folder.
- `uteg-street-apartments` has no gallery at all.
- **No CI coverage of painted crop or of contrast**, including the translucent eyebrow lozenge
  from this morning.
- `/about` → Why EM8 is still empty.
- **Cutover.** `em-8.com` still serves the old site and Railway still lists zero custom
  domains. Everything above was verified at
  `https://em-8-properties-website-production.up.railway.app`.

New, from this session:

- **The share card still draws the logo in Light.** `components/seo/shareCardFrame.tsx` reads
  a subsetted `public/fonts/CormorantGaramond-Light-wordmark.ttf` at `weight: 300` — Satori
  takes font files, not CSS, so it did not follow. The page mark and the social mark are now
  **two different weights**. Matching it needs a Regular-or-heavier subset committed to
  `public/fonts`, which was more than the request covered. This is the third-copy drift that
  `Wordmark.tsx`'s docblock predicted, arriving exactly where it said it would: the one
  surface nothing in the build, the tests or a typecheck reports on.
- **`RAILWAY_API_TOKEN` is still missing from this worktree's `.env.local`, and the disproved
  line is still there.** The previous handover asked for this to be fixed by hand; it could
  not be done from the session, because every write to `.env.local` is refused by a
  credential guard. The deploy was run from the **main checkout's** copy instead, which works
  and is probably the better habit anyway — one operator credential, one place. If the
  worktree copy is ever fixed, delete the sentence claiming no API key is needed.

---

## For Hunter — add anything below this line

Nothing below here is written by Claude.

### Priorities for the next session

-

### Corrections to anything above

-
