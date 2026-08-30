import Link from 'next/link'
import { Eyebrow } from '@/components/ui/Eyebrow'

type Props = {
  unitCount?: number | null
  yearBuilt?: number | null
  squareFeet?: number | null
  walkMinutes?: number | null
  metraStation?: string | null
  publiclyOffered?: boolean | null
}

// `even:border-e-0` clears the trailing border on the right-hand column of the 2-column
// grid. `last:border-e-0` alone only cleared the final cell, leaving a dangling border
// down the whole right edge.
function Fact({ figure, label }: { figure: string; label: string }) {
  return (
    <div className="border-b border-e border-rule p-4 even:border-e-0 last:border-e-0">
      <div className="text-xl font-bold tracking-tight text-ink">{figure}</div>
      <div className="mt-1 text-[8px] font-semibold uppercase tracking-[0.15em] text-ink-secondary">
        {label}
      </div>
    </div>
  )
}

export function FactRail({ property: p }: { property: Props }) {
  const hasWalk = p.walkMinutes !== undefined && p.walkMinutes !== null && !!p.metraStation

  return (
    <aside>
      <div className="grid grid-cols-2 rounded-card border border-rule">
        {p.unitCount != null && <Fact figure={String(p.unitCount)} label="Units" />}
        {p.yearBuilt != null && <Fact figure={String(p.yearBuilt)} label="Built" />}
        {hasWalk && <Fact figure={`${p.walkMinutes} min`} label="Walk to Metra" />}
        {p.squareFeet != null && (
          <Fact figure={p.squareFeet.toLocaleString('en-US')} label="Square Feet" />
        )}
      </div>

      {/*
        Gated on publiclyOffered, which defaults false. Only offerings filed under Rule
        506(c) may be marketed publicly; a 506(b) raise appearing here would be a
        general-solicitation problem, not a layout bug.

        The copy states availability, never a return. "Targeted", "projected",
        "underwritten", and "estimated" are the permitted register — never "guaranteed"
        or "will return".
      */}
      {p.publiclyOffered && (
        <div className="mt-4 rounded-card border border-rule p-5">
          <Eyebrow>Interested in this asset?</Eyebrow>
          <p className="mt-2 text-xs leading-relaxed text-ink-secondary">
            Offering materials are available to verified accredited investors through our
            portal.
          </p>
          {/* Link, not a raw anchor — an internal href on <a> forces a full reload. */}
          <Link
            href="/investors"
            className="mt-3 block rounded-control bg-teal px-4 py-2.5 text-center text-[11px] font-semibold uppercase tracking-wide text-white"
          >
            Enter the deal room
          </Link>
        </div>
      )}
    </aside>
  )
}
