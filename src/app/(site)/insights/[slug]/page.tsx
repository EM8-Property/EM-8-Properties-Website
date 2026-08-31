import { notFound } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { PortableText } from 'next-sanity'
import { fetchSanity } from '@/sanity/client'
import { POST_BY_SLUG_QUERY, POST_SLUGS_QUERY } from '@/sanity/queries'
import type {
  POST_BY_SLUG_QUERY_RESULT,
  POST_SLUGS_QUERY_RESULT,
} from '@/sanity/types.generated'
import { urlForImage } from '@/sanity/image'
import { formatUnits } from '@/lib/format'
import { formatCategory, formatDate } from '@/components/insights/PostCard'
import { Eyebrow } from '@/components/ui/Eyebrow'

export async function generateStaticParams() {
  const slugs = await fetchSanity<POST_SLUGS_QUERY_RESULT>(POST_SLUGS_QUERY)
  return slugs.map((slug) => ({ slug }))
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const post = await fetchSanity<POST_BY_SLUG_QUERY_RESULT>(POST_BY_SLUG_QUERY, { slug })
  if (!post) return {}

  const title = `${post.title} | EM8 Properties`
  return {
    title,
    description: post.excerpt ?? undefined,
    // This is the LinkedIn-linkable URL, so the Open Graph block is the point of the
    // page, not decoration. Next does not synthesise og:title from `title` — without
    // this, a shared link renders with no card title at all.
    openGraph: {
      title,
      description: post.excerpt ?? undefined,
      type: 'article',
      publishedTime: post.publishedAt ?? undefined,
    },
    twitter: { card: 'summary_large_image', title, description: post.excerpt ?? undefined },
  }
}

export default async function PostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const post = await fetchSanity<POST_BY_SLUG_QUERY_RESULT>(POST_BY_SLUG_QUERY, { slug })
  if (!post) notFound()

  return (
    <article className="mx-auto max-w-[720px] px-6 py-12">
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
    </article>
  )
}
