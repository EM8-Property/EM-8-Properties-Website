/**
 * Job-posting vocabulary and the small pure helpers the careers pages share.
 *
 * Imports nothing, like `propertyTaxonomy.ts` and for the same reason: the Sanity schema,
 * server components and the JSON-LD builder all read it, and `src/sanity/schema/*` imports
 * the `sanity` package, which must never reach the React Server Component graph.
 */

/**
 * Google's `employmentType` values, stored as-is so the JSON-LD needs no mapping table.
 * https://developers.google.com/search/docs/appearance/structured-data/job-posting
 */
export const EMPLOYMENT_TYPES = [
  'FULL_TIME',
  'PART_TIME',
  'CONTRACTOR',
  'TEMPORARY',
  'INTERN',
] as const
export type EmploymentType = (typeof EMPLOYMENT_TYPES)[number]

export const EMPLOYMENT_TYPE_LABELS: Record<EmploymentType, string> = {
  FULL_TIME: 'Full-time',
  PART_TIME: 'Part-time',
  CONTRACTOR: 'Contract',
  TEMPORARY: 'Temporary',
  INTERN: 'Internship',
}

/**
 * Where the work happens. Only `remote` changes the structured data (Google's
 * `jobLocationType: TELECOMMUTE`); on-site and hybrid roles both carry a physical
 * `jobLocation`, which is what Google requires of them.
 */
export const WORKPLACES = ['on-site', 'hybrid', 'remote'] as const
export type Workplace = (typeof WORKPLACES)[number]

export const WORKPLACE_LABELS: Record<Workplace, string> = {
  'on-site': 'On-site',
  hybrid: 'Hybrid',
  remote: 'Remote',
}

/** Google's `QuantitativeValue.unitText` values for a salary. */
export const SALARY_UNITS = ['YEAR', 'MONTH', 'WEEK', 'HOUR'] as const
export type SalaryUnit = (typeof SALARY_UNITS)[number]

const SALARY_UNIT_SUFFIX: Record<SalaryUnit, string> = {
  YEAR: '',
  MONTH: ' a month',
  WEEK: ' a week',
  HOUR: ' an hour',
}

/** `80000` -> `$80,000`. Whole dollars: nobody posts cents on a salary band. */
function usd(n: number): string {
  return `$${Math.round(n).toLocaleString('en-US')}`
}

/**
 * The salary line as the posting reads it: "$80,000 to $105,000 base, depending on
 * experience". Returns null when there is no figure, so the page omits the line rather
 * than printing a bare note.
 */
export function formatSalary(salary: {
  min?: number | null
  max?: number | null
  unit?: string | null
  note?: string | null
} | null | undefined): string | null {
  if (!salary) return null
  const { min, max, note } = salary
  const suffix = SALARY_UNIT_SUFFIX[(salary.unit ?? 'YEAR') as SalaryUnit] ?? ''
  let figure: string
  if (min && max && min !== max) figure = `${usd(min)} to ${usd(max)}`
  else if (min || max) figure = usd((min ?? max)!)
  else return null
  return [`${figure}${suffix}`, note?.trim()].filter(Boolean).join(' ')
}

/**
 * Whether a posting should be live: published as open, and not past its closing date.
 *
 * The closing date is compared as a calendar date in Chicago, where the jobs are, so a
 * role closing on the 31st stays up for the whole of the 31st. Google's guidance is to take
 * an expired posting down, so the page 404s and the sitemap drops it once this is false.
 */
export function isJobOpen(
  job: { open?: boolean | null; validThrough?: string | null },
  now: Date = new Date(),
): boolean {
  if (job.open !== true) return false
  if (!job.validThrough) return true
  const today = now.toLocaleDateString('en-CA', { timeZone: 'America/Chicago' })
  return job.validThrough >= today
}

/** "Oak Forest, IL". */
export function formatLocation(loc: { city?: string | null; state?: string | null } | null | undefined): string {
  return [loc?.city, loc?.state].filter(Boolean).join(', ')
}
