import type { Metadata } from 'next'
import { seoMetadata } from '@/lib/pageSeo'
import Image from 'next/image'
import { fetchSanity } from '@/sanity/client'
import { TEAM_QUERY, FOCUS_CARDS_QUERY, ABOUT_PAGE_QUERY, SITE_SETTINGS_QUERY } from '@/sanity/queries'
import type {
  TEAM_QUERY_RESULT,
  FOCUS_CARDS_QUERY_RESULT,
  ABOUT_PAGE_QUERY_RESULT,
  SITE_SETTINGS_QUERY_RESULT,
} from '@/sanity/types.generated'
import { urlForImage } from '@/sanity/image'
import { SectionHeading } from '@/components/ui/SectionHeading'
import { Eyebrow } from '@/components/ui/Eyebrow'
import { Card } from '@/components/ui/Card'
import { TEAM_GROUP_LABELS } from '@/lib/teamGroups'
import { TeamBio } from '@/components/about/TeamBio'

export async function generateMetadata(): Promise<Metadata> {
  const [copy, settings] = await Promise.all([
    fetchSanity<ABOUT_PAGE_QUERY_RESULT>(ABOUT_PAGE_QUERY),
    fetchSanity<SITE_SETTINGS_QUERY_RESULT>(SITE_SETTINGS_QUERY),
  ])
  return seoMetadata({
    seo: copy?.seo,
    path: '/about',
    documentName: 'aboutPage',
    shareImage: settings?.defaultShareImage,
  })
}

export default async function AboutPage() {
  const [team, factors, copy] = await Promise.all([
    fetchSanity<TEAM_QUERY_RESULT>(TEAM_QUERY),
    fetchSanity<FOCUS_CARDS_QUERY_RESULT>(FOCUS_CARDS_QUERY),
    fetchSanity<ABOUT_PAGE_QUERY_RESULT>(ABOUT_PAGE_QUERY),
  ])

  if (!copy?.hero) {
    throw new Error(
      'The aboutPage document is missing or has no hero. Create it in the Studio ' +
        'under About page.',
    )
  }

  // Order matters: leadership first, then the board. The titles are copy and come from
  // the document; the group keys and their order are structure and do not.
  const GROUP_SECTIONS = [
    { group: 'leadership', eyebrow: TEAM_GROUP_LABELS.leadership, title: copy.leadershipTitle },
    {
      group: 'partner-board',
      eyebrow: TEAM_GROUP_LABELS['partner-board'],
      title: copy.boardTitle,
    },
  ] as const

  const byGroup = (g: string) =>
    team.filter((m) => (m.group ?? 'leadership') === g)

  return (
    <div>
      <div className="mx-auto max-w-[1200px] px-6 py-14">
        <Eyebrow>{copy.hero.eyebrow}</Eyebrow>
        <h1 className="mt-3 max-w-[19ch] text-4xl font-bold leading-tight tracking-tight text-ink">
          {copy.hero.title}
          {copy.hero.titleAccent && (
            <> <span className="text-teal-text">{copy.hero.titleAccent}</span></>
          )}
          {copy.hero.titleSuffix}
        </h1>
        <p className="mt-4 max-w-[60ch] text-sm leading-relaxed text-ink-secondary">
          {copy.hero.intro}
        </p>
      </div>

      <section className="mx-auto max-w-[1200px] px-6 py-10">
        <SectionHeading {...copy.factorsHeading!} />
        <div className="mt-6 grid gap-6 sm:grid-cols-2">
          {factors.map((f, i) => (
            <div key={f._id} className="flex gap-3">
              <span className="flex size-5 shrink-0 items-center justify-center rounded-chip bg-teal-text text-[10px] font-bold text-white">
                {i + 1}
              </span>
              <div>
                <h3 className="text-sm font-semibold tracking-tight text-ink">{f.title}</h3>
                <p className="mt-2 text-xs leading-relaxed text-ink-secondary">
                  {f.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/*
        Two sections, not one list.

        A board seat is a governance relationship, not a rung on the org chart, so
        rendering a board member and an accountant as peers under a single "Team" heading
        misrepresents both. `group` on the document decides which section a person lands
        in; a group with nobody in it renders nothing rather than an empty heading.
      */}
      {GROUP_SECTIONS.map(
        ({ group, eyebrow, title }) =>
          byGroup(group).length > 0 && (
            <section key={group} className="border-t border-rule bg-panel">
              <div className="mx-auto max-w-[1200px] px-6 py-14">
                <SectionHeading eyebrow={eyebrow} title={title} />
                {/*
                  items-start, so a card is only as tall as its own content.

                  Grid items stretch to the tallest in the row by default, which was fine
                  when every bio was one line. Beside a full board biography it left 325px
                  of empty space inside a bordered card — around forty per cent of it
                  blank, which reads as a rendering fault rather than a short bio.
                */}
                <div className="mt-8 grid items-start gap-5 sm:grid-cols-2 lg:grid-cols-3">
                  {byGroup(group).map((m) => (
                    <Card key={m._id}>
                      {/*
                        Square crops driven by Sanity's hotspot. The circular-crop
                        decapitation the old style guide warned about cannot recur, because
                        the editor sets the focal point in the Studio rather than hoping the
                        crop is kind.
                      */}
                      {m.photo ? (
                        <Image
                          src={urlForImage(m.photo).width(600).height(600).url()}
                          alt={m.photo.alt ?? m.name ?? ''}
                          width={600}
                          height={600}
                          className="aspect-square w-full object-cover"
                        />
                      ) : (
                        <div className="aspect-square w-full bg-rule" />
                      )}
                      <div className="p-4">
                        <h3 className="text-sm font-semibold text-ink">{m.name}</h3>
                        {m.role && <Eyebrow>{m.role}</Eyebrow>}
                        <TeamBio bio={m.bio} />
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            </section>
          ),
      )}
    </div>
  )
}
