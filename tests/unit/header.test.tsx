import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { SiteHeader } from '@/components/layout/SiteHeader'
import { SiteFooter } from '@/components/layout/SiteFooter'

const PHYSICAL = /\b(?:[a-z0-9-]+:)*-?(?:ml|mr|pl|pr|border-l|border-r|text-left|text-right)-?\b/

describe('SiteHeader', () => {
  it('links Investor Login straight to Agora, opening off-site', () => {
    render(<SiteHeader agoraUrl="https://em8.agorareal.com" />)
    const link = screen.getByRole('link', { name: /investor login/i })
    expect(link.getAttribute('href')).toBe('https://em8.agorareal.com')
    expect(link.getAttribute('rel')).toContain('noopener')
  })

  it('exposes every primary route', () => {
    render(<SiteHeader agoraUrl="https://x.test" />)
    for (const label of ['Portfolio', 'Track Record', 'Insights', 'Partners', 'About']) {
      expect(screen.getByRole('link', { name: label })).toBeDefined()
    }
  })

  it('uses no physical-direction utilities', () => {
    const { container } = render(<SiteHeader agoraUrl="https://x.test" />)
    expect(container.innerHTML).not.toMatch(PHYSICAL)
  })
})

describe('SiteFooter', () => {
  it('renders the disclaimer it is given', () => {
    render(<SiteFooter disclaimer="Past performance is not indicative of future results." />)
    expect(screen.getByText(/Past performance is not indicative/)).toBeDefined()
  })

  it('uses no physical-direction utilities', () => {
    const { container } = render(<SiteFooter disclaimer="x" />)
    expect(container.innerHTML).not.toMatch(PHYSICAL)
  })
})
