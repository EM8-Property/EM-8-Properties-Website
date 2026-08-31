import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { DealStory } from '@/components/property/DealStory'

const PHYSICAL = /\b(?:[a-z0-9-]+:)*-?(?:ml|mr|pl|pr|border-l|border-r|text-left|text-right)-?\b/
const PROMISSORY = /\b(guaranteed|will return|assured|risk-free|projected|targeted)\b/i

const story = {
  acquired: '2016 — below replacement cost',
  executed: 'Interior modernization',
  exited: 'Full-cycle sale',
  equityMultiple: '2.1x',
  exitYear: 2019,
}

describe('DealStory', () => {
  it('tells the deal in acquired, executed, exited order', () => {
    render(<DealStory story={story} />)
    const headings = screen.getAllByRole('heading', { level: 4 }).map((h) => h.textContent)
    expect(headings).toEqual(['Acquired', 'Executed', 'Exited'])
  })

  it('labels the multiple as realized, never as a projection', () => {
    render(<DealStory story={story} />)
    expect(screen.getByText(/Realized Equity Multiple/i)).toBeDefined()
  })

  it('uses no forward-looking language on a closed deal', () => {
    // These are results that happened. Calling one "projected" or "targeted" here would
    // misstate a realized figure.
    const { container } = render(<DealStory story={story} />)
    expect(container.textContent ?? '').not.toMatch(PROMISSORY)
  })

  it('omits the multiple block entirely when no multiple is recorded', () => {
    render(<DealStory story={{ acquired: 'a', executed: 'b', exited: 'c' }} />)
    expect(screen.queryByText(/Realized Equity Multiple/i)).toBeNull()
  })

  it('uses no physical-direction utilities', () => {
    const { container } = render(<DealStory story={story} />)
    expect(container.innerHTML).not.toMatch(PHYSICAL)
  })
})
