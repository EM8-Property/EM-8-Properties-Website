import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { InsightsFilter } from '@/components/insights/InsightsFilter'
import type { PostData } from '@/components/insights/PostCard'

const posts: PostData[] = [
  { title: 'Zoning as partnership', slug: 'zoning', publishedAt: '2026-08-12T00:00:00Z', category: 'municipal-partnership', excerpt: 'a' },
  { title: 'Q3 close', slug: 'q3-close', publishedAt: '2026-07-01T00:00:00Z', category: 'announcement', excerpt: 'b' },
  { title: 'Unit mix', slug: 'unit-mix', publishedAt: '2026-06-01T00:00:00Z', category: 'design', excerpt: 'c' },
]

describe('InsightsFilter', () => {
  it('shows the whole feed before any filter is applied', () => {
    render(<InsightsFilter posts={posts} />)
    expect(screen.getByText('Zoning as partnership')).toBeDefined()
    expect(screen.getByText('Q3 close')).toBeDefined()
    expect(screen.getByText('Unit mix')).toBeDefined()
  })

  it('narrows to one category', async () => {
    const user = userEvent.setup()
    render(<InsightsFilter posts={posts} />)
    await user.click(screen.getByRole('button', { name: 'Announcement' }))
    expect(screen.getByText('Q3 close')).toBeDefined()
    expect(screen.queryByText('Zoning as partnership')).toBeNull()
  })

  it('restores the whole feed from All', async () => {
    const user = userEvent.setup()
    render(<InsightsFilter posts={posts} />)
    await user.click(screen.getByRole('button', { name: 'Announcement' }))
    await user.click(screen.getByRole('button', { name: 'All' }))
    expect(screen.getByText('Zoning as partnership')).toBeDefined()
  })

  it('offers only categories that have posts', () => {
    render(<InsightsFilter posts={posts} />)
    expect(screen.queryByRole('button', { name: 'Operations' })).toBeNull()
    expect(screen.getByRole('button', { name: 'Design' })).toBeDefined()
  })

  it('marks the active category for assistive tech', async () => {
    const user = userEvent.setup()
    render(<InsightsFilter posts={posts} />)
    const design = screen.getByRole('button', { name: 'Design' })
    expect(design.getAttribute('aria-pressed')).toBe('false')
    await user.click(design)
    expect(design.getAttribute('aria-pressed')).toBe('true')
  })
})
