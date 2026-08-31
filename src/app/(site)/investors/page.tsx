import type { Metadata } from 'next'
import { fetchSanity } from '@/sanity/client'
import { SITE_SETTINGS_QUERY, TESTIMONIALS_QUERY } from '@/sanity/queries'
import type {
  SITE_SETTINGS_QUERY_RESULT,
  TESTIMONIALS_QUERY_RESULT,
} from '@/sanity/types.generated'
import { LeadForm, type FieldSpec } from '@/components/forms/LeadForm'
import { Testimonials } from '@/components/ui/Testimonials'
import { SectionHeading } from '@/components/ui/SectionHeading'
import { Eyebrow } from '@/components/ui/Eyebrow'

export const metadata: Metadata = {
  title: 'Investors | EM8 Properties',
  description:
    'We work with accredited investors, family offices, and joint-venture partners across the Chicago MSA.',
}

/**
 * How an investment works. Every step describes process, never outcome — no step states
 * or implies a return.
 */
const STEPS: [string, string][] = [
  [
    'Verify and review',
    'Our portal verifies your accreditation. Then you get the full offering materials.',
  ],
  ['Commit and fund', 'Subscription documents and capital calls are handled in the portal.'],
  [
    'Hold and receive',
    'Quarterly reporting and distributions. Statements are there whenever you want them.',
  ],
  ['Exit', 'Refinance or sale, with proceeds distributed per the operating agreement.'],
]

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
  const [settings, testimonials] = await Promise.all([
    fetchSanity<SITE_SETTINGS_QUERY_RESULT>(SITE_SETTINGS_QUERY),
    fetchSanity<TESTIMONIALS_QUERY_RESULT>(TESTIMONIALS_QUERY),
  ])

  return (
    <div className="mx-auto max-w-[1200px] px-6 py-14">
      <div className="grid gap-10 lg:grid-cols-[1.3fr_1fr]">
        <div>
          <SectionHeading
            eyebrow="Investors"
            title="We work with investors who can wait"
            intro="We work with accredited investors, family offices, and joint-venture partners on transit-oriented multifamily and mixed-use around Chicago."
          />
          {settings?.agoraPortalUrl && (
            <a
              href={settings.agoraPortalUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-5 inline-block rounded-control bg-ink px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-white"
            >
              Investor Login →
            </a>
          )}

          <h2 className="mt-10 text-lg font-bold tracking-tight text-ink">
            How an investment works
          </h2>
          <ol className="mt-4 grid gap-3">
            {STEPS.map(([title, body], i) => (
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
          <Eyebrow>Keep in touch</Eyebrow>
          <h2 className="mt-2 text-lg font-bold tracking-tight text-ink">
            Tell us what you&rsquo;re looking for
          </h2>
          <p className="mb-4 mt-1.5 text-[11px] leading-relaxed text-ink-secondary">
            We&rsquo;ll add you to our investor list and reach out when something fits.
          </p>
          <LeadForm source="keep-in-touch" fields={FIELDS} submitLabel="Send" />
        </div>
      </div>

      {testimonials.length > 0 && (
        <section className="mt-16">
          <SectionHeading eyebrow="Our Investors" title="What our partners say" />
          <div className="mt-6">
            <Testimonials items={testimonials} />
          </div>
        </section>
      )}
    </div>
  )
}
