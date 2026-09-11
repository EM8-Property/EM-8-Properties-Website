import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MetricBars } from '@/components/strategy/MetricBars'
import { StrategyPillars } from '@/components/strategy/StrategyPillars'
import { PillarIcon, DRAWN_ICONS } from '@/components/strategy/PillarIcon'
import { PILLAR_ICONS, PILLAR_ICON_LABELS } from '@/lib/pillarIcons'

/** Physical-direction utilities. Phase 2 mirrors this layout for Hebrew. */
const PHYSICAL = /\b(?:[a-z0-9-]+:)*-?(?:ml|mr|pl|pr|border-l|border-r|text-left|text-right)-?\b/

const SERIES = [
  { label: 'Chicago metro', value: 3.1, highlight: true },
  { label: 'New York metro', value: 1.6, highlight: false },
  { label: 'Philadelphia metro', value: 1.1, highlight: false },
]

const SOURCE = 'Apartment List, June 2026.'

function bars(container: HTMLElement): HTMLElement[] {
  return [...container.querySelectorAll<HTMLElement>('[aria-hidden="true"] > div')]
}

describe('MetricBars', () => {
  it('scales every bar against the longest one in the series', () => {
    // The whole claim a bar chart makes. If widths were flat, the labels would say one
    // thing and the picture another — which is worse than no chart, because a chart is
    // read before it is checked.
    const { container } = render(<MetricBars bars={SERIES} unit="%" source={SOURCE} />)
    const widths = bars(container).map((b) => parseFloat(b.style.width))
    expect(widths[0]).toBe(100)
    expect(widths[1]).toBeCloseTo((1.6 / 3.1) * 100, 5)
    expect(widths[2]).toBeCloseTo((1.1 / 3.1) * 100, 5)
  })

  it('formats every figure to the same precision', () => {
    /*
     * A column reading 3.1 / 1.6 / 1 invites the reader to take the last as a rounder,
     * more certain number than its neighbours. It is the same series to the same
     * precision, so it is shown to the same precision.
     */
    render(
      <MetricBars bars={[...SERIES, { label: 'Boston metro', value: 2 }]} unit="%" source={SOURCE} />,
    )
    expect(screen.getByText('2.0%')).toBeInTheDocument()
    expect(screen.queryByText('2%')).not.toBeInTheDocument()
  })

  it('drops the decimals when no value in the series has one', () => {
    render(
      <MetricBars
        bars={[
          { label: 'Managed', value: 1350 },
          { label: 'Sold', value: 750 },
        ]}
        unit=""
        source={SOURCE}
      />,
    )
    expect(screen.getByText('1350')).toBeInTheDocument()
  })

  it('draws the highlighted row in the accent teal and its figure in the legible one', () => {
    // The figure renders at 14px, where the accent teal measures ~2.2:1 on white and
    // fails AA. The bar is a fill and may carry it; the number beside it may not.
    const { container } = render(<MetricBars bars={SERIES} unit="%" source={SOURCE} />)
    expect(bars(container)[0]!.className).toContain('bg-teal')
    expect(bars(container)[1]!.className).not.toContain('bg-teal')
    expect(screen.getByText('3.1%').className).toContain('text-teal-text')
    expect(screen.getByText('3.1%').className).not.toMatch(/text-teal(?!-text)/)
  })

  it('keeps the bars out of the accessibility tree, since the numbers sit beside them', () => {
    // A screen reader announcing a decorative div and then the <dd> it encodes reads the
    // same figure twice.
    const { container } = render(<MetricBars bars={SERIES} unit="%" source={SOURCE} />)
    expect(container.querySelectorAll('[aria-hidden="true"]').length).toBe(SERIES.length)
    expect(screen.getByText('Chicago metro').tagName).toBe('DT')
    expect(screen.getByText('3.1%').tagName).toBe('DD')
  })

  it('renders the source, because a figure on this site states where it came from', () => {
    render(<MetricBars bars={SERIES} unit="%" source={SOURCE} />)
    expect(screen.getByText(SOURCE)).toBeInTheDocument()
  })

  it('renders nothing at all when no row carries both a label and a number', () => {
    // A heading over an empty chart is a promise the page does not keep. The page gates
    // the whole section too; this is the second of the two guards.
    const { container } = render(
      <MetricBars bars={[{ label: 'Chicago metro' }, { value: 3.1 }]} source={SOURCE} />,
    )
    expect(container.firstChild).toBeNull()
  })

  it('gives a near-zero row a visible mark rather than nothing', () => {
    const { container } = render(
      <MetricBars
        bars={[
          { label: 'Chicago metro', value: 3.1 },
          { label: 'Flat market', value: 0 },
        ]}
        source={SOURCE}
      />,
    )
    expect(parseFloat(bars(container)[1]!.style.width)).toBe(2)
  })

  it('clamps a negative value rather than drawing it as a gain', () => {
    // The schema holds `value` at zero or above, but that validation is Studio-side only —
    // the CLI, Vision and any direct API write ignore it. Drawn from a zero baseline, a
    // negative would render on the same side as every gain and read as a small one.
    const { container } = render(
      <MetricBars
        bars={[
          { label: 'Chicago metro', value: 3.1 },
          { label: 'Phoenix metro', value: -3.5 },
        ]}
        unit="%"
        source={SOURCE}
      />,
    )
    expect(parseFloat(bars(container)[1]!.style.width)).toBe(2)
    expect(screen.getByText('0.0%')).toBeInTheDocument()
  })

  it('invents no unit of its own when the CMS has none', () => {
    /*
     * `unit` used to default to `'%'`, and that default was both unreachable and
     * misleading. A JavaScript default fires only on `undefined`; the page passes
     * `copy.marketUnit` straight from GROQ, which returns `null` for an empty field — so
     * the page never once received the default and only the tests did, while the signature
     * implied the component held an opinion the CMS could not see.
     *
     * The default lives in the schema now, as `marketUnit`'s `initialValue`, where an
     * editor can see it, change it, and clear it. Both spellings of "absent" are pinned
     * here because it is the difference between the two that made the old default dead.
     */
    const { rerender } = render(<MetricBars bars={[{ label: 'Chicago metro', value: 3.1 }]} source={SOURCE} />)
    expect(screen.getByText('3.1').textContent).toBe('3.1')

    rerender(<MetricBars bars={[{ label: 'Chicago metro', value: 3.1 }]} unit={null} source={SOURCE} />)
    expect(screen.getByText('3.1').textContent).toBe('3.1')
  })

  it('uses no physical-direction utility, so Phase 2 mirrors it for free', () => {
    const { container } = render(<MetricBars bars={SERIES} unit="%" source={SOURCE} />)
    for (const el of container.querySelectorAll<HTMLElement>('*')) {
      if (typeof el.className !== 'string') continue
      expect(el.className, el.className).not.toMatch(PHYSICAL)
    }
  })
})

