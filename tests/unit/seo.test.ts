import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { pageMetadata, pageTitle, SITE_NAME } from '@/lib/seo'

describe('pageTitle', () => {
  it('uses the suffix format every page on the site already used', () => {
    expect(pageTitle('Portfolio')).toBe('Portfolio | EM8 Properties')
  })

  it('does not repeat the site name on the homepage', () => {
    expect(pageTitle(SITE_NAME)).toBe('EM8 Properties')
  })
})

describe('pageMetadata', () => {
  const meta = pageMetadata({
    title: 'Portfolio',
    description: 'Multifamily and mixed-use assets.',
    path: '/portfolio',
  })

  it('declares a canonical URL for the page', () => {
    // Seven of nine routes shipped with none, on a site whose fourth non-negotiable is
    // one canonical URL per property.
    expect(meta.alternates?.canonical).toBe('/portfolio')
  })

  it('keeps the page title and description it was given', () => {
    expect(meta.title).toBe('Portfolio | EM8 Properties')
    expect(meta.description).toBe('Multifamily and mixed-use assets.')
  })

  it('carries an Open Graph block, since Next synthesises none from title', () => {
    // Without this a shared link renders with no card title at all — the failure the
    // insights route was already fixed for, still present on seven other pages.
    expect(meta.openGraph?.title).toBe('Portfolio | EM8 Properties')
    expect(meta.openGraph?.description).toBe('Multifamily and mixed-use assets.')
    expect(meta.openGraph?.siteName).toBe(SITE_NAME)
    expect(meta.openGraph?.url).toBe('/portfolio')
  })

  it('asks for a large summary card, which is what LinkedIn renders', () => {
    // toMatchObject rather than property access: Next's `Twitter` type is a union, and
    // `card` is not readable off it without narrowing first.
    expect(meta.twitter).toMatchObject({
      card: 'summary_large_image',
      title: 'Portfolio | EM8 Properties',
    })
  })

  it('names the generated share card, since nothing else supplies one', () => {
    // Not left to Next's `opengraph-image` file convention: measured on the build, that
    // applied to the homepage alone and left the six sibling routes with no card.
    expect(meta.openGraph?.images).toEqual([
      { url: '/share-card', width: 1200, height: 630, alt: 'EM8 Properties' },
    ])
  })

  it('gives the twitter block an image too, or the card degrades to the small variant', () => {
    // With no image Next emits `twitter:card = summary`, which renders as a bare link.
    expect(meta.twitter).toMatchObject({ images: ['/share-card'] })
  })
})

/**
 * A page shipping without a canonical is invisible to every other test: the build passes,
 * lint passes, and Lighthouse does not audit for one. This is the guard, and it is why
 * `pageMetadata` exists as a single helper rather than seven hand-written blocks.
 */
describe('every content route declares a canonical', () => {
  const siteDir = resolve(__dirname, '../../src/app/(site)')

  /** Every `page.tsx` under the (site) group, at any depth. */
  function pageFiles(dir: string): string[] {
    const found: string[] = []
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = join(dir, entry.name)
      if (entry.isDirectory()) found.push(...pageFiles(full))
      else if (entry.name === 'page.tsx') found.push(full)
    }
    return found
  }

  const files = pageFiles(siteDir)

  it('finds every page, so the assertion below is not vacuous', () => {
    // Nine routes today: home, about, insights, insights/[slug], investors, partners,
    // portfolio, portfolio/[slug], track-record.
    expect(files.length).toBe(9)
  })

  it.each(files.map((f) => [f.slice(siteDir.length + 1).replace(/\\/g, '/'), f]))(
    '%s',
    (_label, file) => {
      const source = readFileSync(file, 'utf8')
      const declaresCanonical =
        source.includes('pageMetadata(') || /alternates:\s*\{\s*canonical/.test(source)
      expect(declaresCanonical).toBe(true)
    },
  )
})
