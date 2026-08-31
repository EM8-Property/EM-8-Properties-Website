'use client'

import { useMemo, useState } from 'react'
import { PropertyCard, type PropertyCardData } from './PropertyCard'
// Single definition, shared with the Sanity schema. Imported from lib/ rather than from
// schema/property.ts, which pulls in the sanity package.
import { ASSET_CLASS_LABELS, STATUS_LABELS } from '@/lib/propertyTaxonomy'

function FilterRow({
  label,
  allLabel,
  options,
  labels,
  active,
  onChange,
}: {
  label: string
  allLabel: string
  options: string[]
  labels: Record<string, string>
  active: string | null
  onChange: (value: string | null) => void
}) {
  const button = (isActive: boolean) =>
    [
      'rounded-chip border px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.12em]',
      isActive
        ? 'border-teal-text bg-teal-text text-white'
        : 'border-rule text-ink-secondary hover:border-teal hover:text-ink',
    ].join(' ')

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="me-1 text-[9px] font-semibold uppercase tracking-[0.16em] text-ink-secondary">
        {label}
      </span>
      <button
        type="button"
        aria-pressed={active === null}
        onClick={() => onChange(null)}
        className={button(active === null)}
      >
        {allLabel}
      </button>
      {options.map((value) => (
        <button
          key={value}
          type="button"
          aria-pressed={active === value}
          onClick={() => onChange(active === value ? null : value)}
          className={button(active === value)}
        >
          {labels[value] ?? value}
        </button>
      ))}
    </div>
  )
}

/**
 * Filterable portfolio index (spec §3).
 *
 * Filtering happens client-side over the already-fetched list. The portfolio is roughly
 * ten properties, so refetching or pushing filter state into the URL would add moving
 * parts for no benefit, and the page stays statically generated.
 *
 * Only values actually present in the data are offered as controls — a filter for an
 * asset class EM8 does not own would be a dead end that returns nothing.
 */
export function PortfolioFilter({ properties }: { properties: PropertyCardData[] }) {
  const [assetClass, setAssetClass] = useState<string | null>(null)
  const [status, setStatus] = useState<string | null>(null)

  const assetClasses = useMemo(
    () => [...new Set(properties.map((p) => p.assetClass))].filter(Boolean).sort(),
    [properties],
  )
  const statuses = useMemo(
    () => [...new Set(properties.map((p) => p.status))].filter(Boolean).sort(),
    [properties],
  )

  const visible = useMemo(
    () =>
      properties.filter(
        (p) =>
          (assetClass === null || p.assetClass === assetClass) &&
          (status === null || p.status === status),
      ),
    [properties, assetClass, status],
  )

  return (
    <div>
      <div className="flex flex-col gap-3 border-y border-rule py-4">
        <FilterRow
          label="Type"
          allLabel="All types"
          options={assetClasses}
          labels={ASSET_CLASS_LABELS}
          active={assetClass}
          onChange={setAssetClass}
        />
        <FilterRow
          label="Status"
          allLabel="All statuses"
          options={statuses}
          labels={STATUS_LABELS}
          active={status}
          onChange={setStatus}
        />
      </div>

      {visible.length === 0 ? (
        <p className="py-16 text-center text-sm text-ink-secondary">
          No properties match those filters.
        </p>
      ) : (
        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {visible.map((p) => (
            <PropertyCard key={p.slug} property={p} />
          ))}
        </div>
      )}
    </div>
  )
}
