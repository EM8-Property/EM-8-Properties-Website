import { SITE_NAME } from './seo'
import type { EmploymentType, SalaryUnit, Workplace } from './jobTaxonomy'

/**
 * JSON-LD builders. Plain data, no React, no Sanity client — so they are testable and
 * cannot drag anything into a client bundle.
 *
 * Scope is deliberately narrow: who the firm is, what an article is, and what a job
 * posting is. There is no markup for properties, offerings or returns. (A job's salary is
 * pay, not a return, so the reasoning below does not reach it.)
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

/**
 * JobPosting, for Google's job search experience.
 * https://developers.google.com/search/docs/appearance/structured-data/job-posting
 *
 * Required by Google: title, description, datePosted, hiringOrganization, jobLocation
 * (or, for a remote role, applicantLocationRequirements with jobLocationType TELECOMMUTE).
 * validThrough is required when the role has a closing date. Everything else here is
 * recommended and is emitted whenever the posting holds a value for it.
 *
 * `description` is HTML because Google asks for the full description as HTML, built from
 * the same sections the page renders so the two cannot say different things.
 */
export type JobSection = {
  heading?: string | null
  body?: string | null
  items?: (string | null)[] | null
}

export type JobForJsonLd = {
  title: string
  slug: string
  datePosted: string
  validThrough?: string | null
  employmentType?: EmploymentType | string | null
  workplace?: Workplace | string | null
  location?: {
    streetAddress?: string | null
    city?: string | null
    state?: string | null
    postalCode?: string | null
  } | null
  salary?: { min?: number | null; max?: number | null; unit?: SalaryUnit | string | null } | null
  summary?: string | null
  sections?: JobSection[] | null
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

/** The posting's body as the small HTML subset Google accepts: p, strong, ul, li. */
export function jobDescriptionHtml(job: Pick<JobForJsonLd, 'summary' | 'sections'>): string {
  const parts: string[] = []
  if (job.summary) parts.push(`<p>${escapeHtml(job.summary)}</p>`)
  for (const section of job.sections ?? []) {
    if (section.heading) parts.push(`<p><strong>${escapeHtml(section.heading)}</strong></p>`)
    for (const para of (section.body ?? '').split(/\n\s*\n/)) {
      if (para.trim()) parts.push(`<p>${escapeHtml(para.trim())}</p>`)
    }
    const items = (section.items ?? []).filter((i): i is string => !!i?.trim())
    if (items.length) {
      parts.push(`<ul>${items.map((i) => `<li>${escapeHtml(i.trim())}</li>`).join('')}</ul>`)
    }
  }
  return parts.join('')
}

/**
 * A date-only closing date is read by Google as midnight at the start of that day, which
 * would end the posting a day early. The end of the day in Chicago is what an editor means
 * by "closes on the 31st". -06:00 is CST; in summer this ends the posting an hour late,
 * which errs the right way.
 */
function endOfDayChicago(date: string): string {
  return `${date}T23:59:59-06:00`
}

export function jobPostingJsonLd({
  siteUrl,
  job,
}: {
  siteUrl: string
  job: JobForJsonLd
}): Record<string, unknown> {
  const remote = job.workplace === 'remote'
  const loc = job.location ?? {}
  const address = {
    '@type': 'PostalAddress',
    ...(loc.streetAddress ? { streetAddress: loc.streetAddress } : {}),
    ...(loc.city ? { addressLocality: loc.city } : {}),
    ...(loc.state ? { addressRegion: loc.state } : {}),
    ...(loc.postalCode ? { postalCode: loc.postalCode } : {}),
    addressCountry: 'US',
  }

  const min = job.salary?.min ?? null
  const max = job.salary?.max ?? null
  const baseSalary =
    min || max
      ? {
          baseSalary: {
            '@type': 'MonetaryAmount',
            currency: 'USD',
            value: {
              '@type': 'QuantitativeValue',
              ...(min && max && min !== max
                ? { minValue: min, maxValue: max }
                : { value: min ?? max }),
              unitText: job.salary?.unit ?? 'YEAR',
            },
          },
        }
      : {}

  return {
    '@context': 'https://schema.org',
    '@type': 'JobPosting',
    title: job.title,
    description: jobDescriptionHtml(job),
    datePosted: job.datePosted,
    ...(job.validThrough ? { validThrough: endOfDayChicago(job.validThrough) } : {}),
    ...(job.employmentType ? { employmentType: job.employmentType } : {}),
    hiringOrganization: {
      '@type': 'Organization',
      '@id': organizationId(siteUrl),
      name: SITE_NAME,
      sameAs: siteUrl,
    },
    // The page carries its own application form, so a candidate applies here without
    // being sent anywhere else. That is the condition Google sets for directApply.
    directApply: true,
    url: `${siteUrl}/careers/${job.slug}`,
    ...(remote
      ? {
          jobLocationType: 'TELECOMMUTE',
          applicantLocationRequirements: { '@type': 'Country', name: 'USA' },
        }
      : { jobLocation: { '@type': 'Place', address } }),
    ...baseSalary,
  }
}
