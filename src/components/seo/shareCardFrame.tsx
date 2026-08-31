import { palette } from '@/lib/tokens'

/** Every share card is 1200x630 — the size LinkedIn, Facebook and X all render large. */
export const SHARE_CARD_SIZE = { width: 1200, height: 630 } as const

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
      }}
    >
      <div
        style={{
          display: 'flex',
          fontSize: 26,
          letterSpacing: 2,
          color: palette.ink,
        }}
      >
        EM8&nbsp;<span style={{ color: palette.tealText }}>PROPERTIES</span>
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
