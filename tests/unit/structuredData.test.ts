import { describe, it, expect } from 'vitest'
import { organizationJsonLd, articleJsonLd } from '@/lib/structuredData'

describe('organizationJsonLd', () => {
  const org = organizationJsonLd({
    siteUrl: 'https://em-8.com',
    contactEmail: 'info@em-8.com',
  })

  it('identifies the firm to a crawler', () => {
    expect(org['@context']).toBe('https://schema.org')
    expect(org['@type']).toBe('Organization')
    expect(org.name).toBe('EM8 Properties')
    expect(org.url).toBe('https://em-8.com')
    expect(org.email).toBe('info@em-8.com')
  })

  /**
   * Non-negotiable #5 — no placeholder figures ship — applies to machine-readable claims
   * as much as to visible copy, and a crawler cannot tell the difference between a
   * confident guess and a fact. EM8's postal address, logo asset, founding date and
   * social profiles are none of them in the CMS, so none of them are asserted.
   */
  it('asserts nothing the CMS does not actually hold', () => {
    expect(org).not.toHaveProperty('address')
    expect(org).not.toHaveProperty('logo')
    expect(org).not.toHaveProperty('foundingDate')
    expect(org).not.toHaveProperty('sameAs')
    expect(org).not.toHaveProperty('numberOfEmployees')
  })

  it('omits the email rather than emitting an empty one', () => {
    const noEmail = organizationJsonLd({ siteUrl: 'https://em-8.com', contactEmail: null })
    expect(noEmail).not.toHaveProperty('email')
    expect(noEmail.url).toBe('https://em-8.com')
  })
})

describe('articleJsonLd', () => {
  const article = articleJsonLd({
    siteUrl: 'https://em-8.com',
    path: '/insights/we-start-with-the-platform',
    title: 'We start with the platform, not the parcel',
    description: 'Proximity to a station is the one thing nobody can copy.',
    publishedAt: '2026-08-30T12:00:00Z',
  })

  it('describes the article and who published it', () => {
    expect(article['@type']).toBe('Article')
    expect(article.headline).toBe('We start with the platform, not the parcel')
    expect(article.description).toBe('Proximity to a station is the one thing nobody can copy.')
    expect(article.datePublished).toBe('2026-08-30T12:00:00Z')
    expect(article.publisher).toEqual({ '@type': 'Organization', name: 'EM8 Properties' })
    expect(article.author).toEqual({ '@type': 'Organization', name: 'EM8 Properties' })
  })

  it('points at the absolute canonical URL, not a relative path', () => {
    // A relative @id is meaningless to a crawler consuming the JSON on its own.
    expect(article.mainEntityOfPage).toEqual({
      '@type': 'WebPage',
      '@id': 'https://em-8.com/insights/we-start-with-the-platform',
    })
  })

  it('omits a missing date rather than emitting null or an invalid one', () => {
    const undated = articleJsonLd({
      siteUrl: 'https://em-8.com',
      path: '/insights/x',
      title: 'X',
      description: null,
      publishedAt: null,
    })
    expect(undated).not.toHaveProperty('datePublished')
    expect(undated).not.toHaveProperty('description')
    expect(undated.headline).toBe('X')
  })

  it('serialises to JSON a browser will parse', () => {
    // Guards against a value that JSON.stringify drops, such as undefined or a function.
    expect(() => JSON.parse(JSON.stringify(article))).not.toThrow()
    expect(JSON.stringify(article)).not.toContain('undefined')
  })
})
