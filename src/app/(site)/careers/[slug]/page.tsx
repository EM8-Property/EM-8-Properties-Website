import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { fetchSanity } from '@/sanity/client'
import { CAREERS_PAGE_QUERY, JOB_BY_SLUG_QUERY, OPEN_JOBS_QUERY } from '@/sanity/queries'
import type {
  CAREERS_PAGE_QUERY_RESULT,
  JOB_BY_SLUG_QUERY_RESULT,
  OPEN_JOBS_QUERY_RESULT,
} from '@/sanity/types.generated'
import { pageMetadata } from '@/lib/seo'
import { siteUrl } from '@/lib/siteUrl'
import { JsonLd } from '@/components/seo/JsonLd'
import { jobPostingJsonLd } from '@/lib/structuredData'
import { ApplicationForm } from '@/components/careers/ApplicationForm'
import {
  EMPLOYMENT_TYPE_LABELS,
  WORKPLACE_LABELS,
  formatLocation,
  formatSalary,
  isJobOpen,
  type EmploymentType,
  type Workplace,
} from '@/lib/jobTaxonomy'

export async function generateStaticParams() {
  const jobs = await fetchSanity<OPEN_JOBS_QUERY_RESULT>(OPEN_JOBS_QUERY)
  return jobs.filter((j) => isJobOpen(j)).map((j) => ({ slug: j.slug! }))
}

async function loadOpenJob(slug: string) {
  const job = await fetchSanity<JOB_BY_SLUG_QUERY_RESULT>(JOB_BY_SLUG_QUERY, { slug })
  // A filled or expired role 404s rather than staying up with a "closed" note. Google's
  // guidance for an expired posting is to remove it, and a 404 is the removal it reads.
  return job && job.title && job.datePosted && isJobOpen(job) ? job : null
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const job = await loadOpenJob(slug)
  if (!job) return {}
  const where = formatLocation(job.location)
  return pageMetadata({
    title: where ? `${job.title}, ${where}` : job.title!,
    description: job.summary ?? '',
    path: `/careers/${slug}`,
  })
}

export default async function JobPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const [job, copy] = await Promise.all([
    loadOpenJob(slug),
    fetchSanity<CAREERS_PAGE_QUERY_RESULT>(CAREERS_PAGE_QUERY),
  ])
  if (!job) notFound()
  if (!copy?.formTitle || !copy.submitLabel || !copy.successMessage || !copy.heading?.title) {
    throw new Error(
      'The careersPage document is missing its application form heading, button or ' +
        'success message. Fill them in the Studio under Careers page.',
    )
  }

  const facts = [
    formatLocation(job.location),
    job.workplace ? WORKPLACE_LABELS[job.workplace as Workplace] : null,
    job.employmentType ? EMPLOYMENT_TYPE_LABELS[job.employmentType as EmploymentType] : null,
  ].filter(Boolean)
  const salary = formatSalary(job.salary)

  return (
    <div className="mx-auto max-w-[1200px] px-6 py-12">
      <JsonLd
        data={jobPostingJsonLd({
          siteUrl: siteUrl(),
          job: { ...job, title: job.title!, slug, datePosted: job.datePosted! },
        })}
      />

      <p className="text-[11px] font-medium text-ink-secondary">
        <Link href="/careers" className="text-teal-text">
          {copy.seo?.title ?? copy.heading.title}
        </Link>
      </p>

      <div className="mt-3 grid gap-10 lg:grid-cols-[1.4fr_1fr]">
        <article>
          <h1 className="text-3xl font-bold leading-tight tracking-tight text-ink">{job.title}</h1>
          <p className="mt-3 text-sm font-medium text-ink">{facts.join(' · ')}</p>
          {salary && <p className="mt-1 text-sm text-ink-secondary">{salary}</p>}

          <div className="mt-8 grid gap-8 border-t border-rule pt-8">
            {job.sections?.map((section) => (
              <section key={section._key}>
                <h2 className="text-lg font-bold tracking-tight text-ink">{section.heading}</h2>
                {section.body
                  ?.split(/\n\s*\n/)
                  .filter((p) => p.trim())
                  .map((p, i) => (
                    <p key={i} className="mt-3 max-w-[68ch] text-[15px] leading-relaxed text-ink-secondary">
                      {p.trim()}
                    </p>
                  ))}
                {!!section.items?.length && (
                  <ul className="mt-3 max-w-[68ch] list-disc space-y-2 ps-5 text-[15px] leading-relaxed text-ink-secondary">
                    {section.items.map((item, i) => (
                      <li key={i}>{item}</li>
                    ))}
                  </ul>
                )}
              </section>
            ))}
          </div>
        </article>

        {/* Sticky beside the description on a wide screen, so the form is never a long scroll away. */}
        <aside id="apply" className="self-start rounded-card border border-rule bg-panel p-6 lg:sticky lg:top-24">
          <h2 className="mb-4 text-base font-bold tracking-tight text-ink">{copy.formTitle}</h2>
          <ApplicationForm
            jobSlug={slug}
            submitLabel={copy.submitLabel}
            successMessage={copy.successMessage}
          />
        </aside>
      </div>
    </div>
  )
}
