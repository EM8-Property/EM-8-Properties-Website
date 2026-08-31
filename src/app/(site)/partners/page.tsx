import type { Metadata } from 'next'
import { seoMetadata } from '@/lib/pageSeo'
import { fetchSanity } from '@/sanity/client'
import { PARTNERS_PAGE_QUERY, SITE_SETTINGS_QUERY } from '@/sanity/queries'
import type { PARTNERS_PAGE_QUERY_RESULT, SITE_SETTINGS_QUERY_RESULT } from '@/sanity/types.generated'
import { LeadForm, type FieldSpec } from '@/components/forms/LeadForm'
import { SectionHeading } from '@/components/ui/SectionHeading'
import { Eyebrow } from '@/components/ui/Eyebrow'
import { Card } from '@/components/ui/Card'

export async function generateMetadata(): Promise<Metadata> {
  const [copy, settings] = await Promise.all([
    fetchSanity<PARTNERS_PAGE_QUERY_RESULT>(PARTNERS_PAGE_QUERY),
    fetchSanity<SITE_SETTINGS_QUERY_RESULT>(SITE_SETTINGS_QUERY),
  ])
  return seoMetadata({
    seo: copy?.seo,
    path: '/partners',
    documentName: 'partnersPage',
    shareImage: settings?.defaultShareImage,
  })
}

const SITE_FIELDS: FieldSpec[] = [
  { name: 'firstName', label: 'Your name', type: 'text', required: true },
  { name: 'email', label: 'Email', type: 'email', required: true },
  {
    name: 'investorType',
    label: 'I am a…',
    type: 'select',
    options: ['Broker', 'Municipality', 'Property owner', 'Other'],
  },
  {
    name: 'propertyAddress',
    label: 'Property address or cross streets',
    type: 'text',
    required: true,
  },
  { name: 'message', label: 'Anything we should know?', type: 'textarea' },
]

export default async function PartnersPage() {
  const copy = await fetchSanity<PARTNERS_PAGE_QUERY_RESULT>(PARTNERS_PAGE_QUERY)

  if (!copy?.heading) {
    throw new Error(
      'The partnersPage document is missing. Create it in the Studio under Partners page.',
    )
  }

  return (
    <div className="mx-auto max-w-[1200px] px-6 py-14">
      <SectionHeading {...copy.heading} level={1} />

      <div className="mt-8 grid gap-5 sm:grid-cols-3">
        {(copy.partners ?? []).map(({ eyebrow, title, body }) => (
          <Card key={title}>
            <div className="p-5">
              <Eyebrow>{eyebrow}</Eyebrow>
              <h3 className="mt-2 font-display text-base font-medium uppercase tracking-wide text-ink">
                {title}
              </h3>
              <p className="mt-2 text-xs leading-relaxed text-ink-secondary">{body}</p>
            </div>
          </Card>
        ))}
      </div>

      {/* The audience the current site serves with nothing: brokers, municipalities,
          and land sellers. */}
      <section className="mt-16 grid gap-10 lg:grid-cols-[1.2fr_1fr]">
        <div>
          <SectionHeading {...copy.submissionHeading!} />
          <dl className="mt-5 flex flex-wrap gap-8">
            {(copy.facts ?? []).map(({ label, value }) => (
              <div key={label}>
                <dt className="text-[8px] font-semibold uppercase tracking-[0.15em] text-ink-secondary">
                  {label}
                </dt>
                <dd className="mt-1 text-xs font-semibold text-ink">{value}</dd>
              </div>
            ))}
          </dl>
        </div>
        <div className="rounded-card border border-rule bg-panel p-6">
          <h2 className="mb-4 text-base font-bold tracking-tight text-ink">
            {copy.formTitle}
          </h2>
          <LeadForm
            source="site-submission"
            fields={SITE_FIELDS}
            submitLabel={copy.submitLabel ?? 'Send'}
          />
        </div>
      </section>
    </div>
  )
}
