import { Eyebrow } from './Eyebrow'

export function SectionHeading({
  eyebrow,
  title,
  intro,
}: {
  eyebrow: string
  title: string
  intro?: string
}) {
  return (
    <div className="max-w-2xl">
      <Eyebrow>{eyebrow}</Eyebrow>
      <h2 className="mt-3 text-3xl font-bold leading-tight tracking-tight text-ink">{title}</h2>
      {intro && <p className="mt-3 text-sm leading-relaxed text-ink-secondary">{intro}</p>}
    </div>
  )
}
