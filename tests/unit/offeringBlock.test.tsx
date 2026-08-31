import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { OfferingBlock } from '@/components/property/OfferingBlock'

const PHYSICAL = /\b(?:[a-z0-9-]+:)*-?(?:ml|mr|pl|pr|border-l|border-r|text-left|text-right)-?\b/

const OFFERING = {
  summary: 'An 87,762 SF open-air retail center acquired at $51/SF with 50% vacancy.',
  targetIrr: '17.7%',
  targetEquityMultiple: '2.2x',
  targetHoldYears: 7,
  dealRoomUrl: 'https://em-8.acp.agorareal.com/offering',
}

/**
 * The 506(c) gate rendered. `publiclyOffered` decides whether any of this may be shown at
 * all: an offering not filed under 506(c) may not be generally solicited, so the default
 * has to be silence rather than disclosure.
 */
describe('OfferingBlock', () => {
  it('renders nothing when the offering is not public', () => {
    const { container } = render(<OfferingBlock offering={OFFERING} publiclyOffered={false} />)
    expect(container.innerHTML).toBe('')
  })

  it('renders nothing when there is no offering to show', () => {
    const { container } = render(<OfferingBlock offering={null} publiclyOffered />)
    expect(container.innerHTML).toBe('')
  })

  it('shows the underwritten figures when the offering is public', () => {
    render(<OfferingBlock offering={OFFERING} publiclyOffered />)
    expect(screen.getByText('17.7%')).toBeDefined()
    expect(screen.getByText('2.2x')).toBeDefined()
    expect(screen.getByText('7 years')).toBeDefined()
  })

  it('labels every figure as targeted rather than achieved', () => {
    // The compliance rule: targeted / projected / underwritten / estimated / pro forma.
    // A bare "17.7%" next to a realized multiple on /track-record would read as a result.
    const { container } = render(<OfferingBlock offering={OFFERING} publiclyOffered />)
    const text = container.textContent!
    expect(text).toMatch(/targeted/i)
    expect(text).not.toMatch(/guarantee|will return|assured|risk-free/i)
  })

  it('carries a forward-looking caveat', () => {
    const { container } = render(<OfferingBlock offering={OFFERING} publiclyOffered />)
    expect(container.textContent).toMatch(/no assurance|not a prediction|may not be achieved/i)
  })

  it('links to the deal room, where accreditation is actually verified', () => {
    render(<OfferingBlock offering={OFFERING} publiclyOffered />)
    const link = screen.getByRole('link', { name: /deal room/i })
    expect(link.getAttribute('href')).toBe(OFFERING.dealRoomUrl)
    expect(link.getAttribute('rel')).toContain('noopener')
  })

  it('omits figures that have not been supplied rather than showing a blank', () => {
    render(<OfferingBlock offering={{ summary: 'Summary only.' }} publiclyOffered />)
    expect(screen.queryByText(/targeted levered irr/i)).toBeNull()
    expect(screen.getByText('Summary only.')).toBeDefined()
  })

  it('uses no physical-direction utilities', () => {
    const { container } = render(<OfferingBlock offering={OFFERING} publiclyOffered />)
    expect(container.innerHTML).not.toMatch(PHYSICAL)
  })
})
