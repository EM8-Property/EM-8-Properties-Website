import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, act, fireEvent } from '@testing-library/react'
import { InvestorPopup, POPUP_DISMISSED_KEY } from '@/components/home/InvestorPopup'

const PHYSICAL = /\b(?:[a-z0-9-]+:)*-?(?:ml|mr|pl|pr|border-l|border-r|text-left|text-right)-?\b/

beforeEach(() => {
  window.localStorage.clear()
})

/** Advances past the delay and lets React flush the resulting state update. */
async function openIt() {
  await act(async () => {
    vi.advanceTimersByTime(20_000)
  })
}

describe('InvestorPopup', () => {
  it('stays hidden until the delay has passed', async () => {
    vi.useFakeTimers()
    render(<InvestorPopup />)
    expect(screen.queryByRole('dialog')).toBeNull()
    await openIt()
    expect(screen.getByRole('dialog')).toBeDefined()
    vi.useRealTimers()
  })

  it('asks only for a name and an email', async () => {
    vi.useFakeTimers()
    render(<InvestorPopup />)
    await openIt()
    expect(document.querySelector('input[name="firstName"]')).not.toBeNull()
    expect(document.querySelector('input[type="email"]')).not.toBeNull()
    // Deliberately not here: check size and the accreditation declaration. Those belong
    // on /investors, not in an unsolicited overlay.
    expect(document.querySelector('[name="checkSize"]')).toBeNull()
    expect(document.querySelector('[name="accreditedConfirmed"]')).toBeNull()
    vi.useRealTimers()
  })

  it('is labelled and closeable', async () => {
    vi.useFakeTimers()
    render(<InvestorPopup />)
    await openIt()
    const dialog = screen.getByRole('dialog')
    expect(dialog.getAttribute('aria-modal')).toBe('true')
    expect(dialog.getAttribute('aria-labelledby')).toBeTruthy()
    expect(screen.getByRole('button', { name: /close/i })).toBeDefined()
    vi.useRealTimers()
  })

  it('never reappears once dismissed', async () => {
    vi.useFakeTimers()
    const { unmount } = render(<InvestorPopup />)
    await openIt()
    // fireEvent, not userEvent: userEvent awaits its own internal delays, which never
    // resolve under fake timers and hang the test rather than failing it.
    fireEvent.click(screen.getByRole('button', { name: /close/i }))
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(window.localStorage.getItem(POPUP_DISMISSED_KEY)).toBeTruthy()

    unmount()
    render(<InvestorPopup />)
    await openIt()
    expect(screen.queryByRole('dialog'), 'a dismissed popup came back on the next visit').toBeNull()
    vi.useRealTimers()
  })

  it('closes on Escape, the reflex every overlay has to honour', async () => {
    vi.useFakeTimers()
    render(<InvestorPopup />)
    await openIt()
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(screen.queryByRole('dialog')).toBeNull()
    vi.useRealTimers()
  })

  it('survives localStorage being unavailable', async () => {
    // Private browsing and locked-down browsers throw on access rather than returning
    // null. Throwing here would take the whole homepage down with it.
    const original = window.localStorage.getItem
    window.localStorage.getItem = () => { throw new Error('denied') }
    vi.useFakeTimers()
    expect(() => render(<InvestorPopup />)).not.toThrow()
    await openIt()
    vi.useRealTimers()
    window.localStorage.getItem = original
  })

  it('makes no promise about returns', async () => {
    vi.useFakeTimers()
    const { container } = render(<InvestorPopup />)
    await openIt()
    expect(container.textContent).not.toMatch(/guarantee|will return|assured|risk-free/i)
    vi.useRealTimers()
  })

  it('uses no physical-direction utilities', async () => {
    vi.useFakeTimers()
    const { container } = render(<InvestorPopup />)
    await openIt()
    expect(container.innerHTML).not.toMatch(PHYSICAL)
    vi.useRealTimers()
  })
})

/**
 * A dialog that sets aria-modal="true" is telling assistive tech that the rest of the
 * page is inert. If a keyboard user can Tab out of it into a live page, that claim is
 * false, and they end up interacting with content they cannot see behind a scrim.
 */
/**
 * A dialog that sets aria-modal="true" tells assistive tech the rest of the page is
 * inert. If a keyboard user can Tab out of it into a live page, that claim is false and
 * they end up interacting with content hidden behind a scrim.
 */
describe('InvestorPopup — modality', () => {
  it('wraps focus back to the start when tabbing past the last control', async () => {
    vi.useFakeTimers()
    render(<InvestorPopup />)
    await openIt()
    const dialog = screen.getByRole('dialog')
    const focusable = [
      ...dialog.querySelectorAll<HTMLElement>('button, [href], input, select, textarea'),
    ]
    expect(focusable.length).toBeGreaterThan(1)

    const last = focusable[focusable.length - 1]!
    last.focus()
    expect(document.activeElement).toBe(last)
    fireEvent.keyDown(dialog, { key: 'Tab' })
    expect(document.activeElement, 'Tab escaped the dialog').toBe(focusable[0])
    vi.useRealTimers()
  })

  it('wraps backwards too, so Shift+Tab from the first control stays inside', async () => {
    vi.useFakeTimers()
    render(<InvestorPopup />)
    await openIt()
    const dialog = screen.getByRole('dialog')
    const focusable = [
      ...dialog.querySelectorAll<HTMLElement>('button, [href], input, select, textarea'),
    ]
    focusable[0]!.focus()
    fireEvent.keyDown(dialog, { key: 'Tab', shiftKey: true })
    expect(document.activeElement).toBe(focusable[focusable.length - 1])
    vi.useRealTimers()
  })

  it('locks the page behind it from scrolling, and releases it again', async () => {
    vi.useFakeTimers()
    const { unmount } = render(<InvestorPopup />)
    await openIt()
    expect(document.body.style.overflow).toBe('hidden')
    fireEvent.click(screen.getByRole('button', { name: /close/i }))
    expect(document.body.style.overflow).not.toBe('hidden')
    unmount()
    vi.useRealTimers()
  })
})
