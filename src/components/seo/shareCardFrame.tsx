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
 * The wordmark font here is subset to nine glyphs. Passing it alone would have produced a
 * correct `EM8` above a headline of empty rectangles — and since the card is a PNG that
 * only ever renders inside someone else's link preview, nothing in the build, the tests or
 * a typecheck would have said so. Both faces, always, is the shape that cannot do that.
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
 * The files are publicly reachable as a side effect of living there. Both are open-licensed
 * (Cormorant Garamond under the OFL, Geist under the OFL), nothing links to them, and
 * 131KB of fonts is not worth a route to hide them behind.
 */
export async function shareCardFonts() {
  const dir = join(process.cwd(), 'public', 'fonts')
  const [wordmark, body] = await Promise.all([
    readFile(join(dir, 'CormorantGaramond-Light-wordmark.ttf')),
    readFile(join(dir, 'Geist-Regular.ttf')),
  ])

  return [
    { name: WORDMARK_FACE, data: wordmark, weight: 300 as const, style: 'normal' as const },
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
 * inspection, and `shareCard.test.tsx` pins the parts that would drift — the teal `8`, the
 * face, and the word beneath the rule.
 *
 * The lockup rather than the bare mark, because a card is seen by people who have never
 * been to the site and the full name is the point of it. It is drawn at 3.5x the header's
 * size, which keeps the `8` far above the 24px floor `teal` carries.
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
          image. 252 is the measured width of PROPERTIES at the size and tracking below, and
          it has to move when either of those does. */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
        <div
          style={{
            display: 'flex',
            fontFamily: WORDMARK_FACE,
            fontSize: 84,
            lineHeight: 1,
            letterSpacing: 5,
            color: palette.ink,
          }}
        >
          EM<span style={{ color: palette.teal, fontSize: 89 }}>8</span>
        </div>
        <div
          style={{
            display: 'flex',
            marginTop: 14,
            height: 1,
            width: 252,
            background: palette.rule,
          }}
        />
        <div
          style={{
            display: 'flex',
            marginTop: 12,
            fontFamily: WORDMARK_FACE,
            fontSize: 26,
            lineHeight: 1,
            letterSpacing: 11,
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
