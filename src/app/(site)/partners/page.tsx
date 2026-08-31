import type { Metadata } from 'next'
import { LeadForm, type FieldSpec } from '@/components/forms/LeadForm'
import { SectionHeading } from '@/components/ui/SectionHeading'
import { Eyebrow } from '@/components/ui/Eyebrow'
import { Card } from '@/components/ui/Card'

export const metadata: Metadata = {
  title: 'Partners | EM8 Properties',
  description:
    'EM8 works with Kinzie, Advantage, and municipalities across the Chicago MSA as one accountable team.',
}

/**
 * Partner copy is hardcoded rather than CMS-backed. Recorded as a conscious Phase 1
 * tradeoff (plan revision D4): there is no content type for it, so editing requires a
 * developer. Revisit in Phase 3 rather than inventing a schema for three cards.
 */
const PARTNERS: [string, string, string][] = [
  [
    'Development & Capital',
    'EM8 Properties',
    'Site selection, entitlement, capital structure, and design direction. We stay the owner. We don’t merchant-build and walk away.',
  ],
  [
    'Construction',
    'Kinzie',
    'Our builder across the portfolio. Involved early enough to price design decisions while they can still change.',
  ],
  [
    'Property Management',
    'Advantage',
    'Day-to-day operations and resident experience. We walk every vacant unit, the grounds, and the amenities together each month.',
  ],
]

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

export default function PartnersPage() {
  return (
    <div className="mx-auto max-w-[1200px] px-6 py-14">
      <SectionHeading
        eyebrow="Partners"
        title="One accountable team, start to finish"
        intro="Most developers assemble a new cast for every project, then spend the job managing the seams. We use the same builder and the same manager across the portfolio, so nobody gets to point at somebody else."
      />

      <div className="mt-8 grid gap-5 sm:grid-cols-3">
        {PARTNERS.map(([role, name, body]) => (
          <Card key={name}>
            <div className="p-5">
              <Eyebrow>{role}</Eyebrow>
              <h3 className="mt-2 font-display text-base font-medium uppercase tracking-wide text-ink">
                {name}
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
          <SectionHeading
            eyebrow="Bring Us A Site"
            title="Have land near a Metra station?"
            intro="We look at multifamily and mixed-use sites within walking distance of transit across the Chicago MSA and southern Wisconsin. Brokers, cities, owners: we answer every one."
          />
          <dl className="mt-5 flex flex-wrap gap-8">
            {[
              ['Deal Size', '$10M – $50M'],
              ['Asset Types', 'Multifamily, Mixed-Use'],
              ['Geography', 'Chicago MSA, S. Wisconsin'],
            ].map(([k, v]) => (
              <div key={k}>
                <dt className="text-[8px] font-semibold uppercase tracking-[0.15em] text-ink-secondary">
                  {k}
                </dt>
                <dd className="mt-1 text-xs font-semibold text-ink">{v}</dd>
              </div>
            ))}
          </dl>
        </div>
        <div className="rounded-card border border-rule bg-panel p-6">
          <h2 className="mb-4 text-base font-bold tracking-tight text-ink">Submit a site</h2>
          <LeadForm source="site-submission" fields={SITE_FIELDS} submitLabel="Send" />
        </div>
      </section>
    </div>
  )
}
