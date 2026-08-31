import { pageMetadata } from '@/lib/seo'
import { fetchSanity } from '@/sanity/client'
import {
  SITE_SETTINGS_QUERY,
  TESTIMONIALS_QUERY,
  INVESTORS_PAGE_QUERY,
} from '@/sanity/queries'
import type {
  SITE_SETTINGS_QUERY_RESULT,
  INVESTORS_PAGE_QUERY_RESULT,
  TESTIMONIALS_QUERY_RESULT,
} from '@/sanity/types.generated'
import { LeadForm, type FieldSpec } from '@/components/forms/LeadForm'
import { Testimonials } from '@/components/ui/Testimonials'
import { SectionHeading } from '@/components/ui/SectionHeading'
import { Eyebrow } from '@/components/ui/Eyebrow'

export const metadata = pageMetadata({
  title: 'Investors',
  description:
    'We work with accredited investors, family offices, and joint-venture partners across the Chicago MSA.',
  path: '/investors',
})

const FIELDS: FieldSpec[] = [
  { name: 'firstName', label: 'First name', type: 'text', required: true },
  { name: 'lastName', label: 'Last name', type: 'text' },
  { name: 'email', label: 'Email', type: 'email', required: true },
  { name: 'phone', label: 'Phone (optional)', type: 'tel' },
  {
    name: 'investorType',
    label: 'Investor type',
    type: 'select',
    options: ['Individual', 'Family office', 'RIA', 'JV partner'],
  },
  {
    name: 'checkSize',
    label: 'Typical check size',
    type: 'select',
    options: ['Under $100k', '$100k–$250k', '$250k–$1M', '$1M+'],
  },
  { name: 'message', label: 'What are you looking for?', type: 'textarea' },
  {
    name: 'accreditedConfirmed',
    label: 'I confirm I am an accredited investor',
    type: 'checkbox',
    required: true,
  },
]

export default async function InvestorsPage() {
  const [settings, testimonials, copy] = await Promise.all([
    fetchSanity<SITE_SETTINGS_QUERY_RESULT>(SITE_SETTINGS_QUERY),
    fetchSanity<TESTIMONIALS_QUERY_RESULT>(TESTIMONIALS_QUERY),
    fetchSanity<INVESTORS_PAGE_QUERY_RESULT>(INVESTORS_PAGE_QUERY),
  ])

  if (!copy?.heading) {
    throw new Error(
      'The investorsPage document is missing. Create it in the Studio under ' +
        'Investors page.',
    )
  }

  return (
    <div className="mx-auto max-w-[1200px] px-6 py-14">
      <div className="grid gap-10 lg:grid-cols-[1.3fr_1fr]">
        <div>
          <SectionHeading {...copy.heading} level={1} />
          {settings?.agoraPortalUrl && (
            <a
              href={settings.agoraPortalUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-5 inline-block rounded-control bg-ink px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-white"
            >
              {copy.loginLabel}
            </a>
          )}

          <h2 className="mt-10 text-lg font-bold tracking-tight text-ink">
            {copy.stepsTitle}
          </h2>
          <ol className="mt-4 grid gap-3">
            {(copy.steps ?? []).map(({ title, body }, i) => (
              <li key={title} className="flex gap-3">
                <span className="flex size-5 shrink-0 items-center justify-center rounded-chip bg-teal-text text-[10px] font-bold text-white">
                  {i + 1}
                </span>
                <span>
                  <span className="block text-xs font-semibold text-ink">{title}</span>
                  <span className="mt-1 block text-[11px] leading-relaxed text-ink-secondary">
                    {body}
                  </span>
                </span>
              </li>
            ))}
          </ol>
        </div>

        <div className="rounded-card border border-rule bg-panel p-6">
          <Eyebrow>{copy.keepInTouchHeading!.eyebrow}</Eyebrow>
          <h2 className="mt-2 text-lg font-bold tracking-tight text-ink">
            {copy.keepInTouchHeading!.title}
          </h2>
          <p className="mb-4 mt-1.5 text-[11px] leading-relaxed text-ink-secondary">
            {copy.keepInTouchHeading!.intro}
          </p>
          <LeadForm
            source="keep-in-touch"
            fields={FIELDS}
            submitLabel={copy.submitLabel ?? 'Send'}
          />
        </div>
      </div>

      {testimonials.length > 0 && (
        <section className="mt-16">
          <SectionHeading {...copy.testimonialsHeading!} />
          <div className="mt-6">
            <Testimonials items={testimonials} />
          </div>
        </section>
      )}
    </div>
  )
}
