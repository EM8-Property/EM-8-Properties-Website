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
  *[_type == "property" && showInPortfolio != false] | order(order asc) {
    _id, title, "slug": slug.current, assetClass, status, city, state,
    metraStation, walkMinutes, unitCount, retailUnitCount, yearBuilt, cardBlurb,
    "image": gallery[0]
  }
`)

export const PROPERTY_BY_SLUG_QUERY = defineQuery(`
  *[_type == "property" && slug.current == $slug][0] {
    _id, title, "slug": slug.current, assetClass, status, city, state,
    metraStation, walkMinutes, unitCount, retailUnitCount, yearBuilt, cardBlurb,
    "image": gallery[0],
    squareFeet, yearRenovated, overview, businessPlan,
    gallery, coordinates, dealStory, publiclyOffered, offering,
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
    metraStation, walkMinutes, unitCount, retailUnitCount, yearBuilt, cardBlurb,
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
    relatedProperty-> { title, "slug": slug.current, city, unitCount, retailUnitCount, walkMinutes, "image": gallery[0] }
  }
`)

export const POST_SLUGS_QUERY = defineQuery(
  `*[_type == "post" && defined(slug.current)].slug.current`,
)

export const TEAM_QUERY = defineQuery(
  `*[_type == "teamMember"] | order(order asc) { _id, name, role, bio, photo, linkedin, group }`,
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

/**
 * The current-opportunity module spec §4 refers to.
 *
 * Filtered on publiclyOffered, which is the Rule 506(c) gate: an offering not filed
 * under 506(c) may not be generally solicited, so it must never reach a public page by
 * default. The filter is the enforcement, not a convenience.
 */
export const CURRENT_OFFERINGS_QUERY = defineQuery(`
  *[_type == "property" && publiclyOffered == true] | order(order asc) {
    _id, title, "slug": slug.current, assetClass, status, city, state,
    metraStation, walkMinutes, unitCount, retailUnitCount, yearBuilt, cardBlurb,
    "image": gallery[0], offering
  }
`)

export const SITE_SETTINGS_QUERY = defineQuery(
  `*[_type == "siteSettings"][0] {
    agoraPortalUrl, contactEmail, bookACallUrl, disclaimer, defaultShareImage,
    ctaBand {
      heading { eyebrow, title, intro },
      submitLabel, successMessage, callTitle, callBody, callLabel
    },
    heroCarousel[]{ image, "slug": property->slug.current, "propertyTitle": property->title }
  }`,
)

/**
 * Per-page copy, closing plan revision D4.
 *
 * Each is a pinned singleton fetched by its fixed id rather than by `[0]` on a type. The
 * Studio pins the same ids, so there is no second document for these to silently prefer.
 * Fields are inlined here for the same typegen reason as everywhere else in this file.
 */
export const HOME_PAGE_QUERY = defineQuery(`
  *[_id == "homePage"][0] {
    seo { title, description },
    hero { eyebrow, title, titleAccent, titleSuffix, intro,
           primaryCta { label, href }, secondaryCta { label, href } },
    factorsHeading { eyebrow, title, intro },
    insightsHeading { eyebrow, title, intro },
    portfolioHeading { eyebrow, title, intro },
    offeringsHeading { eyebrow, title, intro },
    testimonialsHeading { eyebrow, title, intro },
    partnersTeaser { eyebrow, title, intro },
    partnersTeaserCta { label, href },
    portfolioCta { label, href },
    popup { enabled, eyebrow, title, body, submitLabel, successMessage }
  }
`)

export const ABOUT_PAGE_QUERY = defineQuery(`
  *[_id == "aboutPage"][0] {
    seo { title, description },
    hero { eyebrow, title, titleAccent, titleSuffix, intro },
    factorsHeading { eyebrow, title, intro },
    leadershipTitle,
    boardTitle
  }
`)

export const PARTNERS_PAGE_QUERY = defineQuery(`
  *[_id == "partnersPage"][0] {
    seo { title, description },
    heading { eyebrow, title, intro },
    partners[] { eyebrow, title, body },
    submissionHeading { eyebrow, title, intro },
    facts[] { label, value },
    formTitle,
    submitLabel
  }
`)

export const INVESTORS_PAGE_QUERY = defineQuery(`
  *[_id == "investorsPage"][0] {
    seo { title, description },
    heading { eyebrow, title, intro },
    loginLabel,
    stepsTitle,
    steps[] { title, body },
    keepInTouchHeading { eyebrow, title, intro },
    submitLabel,
    testimonialsHeading { eyebrow, title, intro }
  }
`)

/**
 * The three routes whose only stored copy is their search title and description.
 *
 * Written out separately rather than built from a shared string: typegen only discovers
 * queries declared literally inside `defineQuery` and cannot resolve an interpolated
 * fragment — it silently reports "0 queries" and the type safety this CMS was chosen for
 * disappears. Three near-identical queries is the price of that guarantee.
 */
export const PORTFOLIO_PAGE_QUERY = defineQuery(`
  *[_id == "portfolioPage"][0] {
    seo { title, description }
  }
`)

export const INSIGHTS_PAGE_QUERY = defineQuery(`
  *[_id == "insightsPage"][0] {
    seo { title, description }
  }
`)

export const TRACK_RECORD_PAGE_QUERY = defineQuery(`
  *[_id == "trackRecordPage"][0] {
    seo { title, description }
  }
`)
