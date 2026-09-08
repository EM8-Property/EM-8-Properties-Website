/**
 * Chip fills, keyed by asset class and status.
 *
 * In `lib` rather than beside the component for the same reason `propertyTaxonomy.ts` is:
 * this is shared vocabulary and the module imports nothing. It also keeps the
 * colour-literal lint rule honest — its exception list is two files in `lib` plus
 * `global-error.tsx`, rather than an exception shaped like a component.
 *
 * Every fill carries white text at 4.5:1 or better. The original palette ranged 2.16:1 to
 * 4.37:1 — every one failing, on 10px text, on every portfolio card and property header.
 * `tests/unit/chipContrast.test.ts` pins the ratios both ways: text on the fill, and the
 * fill against the page ground.
 *
 * `stabilized` and `lease-up` use the accessible teal (#2C7A74) rather than the accent
 * (#4ABDB5), which measured 2.27:1.
 */
export const CHIP_COLORS: Record<string, string> = {
  multifamily: '#00707F',
  'mixed-use': '#01579B',
  townhomes: '#2E7D32',
  industrial: '#A64B00',
  retail: '#6A1B9A',
  senior: '#455A64',
  stabilized: '#2C7A74',
  'lease-up': '#2C7A74',
  'under-construction': '#01579B',
  'renovation-complete': '#2E7D32',
  'under-contract': '#8C5000',
  sold: '#455A64',
}

export const CHIP_FALLBACK_COLOR = '#455A64'
