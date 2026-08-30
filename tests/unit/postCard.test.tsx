import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { PostCard, formatCategory, formatDate } from '@/components/insights/PostCard'

const PHYSICAL = /\b(?:[a-z0-9-]+:)*-?(?:ml|mr|pl|pr|border-l|border-r|text-left|text-right)-?\b/

const post = {
  title: 'Why we stopped treating zoning as a negotiation',
  slug: 'why-we-stopped-treating-zoning-as-a-negotiation',
  publishedAt: '2026-08-12T00:00:00Z',
  category: 'municipal-partnership',
  excerpt: 'Oak Forest approved 90 units faster than we budgeted.',
  heroImage: null,
}

describe('PostCard', () => {
  it('links to the article URL used on LinkedIn', () => {
    render(<PostCard post={post} />)
    expect(screen.getByRole('link').getAttribute('href')).toBe(
      '/insights/why-we-stopped-treating-zoning-as-a-negotiation',
    )
  })

  it('renders a readable category, not the slug', () => {
    expect(formatCategory('municipal-partnership')).toBe('Municipal Partnership')
    expect(formatCategory('announcement')).toBe('Announcement')
  })

  it('shows a human-readable date', () => {
    render(<PostCard post={post} />)
    expect(screen.getByText(/Aug 12, 2026/)).toBeDefined()
  })

  it('renders the publication date in UTC, not the viewer timezone', () => {
    // Sanity stores publishedAt as an instant. Formatting it in local time moves a
    // midnight-UTC date back a day for every viewer west of Greenwich — including
    // America/Chicago, where this project is developed. An article dated Aug 12 would
    // read "Aug 11" on the author's own machine.
    expect(formatDate('2026-08-12T00:00:00Z')).toBe('Aug 12, 2026')
    expect(formatDate('2026-01-01T00:00:00Z')).toBe('Jan 1, 2026')
  })

  it('uses no physical-direction utilities', () => {
    const { container } = render(<PostCard post={post} />)
    expect(container.innerHTML).not.toMatch(PHYSICAL)
  })
})
