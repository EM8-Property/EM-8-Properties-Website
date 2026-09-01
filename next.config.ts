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
    // build error, byte-identical output. The hero and banner crops ask for 68, so 68
    // has to be declared here or the prop does nothing at all.
    qualities: [68, 75],
  },
}

export default nextConfig
