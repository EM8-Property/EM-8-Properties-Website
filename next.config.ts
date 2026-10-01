import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // Railway runs this as a container; standalone keeps the runtime image small.
  output: 'standalone',
  images: {
    // Every image on the site is served from Sanity's pipeline. Without this allowlist
    // next/image refuses the URL outright.
    remotePatterns: [{ protocol: 'https', hostname: 'cdn.sanity.io' }],
    // Next 16 allowlists image qualities and ships with only [75]. A `quality` prop
    // holding any other value is silently ignored and falls back to 75 — no warning, no
    // build error, byte-identical output. Anything the code asks for has to be declared
    // here or the prop does nothing at all.
    //
    // **Nothing asks for 68 any more.** PR 4 took the hero to `quality={75}` (spec §7's
    // first resolution lever), and 75 is Next's own default, so this list could be
    // dropped entirely without changing a byte. It is kept, with 68 still on it, for one
    // reason: 68 is what `7d0d9ff` and everything before it served, and the before/after
    // byte tables in `docs/resource-budget.md` are only reproducible while a build can
    // still be pointed back at it. Remove 68 when those numbers stop mattering — and if
    // you do, this whole `qualities` key goes with it.
    qualities: [68, 75],
  },

  /**
   * Netlify must not cache anything it proxies from here.
   *
   * em-8.com reaches this site through the OLD Netlify site, which proxies every request
   * to Railway with a 200 rewrite (`ops/netlify-proxy/_redirects`). That is not a choice
   * of architecture, it is a constraint: the domain is registered in a former employee's
   * Wix account, so its DNS cannot be changed, and it already points at Netlify. See
   * `docs/handover-2026-10-01-netlify-proxy-cutover.md`.
   *
   * Prerendered pages leave here with `Cache-Control: s-maxage=31536000`, and Netlify's
   * CDN honours `s-maxage` on proxied responses — so without this header, Netlify would
   * hold every page for a year. A Studio publish purges Next's cache on Railway through
   * `/api/revalidate`, and em-8.com would never see it.
   *
   * `Netlify-CDN-Cache-Control` is the most specific of the three headers Netlify reads
   * and applies to its CDN only, so the browser and every other cache still get Next's own
   * `Cache-Control`, including the year-long `immutable` on hashed assets. Every request
   * through em-8.com therefore reaches Railway, which is what keeps a publish visible on
   * the next page load. Remove this together with the proxy once the domain points at
   * Railway directly.
   */
  async headers() {
    return [{ source: '/:path*', headers: [{ key: 'Netlify-CDN-Cache-Control', value: 'no-store' }] }]
  },
}

export default nextConfig
