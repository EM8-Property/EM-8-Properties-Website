import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { CtaBand } from '@/components/ui/CtaBand'

const PHYSICAL = /\b(?:[a-z0-9-]+:)*-?(?:ml|mr|pl|pr|border-l|border-r|text-left|text-right)-?\b/
const CAL = 'https://calendar.app.google/mJNPKxULTGh8NMTq9'

/**
 * The homepage ran hero → stats → factors → portfolio and then stopped, straight into the
 * footer disclaimer. Spec §3 specifies "… → portfolio → partners → CTA"; the closing CTA
 * was never built. Property pages were worse — the only outbound link on one was
 * Leaflet's own attribution, on the page most likely to be reached from LinkedIn.
 *
 * So a visitor who read everything was offered no way to start a conversation. This band
 * is the fix, and it is shared rather than page-specific so the two entry points cannot
 * drift apart.
 */
describe('CtaBand', () => {
  it('captures an email address', () => {
    render(<CtaBand bookACallUrl={CAL} />)
    const input = document.querySelector('input[type="email"]') as HTMLInputElement
    expect(input).not.toBeNull()
    expect(input.required).toBe(true)
  })

  it('posts as a newsletter lead, the low-friction ask', () => {
    render(<CtaBand bookACallUrl={CAL} />)
    // The whole point of this band is that it does not demand a name, a check size, or an
    // accreditation declaration before someone will give an address.
    expect(document.querySelector('input[name="firstName"]')).toBeNull()
    expect(document.querySelector('input[name="checkSize"]')).toBeNull()
    expect(document.querySelector('input[name="accreditedConfirmed"]')).toBeNull()
  })

  it('offers the scheduling link, opening off-site safely', () => {
    render(<CtaBand bookACallUrl={CAL} />)
    const link = screen.getByRole('link', { name: /book a call/i })
    expect(link.getAttribute('href')).toBe(CAL)
    expect(link.getAttribute('target')).toBe('_blank')
    expect(link.getAttribute('rel')).toContain('noopener')
  })

  it('degrades gracefully when no scheduling link is configured', () => {
    // bookACallUrl is optional content in Sanity. A missing one must not render a dead
    // button — the email capture still stands on its own.
    render(<CtaBand />)
    expect(screen.queryByRole('link', { name: /book a call/i })).toBeNull()
    expect(document.querySelector('input[type="email"]')).not.toBeNull()
  })

  it('makes no promise about returns', () => {
    const { container } = render(<CtaBand bookACallUrl={CAL} />)
    expect(container.textContent).not.toMatch(/guarantee|will return|assured|risk-free/i)
  })

  it('uses no physical-direction utilities', () => {
    const { container } = render(<CtaBand bookACallUrl={CAL} />)
    expect(container.innerHTML).not.toMatch(PHYSICAL)
  })
})
