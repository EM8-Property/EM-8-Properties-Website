import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { SiteHeader } from '@/components/layout/SiteHeader'

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

// SiteFooter has its own suite in footer.test.tsx, which covers the navigation and
// contact address added after this file was written.
