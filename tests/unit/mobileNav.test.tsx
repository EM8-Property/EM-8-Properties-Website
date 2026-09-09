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
    expect(screen.getByRole('link', { name: 'About Us' })).toBeDefined()
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

  it('pins the md:hidden / md:flex pair that keeps Investor Login on the desktop', () => {
    /*
     * The safety property of the whole disclosure, and until this test nothing held it.
     *
     * `md:hidden` on the button and `md:flex` on the link are the entire mechanism by which
     * "the desktop header does not change" is true: from `md` up the button is display:none
     * and the link is display:flex regardless of `accountOpen`. Delete either token and
     * Investor Login disappears from the desktop header — or, worse, both the button and
     * the link render there and two nodes carry the accessible name "Investor Login".
     *
     * Neither failure is visible to any other test in this repo. jsdom does not evaluate
     * the stylesheet, so every `getByRole` in this file finds the link whatever its class
     * says; the desktop E2E test asserted `toHaveAttribute` rather than `toBeVisible`. The
     * pairing could be broken with all 516 unit tests and all 24 E2E tests green, which is
     * why this asserts on the class strings — the one thing jsdom *can* see — and the E2E
     * test now asserts visibility at 1280px, which is the thing jsdom cannot.
     *
     * `md:static` is asserted for a different reason: below `md` the disclosed link is
     * `absolute`, so revealing it cannot change the header's height. `md:static` is what
     * puts it back in flow on a desktop, where row one has always had room for it.
     */
    const { container } = render(<SiteHeader {...props} />)

    const button = container.querySelector('button[aria-controls="investor-login-link"]')!
    expect(button.className).toContain('md:hidden')

    const link = container.querySelector('#investor-login-link')!
    expect(link.className).toContain('md:flex')
    expect(link.className).toContain('md:static')
    // And out of flow below `md`, which is the Critical fix this pairing sits on top of.
    expect(link.className).toContain('absolute')
  })

  it('lays the desktop bar out as wordmark, nav, actions', () => {
    /*
     * Source order in the component is wordmark, actions, nav — deliberately, so a screen
     * reader and a keyboard reach the wordmark, then the two actions, then the nav, and so
     * `order-last basis-full` can make the nav row two on a phone.
     *
     * Which means the desktop reading of wordmark, nav, actions is produced entirely by the
     * `md:order-2` / `md:order-3` pair, and getting it wrong is silent: the first version of
     * this header carried `md:order-none` on the nav and nothing on the actions, so all
     * three resolved to `order: 0` and sorted by source order — putting the primary CTA at
     * x=553 in the middle of a 1280px bar and the nav links at x=929 against the right
     * edge. Every test was green, and the comment above the class string claimed the
     * opposite of what it did.
     *
     * The wordmark's implicit `order: 0` sorts before 2 before 3.
     *
     * `md:ms-auto md:me-5` is the other half, and the order pair alone left the docblock on
     * the component false: order fixes the sequence, but the container's `justify-between`
     * then had three children instead of two and spread them, leaving the nav in the middle
     * of the bar (nav x=436, actions x=975 at 1280px) where before this task the nav,
     * Investor Login and the CTA were one cluster against the right edge. `ms-auto` gives
     * the free space to the nav rather than splitting it; `me-5` is the 20px the old single
     * `<nav>`'s `md:gap-5` used to leave between `Insights` and `Investor Login`.
     *
     * Measured at 1280px after both: wordmark x=64, nav x=668 ending at 955, actions x=975,
     * CTA right edge 1216 — the inline end of the 1200px measure (1280 − 64).
     */
    const { container } = render(<SiteHeader {...props} />)
    expect(container.querySelector('#site-nav')!.className).toContain('md:order-2')
    expect(container.querySelector('#header-actions')!.className).toContain('md:order-3')
    expect(container.querySelector('#site-nav')!.className).toContain('md:ms-auto')
    expect(container.querySelector('#site-nav')!.className).toContain('md:me-5')
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
      'About Us',
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
    // /about and /strategy both appear twice on purpose, each with two different
    // accessible names — the bar link and the panel's first child, which §5 requires so
    // the destination survives a tap on the parent. Both instances of each pair point at
    // the same place: About Us / About EM8 to /about, Strategy / Why Midwest to /strategy.
    for (const href of ['/about', '/strategy']) {
      expect(
        screen
          .getAllByRole('link', { hidden: true })
          .filter((a) => a.getAttribute('href') === href),
        href,
      ).toHaveLength(2)
    }
  })

  it('drops the Why EM8 link while that section has no body', () => {
    // The live state on the day this ships, not a hypothetical: §3 lists the copy under
    // "Owed by people". A menu link to an anchor that is not on the page scrolls nowhere.
    render(<SiteHeader {...props} sections={{ whyEm8: false }} />)
    expect(screen.queryByRole('link', { name: 'Why EM8', hidden: true })).toBeNull()
    expect(screen.getByRole('link', { name: 'Our Team', hidden: true })).toBeDefined()
  })

  it('shows it once the section has a body', () => {
    render(<SiteHeader {...props} sections={{ whyEm8: true }} />)
    expect(screen.getByRole('link', { name: 'Why EM8', hidden: true })).toBeDefined()
  })
})
