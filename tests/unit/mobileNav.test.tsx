import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { SiteHeader } from '@/components/layout/SiteHeader'

/**
 * The header shipped as a single unwrapped flex row of seven items with no breakpoint and
 * no toggle, so on a phone "About", "Investor Login" and "Get Started" ran off the edge of
 * the screen — the primary call to action and the investor portal, both unreachable.
 *
 * Lighthouse does not catch this: it is not a contrast, tap-target or overflow failure,
 * the elements are simply painted outside the viewport.
 *
 * The links are rendered exactly once and revealed with CSS rather than duplicated into a
 * separate mobile menu. A second copy would put two nodes with the same accessible name in
 * the tree, which breaks `getByRole` for every consumer and makes the nav ambiguous to a
 * screen reader.
 */
const NAV_LABELS = ['Portfolio', 'Track Record', 'Insights', 'Partners', 'About']

/** The header's call to action comes from siteSettings now, so the tests supply one. */
const CTA = { label: 'Invest With Us', href: '/investors' }

describe('SiteHeader on small viewports', () => {
  it('offers a menu button that starts collapsed', () => {
    render(<SiteHeader agoraUrl="https://x.test" cta={CTA} />)
    const button = screen.getByRole('button', { name: /menu/i })
    expect(button.getAttribute('aria-expanded')).toBe('false')
    expect(button.getAttribute('aria-controls')).toBe('site-nav')
  })

  it('expands and collapses on click', async () => {
    const user = userEvent.setup()
    render(<SiteHeader agoraUrl="https://x.test" cta={CTA} />)
    const button = screen.getByRole('button', { name: /menu/i })

    await user.click(button)
    expect(button.getAttribute('aria-expanded')).toBe('true')
    await user.click(button)
    expect(button.getAttribute('aria-expanded')).toBe('false')
  })

  it('hides the nav by default but always shows it from the md breakpoint up', () => {
    const { container } = render(<SiteHeader agoraUrl="https://x.test" cta={CTA} />)
    const nav = container.querySelector('#site-nav')!
    expect(nav.className).toContain('hidden')
    expect(nav.className).toContain('md:flex')
  })

  it('reveals the nav once expanded', async () => {
    const user = userEvent.setup()
    const { container } = render(<SiteHeader agoraUrl="https://x.test" cta={CTA} />)
    await user.click(screen.getByRole('button', { name: /menu/i }))
    const nav = container.querySelector('#site-nav')!
    expect(nav.className).not.toContain('hidden')
  })

  it('keeps the menu button itself off the desktop layout', () => {
    render(<SiteHeader agoraUrl="https://x.test" cta={CTA} />)
    expect(screen.getByRole('button', { name: /menu/i }).className).toContain('md:hidden')
  })

  it('renders every destination exactly once, including the two CTAs', () => {
    render(<SiteHeader agoraUrl="https://x.test" cta={CTA} />)
    for (const label of [...NAV_LABELS, 'Investor Login', CTA.label]) {
      // getAllBy + length assertion rather than getBy: this is the duplicate-DOM
      // regression guard, and getBy would throw before it could be asserted on.
      expect(screen.getAllByRole('link', { name: label })).toHaveLength(1)
    }
  })
})
