import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { palette } from '@/lib/tokens'

// Re-exported so a card file needs one import. The value lives in `lib/seo`, which also
// declares the og:image dimensions, so the tags and the pixels cannot disagree.
export { SHARE_CARD_SIZE } from '@/lib/seo'

/** The face names the frame asks for. Must match what `shareCardFonts()` returns. */
const WORDMARK_FACE = 'Cormorant Garamond'
const BODY_FACE = 'Geist'

/**
 * The lockup's two weights, which are the page's two weights.
 *
 * `Wordmark.tsx` sets the mark at 600 and `PROPERTIES` at 700 — see the docblock there for
 * why they differ. Satori resolves a face by family **plus weight**, so both have to be
 * registered and both have to be asked for explicitly. A `fontWeight` with no matching
 * entry does not fail; it draws in whichever face is registered, which is exactly the kind
 * of silent wrong result this card specialises in.
 */
const MARK_WEIGHT = 600 as const
const PROPERTIES_WEIGHT = 700 as const

/**
 * The two fonts every share card is drawn with, as Satori wants them.
 *
 * ## Why this function has to exist at all
 *
 * Satori has no font fallback chain and no system fonts — it renders with exactly the list
 * it is handed. `@vercel/og` supplies a default when you pass none (`fonts: options.fonts
 * || defaultFonts` in its bundled source), and that default is a single face, Geist. The
 * trap is that the two are **either/or**: the moment a card asks for one custom font, the
 * default is gone, and every glyph that font does not carry renders as a blank box.
 *
 * The wordmark fonts here are subset to nine glyphs. Passing them alone would have produced
 * a correct `EM8` above a headline of empty rectangles — and since the card is a PNG that
 * only ever renders inside someone else's link preview, nothing in the build, the tests or
 * a typecheck would have said so. Every face, always, is the shape that cannot do that.
 *
 * ## Why the files are in `public/`, and why Geist is copied rather than resolved
 *
 * `next.config.ts` sets `output: 'standalone'`, and the Dockerfile copies exactly three
 * things into the runtime image: `public`, `.next/standalone`, `.next/static`. A font read
 * from anywhere else depends on Next's file tracing having noticed a `readFile` of a path
 * it had to compute — which works until it doesn't, at which point the card 500s in the
 * container and renders on a laptop. `public/` is copied verbatim and unconditionally.
 *
 * Geist is a byte copy of `@vercel/og`'s own bundled default rather than a read from
 * `node_modules`, which the runtime image does not contain in full. Copying it also pins
 * the headline face: a Next upgrade that changes the bundled default would otherwise
 * restyle every share card on the site silently.
 *
 * The files are publicly reachable as a side effect of living there. All are open-licensed
 * (Cormorant Garamond under the OFL, Geist under the OFL), nothing links to them, and
 * 133KB of fonts is not worth a route to hide them behind. Two Cormorant subsets rather
 * than one costs 5KB, because each is nine glyphs.
 */
export async function shareCardFonts() {
  const dir = join(process.cwd(), 'public', 'fonts')
  const [mark, properties, body] = await Promise.all([
    readFile(join(dir, 'CormorantGaramond-SemiBold-wordmark.ttf')),
    readFile(join(dir, 'CormorantGaramond-Bold-wordmark.ttf')),
    readFile(join(dir, 'Geist-Regular.ttf')),
  ])

  return [
    { name: WORDMARK_FACE, data: mark, weight: MARK_WEIGHT, style: 'normal' as const },
    {
      name: WORDMARK_FACE,
      data: properties,
      weight: PROPERTIES_WEIGHT,
      style: 'normal' as const,
    },
    { name: BODY_FACE, data: body, weight: 400 as const, style: 'normal' as const },
  ]
}

