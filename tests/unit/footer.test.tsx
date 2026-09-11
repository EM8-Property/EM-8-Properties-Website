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
const LABELS = {
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

const props = {
  disclaimer: 'Past performance is not indicative of future results.',
  contactEmail: 'info@em-8.com',
  labels: LABELS,
  investorsLabel: 'Investors',
}

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
    for (const label of ['Portfolio', 'Strategy', 'Insights', 'Partners', 'About Us', 'Investors']) {
      expect(screen.getByRole('link', { name: label })).toBeDefined()
    }
  })

  it('takes its words from the same navLabels the header reads', () => {
    /*
     * The defect this closes. These labels used to be literals in the component, so
     * renaming `navLabels.portfolio` in the Studio changed the header and left the footer
     * saying the old word, with nothing in the build, the tests or Lighthouse to catch the
     * disagreement.
     *
     * The DESTINATIONS are still literals, which is what spec §5 actually asks for — "the
     * panel must not be the only route to a page" — and `navigation.test.ts` still joins
     * them to `NAV_TREE` in both directions.
     */
    render(<SiteFooter {...props} labels={{ ...LABELS, portfolio: 'Our Assets' }} />)
    expect(screen.getByRole('link', { name: 'Our Assets' }).getAttribute('href')).toBe('/portfolio')
    expect(screen.queryByRole('link', { name: 'Portfolio' })).toBeNull()
  })

  it('labels the investors link from its own leaf, since the nav tree has no word for it', () => {
    // /investors is reached from the header's own button rather than from NAV_TREE, so a
    // navLabels leaf for it would break the join navigation.test.ts keeps between NAV_KEYS
    // and the required-content list.
    render(<SiteFooter {...props} investorsLabel="Invest With Us" />)
    expect(screen.getByRole('link', { name: 'Invest With Us' }).getAttribute('href')).toBe(
      '/investors',
    )
  })

  it('uses no physical-direction utilities', () => {
    const { container } = render(<SiteFooter {...props} />)
    expect(container.innerHTML).not.toMatch(PHYSICAL)
  })
})
