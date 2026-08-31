import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // Railway runs this as a container; standalone keeps the runtime image small.
  output: 'standalone',
  images: {
    // Every image on the site is served from Sanity's pipeline. Without this allowlist
    // next/image refuses the URL outright.
    remotePatterns: [{ protocol: 'https', hostname: 'cdn.sanity.io' }],
  },
}

export default nextConfig
