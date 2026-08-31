type Story = {
  acquired?: string | null
  executed?: string | null
  exited?: string | null
  equityMultiple?: string | null
  exitYear?: number | null
}

/**
 * The Acquired → Executed → Exited arc for a realized deal.
 *
 * Every figure here describes something that already happened, so the labels say
 * "Realized". Forward-looking words — targeted, projected, underwritten — belong on live
 * offerings and would misstate a closed result if used here.
 */
export function DealStory({ story }: { story: Story }) {
  const stages: [string, string | null | undefined][] = [
    ['Acquired', story.acquired],
    ['Executed', story.executed],
    ['Exited', story.exited],
  ]

  return (
    <div className="mt-4 border-t border-rule pt-4">
      <div className="grid gap-4 sm:grid-cols-3">
        {stages.map(([label, body]) => (
          <div key={label}>
            <h4 className="text-[8px] font-semibold uppercase tracking-[0.15em] text-teal-text">
              {label}
            </h4>
            <p className="mt-1.5 text-[11px] leading-relaxed text-ink-secondary">{body}</p>
          </div>
        ))}
      </div>
      {story.equityMultiple && (
        <div className="mt-4 flex gap-8 border-t border-rule pt-3">
          <div>
            <div className="text-lg font-bold tracking-tight text-teal-text">
              {story.equityMultiple}
            </div>
            <div className="mt-1 text-[8px] font-semibold uppercase tracking-[0.15em] text-ink-secondary">
              Realized Equity Multiple
            </div>
          </div>
          {story.exitYear && (
            <div>
              <div className="text-lg font-bold tracking-tight text-ink">{story.exitYear}</div>
              <div className="mt-1 text-[8px] font-semibold uppercase tracking-[0.15em] text-ink-secondary">
                Exit Year
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
