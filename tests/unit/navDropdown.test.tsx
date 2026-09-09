import { describe, it, expect, vi } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { NavDropdown } from '@/components/layout/NavDropdown'
import { NAV_TREE } from '@/lib/navigation'
import type { NavLabels } from '@/lib/navigation'

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

const aboutUs = NAV_TREE.find((n) => n.key === 'aboutUs')!
const strategy = NAV_TREE.find((n) => n.key === 'strategy')!

const PHYSICAL = /\b(?:[a-z0-9-]+:)*-?(?:ml|mr|pl|pr|border-l|border-r|text-left|text-right)-?\b/

describe('NavDropdown, a parent with no destination', () => {
  it('renders the label from Sanity, never a literal of its own', () => {
    /*
     * The test that fails if a string goes back into the JSX, which is the whole point of
     * Hunter's decision to move these into the CMS. Rendering the real label would pass
     * against a component that ignores the prop and hardcodes the same two words, so this
     * renders different copy and asserts the seeded wording is absent.
     */
    render(
      <NavDropdown node={aboutUs} labels={{ ...LABELS, aboutUs: 'Who We Are' }} />,
    )
    expect(screen.getByRole('button', { name: /who we are/i })).toBeDefined()
    expect(screen.queryByRole('button', { name: /^about us/i })).toBeNull()
  })

  it('starts collapsed, and says so', () => {
    render(<NavDropdown node={aboutUs} labels={LABELS} />)
    const toggle = screen.getByRole('button', { name: /about us/i })
    expect(toggle.getAttribute('aria-expanded')).toBe('false')
    expect(toggle.getAttribute('aria-controls')).toBe('nav-panel-aboutUs')
  })

  it('points aria-controls at the panel that actually exists', () => {
    /*
     * An aria-controls naming no element is worse than none: a screen reader announces a
     * relationship and then cannot follow it. This is the assertion that catches the id
     * and the attribute drifting apart, which is invisible in a browser.
     */
    const { container } = render(<NavDropdown node={aboutUs} labels={LABELS} />)
    const toggle = screen.getByRole('button', { name: /about us/i })
    const id = toggle.getAttribute('aria-controls')!
    expect(container.querySelector(`#${id}`), `no element with id ${id}`).not.toBeNull()
  })

  it('opens on click and closes again', async () => {
    const user = userEvent.setup()
    render(<NavDropdown node={aboutUs} labels={LABELS} />)
    const toggle = screen.getByRole('button', { name: /about us/i })

    await user.click(toggle)
    expect(toggle.getAttribute('aria-expanded')).toBe('true')
    await user.click(toggle)
    expect(toggle.getAttribute('aria-expanded')).toBe('false')
  })

  it('opens on a touch tap, which is the case that made this a component', async () => {
    /*
     * §5: "Touch: opens on tap; a parent that is also a link must not navigate on that
     * first tap." About Us sidesteps that by being a button — so what this asserts is the
     * other half: a tap has to be enough. A hover-only panel is unreachable on a phone,
     * and a phone is the review surface (§11).
     *
     * userEvent's pointer API with a touch pointer, rather than `click`, so this fails if
     * the panel is ever moved onto a CSS :hover that a touch device cannot produce.
     */
    const user = userEvent.setup()
    render(<NavDropdown node={aboutUs} labels={LABELS} />)
    const toggle = screen.getByRole('button', { name: /about us/i })

    await user.pointer({ target: toggle, keys: '[TouchA]' })
    expect(toggle.getAttribute('aria-expanded')).toBe('true')
  })

  it('renders its three children as links once the panel is open', async () => {
    const user = userEvent.setup()
    render(<NavDropdown node={aboutUs} labels={LABELS} />)
    await user.click(screen.getByRole('button', { name: /about us/i }))

    expect(screen.getByRole('link', { name: 'About EM8' }).getAttribute('href')).toBe('/about')
    expect(screen.getByRole('link', { name: 'Why EM8' }).getAttribute('href')).toBe(
      '/about#why-em8',
    )
    expect(screen.getByRole('link', { name: 'Our Team' }).getAttribute('href')).toBe(
      '/about#team',
    )
  })

  it('keeps the children in the tree while collapsed, hidden rather than unmounted', () => {
    /*
     * The pattern the header has used since the mobile nav was fixed: render once, reveal
     * with CSS. A second copy for a second breakpoint puts two nodes with the same
     * accessible name in the tree, which breaks `getByRole` for every consumer and makes
     * the nav ambiguous to a screen reader — `mobileNav.test.tsx` was written for exactly
     * that regression.
     *
     * `hidden` rather than `display: none` in a class: `[hidden]` keeps the subtree out of
     * the accessibility tree AND out of the tab order, where a class can be overridden by
     * a later rule and silently leave focusable links inside a closed panel.
     */
    const { container } = render(<NavDropdown node={aboutUs} labels={LABELS} />)
    const panel = container.querySelector('#nav-panel-aboutUs')!
    expect(panel).not.toBeNull()
    expect(panel.hasAttribute('hidden')).toBe(true)
    expect(panel.querySelectorAll('a')).toHaveLength(3)
  })

  it('closes on Escape and returns focus to the parent', async () => {
    // §5, verbatim: "Escape closes and returns focus to the parent." Without the second
    // half, focus is left on a link inside a panel that is no longer there, and the next
    // Tab starts from nowhere.
    const user = userEvent.setup()
    render(<NavDropdown node={aboutUs} labels={LABELS} />)
    const toggle = screen.getByRole('button', { name: /about us/i })

    await user.click(toggle)
    await user.tab()
    expect(document.activeElement).toBe(screen.getByRole('link', { name: 'About EM8' }))

    await user.keyboard('{Escape}')
    expect(toggle.getAttribute('aria-expanded')).toBe('false')
    expect(document.activeElement).toBe(toggle)
  })

  it('moves focus down and up the panel with the arrow keys', async () => {
    // §5: "Arrow keys move within the panel." ArrowDown on the closed toggle opens it and
    // lands on the first child, so a keyboard user reaches the panel in one key rather
    // than opening and then tabbing.
    const user = userEvent.setup()
    render(<NavDropdown node={aboutUs} labels={LABELS} />)
    const toggle = screen.getByRole('button', { name: /about us/i })
    toggle.focus()

    await user.keyboard('{ArrowDown}')
    expect(toggle.getAttribute('aria-expanded')).toBe('true')
    expect(document.activeElement).toBe(screen.getByRole('link', { name: 'About EM8' }))

    await user.keyboard('{ArrowDown}')
    expect(document.activeElement).toBe(screen.getByRole('link', { name: 'Why EM8' }))

    await user.keyboard('{ArrowUp}')
    expect(document.activeElement).toBe(screen.getByRole('link', { name: 'About EM8' }))
  })

  it('lets Tab leave the panel rather than trapping focus in it', async () => {
    /*
     * §5: "Tab leaves it." A menu is not a dialog. Trapping focus in a navigation panel
     * is a worse failure than not opening it, because there is no visible way out — so
     * this asserts the absence of a trap, which is the kind of thing added by accident
     * while making Escape work.
     */
    const user = userEvent.setup()
    render(
      <>
        <NavDropdown node={aboutUs} labels={LABELS} />
        <a href="/after">After</a>
      </>,
    )
    await user.click(screen.getByRole('button', { name: /about us/i }))
    for (let i = 0; i < 4; i++) await user.tab()
    expect(document.activeElement).toBe(screen.getByRole('link', { name: 'After' }))
  })

  it('closes when a child is followed, and reports it', async () => {
    // The panel must not stay open over the page the reader just asked for.
    const user = userEvent.setup()
    const onNavigate = vi.fn()
    render(<NavDropdown node={aboutUs} labels={LABELS} onNavigate={onNavigate} />)

    await user.click(screen.getByRole('button', { name: /about us/i }))
    await user.click(screen.getByRole('link', { name: 'Our Team' }))
    expect(screen.getByRole('button', { name: /about us/i }).getAttribute('aria-expanded')).toBe(
      'false',
    )
    expect(onNavigate).toHaveBeenCalled()
  })

  it('drops a child named in hiddenKeys, and its panel keeps the rest', async () => {
    /*
     * How Task 8 removes "Why EM8" while that section has no body. §5: "A section whose
     * body is absent renders nothing, and its nav entry goes with it." On the day this
     * merges the section IS empty, so this is the live behaviour rather than a hypothetical.
     *
     * Opened first, deliberately, unlike the brief's original draft of this test: the panel
     * carries `hidden` while collapsed (proven above and falsified in Step 5), and a `hidden`
     * subtree is excluded from `getByRole` by design — that is the whole point of the
     * attribute. A `getByRole` query against a closed panel would fail regardless of
     * `hiddenKeys`, which is not what this test is checking, so it opens the panel the same
     * way the other interaction tests do before asserting on its contents.
     */
    const user = userEvent.setup()
    const { container } = render(
      <NavDropdown node={aboutUs} labels={LABELS} hiddenKeys={['whyEm8']} />,
    )
    await user.click(screen.getByRole('button', { name: /about us/i }))
    expect(container.querySelector('#nav-panel-aboutUs')!.querySelectorAll('a')).toHaveLength(2)
    expect(screen.queryByRole('link', { name: 'Why EM8' })).toBeNull()
    expect(screen.getByRole('link', { name: 'Our Team' })).toBeDefined()
  })

  it('uses no physical-direction utilities', () => {
    const { container } = render(<NavDropdown node={aboutUs} labels={LABELS} />)
    expect(container.innerHTML).not.toMatch(PHYSICAL)
  })
})

