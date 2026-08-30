import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { PortfolioFilter } from '@/components/property/PortfolioFilter'
import type { PropertyCardData } from '@/components/property/PropertyCard'

const PHYSICAL = /\b(?:[a-z0-9-]+:)*-?(?:ml|mr|pl|pr|border-l|border-r|text-left|text-right)-?\b/

const properties: PropertyCardData[] = [
  { title: 'Boulevard', slug: 'boulevard', assetClass: 'mixed-use', status: 'lease-up', city: 'Tinley Park', state: 'IL' },
  { title: 'Waverly Creek', slug: 'waverly-creek', assetClass: 'multifamily', status: 'stabilized', city: 'Antioch', state: 'IL' },
  { title: 'Park Townhomes', slug: 'park-townhomes', assetClass: 'townhomes', status: 'sold', city: 'Oak Forest', state: 'IL' },
]

describe('PortfolioFilter', () => {
  it('shows every property before any filter is applied', () => {
    render(<PortfolioFilter properties={properties} />)
    expect(screen.getByText('Boulevard')).toBeDefined()
    expect(screen.getByText('Waverly Creek')).toBeDefined()
    expect(screen.getByText('Park Townhomes')).toBeDefined()
  })

  it('narrows to a single asset class', async () => {
    const user = userEvent.setup()
    render(<PortfolioFilter properties={properties} />)
    await user.click(screen.getByRole('button', { name: 'Townhomes' }))
    expect(screen.getByText('Park Townhomes')).toBeDefined()
    expect(screen.queryByText('Boulevard')).toBeNull()
    expect(screen.queryByText('Waverly Creek')).toBeNull()
  })

  it('narrows by status independently of asset class', async () => {
    const user = userEvent.setup()
    render(<PortfolioFilter properties={properties} />)
    await user.click(screen.getByRole('button', { name: 'Stabilized' }))
    expect(screen.getByText('Waverly Creek')).toBeDefined()
    expect(screen.queryByText('Park Townhomes')).toBeNull()
  })

  it('combines an asset class and a status filter', async () => {
    const user = userEvent.setup()
    render(<PortfolioFilter properties={properties} />)
    await user.click(screen.getByRole('button', { name: 'Townhomes' }))
    await user.click(screen.getByRole('button', { name: 'Stabilized' }))
    // Nothing is both a townhome and stabilized.
    expect(screen.queryByText('Park Townhomes')).toBeNull()
    expect(screen.getByText(/no properties match/i)).toBeDefined()
  })

  it('restores the full list from the All control', async () => {
    const user = userEvent.setup()
    render(<PortfolioFilter properties={properties} />)
    await user.click(screen.getByRole('button', { name: 'Townhomes' }))
    await user.click(screen.getByRole('button', { name: 'All types' }))
    expect(screen.getByText('Boulevard')).toBeDefined()
    expect(screen.getByText('Waverly Creek')).toBeDefined()
  })

  it('offers only the asset classes actually present, not every value in the schema', () => {
    render(<PortfolioFilter properties={properties} />)
    expect(screen.queryByRole('button', { name: 'Industrial' })).toBeNull()
    expect(screen.getByRole('button', { name: 'Multifamily' })).toBeDefined()
  })

  it('marks the active filter for assistive tech, not just visually', async () => {
    const user = userEvent.setup()
    render(<PortfolioFilter properties={properties} />)
    const townhomes = screen.getByRole('button', { name: 'Townhomes' })
    expect(townhomes.getAttribute('aria-pressed')).toBe('false')
    await user.click(townhomes)
    expect(townhomes.getAttribute('aria-pressed')).toBe('true')
  })

  it('uses no physical-direction utilities', () => {
    const { container } = render(<PortfolioFilter properties={properties} />)
    expect(container.innerHTML).not.toMatch(PHYSICAL)
  })
})
