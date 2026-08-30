import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { FactRail } from '@/components/property/FactRail'

const PHYSICAL = /\b(?:[a-z0-9-]+:)*-?(?:ml|mr|pl|pr|border-l|border-r|text-left|text-right)-?\b/

/** Words that state a return as a promise. Compliance rule, not style. */
const PROMISSORY = /\b(guaranteed|will return|assured|risk-free|no risk)\b/i

const p = {
  unitCount: 66,
  yearBuilt: 2021,
  walkMinutes: 2,
  metraStation: 'Tinley Park',
  squareFeet: undefined,
  publiclyOffered: false,
}

describe('FactRail', () => {
  it('gives the Metra walk the same weight as unit count', () => {
    render(<FactRail property={p} />)
    expect(screen.getByText('66')).toBeDefined()
    expect(screen.getByText('2 min')).toBeDefined()
    expect(screen.getByText(/Walk to Metra/i)).toBeDefined()
  })

  it('hides the offering block when publiclyOffered is false', () => {
    render(<FactRail property={p} />)
    expect(screen.queryByText(/deal room/i)).toBeNull()
  })

  it('shows the offering block only for a 506(c) property', () => {
    render(<FactRail property={{ ...p, publiclyOffered: true }} />)
    expect(screen.getByText(/deal room/i)).toBeDefined()
  })

  it('never phrases the offering as a promised return', () => {
    const { container } = render(<FactRail property={{ ...p, publiclyOffered: true }} />)
    expect(container.textContent ?? '').not.toMatch(PROMISSORY)
  })

  it('omits facts that have no value rather than rendering an empty cell', () => {
    render(<FactRail property={{ publiclyOffered: false }} />)
    expect(screen.queryByText('Units')).toBeNull()
    expect(screen.queryByText(/Walk to Metra/i)).toBeNull()
  })

  it('renders the walk fact only when both minutes and station are present', () => {
    render(<FactRail property={{ walkMinutes: 4, publiclyOffered: false }} />)
    expect(screen.queryByText(/Walk to Metra/i)).toBeNull()
  })

  it('uses no physical-direction utilities', () => {
    const { container } = render(<FactRail property={{ ...p, publiclyOffered: true }} />)
    expect(container.innerHTML).not.toMatch(PHYSICAL)
  })
})

describe('FactRail unit mix and transit scores', () => {
  it('breaks out retail units as their own fact rather than folding them into units', () => {
    render(<FactRail property={{ ...p, unitCount: 66, retailUnitCount: 5 }} />)
    expect(screen.getByText('66')).toBeDefined()
    expect(screen.getByText(/Residential/i)).toBeDefined()
    expect(screen.getByText('5')).toBeDefined()
    expect(screen.getByText(/Retail/i)).toBeDefined()
  })

  it('labels the count "Units" when the asset has no retail', () => {
    render(<FactRail property={{ ...p, unitCount: 40, retailUnitCount: null }} />)
    expect(screen.getByText(/^Units$/i)).toBeDefined()
    expect(screen.queryByText(/Retail/i)).toBeNull()
  })

  it('shows Walk Score and Transit Score when they are known', () => {
    render(<FactRail property={{ ...p, walkScore: 71, transitScore: 48 }} />)
    expect(screen.getByText('71')).toBeDefined()
    expect(screen.getByText(/Walk Score/i)).toBeDefined()
    expect(screen.getByText('48')).toBeDefined()
    expect(screen.getByText(/Transit Score/i)).toBeDefined()
  })

  it('omits the score tiles entirely when they are unknown', () => {
    // They come from a third-party API that needs a key. An absent score must render as
    // nothing at all, never as 0 — a Walk Score of 0 is a real and very different claim.
    render(<FactRail property={{ ...p, walkScore: null, transitScore: undefined }} />)
    expect(screen.queryByText(/Walk Score/i)).toBeNull()
    expect(screen.queryByText(/Transit Score/i)).toBeNull()
  })
})
