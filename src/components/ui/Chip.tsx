const CHIP_COLORS: Record<string, string> = {
  multifamily: '#00BCD4',
  'mixed-use': '#0288D1',
  townhomes: '#4CAF50',
  industrial: '#FF9800',
  senior: '#607D8B',
  stabilized: '#4ABDB5',
  'lease-up': '#4ABDB5',
  'under-construction': '#0288D1',
  'renovation-complete': '#4CAF50',
  sold: '#607D8B',
}

const LABELS: Record<string, string> = {
  multifamily: 'Multifamily',
  'mixed-use': 'Mixed-Use',
  townhomes: 'Townhomes',
  industrial: 'Industrial',
  senior: 'Senior Living',
  stabilized: 'Stabilized',
  'lease-up': 'In Lease-Up',
  'under-construction': 'Under Construction',
  'renovation-complete': 'Renovation Complete',
  sold: 'Sold',
}

/**
 * Asset-class and status pill.
 *
 * The chip colours are solid backgrounds behind white text, so they are not subject to
 * the small-teal-text rule — `stabilized` uses the accent teal as a fill, which is what
 * the accent is for.
 *
 * Unknown kinds fall back to the raw value rather than rendering blank: if someone adds
 * an asset class in the Studio and forgets this map, a visible untidy label is far easier
 * to notice and fix than an empty chip.
 */
export function Chip({ kind }: { kind: string }) {
  return (
    <span
      className="inline-block rounded-chip px-2 py-1 text-[8px] font-semibold uppercase tracking-[0.13em] text-white"
      style={{ backgroundColor: CHIP_COLORS[kind] ?? '#607D8B' }}
    >
      {LABELS[kind] ?? kind}
    </span>
  )
}
