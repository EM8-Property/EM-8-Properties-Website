import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { PropertyCard } from '@/components/property/PropertyCard'

const PHYSICAL = /\b(?:[a-z0-9-]+:)*-?(?:ml|mr|pl|pr|border-l|border-r|text-left|text-right)-?\b/

const base = {
  title: '157 & Cicero',
  slug: '157-and-cicero',
  assetClass: 'mixed-use',
  status: 'stabilized',
  city: 'Oak Forest',
  state: 'IL',
  unitCount: 90,
  cardBlurb: 'Ground-up mixed-use.',
  walkMinutes: 6,
  metraStation: 'Oak Forest',
  image: null,
}

describe('PropertyCard', () => {
  it('links to the single canonical property URL', () => {
    render(<PropertyCard property={base} />)
    expect(screen.getByRole('link').getAttribute('href')).toBe('/portfolio/157-and-cicero')
  })

  it('shows the Metra walk distance', () => {
    render(<PropertyCard property={base} />)
    expect(screen.getByText(/6 min walk · Oak Forest Metra/)).toBeDefined()
  })

  it('omits the walk line entirely when there is no station', () => {
    render(<PropertyCard property={{ ...base, walkMinutes: undefined, metraStation: undefined }} />)
    expect(screen.queryByText(/min walk/)).toBeNull()
  })

  it('shows a Sold chip for realized deals', () => {
    render(<PropertyCard property={{ ...base, status: 'sold' }} />)
    expect(screen.getByText('Sold')).toBeDefined()
  })

  it('still links to /portfolio/[slug] for a sold property, not a track-record URL', () => {
    // A realized deal must never exist at two addresses.
    render(<PropertyCard property={{ ...base, status: 'sold' }} />)
    expect(screen.getByRole('link').getAttribute('href')).toBe('/portfolio/157-and-cicero')
  })

  it('omits the unit count rather than printing "undefined Units"', () => {
    render(<PropertyCard property={{ ...base, unitCount: undefined }} />)
    expect(screen.queryByText(/undefined/i)).toBeNull()
  })

  it('uses no physical-direction utilities', () => {
    const { container } = render(<PropertyCard property={base} />)
    expect(container.innerHTML).not.toMatch(PHYSICAL)
  })
})

describe('PropertyCard unit mix', () => {
  it('states residential and retail separately on a mixed-use card', () => {
    render(<PropertyCard property={{ ...base, unitCount: 90, retailUnitCount: 3 }} />)
    expect(screen.getByText(/90 Residential · 3 Retail/)).toBeDefined()
  })

  it('still reads "Units" for a purely residential asset', () => {
    render(<PropertyCard property={{ ...base, unitCount: 40, retailUnitCount: null }} />)
    expect(screen.getByText(/40 Units/)).toBeDefined()
  })
})
