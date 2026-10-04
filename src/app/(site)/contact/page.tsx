import type { Metadata } from 'next'
import { seoMetadata } from '@/lib/pageSeo'
import { fetchSanity } from '@/sanity/client'
import { CONTACT_PAGE_QUERY, SITE_SETTINGS_QUERY } from '@/sanity/queries'
import type { CONTACT_PAGE_QUERY_RESULT, SITE_SETTINGS_QUERY_RESULT } from '@/sanity/types.generated'
import { LeadForm, type FieldSpec } from '@/components/forms/LeadForm'
import { SectionHeading } from '@/components/ui/SectionHeading'
import { PageHero } from '@/components/layout/PageHero'
import type { CarouselSlide } from '@/components/layout/HeroCarousel'

export async function generateMetadata(): Promise<Metadata> {
  const [copy, settings] = await Promise.all([
    fetchSanity<CONTACT_PAGE_QUERY_RESULT>(CONTACT_PAGE_QUERY),
    fetchSanity<SITE_SETTINGS_QUERY_RESULT>(SITE_SETTINGS_QUERY),
  ])
  return seoMetadata({
    seo: copy?.seo,
    path: '/contact',
    documentName: 'contactPage',
    shareImage: settings?.defaultShareImage,
  })
}

/*
 * The lightest form on the site, on purpose. /investors asks for a check size and an
 * accreditation declaration and /partners asks for an address; this page is for the
 * person who only wants to ask a question, so it asks for a name, an email and the
 * question, with a phone number if they would rather be called.
 *
 * "I am a…" is stored in `investorType`, the same column /partners uses for its own
 * select, so the team can sort a general enquiry by who sent it without a new field.
 */
const CONTACT_FIELDS: FieldSpec[] = [
  { name: 'firstName', label: 'Your name', type: 'text', required: true },
  { name: 'email', label: 'Email', type: 'email', required: true },
  { name: 'phone', label: 'Phone (optional)', type: 'tel' },
  {
    name: 'investorType',
    label: 'I am a…',
    type: 'select',
    options: ['Investor', 'Broker', 'Property owner', 'Municipality', 'Resident', 'Other'],
  },
  { name: 'message', label: 'How can we help?', type: 'textarea', required: true },
]

export default async function ContactPage() {
  const [copy, settings] = await Promise.all([
    fetchSanity<CONTACT_PAGE_QUERY_RESULT>(CONTACT_PAGE_QUERY),
    fetchSanity<SITE_SETTINGS_QUERY_RESULT>(SITE_SETTINGS_QUERY),
  ])

  if (!copy?.heading) {
    throw new Error(
      'The contactPage document is missing. Create it in the Studio under Contact page.',
    )
  }

  const contactEmail = settings?.contactEmail
  // Both halves, as in CtaBand: a link with an address and no words, or words and no
  // address, is worse than leaving the door out.
  const callLabel = settings?.ctaBand?.callLabel

  return (
    <div>
      {/* A sibling of the measure, never inside it — see /partners. */}
      <PageHero
        copy={copy.heading}
        slides={(settings?.heroCarousel ?? []) as CarouselSlide[]}
      />

      <div className="mx-auto max-w-[1200px] px-6 py-14">
        <section className="grid gap-10 lg:grid-cols-[1fr_1.2fr]">
          <div>
            <SectionHeading {...copy.detailsHeading!} />
            <div className="mt-6 grid gap-6">
              {contactEmail && (
                <div>
                  <p className="text-[8px] font-semibold uppercase tracking-[0.15em] text-ink-secondary">
                    Email
                  </p>
                  <a
                    href={`mailto:${contactEmail}`}
                    className="mt-1 inline-block text-sm font-semibold text-teal-text hover:text-ink"
                  >
                    {contactEmail}
                  </a>
                </div>
              )}
              {settings?.bookACallUrl && callLabel && (
                <div>
                  {/* External scheduling host: new tab, and noopener keeps it off window.opener. */}
                  <a
                    href={settings.bookACallUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-block rounded-control border border-rule px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-ink hover:border-teal"
                  >
                    {callLabel}
                  </a>
                </div>
              )}
            </div>
          </div>

          <div className="rounded-card border border-rule bg-panel p-6">
            <h2 className="mb-4 text-base font-bold tracking-tight text-ink">
              {copy.formTitle}
            </h2>
            <LeadForm
              source="contact"
              fields={CONTACT_FIELDS}
              submitLabel={copy.submitLabel ?? 'Send'}
              successMessage={copy.successMessage ?? undefined}
            />
          </div>
        </section>
      </div>
    </div>
  )
}
