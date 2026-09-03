import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { SiteHeader } from '@/components/layout/SiteHeader'

const PHYSICAL = /\b(?:[a-z0-9-]+:)*-?(?:ml|mr|pl|pr|border-l|border-r|text-left|text-right)-?\b/

/**
 * The header's only editable label, and its only conversion path — which is what makes
 * it the copy most likely to be reworded. The nav labels and "Investor Login" stay
 * literals on purpose; see `headerCta` in src/sanity/schema/siteSettings.ts.
 */
const CTA = { label: 'Invest With Us', href: '/investors' }

describe('SiteHeader', () => {
  it('links Investor Login straight to Agora, opening off-site', () => {
    render(<SiteHeader agoraUrl="https://em8.agorareal.com" cta={CTA} />)
    const link = screen.getByRole('link', { name: /investor login/i })
    expect(link.getAttribute('href')).toBe('https://em8.agorareal.com')
    expect(link.getAttribute('rel')).toContain('noopener')
  })

  it('exposes every primary route', () => {
    render(<SiteHeader agoraUrl="https://x.test" cta={CTA} />)
    for (const label of ['Portfolio', 'Track Record', 'Insights', 'Partners', 'About']) {
      expect(screen.getByRole('link', { name: label })).toBeDefined()
    }
  })

  it('uses no physical-direction utilities', () => {
    const { container } = render(<SiteHeader agoraUrl="https://x.test" cta={CTA} />)
    expect(container.innerHTML).not.toMatch(PHYSICAL)
  })

  it('takes its call to action from the CMS, label and destination both', () => {
    render(<SiteHeader agoraUrl="https://x.test" cta={CTA} />)
    const link = screen.getByRole('link', { name: 'Invest With Us' })
    expect(link.getAttribute('href')).toBe('/investors')
  })

  it('bakes in no label of its own', () => {
    /*
     * The assertion above passes just as happily against a component that ignores the
     * prop and hardcodes the same two words, so this renders different copy and asserts
     * the old literal is gone. This is the test that fails if a string goes back in the
     * JSX, which is the whole point of moving it.
     */
    render(<SiteHeader agoraUrl="https://x.test" cta={{ label: 'Talk To Us', href: '/partners' }} />)
    expect(screen.getByRole('link', { name: 'Talk To Us' }).getAttribute('href')).toBe('/partners')
    expect(screen.queryByRole('link', { name: /get started/i })).toBeNull()
  })
})

// SiteFooter has its own suite in footer.test.tsx, which covers the navigation and
// contact address added after this file was written.
