/**
 * How a person relates to the firm, which is not the same thing as their job title.
 *
 * /about previously rendered one flat list, so a board member and an accountant appeared
 * as peers under the same heading. A board seat is a governance relationship, not a role
 * in the org chart, and investors read the two differently.
 *
 * Imports nothing, for the same reason as propertyTaxonomy: the Sanity schema and the
 * React components both need this vocabulary, and pulling it from a schema file would
 * drag the whole Studio into the RSC graph.
 */
export const TEAM_GROUPS = ['leadership', 'partner-board'] as const

export type TeamGroup = (typeof TEAM_GROUPS)[number]

/**
 * Typed against the union rather than `string`, so adding a group without a label is a
 * compile error instead of an `undefined` heading rendered to a visitor.
 */
export const TEAM_GROUP_LABELS: Record<TeamGroup, string> = {
  leadership: 'Leadership',
  'partner-board': 'Partners & Board Members',
}
