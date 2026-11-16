import type { Metadata } from 'next'
import Link from 'next/link'
import { seoMetadata } from '@/lib/pageSeo'
import { fetchSanity } from '@/sanity/client'
import { CAREERS_PAGE_QUERY, OPEN_JOBS_QUERY, SITE_SETTINGS_QUERY } from '@/sanity/queries'
import type {
  CAREERS_PAGE_QUERY_RESULT,
  OPEN_JOBS_QUERY_RESULT,
  SITE_SETTINGS_QUERY_RESULT,
} from '@/sanity/types.generated'
import { PageHero } from '@/components/layout/PageHero'
import type { CarouselSlide } from '@/components/layout/HeroCarousel'
import { Band } from '@/components/ui/Band'
import { CtaBand } from '@/components/ui/CtaBand'
import {
  EMPLOYMENT_TYPE_LABELS,
  WORKPLACE_LABELS,
  formatLocation,
  formatSalary,
  isJobOpen,
  type EmploymentType,
  type Workplace,
} from '@/lib/jobTaxonomy'

export async function generateMetadata(): Promise<Metadata> {
  const [copy, settings] = await Promise.all([
    fetchSanity<CAREERS_PAGE_QUERY_RESULT>(CAREERS_PAGE_QUERY),
    fetchSanity<SITE_SETTINGS_QUERY_RESULT>(SITE_SETTINGS_QUERY),
  ])
  return seoMetadata({
    seo: copy?.seo,
    path: '/careers',
    documentName: 'careersPage',
    shareImage: settings?.defaultShareImage,
  })
}

/**
 * Every role accepting applications, each linking to its own page at /careers/[slug].
 * The job pages carry the structured data Google's job search reads; this page is the
 * index that links them, and lists nothing that has closed.
 */
export default async function CareersPage() {
  const [copy, jobs, settings] = await Promise.all([
    fetchSanity<CAREERS_PAGE_QUERY_RESULT>(CAREERS_PAGE_QUERY),
    fetchSanity<OPEN_JOBS_QUERY_RESULT>(OPEN_JOBS_QUERY),
    fetchSanity<SITE_SETTINGS_QUERY_RESULT>(SITE_SETTINGS_QUERY),
  ])

  if (!copy?.heading?.title || !copy.openingsTitle || !copy.emptyMessage) {
    throw new Error(
      'The careersPage document is missing its heading, open roles heading or empty message. ' +
        'Fill them in the Studio under Careers page.',
    )
  }

  const open = jobs.filter((j) => isJobOpen(j))

  return (
    <div>
      {/* A sibling of the measure, never inside it — see /partners. */}
      <PageHero copy={copy.heading} slides={(settings?.heroCarousel ?? []) as CarouselSlide[]} />

      <Band tone="ground">
        <h2 className="text-xl font-bold tracking-tight text-ink">{copy.openingsTitle}</h2>
        {open.length === 0 ? (
          <p className="mt-4 max-w-[68ch] text-sm leading-relaxed text-ink-secondary">
            {copy.emptyMessage}
          </p>
        ) : (
          <ul className="mt-6 grid gap-4">
            {open.map((job) => {
              const facts = [
                formatLocation(job.location),
                job.workplace ? WORKPLACE_LABELS[job.workplace as Workplace] : null,
                job.employmentType ? EMPLOYMENT_TYPE_LABELS[job.employmentType as EmploymentType] : null,
              ].filter(Boolean)
              const salary = formatSalary(job.salary)
              return (
                <li key={job._id}>
                  <Link
                    href={`/careers/${job.slug}`}
                    className="group block rounded-card border border-rule bg-ground p-5 transition-colors hover:border-teal"
                  >
                    <h3 className="text-base font-bold tracking-tight text-ink group-hover:text-teal-text">
                      {job.title}
                    </h3>
                    <p className="mt-1 text-xs font-medium text-ink-secondary">{facts.join(' · ')}</p>
                    {salary && <p className="mt-1 text-xs text-ink-secondary">{salary}</p>}
                    {job.summary && (
                      <p className="mt-3 max-w-[68ch] text-sm leading-relaxed text-ink-secondary">
                        {job.summary}
                      </p>
                    )}
                  </Link>
                </li>
              )
            })}
          </ul>
        )}
      </Band>

      {/* Every page offers a way to start a conversation; see ctaCoverage.test.ts. */}
      <CtaBand bookACallUrl={settings?.bookACallUrl} copy={settings?.ctaBand} tone="panel" />
    </div>
  )
}
