import { ImageResponse } from 'next/og'
import { fetchSanity } from '@/sanity/client'
import { POST_BY_SLUG_QUERY } from '@/sanity/queries'
import type { POST_BY_SLUG_QUERY_RESULT } from '@/sanity/types.generated'

export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'
export const alt = 'EM8 Properties'

/**
 * The card LinkedIn renders when an article is shared — the single highest-leverage
 * surface on the site, since /insights exists to be linked from there.
 *
 * `params` is a Promise. Next 15+ passes route params asynchronously to every route
 * file, this one included; typing it as a plain object compiles but yields `undefined`
 * for the slug at runtime, producing a card with the fallback title on every article.
 */
export default async function OgImage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const post = await fetchSanity<POST_BY_SLUG_QUERY_RESULT>(POST_BY_SLUG_QUERY, { slug })

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          background: '#FFFFFF',
          padding: 72,
        }}
      >
        <div style={{ display: 'flex', fontSize: 26, fontWeight: 700, letterSpacing: 2, color: '#1A1A1A' }}>
          EM8&nbsp;<span style={{ color: '#2C7A74' }}>PROPERTIES</span>
        </div>
        <div
          style={{
            display: 'flex',
            fontSize: 60,
            fontWeight: 700,
            lineHeight: 1.1,
            color: '#1A1A1A',
            maxWidth: 900,
          }}
        >
          {post?.title ?? 'EM8 Properties'}
        </div>
        {/* Teal as a fill, which is what the accent is for. */}
        <div style={{ height: 8, width: 160, background: '#4ABDB5' }} />
      </div>
    ),
    size,
  )
}
