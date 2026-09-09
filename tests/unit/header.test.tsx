import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { SiteHeader } from '@/components/layout/SiteHeader'
import type { NavLabels } from '@/lib/navigation'

const PHYSICAL = /\b(?:[a-z0-9-]+:)*-?(?:ml|mr|pl|pr|border-l|border-r|text-left|text-right)-?\b/

/**
 * The header's only editable label, and its only conversion path — which is what makes
 * it the copy most likely to be reworded. Investor Login stays a literal on purpose; see
 * `headerCta` in src/sanity/schema/siteSettings.ts. The nav labels used to be literals too
 * but are now `siteSettings.navLabels`, required leaf by leaf.
 */
const CTA = { label: 'Invest With Us', href: '/investors' }

const LABELS: NavLabels = {
  aboutUs: 'About Us',
  aboutEm8: 'About EM8',
  whyEm8: 'Why EM8',
  ourTeam: 'Our Team',
  strategy: 'Strategy',
  whyMidwest: 'Why Midwest',
  partners: 'Partners',
  portfolio: 'Portfolio',
  insights: 'Insights',
}

const props = { agoraUrl: 'https://em8.agorareal.com', cta: CTA, labels: LABELS }

describe('SiteHeader', () => {
  it('links Investor Login straight to Agora, opening off-site', () => {
    render(<SiteHeader {...props} />)
    const link = screen.getByRole('link', { name: /investor login/i })
    expect(link.getAttribute('href')).toBe('https://em8.agorareal.com')
    expect(link.getAttribute('rel')).toContain('noopener')
  })

  it('exposes every primary route', () => {
    render(<SiteHeader {...props} />)
    // About Us navigates to /about now (Hunter's call, 2026-09-09), the same shape as
    // Strategy: a link for the label plus a separately-named disclosure button for its
    // panel. Its three children are in that panel, which mobileNav.test.tsx covers.
    expect(screen.getByRole('link', { name: 'About Us' })).toBeDefined()
    expect(screen.getByRole('button', { name: 'Open the About Us menu' })).toBeDefined()
    for (const label of ['Strategy', 'Portfolio', 'Insights']) {
      expect(screen.getByRole('link', { name: label })).toBeDefined()
    }
  })

  it('uses no physical-direction utilities', () => {
    const { container } = render(<SiteHeader {...props} />)
    expect(container.innerHTML).not.toMatch(PHYSICAL)
  })

  it('takes its call to action from the CMS, label and destination both', () => {
    render(<SiteHeader {...props} />)
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
    render(
      <SiteHeader
        {...props}
        cta={{ label: 'Talk To Us', href: '/partners' }}
      />,
    )
    expect(screen.getByRole('link', { name: 'Talk To Us' }).getAttribute('href')).toBe('/partners')
    expect(screen.queryByRole('link', { name: /get started/i })).toBeNull()
  })

  it('bakes in no nav label of its own', () => {
    /*
     * The same test `headerCta` has, for the same reason and now over nine more strings.
     * Rendering the real labels would pass just as happily against a component that
     * ignores the prop and hardcodes them, so this renders different copy and asserts the
     * seeded wording is gone.
     */
    render(
      <SiteHeader
        {...props}
        labels={{ ...LABELS, portfolio: 'Our Assets', insights: 'Writing' }}
      />,
    )
    expect(screen.getByRole('link', { name: 'Our Assets' }).getAttribute('href')).toBe(
      '/portfolio',
    )
    expect(screen.getByRole('link', { name: 'Writing' }).getAttribute('href')).toBe('/insights')
    expect(screen.queryByRole('link', { name: 'Portfolio' })).toBeNull()
    expect(screen.queryByRole('link', { name: 'Insights' })).toBeNull()
  })
})

// SiteFooter has its own suite in footer.test.tsx, which covers the navigation and
// contact address added after this file was written.
