import { describe, it, expect } from 'vitest'
import nextConfig from '../../next.config'

/*
 * em-8.com is served through a Netlify proxy (see next.config.ts and
 * docs/handover-2026-10-01-netlify-proxy-cutover.md). Prerendered pages carry
 * `s-maxage=31536000`, which Netlify's CDN honours on proxied responses, so dropping this
 * header would freeze em-8.com at whatever Netlify first fetched — and a Studio publish
 * would update the Railway origin and never reach a visitor. Nothing else would notice:
 * the build, the E2E suite run against Railway, and the page itself all look correct.
 */
describe('Netlify CDN caching', () => {
  it('tells Netlify not to store any response, on every path', async () => {
    const rules = (await nextConfig.headers?.()) ?? []
    const rule = rules.find((r) =>
      r.headers.some((h) => h.key.toLowerCase() === 'netlify-cdn-cache-control'),
    )

    expect(rule, 'a Netlify-CDN-Cache-Control rule').toBeDefined()
    // Every path, including `/` — `:path*` matches zero segments.
    expect(rule!.source).toBe('/:path*')
    expect(rule!.headers.find((h) => h.key === 'Netlify-CDN-Cache-Control')?.value).toBe('no-store')
  })

  it('does not set Cache-Control itself, which would change what browsers cache', async () => {
    // The browser should keep Next's own headers — including the year-long `immutable` on
    // hashed assets. Only Netlify's CDN is being told anything.
    const rules = (await nextConfig.headers?.()) ?? []
    const keys = rules.flatMap((r) => r.headers.map((h) => h.key.toLowerCase()))
    expect(keys).not.toContain('cache-control')
  })
})
