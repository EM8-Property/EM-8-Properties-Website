import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { SiteHeader } from '@/components/layout/SiteHeader'
import type { NavLabels } from '@/lib/navigation'

/**
 * The phone header, rewritten for spec §5.
 *
 * What this file used to pin: one flex row, a hamburger, and a nav that was `hidden` until
 * tapped. That shipped because the header before it had no responsive behaviour at all and
 * painted "About", "Investor Login" and "Get Started" past the right edge — a real fix, and
 * the reason the render-once-reveal-with-CSS pattern is still here.
 *
 * What replaced it, and why: Etamar reviewed the site on a phone and reported that the nav
 * was empty. It was not — every link was one tap away inside the panel — but a header
 * reading `EM8 Properties · Menu` is indistinguishable from a site with no navigation.
 * Hunter's decision of 2026-09-08: the items are right and they have to be visible.
 *
 * So the hamburger is gone. There is nothing left for it to hold: the four parents are in
 * the bar and their children are in their own panels, each with its own disclosure.
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

const props = { agoraUrl: 'https://x.test', cta: CTA, labels: LABELS }

describe('the phone header', () => {
  it('shows all four nav parents without a tap', () => {
    /*
     * The assertion that answers the actual feedback. Every one of these is in the
     * document and none of them is behind a disclosure — which is the whole difference
     * between this header and the one that prompted "add case studies and insights to the
     * upper bar" for links that were already there.
     */
    render(<SiteHeader {...props} />)
    expect(screen.getByRole('button', { name: /about us/i })).toBeDefined()
    expect(screen.getByRole('link', { name: 'Strategy' })).toBeDefined()
    expect(screen.getByRole('link', { name: 'Portfolio' })).toBeDefined()
    expect(screen.getByRole('link', { name: 'Insights' })).toBeDefined()
  })

  it('offers no hamburger at all', () => {
    // Not "hides it on desktop" — it is gone. A menu button beside a visible nav is a
    // control with nothing behind it, and it is the thing that made the nav look empty.
    render(<SiteHeader {...props} />)
    expect(screen.queryByRole('button', { name: /^menu$/i })).toBeNull()
  })

  it('puts the nav on its own row from the phone up to the md breakpoint', () => {
    /*
     * Two rows rather than one because the wordmark, Investor Login and the CTA already
     * fill a 390px row between them. `basis-full` is what forces the break; `md:basis-auto`
     * is what returns the header to a single row on a desktop, where it has always been
     * one.
     */
    const { container } = render(<SiteHeader {...props} />)
    const nav = container.querySelector('#site-nav')!
    expect(nav.className).toContain('basis-full')
    expect(nav.className).toContain('md:basis-auto')
    // And it is never hidden. This is the assertion that fails if someone reinstates a
    // breakpoint-gated `hidden`, which is how this header looked empty in the first place.
    expect(nav.className).not.toMatch(/\bhidden\b/)
  })

  it('keeps Investor Login and the CTA reachable on a phone', () => {
    /*
     * §5's sketch of the phone header shows only the wordmark and Invest With Us on row
     * one, and omits Investor Login. Dropping it entirely would re-open the exact defect
     * the mobile nav work closed — "the primary CTA and the investor portal were both
     * mobile-inaccessible" — so it is still one node in the tree here, findable by role and
     * name regardless of viewport.
     *
     * It is not a plain row-one link any more, though. Step 6's measurement found that
     * wordmark + Investor Login + the CTA measured 366px of content against 342px of
     * content width at 390px wide — `flex-wrap`'s exact third-row case, where two flex
     * children that do not fit together move to their own lines. Per §5's own fallback for
     * that shape, Investor Login moved behind a small button below `md`; `md:flex`
     * overrides that unconditionally from `md` up, so nothing changed on a desktop. This
     * unit test cannot see that, because jsdom does not evaluate the stylesheet that makes
     * the class conditional — see the E2E test in site.spec.ts for the assertion that does.
     */
    render(<SiteHeader {...props} />)
    expect(screen.getByRole('link', { name: /investor login/i })).toBeDefined()
    expect(screen.getByRole('link', { name: 'Invest With Us' })).toBeDefined()
  })

  it('renders every destination exactly once, panels included', () => {
    /*
     * The duplicate-DOM regression guard, kept verbatim from the file this replaces and
     * now covering nine labels instead of five. A second copy of the nav for a second
     * breakpoint would put two nodes with the same accessible name in the tree, break
     * `getByRole` for every consumer, and make the nav ambiguous to a screen reader.
     *
     * getAllBy plus a length assertion rather than getBy, because getBy throws on a
     * duplicate before it can be asserted on.
     */
    render(<SiteHeader {...props} />)
    for (const name of [
      'About EM8',
      'Why EM8',
      'Our Team',
      'Why Midwest',
      'Partners',
      'Portfolio',
      'Insights',
      'Investor Login',
      CTA.label,
    ]) {
      expect(screen.getAllByRole('link', { name, hidden: true }), name).toHaveLength(1)
    }
    // Strategy appears twice on purpose and with two different accessible names — the bar
    // link and the panel's first child, which §5 requires so the destination survives a
    // tap on the parent. Both point at the same place.
    expect(
      screen
        .getAllByRole('link', { hidden: true })
        .filter((a) => a.getAttribute('href') === '/strategy'),
    ).toHaveLength(2)
  })
})
