import { ImageResponse } from 'next/og'
import { fetchSanity } from '@/sanity/client'
import { POST_BY_SLUG_QUERY } from '@/sanity/queries'
import type { POST_BY_SLUG_QUERY_RESULT } from '@/sanity/types.generated'
import { ShareCardFrame, SHARE_CARD_SIZE } from '@/components/seo/shareCardFrame'

export const size = SHARE_CARD_SIZE
export const contentType = 'image/png'
export const alt = 'EM8 Properties'

/**
 * The card LinkedIn renders when an article is shared — the single highest-leverage
 * surface on the site, since /insights exists to be linked from there.
 *
 * The frame is shared with the default card at `/share-card`; only the headline differs.
 *
 * `params` is a Promise. Next 15+ passes route params asynchronously to every route
 * file, this one included; typing it as a plain object compiles but yields `undefined`
 * for the slug at runtime, producing a card with the fallback title on every article.
 */
export default async function OgImage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const post = await fetchSanity<POST_BY_SLUG_QUERY_RESULT>(POST_BY_SLUG_QUERY, { slug })

  return new ImageResponse(
    <ShareCardFrame headline={post?.title ?? 'EM8 Properties'} />,
    size,
  )
}
