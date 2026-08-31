import { LeadForm } from '@/components/forms/LeadForm'
import { SectionHeading } from './SectionHeading'

/**
 * The closing call to action, shared by the homepage and every property page.
 *
 * Two things were missing before this existed. The homepage stopped after the portfolio
 * grid and ran straight into the footer disclaimer, so a visitor who read the whole
 * narrative was offered nothing to do next. Property pages carried no outbound link at
 * all — the only anchor on one was Leaflet's attribution — even though they are the pages
 * most likely to be reached from LinkedIn or search.
 *
 * It offers two doors on purpose, because they suit different readers:
 *
 *   - an email address, which asks for nothing else. Every comparable sponsor site opens
 *     with a low-friction ask and escalates later; this site's only ask was the
 *     /investors form, which wants a check size and an accreditation declaration from a
 *     stranger. That is the highest-friction possible first contact.
 *   - a scheduling link, for the reader who is further along and would rather talk.
 *
 * `bookACallUrl` is optional content. When it is unset the band still works — a dead
 * button is worse than one door.
 */
export type CtaBandCopy = {
  heading?: { eyebrow?: string | null; title?: string | null; intro?: string | null } | null
  submitLabel?: string | null
  successMessage?: string | null
  callTitle?: string | null
  callBody?: string | null
  callLabel?: string | null
} | null

export function CtaBand({
  bookACallUrl,
  copy,
}: {
  bookACallUrl?: string | null
  copy?: CtaBandCopy
}) {
  return (
    <section className="border-t border-rule bg-panel">
      <div className="mx-auto max-w-[1200px] px-6 py-14">
        <SectionHeading {...(copy?.heading ?? {})} />

        <div className="mt-8 grid gap-8 md:grid-cols-2">
          <div>
            <LeadForm
              source="newsletter"
              submitLabel={copy?.submitLabel ?? 'Keep me posted'}
              successMessage={copy?.successMessage ?? undefined}
              fields={[{ name: 'email', label: 'Email address', type: 'email', required: true }]}
            />
          </div>

          {/*
            Both the destination and the label are required. A link with an href and no
            text is invisible to a screen reader and unlabelled to everyone else — worse
            than the one door the email capture already provides.
          */}
          {bookACallUrl && copy?.callLabel && (
            <div className="border-t border-rule pt-6 md:border-s md:border-t-0 md:pt-0 md:ps-8">
              <p className="text-sm font-semibold text-ink">{copy?.callTitle}</p>
              <p className="mt-2 text-xs leading-relaxed text-ink-secondary">
                {copy?.callBody}
              </p>
              {/*
                An external scheduling host, so it opens in a new tab.
                rel="noopener noreferrer" keeps that page from reaching back into this one
                through window.opener.
              */}
              <a
                href={bookACallUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-4 inline-block rounded-control border border-rule px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-ink hover:border-teal"
              >
                {copy?.callLabel}
              </a>
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
