import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, cleanup } from '@testing-library/react'
import { CarouselSlot, CAROUSEL_PATHS } from '@/components/layout/CarouselSlot'

const mockPath = vi.fn()
vi.mock('next/navigation', () => ({ usePathname: () => mockPath() }))
vi.mock('@/components/layout/HeroCarousel', () => ({
  HeroCarousel: () => <div data-testid="carousel" />,
}))

const SLIDES = [{ image: {}, slug: 'x', propertyTitle: 'X' }]
// cleanup() between renders is load-bearing: testing-library queries are scoped to
// document.body, so without it a carousel left over from a previous assertion is found
// by the next one and every check passes regardless of the path.
const shows = (path: string) => {
  cleanup()
  mockPath.mockReturnValue(path)
  const { queryByTestId } = render(<CarouselSlot slides={SLIDES} />)
  return Boolean(queryByTestId('carousel'))
}

beforeEach(() => mockPath.mockReset())

/**
 * Which pages carry the photo band, pinned. Hunter named six; /investors and the property
 * pages are deliberately excluded — the former is a conversion page, the latter already
 * open on their own hero photograph.
 */
describe('CarouselSlot', () => {
  it('shows the band on exactly the six pages that asked for it', () => {
    for (const path of ['/', '/portfolio', '/track-record', '/insights', '/partners', '/about']) {
      expect(shows(path), `expected the carousel on ${path}`).toBe(true)
    }
    expect(CAROUSEL_PATHS).toHaveLength(6)
  })

  it('keeps it off /investors and off individual property pages', () => {
    for (const path of ['/investors', '/portfolio/oak-forest-k', '/insights/some-article']) {
      expect(shows(path), `did not expect the carousel on ${path}`).toBe(false)
    }
  })

  it('does not leak onto a nested path that merely starts with an allowed one', () => {
    // A prefix match would put the band on every /portfolio/[slug] page, which is the
    // one place it was explicitly not wanted.
    expect(shows('/portfolio/anything')).toBe(false)
    expect(shows('/aboutus')).toBe(false)
  })

  it('tolerates a trailing slash', () => {
    expect(shows('/about/')).toBe(true)
  })
})
