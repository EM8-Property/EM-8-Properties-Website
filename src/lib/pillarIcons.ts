/**
 * The icon vocabulary for the Strategy pillars — the single source for both the Sanity
 * schema's dropdown and the component that draws them.
 *
 * Here rather than beside either one, for the reason `propertyTaxonomy.ts` gives at
 * length: `src/sanity/schema/pages.ts` imports the `sanity` package, so a component
 * reaching into it for this list would drag the entire Studio into the React Server
 * Component graph and fail the build. This module imports nothing. Keep it that way.
 *
 * A closed list rather than a free-text field. An editor who types `hand-shake` into a
 * string field gets a card with a hole where its icon should be, and nothing in the
 * build, the tests or Lighthouse would say so — `PillarIcon` renders nothing it does not
 * recognise. The dropdown makes that unreachable.
 */

export const PILLAR_ICONS = [
  'resilience',
  'diversified',
  'supply',
  'partnership',
  'transit',
  'growth',
  'households',
] as const

export type PillarIcon = (typeof PILLAR_ICONS)[number]

/** What the Studio dropdown shows. The values above are what documents store. */
export const PILLAR_ICON_LABELS: Record<string, string> = {
  resilience: 'Resilience (shield)',
  diversified: 'Diversified economy (grid)',
  supply: 'Supply (buildings)',
  partnership: 'Partnership (handshake)',
  transit: 'Transit (train)',
  growth: 'Growth (trend line)',
  households: 'Households (people)',
}
