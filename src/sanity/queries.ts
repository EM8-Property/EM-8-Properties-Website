import { defineQuery } from 'next-sanity'

/**
 * Every GROQ query in the project, in one file.
 *
 * Keeping them together means a schema rename has exactly one place to be reflected, and
 * a reader can see the whole data surface at once instead of hunting through routes.
 *
 * All of them are wrapped in `defineQuery`. That is not decoration: `sanity typegen`
 * only discovers queries declared this way, and without it typegen reports "0 queries"
 * and emits schema types alone. The plan's stated guarantee — that a renamed field fails
 * the build instead of blanking a section in production — depends on the query result
 * types existing, so a plain template literal here would quietly remove the guardrail.
 *
 * Fields are inlined rather than interpolated from a shared constant for the same reason:
 * typegen resolves each query by parsing the literal, so a `${FIELDS}` splice would leave
 * it unable to infer the shape.
 */

export const ALL_PROPERTIES_QUERY = defineQuery(`
  *[_type == "property"] | order(order asc) {
    _id, title, "slug": slug.current, assetClass, status, city, state,
    metraStation, walkMinutes, unitCount, yearBuilt, cardBlurb,
    "image": gallery[0]
  }
`)

export const PROPERTY_BY_SLUG_QUERY = defineQuery(`
  *[_type == "property" && slug.current == $slug][0] {
    _id, title, "slug": slug.current, assetClass, status, city, state,
    metraStation, walkMinutes, unitCount, yearBuilt, cardBlurb,
    "image": gallery[0],
    squareFeet, yearRenovated, overview, businessPlan,
    gallery, coordinates, dealStory, publiclyOffered,
    "relatedPosts": *[_type == "post" && relatedProperty._ref == ^._id] | order(publishedAt desc) {
      title, "slug": slug.current, publishedAt
    }
  }
`)

export const PROPERTY_SLUGS_QUERY = defineQuery(
  `*[_type == "property" && defined(slug.current)].slug.current`,
)

/**
 * The /track-record view. It selects the same `slug` the canonical /portfolio/[slug]
 * page uses — a realized deal is presented here but never given a second URL, which
 * would split its search ranking and double the editing surface.
 */
export const SOLD_PROPERTIES_QUERY = defineQuery(`
  *[_type == "property" && status == "sold"] | order(dealStory.exitYear desc) {
    _id, title, "slug": slug.current, assetClass, status, city, state,
    metraStation, walkMinutes, unitCount, yearBuilt, cardBlurb,
    "image": gallery[0],
    dealStory
  }
`)

export const ALL_POSTS_QUERY = defineQuery(`
  *[_type == "post"] | order(publishedAt desc) {
    _id, title, "slug": slug.current, publishedAt, category, excerpt, heroImage
  }
`)

export const POST_BY_SLUG_QUERY = defineQuery(`
  *[_type == "post" && slug.current == $slug][0] {
    title, "slug": slug.current, publishedAt, category, excerpt, heroImage, body,
    relatedProperty-> { title, "slug": slug.current, city, unitCount, walkMinutes, "image": gallery[0] }
  }
`)

export const POST_SLUGS_QUERY = defineQuery(
  `*[_type == "post" && defined(slug.current)].slug.current`,
)

export const TEAM_QUERY = defineQuery(
  `*[_type == "teamMember"] | order(order asc) { _id, name, role, bio, photo, linkedin }`,
)

export const HERO_STATS_QUERY = defineQuery(
  `*[_type == "heroStat"] | order(order asc) { _id, figure, label }`,
)

export const FOCUS_CARDS_QUERY = defineQuery(
  `*[_type == "focusCard"] | order(order asc) { _id, title, description }`,
)

/**
 * The `consentOnRecord` filter is a compliance gate, not an optimisation: written consent
 * is required before publishing any investor's name, and this is what enforces it.
 * Do not relax this filter.
 */
export const TESTIMONIALS_QUERY = defineQuery(`
  *[_type == "testimonial" && consentOnRecord == true] | order(order asc) {
    _id, quote, attribution, descriptor, investorSince, featured
  }
`)

export const SITE_SETTINGS_QUERY = defineQuery(
  `*[_type == "siteSettings"][0] { agoraPortalUrl, contactEmail, disclaimer, defaultShareImage }`,
)
