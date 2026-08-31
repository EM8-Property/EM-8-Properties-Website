import { describe, it, expect } from 'vitest'
import { seoMetadata, resolveShareImage } from '@/lib/pageSeo'
import { SHARE_CARD } from '@/lib/seo'
import { PAGE_SEO } from '../../scripts/content/em8-content.mjs'

describe('seoMetadata', () => {
  const meta = seoMetadata({
    seo: { title: 'About', description: 'Creating communities people choose to live in.' },
    path: '/about',
    documentName: 'aboutPage',
  })

  it('builds the page title, canonical and description from the CMS block', () => {
    expect(meta.title).toBe('About | EM8 Properties')
    expect(meta.description).toBe('Creating communities people choose to live in.')
    expect(meta.alternates?.canonical).toBe('/about')
  })

  it('falls back to the generated card when no share image is set', () => {
    expect(meta.openGraph?.images).toEqual([SHARE_CARD])
  })

  /**
   * The same rule as siteSettings and the page copy documents: missing required content
   * fails the build with a message naming the fix, rather than rendering a page titled
   * "undefined | EM8 Properties". Silent fallback content is the failure mode the old
   * site's constants.ts created, and it is why nobody noticed that site had drifted from
   * its own CMS.
   */
  it.each([
    ['no document at all', undefined],
    ['a document with no seo block', null],
    ['a title but no description', { title: 'About', description: null }],
    ['a description but no title', { title: null, description: 'Something.' }],
    ['an empty title', { title: '', description: 'Something.' }],
  ])('throws for %s, naming the document', (_label, seo) => {
    expect(() => seoMetadata({ seo, path: '/about', documentName: 'aboutPage' })).toThrow(
      /aboutPage/,
    )
  })
})

describe('resolveShareImage', () => {
  it('uses the generated card when siteSettings has no default', () => {
    expect(resolveShareImage(null)).toEqual(SHARE_CARD)
    expect(resolveShareImage(undefined)).toEqual(SHARE_CARD)
  })

  it('builds a card from defaultShareImage when one is set', () => {
    // The field has existed since the beginning and was queried but read by nothing, so
    // uploading an image there changed no page. This is the wiring it was missing.
    const image = resolveShareImage({
      _type: 'image',
      asset: { _ref: 'image-abc123-1200x630-jpg', _type: 'reference' },
    })
    expect(image.url).toContain('abc123')
    expect(image.width).toBe(1200)
    expect(image.height).toBe(630)
    expect(image.alt).toBe('EM8 Properties')
  })
})

/**
 * The seeded copy is transcribed from the `metadata` exports these pages carried before
 * the move into Sanity. These bounds are the schema's `validation` caps: a value that
 * exceeds them seeds fine and then fails validation in the Studio, where an editor meets
 * it as an error on content they did not write.
 */
describe('the seeded page SEO copy', () => {
  const entries = Object.entries(PAGE_SEO)

  it('covers every page singleton', () => {
    expect(entries.map(([id]) => id).sort()).toEqual([
      'aboutPage',
      'homePage',
      'insightsPage',
      'investorsPage',
      'partnersPage',
      'portfolioPage',
      'trackRecordPage',
    ])
  })

  it.each(entries)('%s fits the schema limits', (_id, seo) => {
    expect(seo.title.length).toBeGreaterThan(0)
    expect(seo.title.length).toBeLessThanOrEqual(60)
    expect(seo.description.length).toBeGreaterThan(0)
    expect(seo.description.length).toBeLessThanOrEqual(155)
  })

  it.each(entries)('%s does not repeat the site name in its title', (_id, seo) => {
    // `pageTitle` appends " | EM8 Properties". The homepage is the one page whose title is
    // the site name itself, and `pageTitle` returns that unchanged rather than doubling it.
    if (_id === 'homePage') {
      expect(seo.title).toBe('EM8 Properties')
    } else {
      expect(seo.title).not.toMatch(/EM8 Properties/)
      expect(seo.title).not.toContain('|')
    }
  })
})
