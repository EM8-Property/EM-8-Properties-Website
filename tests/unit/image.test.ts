import { describe, it, expect } from 'vitest'
import { urlForImage } from '@/sanity/image'

const ref = { asset: { _ref: 'image-abc123-2000x1500-jpg' } }

describe('urlForImage', () => {
  it('serves a resized, auto-format image rather than the original', () => {
    // The old site shipped 10-20MB camera originals. This is the guard against that:
    // every image goes through Sanity's pipeline with an explicit width.
    const url = urlForImage(ref).width(800).url()
    expect(url).toContain('w=800')
    expect(url).toContain('auto=format')
  })

  it('points at the Sanity CDN, which next.config must allowlist', () => {
    expect(urlForImage(ref).width(100).url()).toContain('cdn.sanity.io')
  })
})
