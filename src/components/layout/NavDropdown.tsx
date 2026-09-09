'use client'

import { useRef, useState } from 'react'
import { flushSync } from 'react-dom'
import Link from 'next/link'
import type { NavKey, NavLabels, NavNode } from '@/lib/navigation'

/**
 * One navigation parent and its panel.
 *
 * The requirements here are accessibility requirements rather than styling ones (spec §5),
 * and every one of them is a case that a panel which merely looks right gets wrong:
 *
 *   - Pointer: opens on hover, and on focus for keyboard users.
 *   - Touch: opens on tap. A hover-only panel does not exist on a phone, and a phone is
 *     the review surface.
 *   - Escape closes and returns focus to the parent. Arrow keys move within the panel.
 *     Tab leaves it — a menu is not a dialog, and trapping focus in navigation is worse
 *     than not opening it, because there is no visible way out.
 *   - `aria-expanded` on the control, `aria-controls` pointing at the panel that exists.
 *   - The panel is never the only route to a page: every destination is in the footer too,
 *     which `navigation.test.ts` asserts against the footer's source.
 *
 * **Open state is React state, not CSS `:hover`.** The obvious implementation —
 * `hidden md:group-hover:block` — costs nothing and cannot work: with hover in CSS,
 * Escape has nothing to close, and `group-focus-within` re-opens the panel the moment
 * Escape returns focus to the parent. So hover is `onPointerEnter`/`onPointerLeave` and
 * every other route in and out is the same piece of state.
 *
 * **The children stay mounted and carry `hidden`.** Render once, reveal — the pattern the
 * header has used since the mobile nav was fixed. A second copy for a second breakpoint
 * puts two nodes with the same accessible name in the tree, which breaks `getByRole` for
 * every consumer and makes the nav ambiguous to a screen reader. `hidden` rather than a
 * `display:none` class because `[hidden]` keeps the subtree out of the accessibility tree
 * AND out of the tab order; a class can be overridden by a later rule and silently leave
 * focusable links inside a closed panel.
 *
 * **Two shapes of parent, and the asymmetry is spec §5's.** `About Us` has no destination
 * of its own, so one button carries the label and the disclosure. `Strategy` has one, so
 * its label is a link and the `▾` beside it is a separate button. §5 proposed one element
 * that was both; taken literally a tap on it navigates and the panel never opens, which
 * leaves /partners reachable only from the footer — the complaint this PR answers,
 * recreated one level down. The link and the extra control keep both.
 *
 * Colours: `text-ink` on `bg-ground` with a `border-rule` edge. Deliberately not
 * `text-white` on anything — spec §9 lists seven `text-white`-on-a-moving-token pairings
 * the dark re-theme has to unpick, the colour-literal lint rule cannot see any of them,
 * and this is a new surface with no reason to become the eighth.
 */
