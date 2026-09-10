import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { CurrentOfferings } from '@/components/property/CurrentOfferings'
import type { PropertyCardData } from '@/components/property/PropertyCard'

const PHYSICAL = /\b(?:[a-z0-9-]+:)*-?(?:ml|mr|pl|pr|border-l|border-r|text-left|text-right)-?\b/

const heading = {
  eyebrow: 'Open Now',
  title: 'Currently accepting commitments',
  intro: 'Offered to verified accredited investors.',
}

const offerings: PropertyCardData[] = [
  {
    title: 'Boulevard at Central Station',
    slug: 'boulevard-at-central-station',
    assetClass: 'mixed-use',
    status: 'lease-up',
    city: 'Tinley Park',
    state: 'IL',
  },
]

describe('CurrentOfferings', () => {
  // Spec §6: a section with nothing in it renders nothing -- no heading, no empty grid,
  // no wrapper div, no stray padding. Today exactly one property is publicly offered; the
  // section must hold none the day that one closes.
  it('renders nothing at all when there are no offerings', () => {
    const { container } = render(<CurrentOfferings heading={heading} offerings={[]} />)
    expect(container.firstChild).toBeNull()
    expect(container.innerHTML).toBe('')
  })

  // The component owns its own measure wrapper -- callers render it unconditionally and
  // never re-derive this emptiness check at the call site (the exact duplication a bare
  // `pt-14` gap once slipped through).
  it('renders the heading and one card for one offering, inside its own wrapper', () => {
    const { container } = render(<CurrentOfferings heading={heading} offerings={offerings} />)
    expect(screen.getByText('Currently accepting commitments')).toBeDefined()
    expect(screen.getByText('Boulevard at Central Station')).toBeDefined()
    const wrapper = container.firstElementChild
    expect(wrapper?.tagName).toBe('DIV')
    expect(wrapper?.className).toMatch(/\bmx-auto\b/)
    expect(wrapper?.className).toContain('max-w-[1200px]')
    expect(wrapper?.className).toMatch(/\bpt-14\b/)
  })

  // GROQ projects `heading { eyebrow, title, intro }` into a truthy object even when every
  // field inside is null, so a shallow truthiness check on the parent passes a half-filled
  // heading straight through and renders an empty heading. This pins the `title` leaf
  // check instead, even though offerings exist. No wrapper div ships either -- a bare
  // `pt-14` gap above the filters is the exact regression this guards.
  it('renders nothing when the heading has no title, even though offerings exist', () => {
    const { container } = render(
      <CurrentOfferings
        heading={{ eyebrow: null, title: null, intro: null }}
        offerings={offerings}
      />,
    )
    expect(container.firstChild).toBeNull()
    expect(container.innerHTML).toBe('')
  })

  it('renders nothing when the heading is entirely absent, even though offerings exist', () => {
    const { container } = render(<CurrentOfferings heading={null} offerings={offerings} />)
    expect(container.firstChild).toBeNull()
    expect(container.innerHTML).toBe('')
  })

  it('uses no physical-direction utilities', () => {
    const { container } = render(<CurrentOfferings heading={heading} offerings={offerings} />)
    expect(container.innerHTML).not.toMatch(PHYSICAL)
  })
})
