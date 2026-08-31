import { ASSET_CLASS_LABELS, STATUS_LABELS } from '@/lib/propertyTaxonomy'

/**
 * Chip fills, all measured at 4.5:1 or better against the white text they carry.
 *
 * The original palette ranged from 2.16:1 (industrial) to 4.37:1 (sold) — every one of
 * them failing WCAG AA, on 8px text, rendered on every portfolio card, property page
 * header, and track-record row. Unlike the teal-fill buttons, these colours appear
 * nowhere in the spec: they were an implementation invention, so there was no design
 * decision to defer to. `tests/unit/chipContrast.test.ts` pins the ratios.
 *
 * `stabilized` and `lease-up` now use the accessible teal (#2C7A74) rather than the
 * accent (#4ABDB5), which measured 2.27:1.
 */
export const CHIP_COLORS: Record<string, string> = {
  multifamily: '#00707F',
  'mixed-use': '#01579B',
  townhomes: '#2E7D32',
  industrial: '#A64B00',
  senior: '#455A64',
  stabilized: '#2C7A74',
  'lease-up': '#2C7A74',
  'under-construction': '#01579B',
  'renovation-complete': '#2E7D32',
  sold: '#455A64',
}

export const CHIP_FALLBACK_COLOR = '#455A64'

const LABELS: Record<string, string> = { ...ASSET_CLASS_LABELS, ...STATUS_LABELS }

/**
 * Asset-class and status pill.
 *
 * Unknown kinds fall back to the raw value rather than rendering blank: if someone adds
 * an asset class in the Studio and forgets the label map, a visible untidy label is far
 * easier to notice and fix than an empty chip.
 */
export function Chip({ kind }: { kind: string }) {
  return (
    <span
      // 10px rather than 8px. At 8px nothing qualifies for the large-text contrast
      // exemption, and the label was barely legible regardless.
      className="inline-block rounded-chip px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.13em] text-white"
      style={{ backgroundColor: CHIP_COLORS[kind] ?? CHIP_FALLBACK_COLOR }}
    >
      {LABELS[kind] ?? kind}
    </span>
  )
}
