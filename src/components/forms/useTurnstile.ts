'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

/** The subset of Cloudflare's `window.turnstile` this site calls. */
type TurnstileApi = {
  render(container: HTMLElement, options: Record<string, unknown>): string | undefined
  reset(widgetId: string): void
  remove(widgetId: string): void
}

declare global {
  interface Window {
    turnstile?: TurnstileApi
  }
}

const SCRIPT_SRC = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'

/**
 * How long a submit waits for a token. Long enough for a visitor Cloudflare asks to tick
 * the checkbox; after it the server is asked anyway, and refuses with a message saying so.
 */
const TOKEN_WAIT_MS = 60_000

let scriptPromise: Promise<TurnstileApi> | null = null

/** Loads Cloudflare's script once per page, however many forms are on it. */
function loadTurnstile(): Promise<TurnstileApi> {
  if (window.turnstile) return Promise.resolve(window.turnstile)
  scriptPromise ??= new Promise<TurnstileApi>((resolve, reject) => {
    const script = document.createElement('script')
    script.src = SCRIPT_SRC
    script.async = true
    script.onload = () =>
      window.turnstile ? resolve(window.turnstile) : reject(new Error('Turnstile missing'))
    script.onerror = () => {
      // Forget the failure, so the next form to mount tries again.
      scriptPromise = null
      reject(new Error('Turnstile script failed to load'))
    }
    document.head.appendChild(script)
  })
  return scriptPromise
}

/**
 * Renders a Turnstile widget into `container` and returns a way to get its token.
 *
 * The widget is `interaction-only`: most visitors never see it, and only one Cloudflare
 * is unsure about is shown a checkbox. With no site key (local dev, CI, or a build
 * before the key was set) nothing loads and `getToken` resolves to undefined, which the
 * server accepts only while it too has no secret.
 */
export function useTurnstile(action: string) {
  const containerRef = useRef<HTMLDivElement>(null)
  const widgetId = useRef<string | undefined>(undefined)
  const token = useRef<string | undefined>(undefined)
  const waiters = useRef<((t: string | undefined) => void)[]>([])
  // Set when the script cannot load at all (an extension or a network blocking
  // Cloudflare), so a submit goes straight to the server's message instead of waiting.
  const unavailable = useRef(false)
  // Read inside the hook rather than at module scope so tests can set it. Next still
  // inlines it at build time, because the full `process.env.NEXT_PUBLIC_…` name appears.
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY

  // True only while Cloudflare is showing its checkbox, so the form can give it room.
  // The container is never empty once rendered, even when it shows nothing, so CSS
  // alone cannot tell the two states apart.
  const [interactive, setInteractive] = useState(false)

  useEffect(() => {
    if (!siteKey) return
    const settle = (t: string | undefined) => {
      token.current = t
      for (const w of waiters.current.splice(0)) w(t)
    }
    let cancelled = false
    loadTurnstile()
      .then((api) => {
        if (cancelled || !containerRef.current) return
        // The form's width, not the container's: the container is `absolute` until the
        // checkbox shows, so it measures nothing. The full-width widget needs 300px, and
        // the homepage popup's form is only 278px on a 360px phone.
        const formWidth = containerRef.current.parentElement?.clientWidth ?? 0
        widgetId.current = api.render(containerRef.current, {
          sitekey: siteKey,
          action,
          appearance: 'interaction-only',
          size: formWidth > 0 && formWidth < 300 ? 'compact' : 'flexible',
          // The site has no dark mode, and Cloudflare's 'auto' follows the visitor's OS,
          // which put a black box on the cream form on a phone in dark mode.
          theme: 'light',
          // The form posts the token itself. Cloudflare's own hidden input would be
          // picked up by FormData as well, under the same name, which is harmless but
          // makes it unclear which copy the server reads.
          'response-field': false,
          callback: (t: string) => settle(t),
          'before-interactive-callback': () => setInteractive(true),
          'after-interactive-callback': () => setInteractive(false),
          'expired-callback': () => {
            token.current = undefined
          },
          'error-callback': () => {
            settle(undefined)
            // Returning true tells Turnstile the error is handled, so it does not also
            // throw into the console. It retries on its own.
            return true
          },
        })
      })
      .catch(() => {
        unavailable.current = true
        settle(undefined)
      })
    return () => {
      cancelled = true
      if (widgetId.current) window.turnstile?.remove(widgetId.current)
      widgetId.current = undefined
    }
  }, [siteKey, action])

  const getToken = useCallback((): Promise<string | undefined> => {
    if (!siteKey || token.current || unavailable.current) return Promise.resolve(token.current)
    return new Promise((resolve) => {
      const timer = setTimeout(() => resolve(undefined), TOKEN_WAIT_MS)
      waiters.current.push((t) => {
        clearTimeout(timer)
        resolve(t)
      })
    })
  }, [siteKey])

  /** Tokens are single-use. Call after every submission that did not succeed. */
  const reset = useCallback(() => {
    token.current = undefined
    if (widgetId.current) window.turnstile?.reset(widgetId.current)
  }, [])

  return { containerRef, getToken, reset, interactive, enabled: Boolean(siteKey) }
}
