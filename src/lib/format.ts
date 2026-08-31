/**
 * Renders the transit claim as a single countable fact, used identically on every card
 * and every property page. Turning "near transit" into "6 min walk · Oak Forest Metra"
 * repeated across the portfolio is what makes the TOD position legible.
 *
 * Returns null when either half is missing — a walk time without a station name, or a
 * station without a time, says nothing.
 *
 * Note the explicit undefined/null check rather than a falsy one: 0 is a meaningful
 * value here, and the strongest version of the claim.
 */
export function formatWalk(minutes?: number, station?: string): string | null {
  if (minutes === undefined || minutes === null || !station) return null
  return `${minutes} min walk · ${station} Metra`
}

/**
 * Renders the unit mix as one line: "90 Residential · 3 Retail", or "40 Units" when an
 * asset has no retail component.
 *
 * The split is not cosmetic. The live site published residential units while the internal
 * June 2026 portfolio sheet published residential + retail combined, which is the whole
 * reason the two sources disagreed on Boulevard (66/71), 157 & Cicero (90/93), and
 * Waverly Creek (29/31). Collapsing them back into a single "units" figure here would
 * reintroduce exactly that ambiguity at the point a reader sees it.
 *
 * Returns null when neither count is known, so callers never emit a stray separator.
 */
export function formatUnits(
  residential?: number | null,
  retail?: number | null,
): string | null {
  const res = residential ?? 0
  const ret = retail ?? 0
  if (res <= 0 && ret <= 0) return null
  if (res > 0 && ret > 0) return `${res} Residential · ${ret} Retail`
  if (res > 0) return `${res} ${res === 1 ? 'Unit' : 'Units'}`
  return `${ret} Retail`
}
