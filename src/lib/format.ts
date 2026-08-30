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
