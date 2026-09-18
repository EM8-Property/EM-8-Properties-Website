# EM8 website — handover, 2026-09-18 (the logo's size, and PROPERTIES)

Third task of the day and the second on the logo. Follows
`docs/handover-2026-09-18-logo-weight.md`, which took the mark Light → SemiBold. Hunter saw
that deployed and asked for `PROPERTIES` bolder still, and for both lines slightly bigger.
Shipped at `c6c66a9` (PR #55), deployed as `51c96b24`, verified on the running site.

| | before | after |
|---|---|---|
| `EM8` | 24px / 600 | **26px** / 600 |
| `PROPERTIES` | 10px / 600 | **12px / 700** |
| Cormorant subset | `weight: '600'` | `weight: ['600', '700']` |

## The finding: a weight change can be reasoned about here, a size change cannot

This is the one thing to carry out of both logo tasks, because the two changes look alike
and behave completely differently against `lib/headerReservation.ts`.

**Weight was free, and provably so.** All five weights the family publishes produce
identical header heights, and the fonts-**blocked** column cannot move for a weight change
*at all* — a blocked webfont paints in the same generated `size-adjust` fallback whichever
weight was asked for. Only the loaded rows were ever at risk.

**Size is not free, and it is the blocked column that pays.** 24px → 26px left the loaded
column untouched but gained **1px on every blocked row**, because the size-adjusted fallback
scales with the size. The tightest clearance went `+31.0 → +30.0`. The table in that file is
updated, and both columns were re-measured rather than adjusted by arithmetic.

So: if you are only changing the wordmark's weight, that docblock's table stands. **If you
are changing its size, re-measure it, including the blocked column.**

## Why 26px and not more

Costed rather than preferred. Every row here was measured on the running site:

| `EM8` | link box | loaded 320/390 | blocked 390 | tightest |
|---|---|---|---|---|
| 24px | 27.0 | 113.0 / 88.5 | 113.0 | +31.0 (was live) |
| **26px** | **28.0** | **113.0 / 88.5** | **114.0** | **+30.0 ← shipped** |
| 27px | 29.0 | 114.0 / 89.5 | 115.0 | +29.0 |
| 28px | 29.7 | 114.7 / 90.2 | 115.0 | +29.0 |
| 30px | 31.8 | 116.8 / 92.3 | 117.0 | +27.0 |

Two independent reasons stop it at 26:

1. **Row one's height is set by the actions block at 30px, not by the wordmark.** The
   wordmark's link box is 27.0px at 24px type and 28.0px at 26px — still under it, which is
   why the loaded column does not move at all. At 28px the link box is **29.7px, within
   0.3px of taking over**, and at 30px it does take over and the desktop header grows too.
   26px is the last size the loaded column ignores completely.
2. **30px breaks the 28px floor** that section's own sweep established as the thing not to
   regress below.

`PROPERTIES` is not in that table — it lives in the footer. 11px, 12px and 13px measure
identically against the header, which is why the size increase was spent more freely there
than on the mark. 13px was rejected on looks alone: it makes the lockup bottom-heavy.

## The lockup's two lines now differ on purpose, and the file used to argue against it

`Wordmark.tsx` and the previous commit both said the opposite: the supplied artwork sets
`EM8` and `PROPERTIES` level, and boldening one alone splits a single brand asset. Hunter
looked at the deployed 600 and asked for exactly that.

That is his call on his own logo, and it is now **recorded in the component and pinned in the
test**, specifically so the next person who reads the older reasoning does not quietly
restore it. The reasoning was not wrong; it was overruled, which is a different thing and
needs to read that way in the file.

### Which means the subset carries two weights for the first time

One font file cannot serve two weights, so `weight: '600'` became `weight: ['600', '700']`.
Every previous version of that comment argued for exactly one weight, and **one weight is
still the default to return to.** The cost is one extra latin subset, not a family — the
browser fetches only the weights and ranges it uses, confirmed as `600:loaded` and
`700:loaded` on the deployment with the other ranges unloaded.

`tests/unit/wordmark.test.tsx` now asserts the loaded list and the classes match **in both
directions**:

- a class can never ask for a weight the subset does not carry (the silent no-op from the
  last handover, now impossible in either line)
- an unused weight can never accumulate in the subset

The second half is what keeps the one-weight rule from eroding by accident instead of by
decision.

## Two test changes worth knowing about

**The size assertion no longer pins `text-2xl`.** It asserts the **≥24px threshold** that
`tokens.ts`'s teal rule actually cares about. The old form failed on this change even though
the change was entirely safe — and a test that must be edited every time the mark is resized
teaches the next person to edit it without reading it. It still fails if anyone shrinks the
mark under the token.

**The weight assertion no longer names a number.** It compares the rendered classes against
the loaded list, so it keeps working the next time either line moves and still fails the
moment the two sides disagree.

Four failure modes were provoked and confirmed to fail, rather than assumed:

| broken deliberately | caught |
|---|---|
| class asks 700, subset loads only 600 | 2 tests |
| subset loads an unused third weight | 1 test |
| `PROPERTIES` put back level with the mark | 2 tests |
| mark shrunk to 20px, under the teal threshold | 1 test |

## Incidentally: the `8`'s `1.06em` earned itself

`Wordmark.tsx` set the `8` as `1.06em` rather than a second fixed size "so that it stays
proportional if the mark is ever set larger". This is the first time the mark has been set
larger, and it needed no second number kept in step. Worth noting because that kind of
choice usually goes unvalidated.

Relatedly, the mark had been sitting **exactly** on the 24px threshold `--color-teal` names
for the bright teal. It now clears it by 2px, so the logo exemption that covers the `8` is
even further from being load-bearing. The docblock prose said "24px" in three places and now
says 26px; the constraint was never the 24, it was the threshold.

## Verified

- **664 unit tests**, 61 files. `tsc --noEmit` clean, `eslint` clean. All 4 CI checks green.
- Measured on the running site before shipping: loaded **and** blocked header heights at all
  eight widths, matching the updated table exactly. No horizontal overflow at 320px.
- Then on the deployment:

```
header mark   26px/600     footer mark  26px/600     PROPERTIES  12px/700
link box 28.0   header 62.0 @1280   113.0 @320   88.5 @390
8 = rgb(74, 189, 181)   Cormorant 600:loaded 700:loaded
no horizontal overflow at 320 or 390
```

- All seven top-level pages 200, and the served HTML carries
  `text-[26px] font-semibold` and `text-[12px] font-bold`.

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
  a credential guard, so it needs a human. Deploys were run from the **main checkout's**
  copy, which works.

Updated from the previous handover:

- **The share card is now two steps away from the page, not one.** It draws the logo from
  `public/fonts/CormorantGaramond-Light-wordmark.ttf` at `weight: 300` and 10px-equivalent
  proportions, so it is Light where the page is SemiBold, and its `PROPERTIES` is Light where
  the page's is Bold. Satori takes font files rather than CSS, so nothing about it followed
  either change. Fixing it means committing a 600 and a 700 subset to `public/fonts` and
  matching the two sizes — a contained job, but it is a new font binary in the repo and was
  outside both requests. **This is the one surface where the logo is now visibly wrong, and
  nothing in the build, the tests or a typecheck reports it** — which is exactly what that
  file's own docblock predicted about itself.

---

## For Hunter — add anything below this line

Nothing below here is written by Claude.

### Priorities for the next session

-

### Corrections to anything above

-
