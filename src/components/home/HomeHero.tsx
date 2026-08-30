import { Eyebrow } from '@/components/ui/Eyebrow'
import { Button } from '@/components/ui/Button'

/**
 * Lives here rather than being exported from app/page.tsx, as the plan had it, so the
 * homepage test can render it without importing the page module and dragging its whole
 * Sanity-fetching graph into a unit test.
 *
 * The hero leads with purpose, not the balance sheet. The old site opened by saying
 * "we own $100M of buildings" — the proof band below states that; the headline does not
 * need to. No figure is hardcoded here at all, so nothing in the hero can drift from the
 * CMS or survive as an invented placeholder.
 */
export function HomeHero() {
  return (
    <div className="mx-auto max-w-[1200px] px-6 pb-10 pt-14">
      <Eyebrow>Transit-Oriented Development · Suburban Chicago</Eyebrow>
      <h1 className="mt-4 max-w-[19ch] text-5xl font-bold leading-[1.08] tracking-tight text-ink">
        Creating communities people <span className="text-teal-text">choose to live in</span>.
      </h1>
      <p className="mt-5 max-w-[56ch] text-sm leading-relaxed text-ink-secondary">
        We develop and operate multifamily and mixed-use housing within walking distance of
        Metra stations — working with municipalities rather than around them.
      </p>
      <div className="mt-6 flex gap-3">
        <Button href="/portfolio">View Portfolio →</Button>
        <Button href="/insights" variant="secondary">
          Read Our Thinking
        </Button>
      </div>
    </div>
  )
}
