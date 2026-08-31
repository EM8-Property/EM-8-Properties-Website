import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { HomeHero } from '@/components/home/HomeHero'

const PROMISSORY = /\b(guaranteed|will return|assured|risk-free|no risk)\b/i

describe('HomeHero', () => {
  it('leads with the purpose, not the balance sheet', () => {
    render(<HomeHero />)
    const h1 = screen.getByRole('heading', { level: 1 })
    expect(h1.textContent).toMatch(/choose to live in/i)
    expect(h1.textContent).not.toMatch(/\$100M/)
  })

  it('states the TOD thesis in the subhead', () => {
    render(<HomeHero />)
    expect(screen.getByText(/walking distance of Metra/i)).toBeDefined()
  })

  it('uses no promissory return language', () => {
    const { container } = render(<HomeHero />)
    expect(container.textContent ?? '').not.toMatch(PROMISSORY)
  })

  it('carries no invented figure in the hero', () => {
    // Spec §9: no placeholder number ships. The hero is the most likely place for one
    // to be hardcoded and forgotten.
    const { container } = render(<HomeHero />)
    expect(container.textContent ?? '').not.toMatch(/\d+(\.\d+)?x\b|\$\d|\d+%/)
  })
})
