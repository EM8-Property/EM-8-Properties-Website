import Link from 'next/link'
import Image from 'next/image'
import { Card } from '@/components/ui/Card'
import { Eyebrow } from '@/components/ui/Eyebrow'
import { urlForImage } from '@/sanity/image'

export type PostData = {
  title?: string | null
  slug?: string | null
  publishedAt?: string | null
  category?: string | null
  excerpt?: string | null
  heroImage?: unknown
}

export function formatCategory(slug: string): string {
  return slug
    .split('-')
    .map((w) => (w ? w[0]!.toUpperCase() + w.slice(1) : w))
    .join(' ')
}

/**
 * Formats a publication date in UTC.
 *
 * `timeZone: 'UTC'` is required, not cosmetic. Sanity stores `publishedAt` as an instant,
 * and formatting it in local time shifts a midnight-UTC date back a day for every viewer
 * west of Greenwich. In America/Chicago — where this project is developed — an article
 * published Aug 12 renders as "Aug 11".
 */
export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  })
}

export function PostCard({ post }: { post: PostData }) {
  return (
    <Card>
      <Link href={`/insights/${post.slug}`} className="block">
        {post.heroImage ? (
          <Image
            src={urlForImage(post.heroImage).width(800).height(450).url()}
            alt={post.title ?? ''}
            width={800}
            height={450}
            className="h-28 w-full object-cover"
          />
        ) : null}
        <div className="p-4">
          {post.category && <Eyebrow>{formatCategory(post.category)}</Eyebrow>}
          <h3 className="mt-2 text-sm font-semibold leading-snug tracking-tight text-ink">
            {post.title}
          </h3>
          <p className="mt-1.5 text-[11px] leading-relaxed text-ink-secondary">{post.excerpt}</p>
          {post.publishedAt && (
            <p className="mt-3 text-[10px] font-medium text-ink-secondary">
              {formatDate(post.publishedAt)}
            </p>
          )}
        </div>
      </Link>
    </Card>
  )
}
