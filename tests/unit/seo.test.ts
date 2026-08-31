import { describe, it, expect } from 'vitest'
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { stripComments } from '../shared/sourceScan'
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
    // The full descriptor, not a bare path, so `twitter:image:alt` is emitted as well.
    expect(meta.twitter).toMatchObject({
      images: [{ url: '/share-card', width: 1200, height: 630, alt: 'EM8 Properties' }],
    })
  })

  it('omits the image entirely when a page supplies its own card', () => {
    // `/insights/[slug]` has a per-article `opengraph-image`, and naming an image here
    // would override that file with the generic card. An empty array would not do —
    // that is an explicit "no image", which is the bug this change fixed elsewhere.
    const own = pageMetadata({
      title: 'X',
      description: 'Y',
      path: '/insights/x',
      image: null,
    })
    expect(own.openGraph).not.toHaveProperty('images')
    expect(own.twitter).not.toHaveProperty('images')
  })
})

/**
 * A page shipping without a canonical is invisible to every other test: the build passes,
 * lint passes, and Lighthouse does not audit for one. This is the guard, and it is why
 * `pageMetadata` exists as a single helper rather than seven hand-written blocks.
 *
 * The assertion is on the canonical's *value*, not its presence. A page copy-pasted from
 * another and left pointing at the original's path is the failure mode that matters:
 * a canonical aimed at the wrong URL is worse than none at all, because it asks Google to
 * drop the page entirely. Checking only that the file mentions a canonical cannot see it.
 */
describe('every content route declares its own canonical', () => {
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

  /** `(site)/about/page.tsx` → `/about`; `(site)/page.tsx` → `/`. */
  function routeOf(file: string): string {
    const rel = file.slice(siteDir.length + 1).replace(/\\/g, '/')
    const dir = rel.replace(/\/?page\.tsx$/, '')
    return dir === '' ? '/' : `/${dir}`
  }

  const routes = pageFiles(siteDir).map((file) => ({ file, route: routeOf(file) }))

  it('covers every route, so the assertions below cannot go vacuous', () => {
    // Named rather than counted: `expected 10 to be 9` does not say which route appeared.
    expect(routes.map((r) => r.route).sort()).toEqual([
      '/',
      '/about',
      '/insights',
      '/insights/[slug]',
      '/investors',
      '/partners',
      '/portfolio',
      '/portfolio/[slug]',
      '/track-record',
    ])
  })

  it.each(routes.map((r) => [r.route, r.file]))('%s', (route, file) => {
    // Comments stripped: the prose in these files discusses canonicals and paths at
    // length, and a match inside a comment would pass for a page that declares none.
    const source = stripComments(readFileSync(file, 'utf8'))

    if (route.includes('[slug]')) {
      // A dynamic route must interpolate the slug rather than hardcode a path, or every
      // article would claim to be a duplicate of one of them.
      const segment = route.replace('/[slug]', '')
      expect(source).toMatch(
        new RegExp(`path:\\s*\`${segment}/\\$\\{slug\\}\`|canonical:\\s*\`${segment}/\\$\\{slug\\}\``),
      )
    } else {
      expect(source).toMatch(new RegExp(`path:\\s*'${route}'`))
    }

    // `image: null` means "a file convention supplies the card". If that file is renamed
    // or removed — plausible when these routes are next touched — the page keeps promising
    // `twitter:card = summary_large_image` with no image behind it, which is the exact
    // failure class this branch exists to remove, and nothing else would see it.
    if (/image:\s*null/.test(source)) {
      expect(
        existsSync(join(dirname(file), 'opengraph-image.tsx')),
        `${route} passes image: null, so it needs its own opengraph-image.tsx`,
      ).toBe(true)
    }

    // No route may go back to a static `metadata` export.
    //
    // Titles and descriptions live in Sanity now, and a missing `seo` field fails the
    // build — which makes "hardcode it again to get the build green" a plausible panic
    // fix. Everything above would still pass afterwards, because the canonical path
    // literal reads the same either way. This is the line that would not.
    expect(
      source,
      `${route} must read its title and description from the CMS, not a static export`,
    ).not.toMatch(/export const metadata\b/)
  })
})
