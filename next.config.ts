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
}

export default nextConfig
