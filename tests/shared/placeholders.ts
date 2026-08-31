/**
 * Every figure spec §9 lists as invented during design, none of which may ship.
 *
 * This list exists because the plan's original placeholder gate searched only for
 * "Lorem", "TODO", "TBD", "placeholder", and "example.com" — none of which match a single
 * number in §9. Every invented figure would have shipped with the test passing green.
 *
 * The check is deliberately blunt. A false positive means a real figure happens to match
 * an invented one; the fix is to delete that entry here with a note, not to weaken the
 * matching. Silence from this gate must mean "checked", not "not looked".
 */

export type Placeholder = { pattern: RegExp; note: string }

export const SPEC_9_PLACEHOLDERS: Placeholder[] = [
  // Deal-level returns invented for layout.
  { pattern: /\b2\.1x\b/i, note: 'Burbank equity multiple — invented (spec §9)' },
  { pattern: /\b1\.7x\b/i, note: 'Embassy equity multiple — invented (spec §9)' },

  // Spec §9 says "Burbank 2.1x and 2019 exit; Embassy 1.7x and 2021 exit" — the exit
  // years are invented too, and dealStory.exitYear is a rendered field.
  { pattern: /\bexit(?:ed)?\D{0,12}\b(?:2019|2021)\b/i, note: 'Burbank/Embassy exit year — invented (spec §9)' },
  { pattern: /"exitYear"\s*:\s*(?:2019|2021)\b/, note: 'Burbank/Embassy exitYear — invented (spec §9)' },

  // "Boulevard target multiple/IRR/cash-on-cash/hold" — every forward-looking figure on
  // that deal was invented. Any of these appearing alongside a percentage or multiple is
  // a figure that has to be confirmed before it ships.
  { pattern: /\bcash[- ]on[- ]cash\b/i, note: 'Boulevard cash-on-cash — invented (spec §9)' },
  { pattern: /\btarget(?:ed)?\s+(?:IRR|multiple)\b/i, note: 'Boulevard target IRR/multiple — invented (spec §9)' },

  // Municipal stats. "0 zoning litigations" is called out in the spec as powerful if
  // true and a liability if not, so it must be verified rather than merely retyped.
  { pattern: /\bzoning litigation/i, note: '"0 zoning litigations" — unverified (spec §9)' },
  { pattern: /\b5 municipalities\b/i, note: 'Municipal count — invented (spec §9)' },
  { pattern: /\b90 units entitled\b/i, note: 'Oak Forest entitlement — invented (spec §9)' },

  // Boulevard retail figures.
  { pattern: /\b4 suites\b/i, note: 'Boulevard retail suites — invented (spec §9)' },
  { pattern: /\b6,?200\s*(SF|square feet)\b/i, note: 'Boulevard retail SF — invented (spec §9)' },
]

/**
 * Figures confirmed real in spec §9, recorded so nobody later "tidies" them into the
 * denylist above. The last two are the most LP-relevant proof EM8 owns and appear
 * nowhere on the current site.
 */
export const CONFIRMED_REAL = [
  '$100M+ AUM',
  '1,350+ units managed',
  '750+ units sold',
  '10+ years',
  '1.79x realized equity multiple',
  '36.2% average annual return on equity',
]
