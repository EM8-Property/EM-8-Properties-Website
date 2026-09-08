import { ASSET_CLASS_LABELS, STATUS_LABELS } from '@/lib/propertyTaxonomy'
import { CHIP_COLORS, CHIP_FALLBACK_COLOR } from '@/lib/chipColors'

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