describe('NavDropdown, a parent that is also a link', () => {
  it('navigates from the label and opens from a separate control', async () => {
    /*
     * The awkward case §5 names, resolved. Taken literally — one element that is both a
     * link and a disclosure — a tap navigates and the panel never opens, which strands
     * /partners behind the footer on a phone. So the label stays a link and the ▾ beside
     * it is its own button.
     */
    const user = userEvent.setup()
    render(<NavDropdown node={strategy} labels={LABELS} />)

    const label = screen.getByRole('link', { name: 'Strategy' })
    expect(label.getAttribute('href')).toBe('/strategy')

    const toggle = screen.getByRole('button', { name: /open the strategy menu/i })
    expect(toggle.getAttribute('aria-expanded')).toBe('false')
    await user.pointer({ target: toggle, keys: '[TouchA]' })
    expect(toggle.getAttribute('aria-expanded')).toBe('true')
  })

  it('names the disclosure control for a screen reader', () => {
    // A button whose only content is "▾" has no accessible name at all. Its label has to
    // say which menu it opens, because there are two of them in the bar.
    render(<NavDropdown node={strategy} labels={{ ...LABELS, strategy: 'Our Plan' }} />)
    expect(screen.getByRole('button', { name: 'Open the Our Plan menu' })).toBeDefined()
  })

  it('repeats /strategy as the panel’s first child', async () => {
    // §5's mitigation, rendered: the destination is reachable from inside the panel too,
    // so it does not depend on how the parent behaves under a tap.
    const user = userEvent.setup()
    render(<NavDropdown node={strategy} labels={LABELS} />)
    await user.click(screen.getByRole('button', { name: /open the strategy menu/i }))

    const links = screen.getAllByRole('link').map((a) => [a.textContent, a.getAttribute('href')])
    expect(links).toEqual([
      ['Strategy', '/strategy'],
      ['Why Midwest', '/strategy'],
      ['Partners', '/partners'],
    ])
  })
})
