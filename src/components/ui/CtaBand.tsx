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
export function CtaBand({
  bookACallUrl,
  eyebrow = 'Get Started',
  title = 'Tell us where to send what we find',
  intro = 'We look at transit-adjacent multifamily, mixed-use, and retail across the Chicago MSA. Leave an address and we will share what we are working on, or book a call and ask us directly.',
}: {
  bookACallUrl?: string | null
  eyebrow?: string
  title?: string
  intro?: string
}) {
  return (
    <section className="border-t border-rule bg-panel">
      <div className="mx-auto max-w-[1200px] px-6 py-14">
        <SectionHeading eyebrow={eyebrow} title={title} intro={intro} />

        <div className="mt-8 grid gap-8 md:grid-cols-2">
          <div>
            <LeadForm
              source="newsletter"
              submitLabel="Keep me posted"
              successMessage="Thank you — we have your address and will be in touch when something fits."
              fields={[{ name: 'email', label: 'Email address', type: 'email', required: true }]}
            />
          </div>

          {bookACallUrl && (
            <div className="border-t border-rule pt-6 md:border-s md:border-t-0 md:pt-0 md:ps-8">
              <p className="text-sm font-semibold text-ink">Would rather talk it through?</p>
              <p className="mt-2 text-xs leading-relaxed text-ink-secondary">
                Book twenty minutes with us. No materials required, and no obligation on
                either side.
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
                Book a call →
              </a>
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
