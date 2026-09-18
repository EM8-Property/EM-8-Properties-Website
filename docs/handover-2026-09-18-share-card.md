# EM8 website — handover, 2026-09-18 (the share card's logo)

Fourth task of the day and the last of three on the logo. Follows
`docs/handover-2026-09-18-logo-weight.md` and `docs/handover-2026-09-18-logo-size.md`, both
of which closed with the share card listed as still wrong. Hunter said "fix the share card".
Shipped at `14c8849` (PR #57), deployed as `ec2d138e`, verified against the deployed PNG.

| | before | after |
|---|---|---|
| `EM8` | 84px / Light | **91px / 600** |
| `PROPERTIES` | 26px / Light | **31px / 700** |
| rule width | 252 | **294** |
| font files | 1 (Light) | 2 (SemiBold, Bold) |

## What went wrong, stated plainly

The card drifted from the site for most of the day and shipped that way through **two
deploys**, a 664-test suite, a typecheck, a lint and four green CI checks. Satori is handed
font *files* rather than CSS, so when `app/layout.tsx` swapped the Cormorant subset, nothing
in `shareCardFrame.tsx` moved. It kept drawing Light against a SemiBold site, and then
against a site whose `PROPERTIES` had gone to Bold as well.

`shareCardFrame.tsx`'s own docblock had already predicted this about itself — "a card is the
one surface where nothing in the build, the tests or a typecheck would report that they
had" — and was right, twice in one day. **Prediction in a comment is not a check.** There
are now two.

## The two tests, and why they are shaped the way they are

Both live in the `share card wordmark` block of `tests/unit/wordmark.test.tsx`.

1. **The card's weights are compared against the page's *rendered* weights**, not against
   the literals 600 and 700. It renders `<Wordmark variant="lockup" />`, reads the weight
   off each Tailwind class, walks the card's React tree for every `fontWeight` on a
   Cormorant-faced node, and asserts the two lists are equal. So the next change to the
   page's weights fails here until the card is brought with it — which is the failure that
   actually happened, rather than the one a fixed number would catch.
2. **A font file must be registered for every weight the card asks for.** `shareCardFonts()`
   reads the real files out of `public/fonts`, and the test asserts the registered weights
   and the asked-for weights match exactly, both directions. Satori does **not** fail on a
   miss — it draws in whichever face it has — so this is the same silent-wrong-weight
   failure the page had, one layer down.

Both were confirmed to fail when violated rather than assumed: putting the card's
`PROPERTIES` back to 600 fails two tests, and asking for a 500 nothing supplies fails one.

## The fonts

Two nine-glyph subsets (`EM8PROTIS`) replace the one, obtained the way
`public/fonts/README.md` already documented — the Google Fonts CSS API with a `text=`
parameter — with one addition worth keeping: **the request needs a user-agent old enough
that the API serves TrueType instead of woff2**, because Satori reads ttf/otf and not woff2.
`User-Agent: Mozilla/4.0` does it.

**Verify what arrives rather than trusting the request.** The checks used, now written into
that README:

- magic number is `00010000` (a real TrueType file, not an error page or a woff2)
- `OS/2`'s `usWeightClass` equals the weight asked for — this is the authoritative weight
  *inside* the file, as opposed to the weight named in the CSS that pointed at it
- the `cmap` maps all nine characters

The Light file is **deleted**, because nothing asks for 300 any more. That mirrors the
`loads nothing it does not use` test on the page side: an unused weight should not
accumulate.

## The rule width, which is the one genuinely interesting problem

`PROPERTIES` sits under a hairline rule that Satori will not shrink-wrap, so its width is an
explicit number that has to match the word. The first attempt computed it from the font:
sum the ten glyphs' `hmtx` advance widths, scale to the font size, add nine letter-spaces
(nine, not ten — the trailing space after the final `S` is not ink). That gives **299**.

Rendered, 299 overhangs the word by 5px on the right.

**The advance sum is wrong because the browser kerns `PROPERTIES` and the sum does not.**
`PROPERTIES` has kern pairs; the arithmetic runs about 2% wide. Measured off the page's own
footer lockup, the rule is `114.00px` against `113.50px` of painted ink — it matches the word
almost exactly, and *that relationship* is what the card has to reproduce, not a formula.

So the number is measured: the page's rendered rule width scaled by this card's `PROPERTIES`
factor, `114.00 x (31 / 12) = 294.5`, then confirmed against the rendered PNG by reading
pixels.

```
page   rule 114.00px   PROPERTIES ink 113.50px   rule/ink 1.0044   overhang 0.25px
card   rule 294.00px   PROPERTIES ink 293.00px   rule/ink 1.0034   overhang 0.00px
```

Both figures come from the same pixel-scanning method applied to the rendered page and the
rendered PNG, which is why they are comparable. The old 252 was ~5px wide of its own word
for the same kerning reason — invisible at 26px, and worth not scaling up.

**If you change the weight, size or tracking of `PROPERTIES` on the card, re-measure this.
Do not recompute it.**

## The card is not a uniform scale of the page, and that is deliberate

Worth knowing before the next change, because recomputing from one scale factor is the
obvious wrong move:

| | page | card | factor |
|---|---|---|---|
| `EM8` | 26px | 91px | **3.50x** |
| `PROPERTIES` | 12px | 31px | **2.58x** |

`PROPERTIES` is proportionally smaller on the card than in the footer lockup, and predates
this session. It is kept: at a true 3.5x it measures 405px against a 1056px content width
and reads as a second headline rather than a supporting line. So the page's change was
carried across as a **relative** one — 84 → 91 and 26 → 31 — holding both ratios where they
already were.

## Proving Satori actually honoured the weights

Registering two faces under one family name is not the same as Satori selecting between
them, and the width difference between 600 and 700 at this size is only ~2px — too fine to
read confidently off a PNG. So it was measured by **ink density** instead, with everything
else held identical:

| card asks for | `PROPERTIES` ink pixels | ink width |
|---|---|---|
| 700 (shipped) | **1600** | 293px |
| 600 (control) | 1430 | 291px |

12% more ink. Satori resolves by family *plus* weight, and is genuinely drawing Bold.

## Verified

- **666 unit tests**, 61 files. `tsc --noEmit` clean, `eslint` clean. All 4 CI checks green.
- `next build` clean, all 35 static pages generated — which **includes prerendering this
  card** (`dynamic = 'force-static'`), so a missing or unreadable font file fails the build
  rather than the link preview. That is the one automated check that existed before today.
- Both consumers render, locally and deployed: `/share-card` and the per-article
  `insights/[slug]/opengraph-image`.
- On the deployment: the card is 200 `image/png`, the rule measures 294 at x=72, and
  `PROPERTIES` ink runs x=73→365 at 293px wide — the Bold figure, where the SemiBold control
  measured 291.
- `public/fonts/CormorantGaramond-Light-wordmark.ttf` now 404s on the deployment and the two
  new files 200, which confirms `public/` reached the container as expected.

One honest caveat: the deployed card's `PROPERTIES` ink count reads 1538 against 1470–1600
locally. Glyph positions and widths are identical, so this is anti-aliasing in the container
differing slightly from the local render, not a different face. The width discriminator
(293 vs 291) is the reliable signal and it is unambiguous.

## Still open

Carried forward; nothing here touched any of it:

- **Antioch Industrial** still wants a real photograph, and Antioch Shopping Plaza has no
  Advantage Photos folder.
- `uteg-street-apartments` has no gallery at all.
- **No CI coverage of painted crop or of contrast.**
- `/about` → Why EM8 is still empty.
- **Cutover.** `em-8.com` still serves the old site; everything above was verified at
  `https://em-8-properties-website-production.up.railway.app`.
- **`RAILWAY_API_TOKEN` is still absent from this worktree's `.env.local`**, which still
  carries the disproved "no API key is needed" line. Every write to that file is refused by
  a credential guard, so it needs a human. All four of today's deploys were run from the
  **main checkout's** copy, which works and is the better habit anyway.

Closed today:

- **The logo is now consistent across all three of its drawings** — `Wordmark.tsx`, the
  share card, and the page's own two variants — for the first time since the mark changed on
  2026-09-15. The share card was the outstanding one and it is the item the two previous
  handovers left open.

New, and small:

- The card's vertical rhythm was **not** rescaled. The rule's `marginTop: 14` and
  `PROPERTIES`' `marginTop: 12` are unchanged, and they were never a scale of the page's
  `mt-2.5` / `mt-2` either — 1.4x and 1.5x against a type scale of 3.5x. They look right and
  nothing asked for them to move, but if the card's lockup is ever revisited as a whole,
  that is the loose end.
- `shareCardFrame.tsx` cited its tests as `shareCard.test.tsx`, which has never existed.
  Corrected to name the `share card wordmark` block in `tests/unit/wordmark.test.tsx`.

---

## For Hunter — add anything below this line

Nothing below here is written by Claude.

### Priorities for the next session

-

### Corrections to anything above

-