export function NavDropdown({
  node,
  labels,
  hiddenKeys,
  onNavigate,
}: {
  node: NavNode
  labels: NavLabels
  /**
   * Children to leave out. Task 8 passes `['whyEm8']` while `aboutPage.whyEm8.body` is
   * empty: §5 says a section whose body is absent takes its nav entry with it, and on the
   * day this ships that section is empty, so this is the live case.
   */
  hiddenKeys?: readonly NavKey[]
  /** Called when a child link is followed, so the header can close its own row state. */
  onNavigate?: () => void
}) {
  const [open, setOpen] = useState(false)
  const toggleRef = useRef<HTMLButtonElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  /**
   * True for the single gesture in which a mouse pointer arriving over the group is what
   * opened it, so the click that follows a heartbeat later — the same physical motion,
   * dispatched as its own event — does not also toggle it straight back shut.
   *
   * A real click always arrives with the pointer already over its target, so `pointerenter`
   * fires before `click` for every mouse click, not only a simulated one: without this,
   * the *first* click a mouse user ever makes on an unopened parent opens it via hover and
   * then immediately closes it via the click that hover made possible, and the panel never
   * visibly appears. Cleared on the click it suppressed, and on every path that closes the
   * panel, so it cannot outlive the gesture that set it and misfire on a later keyboard
   * activation.
   */
  const suppressToggleRef = useRef(false)

  const panelId = `nav-panel-${node.key}`
  const label = labels[node.key]
  const children = (node.children ?? []).filter((c) => !hiddenKeys?.includes(c.key))

  const close = (refocus: boolean) => {
    setOpen(false)
    suppressToggleRef.current = false
    if (refocus) toggleRef.current?.focus()
  }

  const handleToggleClick = () => {
    if (suppressToggleRef.current) {
      // This click is the tail end of the pointerenter that just opened the panel —
      // consume the flag rather than the toggle.
      suppressToggleRef.current = false
      return
    }
    setOpen((v) => !v)
  }

  /**
   * Arrow keys inside the panel, and Escape from anywhere in it.
   *
   * Focus is moved by querying the panel for its links rather than by holding an index in
   * state: the list changes with `hiddenKeys`, and an index would go stale against it
   * without anything failing.
   */
  const onKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Escape') {
      if (open) {
        event.preventDefault()
        close(true)
      }
      return
    }
    if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return

    event.preventDefault()
    if (!open) {
      // ArrowDown on a closed parent opens it and lands on the first child, so the panel
      // is one key away rather than a tab sequence away. `flushSync` rather than a plain
      // `setOpen` because the panel is still `hidden` when the update is merely queued —
      // a `hidden` element's children cannot take focus — and `flushSync` forces the
      // commit (clearing `hidden`) to land before the `focus()` call below runs, rather
      // than racing it across a `requestAnimationFrame` and failing intermittently.
      flushSync(() => setOpen(true))
      panelRef.current?.querySelector<HTMLAnchorElement>('a')?.focus()
      return
    }

    const links = [...(panelRef.current?.querySelectorAll<HTMLAnchorElement>('a') ?? [])]
    if (links.length === 0) return
    const at = links.indexOf(document.activeElement as HTMLAnchorElement)
    const next =
      event.key === 'ArrowDown'
        ? Math.min(at + 1, links.length - 1)
        : Math.max(at - 1, 0)
    links[at === -1 ? 0 : next]!.focus()
  }

  /**
   * Closes when focus leaves the whole group.
   *
   * `relatedTarget` is where focus is going, so this distinguishes tabbing out of the
   * panel — which must close it — from moving between its own children, which must not.
   * A bare `onBlur` closes on every internal move and makes the arrow keys unusable.
   */
  const onBlur = (event: React.FocusEvent<HTMLDivElement>) => {
    if (!event.currentTarget.contains(event.relatedTarget as Node | null)) close(false)
  }

  const onPointerEnter = (event: React.PointerEvent) => {
    if (event.pointerType !== 'mouse') return
    if (!open) suppressToggleRef.current = true
    setOpen(true)
  }

  const onPointerLeave = (event: React.PointerEvent) => {
    if (event.pointerType !== 'mouse') return
    close(false)
  }

  return (
    <div
      className="relative"
      onPointerEnter={onPointerEnter}
      onPointerLeave={onPointerLeave}
      onKeyDown={onKeyDown}
      onBlur={onBlur}
    >
      <span className="flex items-center gap-1">
        {node.href ? (
          <>
            <Link href={node.href} onClick={() => onNavigate?.()} className="hover:text-ink">
              {label}
            </Link>
            <button
              ref={toggleRef}
              type="button"
              onClick={handleToggleClick}
              aria-expanded={open}
              aria-controls={panelId}
              // The label names which menu, because there are two of them in the bar, and
              // a button whose only content is a glyph has no accessible name at all.
              aria-label={`Open the ${label} menu`}
              className="p-1 text-ink-secondary hover:text-ink"
            >
              <Chevron open={open} />
            </button>
          </>
        ) : (
          <button
            ref={toggleRef}
            type="button"
            onClick={handleToggleClick}
            aria-expanded={open}
            aria-controls={panelId}
            className="flex items-center gap-1 hover:text-ink"
          >
            {label}
            <Chevron open={open} />
          </button>
        )}
      </span>

      {/*
        Static below md and absolute from md up: on a phone the group opens as a sheet that
        pushes the rest of the bar down, and on a pointer device it floats over the page.
        §5 asks for both. One element in both cases, so the accessible names stay unique.
      */}
      <div
        ref={panelRef}
        id={panelId}
        hidden={!open}
        className="mt-2 flex w-full flex-col gap-2 ps-3 md:absolute md:top-full md:z-50 md:mt-1 md:w-44 md:gap-0 md:rounded-card md:border md:border-rule md:bg-ground md:p-2 md:shadow-sm md:ps-2"
      >
        {children.map((child) => (
          <Link
            key={child.key}
            href={child.href!}
            onClick={() => {
              close(false)
              onNavigate?.()
            }}
            className="rounded-control px-1 py-1.5 text-ink-secondary hover:bg-panel hover:text-ink md:px-2"
          >
            {labels[child.key]}
          </Link>
        ))}
      </div>
    </div>
  )
}

/** `aria-hidden`, because `aria-expanded` on the control already says which way it points. */
function Chevron({ open }: { open: boolean }) {
  return (
    <svg
      width="8"
      height="8"
      viewBox="0 0 8 8"
      aria-hidden="true"
      fill="none"
      className={open ? 'rotate-180' : ''}
    >
      <path d="M1 2.5L4 5.5L7 2.5" stroke="currentColor" strokeWidth="1.2" />
    </svg>
  )
}
