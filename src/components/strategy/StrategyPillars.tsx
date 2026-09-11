import { Card } from '@/components/ui/Card'
import { Eyebrow } from '@/components/ui/Eyebrow'
import { PillarIcon } from './PillarIcon'

export type Pillar = {
  icon?: string | null
  eyebrow?: string | null
  title?: string | null
  body?: string | null
}

/**
 * The argument for the market, one card per reason.
 *
 * Shaped like the Partners trio deliberately — same `Card`, same `Eyebrow`, same
 * `font-display` heading, same 12px body — so the two pages under the Strategy tab read
 * as one section of the site rather than two designs. The icon badge is the only thing
 * this adds, and it sits above the eyebrow so the card still scans top-down as
 * icon → label → claim → reasoning.
 *
 * `lg:grid-cols-4` and not before: at `sm` these are four ~170px columns on a tablet,
 * which wraps every card heading onto three lines. Two up to `lg`, four above it.
 *
 * The badge carries `text-teal-text` (#2C7A74), not `text-teal`. A 20px glyph at
 * `strokeWidth` 1.5 presents as a hairline rather than as a 24px-and-up figure, so it
 * falls on the small-text side of the rule in `src/lib/tokens.ts` — the accent teal
 * measures ~2.2:1 on white, and on the 10%-teal ground beneath it that is worse, not
 * better.
 */
export function StrategyPillars({ pillars }: { pillars: Pillar[] }) {
  return (
    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
      {pillars.map(({ icon, eyebrow, title, body }) => (
        <Card key={title}>
          <div className="p-5">
            <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-control bg-teal/10 text-teal-text">
              <PillarIcon name={icon} />
            </div>
            <Eyebrow>{eyebrow}</Eyebrow>
            <h3 className="mt-2 font-display text-base font-medium uppercase tracking-wide text-ink">
              {title}
            </h3>
            <p className="mt-2 text-xs leading-relaxed text-ink-secondary">{body}</p>
          </div>
        </Card>
      ))}
    </div>
  )
}