/**
 * The shared frame for every generated share card: wordmark, headline, teal rule.
 *
 * There were two near-identical copies of this — the per-article card and the default
 * one — carrying their own hex literals. Two copies of the brand card drift, and a card
 * is the one surface where nothing in the build, the tests or a typecheck would report
 * that they had.
 *
 * Colours come from `palette` rather than literals. Satori cannot read CSS custom
 * properties, so a card is the one place the design tokens have to be restated in JS;
 * importing them at least means there is a single source and `tokens.test.ts` still
 * guards the values.
 *
 * ## This is the third drawing of the logo, and it cannot share the first two
 *
 * `components/layout/Wordmark.tsx` is the logo everywhere a browser paints it. This is not
 * a duplicate of it by neglect: Satori accepts a small subset of inline styles and no
 * classes at all, so a Tailwind component cannot be handed to it. The two have to agree by
 * inspection, and the `share card wordmark` block in `tests/unit/wordmark.test.tsx` pins the
 * parts that would drift — the teal `8`, the face, the two weights, and the word beneath the
 * rule. (That block was cited here as `shareCard.test.tsx`, which has never existed.)
 *
 * **It drifted for most of 2026-09-18, which is the case against relying on inspection.**
 * The page's logo went Light → SemiBold, and then `PROPERTIES` on to Bold, and this file
 * followed neither: Satori is handed font *files* rather than CSS, so nothing here moved
 * when the subset in `app/layout.tsx` did. The card shipped through two deploys drawing
 * Light while the site drew SemiBold. Nothing reported it, in the way this docblock had
 * already predicted about its own duplication.
 *
 * The lockup rather than the bare mark, because a card is seen by people who have never
 * been to the site and the full name is the point of it.
 *
 * ## The card is not a uniform scale of the page, and that is deliberate
 *
 * `EM8` is drawn at **3.5x** the header's size, which keeps the `8` far above the 24px
 * floor `teal` carries. `PROPERTIES` is at **2.58x**, not 3.5x — proportionally smaller
 * here than in the footer lockup. That predates this file's current form and it is kept:
 * at 3.5x, `PROPERTIES` and its letter-spacing measure 405px, which against a 1056px
 * content width reads as a second headline rather than a supporting line.
 *
 * So the two ratios are independent, and a change to the page's lockup has to be carried
 * across as a **relative** change rather than recomputed from one scale factor. On
 * 2026-09-18 the page went `EM8` 24 → 26 and `PROPERTIES` 10 → 12, so this went 84 → 91
 * and 26 → 31, holding both ratios where they already were.
 */
export function ShareCardFrame({ headline }: { headline: string }) {
  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        background: palette.ground,
        padding: 72,
        fontFamily: BODY_FACE,
      }}
    >
      {/* `alignItems: flex-start` so the lockup is as wide as its own widest row — the
          letterspaced PROPERTIES — rather than the full 1056px of card.

          The rule below carries an explicit width because Satori will not shrink-wrap it.
          `width: '100%'` on a child of a `flex-start` column resolves against the parent's
          full width there, not against the widest sibling the way `items-stretch` does in a
          browser, and the first render of this card drew a hairline the entire width of the
          image. 294 is the width of PROPERTIES at the weight, size and tracking below, and
          it has to move when any of those do.

          **Do not compute this from the font's advance widths.** That was tried: summing
          the ten glyphs' `hmtx` advances and adding nine letter-spaces gives 299, and the
          rendered card then overhangs the word by 5px on the right. The browser applies
          kerning to `PROPERTIES` and the advance sum does not, so the arithmetic runs ~2%
          wide. Measured on the page's own footer lockup, the rule is 114.00px against
          113.50px of painted ink — it matches the word almost exactly, and that
          relationship is what this number has to reproduce.

          So it is derived by measurement: the page's rendered rule width scaled by this
          card's PROPERTIES factor, 114.00 x (31 / 12) = 294.5, then confirmed against the
          rendered PNG. The previous 252 was ~5px wide of its word for the same reason,
          which is invisible at 26px and was not worth scaling up. */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
        <div
          style={{
            display: 'flex',
            fontFamily: WORDMARK_FACE,
            fontWeight: MARK_WEIGHT,
            fontSize: 91,
            lineHeight: 1,
            letterSpacing: 5.5,
            color: palette.ink,
          }}
        >
          EM<span style={{ color: palette.teal, fontSize: 96 }}>8</span>
        </div>
        <div
          style={{
            display: 'flex',
            marginTop: 14,
            height: 1,
            width: 294,
            background: palette.rule,
          }}
        />
        <div
          style={{
            display: 'flex',
            marginTop: 12,
            fontFamily: WORDMARK_FACE,
            fontWeight: PROPERTIES_WEIGHT,
            fontSize: 31,
            lineHeight: 1,
            letterSpacing: 13,
            color: palette.inkSecondary,
          }}
        >
          PROPERTIES
        </div>
      </div>
      <div
        style={{
          display: 'flex',
          fontSize: 54,
          lineHeight: 1.15,
          color: palette.ink,
          maxWidth: 900,
        }}
      >
        {headline}
      </div>
      {/* Teal as a fill, which is what the accent is for. */}
      <div style={{ height: 8, width: 160, background: palette.teal }} />
    </div>
  )
}
