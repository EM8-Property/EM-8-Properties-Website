import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { SiteFooter } from '@/components/layout/SiteFooter'

const PHYSICAL = /\b(?:[a-z0-9-]+:)*-?(?:ml|mr|pl|pr|border-l|border-r|text-left|text-right)-?\b/

/**
 * The footer shipped with the disclaimer and a copyright line and nothing else — no
 * navigation, no contact route of any kind. `siteSettings.contactEmail` was queried by
 * the layout and then never rendered anywhere on the site, so the only way to reach EM8
 * was the single form on /investors.
 */
const props = { disclaimer: 'Past performance is not indicative of future results.', contactEmail: 'info@em-8.com' }

describe('SiteFooter', () => {
  it('renders the disclaimer it is given', () => {
    render(<SiteFooter {...props} />)
    expect(screen.getByText(/Past performance is not indicative/)).toBeDefined()
  })

  it('offers a mailto route to the contact address', () => {
    render(<SiteFooter {...props} />)
    const link = screen.getByRole('link', { name: 'info@em-8.com' })
    expect(link.getAttribute('href')).toBe('mailto:info@em-8.com')
  })

  it('takes the address from content rather than hardcoding it', () => {
    // The address moves — hunter@ to info@ was already one such move. It lives in
    // siteSettings so it changes without a deploy.
    render(<SiteFooter {...props} contactEmail="someone@example.org" />)
    expect(screen.getByRole('link', { name: 'someone@example.org' }).getAttribute('href')).toBe(
      'mailto:someone@example.org',
    )
  })

  it('exposes every primary route so the footer is a real second navigation', () => {
    render(<SiteFooter {...props} />)
    for (const label of ['Portfolio', 'Track Record', 'Insights', 'Partners', 'About', 'Investors']) {
      expect(screen.getByRole('link', { name: label })).toBeDefined()
    }
  })

  it('uses no physical-direction utilities', () => {
    const { container } = render(<SiteFooter {...props} />)
    expect(container.innerHTML).not.toMatch(PHYSICAL)
  })
})
