import { notFound } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { PortableText } from 'next-sanity'
import { fetchSanity } from '@/sanity/client'
import { POST_BY_SLUG_QUERY, POST_SLUGS_QUERY, SITE_SETTINGS_QUERY } from '@/sanity/queries'
import type {
  POST_BY_SLUG_QUERY_RESULT,
  POST_SLUGS_QUERY_RESULT,
  SITE_SETTINGS_QUERY_RESULT,
} from '@/sanity/types.generated'
import { urlForImage } from '@/sanity/image'
import { formatUnits } from '@/lib/format'
import { formatCategory, formatDate } from '@/components/insights/PostCard'
import { Eyebrow } from '@/components/ui/Eyebrow'
import { JsonLd } from '@/components/seo/JsonLd'
import { articleJsonLd } from '@/lib/structuredData'
import { pageMetadata } from '@/lib/seo'
import { siteUrl } from '@/lib/siteUrl'
import { CtaBand } from '@/components/ui/CtaBand'

export async function generateStaticParams() {
  const slugs = await fetchSanity<POST_SLUGS_QUERY_RESULT>(POST_SLUGS_QUERY)
  return slugs.map((slug) => ({ slug }))
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const post = await fetchSanity<POST_BY_SLUG_QUERY_RESULT>(POST_BY_SLUG_QUERY, { slug })
  if (!post) return {}

  // Composed from the shared helper, which supplies the canonical, `og:url` and
  // `og:site_name`. Hand-rolling this block is how this route — the one that exists to be
  // linked from LinkedIn — ended up without the two fields the social graph uses to
  // identify a shared object, so a share carrying a tracking parameter was keyed
  // separately from the clean URL.
  //
  // `type` and `publishedTime` override the helper's `type: 'website'`: this is an
  // article, and the published date is the one piece of Open Graph a feed reader wants.
  //
  // `image: null` on purpose. The per-article card at `opengraph-image.tsx` is a file
  // convention, and naming an image here would override it with the generic card.
  const base = pageMetadata({
    title: post.title ?? '',
    description: post.excerpt ?? '',
    path: `/insights/${slug}`,
    image: null,
  })

  return {
    ...base,
    openGraph: {
      ...base.openGraph,
      type: 'article',
      publishedTime: post.publishedAt ?? undefined,
    },
  }
}

export default async function PostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const [post, settings] = await Promise.all([
    fetchSanity<POST_BY_SLUG_QUERY_RESULT>(POST_BY_SLUG_QUERY, { slug }),
    fetchSanity<SITE_SETTINGS_QUERY_RESULT>(SITE_SETTINGS_QUERY),
  ])
  if (!post) notFound()

  return (
    <article className="mx-auto max-w-[720px] px-6 py-12">
      {/*
        Article markup on the one route that exists to be linked from elsewhere. EM8 is
        both author and publisher: these are written in the firm's voice with no byline on
        the page, and inventing a named author would assert something the page does not
        say.
      */}
      <JsonLd
        data={articleJsonLd({
          siteUrl: siteUrl(),
          path: `/insights/${slug}`,
          title: post.title ?? '',
          description: post.excerpt,
          publishedAt: post.publishedAt,
          // The hero image, not the generated card: the card's URL is build-hashed and
          // cannot be constructed from here. `heroImage` is already in the query.
          image: post.heroImage
            ? urlForImage(post.heroImage).width(1200).height(630).url()
            : null,
        })}
      />
      <p className="text-[11px] font-medium text-ink-secondary">
        <Link href="/insights" className="text-teal-text">
          Insights
        </Link>
        {post.category ? ` › ${formatCategory(post.category)}` : ''}
      </p>
      <h1 className="mt-3 text-3xl font-bold leading-tight tracking-tight text-ink">
        {post.title}
      </h1>
      {post.publishedAt && (
        <p className="mt-4 border-b border-rule pb-5 text-[11px] text-ink-secondary">
          {formatDate(post.publishedAt)}
        </p>
      )}

      {post.heroImage && (
        <Image
          src={urlForImage(post.heroImage).width(1400).height(700).url()}
          alt={post.heroImage.alt ?? post.title ?? ''}
          width={1400}
          height={700}
          className="mt-6 rounded-card"
        />
      )}

      {post.body && (
        <div className="mt-6 text-[15px] leading-relaxed text-ink-secondary">
          <PortableText value={post.body} />
        </div>
      )}

      {post.relatedProperty && (
        <div className="mt-8 flex items-center gap-4 rounded-card border border-rule bg-panel p-4">
          <div>
            <Eyebrow>The property in this piece</Eyebrow>
            <Link
              href={`/portfolio/${post.relatedProperty.slug}`}
              className="mt-1.5 block font-display text-sm font-medium uppercase tracking-wide text-ink hover:text-teal-text"
            >
              {post.relatedProperty.title}
            </Link>
            <p className="text-[11px] text-ink-secondary">
              {post.relatedProperty.city}
              {formatUnits(post.relatedProperty.unitCount, post.relatedProperty.retailUnitCount) ? ` · ${formatUnits(post.relatedProperty.unitCount, post.relatedProperty.retailUnitCount)}` : ''}
            </p>
          </div>
        </div>
      )}

      {/*
        An article is the likeliest arrival point from LinkedIn — /insights exists to be
        linked from there — and it ended with nothing to do next.

        It stays inside the 720px prose measure rather than breaking out of it: the band
        brings its own panel and rule, which is enough to read as the page closing, and a
        full-width band here would need the article's wrapper restructured for a section
        that is not the point of the page.
      */}
      <div className="mt-12">
        <CtaBand bookACallUrl={settings?.bookACallUrl} copy={settings?.ctaBand} />
      </div>
    </article>
  )
}
