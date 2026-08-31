/**
 * Asset-class and status vocabulary — the single source for both the Sanity schema and
 * the UI that renders it.
 *
 * This module deliberately imports nothing. It sits here rather than in
 * `src/sanity/schema/property.ts` because that file imports the `sanity` package, so any
 * component reaching into it for a label would pull the entire Studio library into the
 * React Server Component graph. That fails the build outright — `sanity` imports `swr`,
 * which resolves to a `react-server` build with no default export — and would bloat the
 * client bundle even if it compiled.
 *
 * Keep it free of imports.
 */

export const ASSET_CLASSES = [
  'multifamily',
  'mixed-use',
  'townhomes',
  'industrial',
  'senior',
] as const

export const STATUSES = [
  'stabilized',
  'lease-up',
  'under-construction',
  'renovation-complete',
  'sold',
] as const

export type AssetClass = (typeof ASSET_CLASSES)[number]
export type Status = (typeof STATUSES)[number]

export const ASSET_CLASS_LABELS: Record<string, string> = {
  multifamily: 'Multifamily',
  'mixed-use': 'Mixed-Use',
  townhomes: 'Townhomes',
  industrial: 'Industrial',
  senior: 'Senior Living',
}

export const STATUS_LABELS: Record<string, string> = {
  stabilized: 'Stabilized',
  'lease-up': 'In Lease-Up',
  'under-construction': 'Under Construction',
  'renovation-complete': 'Renovation Complete',
  sold: 'Sold',
}
