import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Testimonials } from '@/components/ui/Testimonials'

const PHYSICAL = /\b(?:[a-z0-9-]+:)*-?(?:ml|mr|pl|pr|border-l|border-r|text-left|text-right)-?\b/

const items = [
  {
    _id: 't1',
    quote: 'Best sponsor I have worked with.',
    attribution: 'Dr. T. S.',
    descriptor: 'Surgeon',
    investorSince: 2022,
  },
]

describe('Testimonials', () => {
  it('attributes the quote to a named person and role', () => {
    render(<Testimonials items={items} />)
    expect(screen.getByText(/Best sponsor/)).toBeDefined()
    expect(screen.getByText(/Dr\. T\. S\./)).toBeDefined()
    expect(screen.getByText(/Surgeon/)).toBeDefined()
  })

  it('renders nothing when there are no consented testimonials', () => {
    const { container } = render(<Testimonials items={[]} />)
    expect(container.firstChild).toBeNull()
  })

  it('keys by document id, so two investors sharing a descriptor both render', () => {
    render(
      <Testimonials
        items={[
          { _id: 'a', quote: 'One.', attribution: 'A. B.', descriptor: 'Physician' },
          { _id: 'b', quote: 'Two.', attribution: 'A. B.', descriptor: 'Physician' },
        ]}
      />,
    )
    expect(screen.getByText(/One\./)).toBeDefined()
    expect(screen.getByText(/Two\./)).toBeDefined()
  })

  it('omits the investor-since line when it is not recorded', () => {
    render(<Testimonials items={[{ _id: 'a', quote: 'x', attribution: 'A. B.' }]} />)
    expect(screen.queryByText(/Investor since/i)).toBeNull()
  })

  it('uses no physical-direction utilities', () => {
    const { container } = render(<Testimonials items={items} />)
    expect(container.innerHTML).not.toMatch(PHYSICAL)
  })
})
