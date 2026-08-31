import { SITE_NAME } from './seo'

/**
 * JSON-LD builders. Plain data, no React, no Sanity client — so they are testable and
 * cannot drag anything into a client bundle.
 *
 * Scope is deliberately narrow: who the firm is, and what an article is. There is no
 * markup for properties, offerings or returns.
 *
 * That is a compliance decision, not an oversight. Schema.org's real-estate and product
 * vocabularies exist to describe things that are for sale, with `Offer` and `price`
 * alongside them, and the site markets under Rule 506(c) — where `publiclyOffered` gates
 * whether an offering block appears at all and every figure has to carry its
 * realized/targeted distinction. Restating a targeted IRR as a machine-readable price-like
 * claim, stripped of the qualifying language the page around it carries, is exactly the
 * kind of statement the draft disclaimer exists to prevent. It needs securities counsel,
 * not a developer, so it is not here.
 */

type OrganizationJsonLd = {
  '@context': string
  '@type': 'Organization'
  '@id': string
  name: string
  url: string
  email?: string
}

/** Stable identifier so the Article's publisher refers to this node instead of restating it. */
export function organizationId(siteUrl: string): string {
  return `${siteUrl}/#organization`
}

export function organizationJsonLd({
  siteUrl,
  contactEmail,
}: {
  siteUrl: string
  contactEmail?: string | null
}): OrganizationJsonLd {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    '@id': organizationId(siteUrl),
    name: SITE_NAME,
    url: siteUrl,
    // Every other Organization property a crawler might want — postal address, logo,
    // foundingDate, sameAs — is absent from the CMS, and a crawler cannot tell a
    // confident guess from a fact. Non-negotiable #5 applies to machine-readable claims
    // too, so nothing is asserted that is not held somewhere real.
    ...(contactEmail ? { email: contactEmail } : {}),
  }
}

/**
 * Points at the Organization node the layout emits on the same page, and describes itself.
 *
 * Both halves matter. The `@id` links the two into one graph rather than leaving two
 * unconnected nodes for the same firm. The `@type` and `name` keep the Article valid read
 * on its own: Google treats `author.name` as required when `author` is present, and
 * whether a crawler resolves an `@id` across two separate `<script>` blocks on one page is
 * an assumption, not a documented guarantee. A bare reference traded a certainty for that
 * assumption on the one page /insights exists for; two extra keys retire the question.
 */
type Attribution = { '@id': string; '@type': 'Organization'; name: string }

type ArticleJsonLd = {
  '@context': string
  '@type': 'Article'
  headline: string
  mainEntityOfPage: { '@type': 'WebPage'; '@id': string }
  author: Attribution
  publisher: Attribution
  description?: string
  datePublished?: string
  image?: string
}

export function articleJsonLd({
  siteUrl,
  path,
  title,
  description,
  publishedAt,
  image,
}: {
  siteUrl: string
  /** Root-relative path; resolved here, since a relative `@id` is meaningless. */
  path: string
  title: string
  description?: string | null
  publishedAt?: string | null
  /** Absolute URL. Google lists `image` as recommended on Article. */
  image?: string | null
}): ArticleJsonLd {
  const attribution: Attribution = {
    '@id': organizationId(siteUrl),
    '@type': 'Organization',
    name: SITE_NAME,
  }

  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: title,
    mainEntityOfPage: { '@type': 'WebPage', '@id': `${siteUrl}${path}` },
    // The firm is both author and publisher: the articles are written in EM8's voice and
    // no byline appears anywhere on the page. Inventing a named author to fill the field
    // would be asserting something the page does not say.
    author: attribution,
    publisher: attribution,
    ...(description ? { description } : {}),
    ...(publishedAt ? { datePublished: publishedAt } : {}),
    ...(image ? { image } : {}),
  }
}