describe('PillarIcon', () => {
  it('draws every name the schema offers', () => {
    // The dropdown and the drawings are two lists that would otherwise drift apart
    // silently: an editor picking a name with no drawing gets a card with a hole in it,
    // and nothing in the build, the tests or Lighthouse would say so.
    expect([...DRAWN_ICONS]).toEqual([...PILLAR_ICONS])
  })

  it('labels every name for the Studio dropdown', () => {
    for (const name of PILLAR_ICONS) {
      expect(PILLAR_ICON_LABELS[name], `${name} has no dropdown label`).toBeTruthy()
    }
  })

  it('renders nothing for a name it does not recognise, rather than an empty box', () => {
    const { container } = render(<PillarIcon name="hand-shake" />)
    expect(container.firstChild).toBeNull()
  })

  it('inherits its colour, so the accent stays on a token', () => {
    // ESLint bans colour literals in src/. An icon with a baked-in fill would be a colour
    // the dark re-theme's token swap could not find.
    const { container } = render(<PillarIcon name="supply" />)
    const svg = container.querySelector('svg')!
    expect(svg.getAttribute('stroke')).toBe('currentColor')
    expect(svg.getAttribute('aria-hidden')).toBe('true')
  })
})

describe('StrategyPillars', () => {
  const PILLARS = [
    { icon: 'resilience', eyebrow: 'Demand', title: 'Climate-resilient', body: 'Water is abundant.' },
    { icon: 'diversified', eyebrow: 'Demand', title: 'No single sector', body: 'Employment spreads.' },
    { icon: 'supply', eyebrow: 'Supply', title: 'Supply-constrained', body: 'Sites are finite.' },
    { icon: 'partnership', eyebrow: 'Execution', title: 'Relationships', body: 'Village boards.' },
  ]

  it('renders one card per pillar, heading and body included', () => {
    render(<StrategyPillars pillars={PILLARS} />)
    for (const p of PILLARS) {
      expect(screen.getByText(p.title)).toBeInTheDocument()
      expect(screen.getByText(p.body)).toBeInTheDocument()
    }
    expect(screen.getAllByRole('heading', { level: 3 })).toHaveLength(4)
  })

  it('carries the legible teal on the icon badge, not the accent', () => {
    // A 20px glyph at strokeWidth 1.5 presents as a hairline, so it falls on the
    // small-text side of the rule in src/lib/tokens.ts — and on a 10%-teal ground the
    // accent is worse there, not better.
    const { container } = render(<StrategyPillars pillars={PILLARS} />)
    const badge = container.querySelector('svg')!.parentElement!
    expect(badge.className).toContain('text-teal-text')
    expect(badge.className).not.toMatch(/text-teal(?!-text)/)
  })

  it('still renders a card whose icon is empty', () => {
    render(<StrategyPillars pillars={[{ eyebrow: 'Demand', title: 'No icon', body: 'Words.' }]} />)
    expect(screen.getByText('No icon')).toBeInTheDocument()
  })

  it('uses no physical-direction utility, so Phase 2 mirrors it for free', () => {
    const { container } = render(<StrategyPillars pillars={PILLARS} />)
    for (const el of container.querySelectorAll<HTMLElement>('*')) {
      if (typeof el.className !== 'string') continue
      expect(el.className, el.className).not.toMatch(PHYSICAL)
    }
  })
})
