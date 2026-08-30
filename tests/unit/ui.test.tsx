import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Eyebrow } from '@/components/ui/Eyebrow'
import { Chip } from '@/components/ui/Chip'
import { StatBand } from '@/components/ui/StatBand'
import { SectionHeading } from '@/components/ui/SectionHeading'
import { Card } from '@/components/ui/Card'

/** Physical-direction utilities. Phase 2 mirrors this layout for Hebrew. */
const PHYSICAL = /\b(?:[a-z0-9-]+:)*-?(?:ml|mr|pl|pr|border-l|border-r|text-left|text-right)-?\b/

describe('Eyebrow', () => {
  it('renders uppercase with the accessible teal, not the accent teal', () => {
    const { container } = render(<Eyebrow>Portfolio</Eyebrow>)
    const el = container.firstChild as HTMLElement
    expect(el.className).toContain('text-teal-text')
    expect(el.className).toContain('uppercase')
  })

  it('never uses the accent teal, which fails contrast at this size', () => {
    // Eyebrows render at 10px. text-teal would be ~2.2:1 on white.
    // The negative lookahead matters: \btext-teal\b also matches inside text-teal-text,
    // because \b sits between the "l" and the "-".
    const { container } = render(<Eyebrow>Portfolio</Eyebrow>)
    expect((container.firstChild as HTMLElement).className).not.toMatch(/text-teal(?!-text)/)
  })
})

describe('Chip', () => {
  it('colours a sold chip with the neutral status colour', () => {
    const { container } = render(<Chip kind="sold" />)
    expect((container.firstChild as HTMLElement).style.backgroundColor).toBe('rgb(96, 125, 139)')
  })

  it('renders a readable label rather than the raw slug', () => {
    render(<Chip kind="mixed-use" />)
    expect(screen.getByText('Mixed-Use')).toBeDefined()
  })

  it('falls back to the slug rather than rendering nothing for an unknown kind', () => {
    render(<Chip kind="brand-new-asset-class" />)
    expect(screen.getByText('brand-new-asset-class')).toBeDefined()
  })
})

describe('StatBand', () => {
  it('renders every stat with its figure and label', () => {
    render(<StatBand stats={[{ figure: '$100M+', label: 'Assets Under Management' }]} />)
    expect(screen.getByText('$100M+')).toBeDefined()
    expect(screen.getByText('Assets Under Management')).toBeDefined()
  })

  it('uses logical padding so RTL mirrors correctly in Phase 2', () => {
    const { container } = render(<StatBand stats={[{ figure: '1', label: 'x' }]} />)
    expect(container.innerHTML).not.toMatch(PHYSICAL)
  })

  it('stacks on small screens instead of crushing five stats into one row', () => {
    // Five inline grid columns on a 375px viewport gives ~75px each. The band must
    // start at two columns and only widen at larger breakpoints.
    const five = Array.from({ length: 5 }, (_, i) => ({ figure: String(i), label: `l${i}` }))
    const { container } = render(<StatBand stats={five} />)
    const band = container.firstChild as HTMLElement
    expect(band.className).toContain('grid-cols-2')
    expect(band.className).toMatch(/(sm|md|lg):/)
  })
})

describe('SectionHeading', () => {
  it('omits the intro paragraph entirely when none is given', () => {
    const { container } = render(<SectionHeading eyebrow="Portfolio" title="Ten assets" />)
    expect(container.querySelectorAll('p')).toHaveLength(1) // the eyebrow only
  })
})

describe('shared primitives', () => {
  it('use no physical-direction utilities', () => {
    const { container } = render(
      <div>
        <Eyebrow>x</Eyebrow>
        <Chip kind="sold" />
        <SectionHeading eyebrow="a" title="b" intro="c" />
        <Card>inner</Card>
      </div>,
    )
    expect(container.innerHTML).not.toMatch(PHYSICAL)
  })
})
