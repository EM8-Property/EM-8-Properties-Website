export type OfferingData = {
  summary?: string | null
  targetIrr?: string | null
  targetEquityMultiple?: string | null
  targetHoldYears?: number | null
  dealRoomUrl?: string | null
}

/**
 * The offering block spec §4 describes — target returns, "Enter the deal room", and the
 * property's appearance as a current opportunity.
 *
 * `publiclyOffered` is a securities gate, not a display preference. Offerings are marketed
 * under Rule 506(c) (spec §10), and the exemption is elected per offering on its Form D,
 * so a 506(b) raise may never be generally solicited. The component therefore renders
 * nothing unless the toggle is explicitly on — silence is the safe default, and the check
 * lives here rather than at the call site so a new caller cannot forget it.
 *
 * Every figure is labelled as targeted and carries the caveat. Unlabelled, "17.7%" reads
 * as a result, especially on a site whose /track-record page publishes realized multiples
 * in the same visual language.
 */
export function OfferingBlock({
  offering,
  publiclyOffered,
}: {
  offering?: OfferingData | null
  publiclyOffered?: boolean | null
}) {
  if (!publiclyOffered || !offering) return null

  const figures = [
    { label: 'Targeted levered IRR', value: offering.targetIrr },
    { label: 'Targeted equity multiple', value: offering.targetEquityMultiple },
    {
      label: 'Target hold',
      value: offering.targetHoldYears ? `${offering.targetHoldYears} years` : null,
    },
  ].filter((f) => Boolean(f.value))

  if (!offering.summary && figures.length === 0 && !offering.dealRoomUrl) return null

  return (
    <section className="mt-10 rounded-card border border-rule bg-panel p-6">
      <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-teal-text">
        Current Offering
      </p>

      {offering.summary && (
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-ink">{offering.summary}</p>
      )}

      {figures.length > 0 && (
        <dl className="mt-6 grid gap-5 sm:grid-cols-3">
          {figures.map((f) => (
            <div key={f.label} className="border-s-2 border-teal ps-4">
              <dd className="text-2xl font-bold tracking-tight text-ink">{f.value}</dd>
              <dt className="mt-1 text-[10px] font-semibold uppercase tracking-[0.15em] text-ink-secondary">
                {f.label}
              </dt>
            </div>
          ))}
        </dl>
      )}

      {offering.dealRoomUrl && (
        <a
          href={offering.dealRoomUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-6 inline-block rounded-control bg-teal px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-ink hover:bg-[#3AA8A0]"
        >
          Enter the deal room →
        </a>
      )}

      {/*
        Not boilerplate. Every figure above is underwriting, and the site publishes
        realized multiples elsewhere in the same visual language — without this line the
        two are indistinguishable to a reader.
      */}
      <p className="mt-6 max-w-2xl text-[10px] leading-relaxed text-ink-secondary">
        Figures are targeted and underwritten as of the offering date. They rest on
        assumptions about leasing, financing, and market conditions that may not hold, and
        there is no assurance they will be achieved. This is not an offer to sell a
        security. Offers are made only to verified accredited investors through the
        definitive offering documents, which govern.
      </p>
    </section>
  )
}
