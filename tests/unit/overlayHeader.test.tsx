import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import { SiteHeader } from '@/components/layout/SiteHeader'
import { HEADER_SCRIM } from '@/components/layout/SiteHeader'
import { contrastRatio } from '@/lib/tokens'
import { palette } from '@/lib/tokens'

const mockPath = vi.fn()
vi.mock('next/navigation', () => ({ usePathname: () => mockPath() }))

beforeEach(() => {
  cleanup()
  mockPath.mockReturnValue('/portfolio')
})

/**
 * On the pages that carry the photo band, the header sits over the photography rather
 * than above it, so the image runs to the very top of the page.
 *
 * The scrim is the load-bearing part. This is a light-institutional design — the header
 * carries ink text, not white — so a transparent header over an unknown photograph would
 * put #1A1A1A on whatever happens to be behind it. A mostly-opaque white scrim keeps the
 * photo visible while holding the text at a contrast that cannot depend on the image.
 */
describe('SiteHeader overlay', () => {
  it('overlays the page when the carousel is present', () => {
    const { container } = render(<SiteHeader agoraUrl="https://x.test" />)
    expect(container.firstElementChild!.className).toMatch(/absolute|fixed/)
  })

  it('sits in normal flow on pages with no photo band', () => {
    mockPath.mockReturnValue('/investors')
    const { container } = render(<SiteHeader agoraUrl="https://x.test" />)
    const cls = container.firstElementChild!.className
    expect(cls).not.toMatch(/\babsolute\b/)
    expect(cls).toContain('border-b')
  })

  it('keeps ink text legible over the darkest possible photograph', () => {
    // Worst case: the scrim sits over pure black. Whatever shows through has to leave the
    // ink text above 4.5:1, or the header becomes unreadable on a dark lobby shot.
    const alpha = HEADER_SCRIM
    const overBlack = Math.round(255 * alpha)
    const hex = '#' + [overBlack, overBlack, overBlack].map((n) => n.toString(16).padStart(2, '0')).join('')
    expect(contrastRatio(palette.ink, hex)).toBeGreaterThanOrEqual(4.5)
  })

  it('still exposes every destination while overlaid', () => {
    render(<SiteHeader agoraUrl="https://x.test" />)
    for (const label of ['Portfolio', 'Track Record', 'Insights', 'Partners', 'About']) {
      expect(screen.getByRole('link', { name: label })).toBeDefined()
    }
  })

  it('uses no physical-direction utilities', () => {
    const { container } = render(<SiteHeader agoraUrl="https://x.test" />)
    expect(container.innerHTML).not.toMatch(
      /\b(?:[a-z0-9-]+:)*-?(?:ml|mr|pl|pr|border-l|border-r|text-left|text-right)-?\b/,
    )
  })
})
