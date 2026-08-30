import { NextResponse } from 'next/server'
import { revalidateTag } from 'next/cache'
import { verifyRevalidateRequest } from '@/lib/revalidate'

/**
 * Sanity publish webhook target.
 *
 * Every read in the app goes through `fetchSanity`, which tags its request `sanity`.
 * Purging that one tag re-renders anything backed by CMS content, so a publish reaches
 * the live site in about a minute without a rebuild or a redeploy.
 *
 * Point a Sanity webhook at POST https://<host>/api/revalidate with the header
 * `x-revalidate-secret: <SANITY_REVALIDATE_SECRET>`.
 */
export async function POST(request: Request) {
  const verified = await verifyRevalidateRequest(request)
  if (!verified.ok) {
    if (verified.status === 500) console.error(verified.message)
    return NextResponse.json({ revalidated: false, error: verified.message }, { status: verified.status })
  }

  // Next 16 requires a cacheLife profile as the second argument. 'max' purges entries
  // regardless of how recently they were cached, which is what a publish webhook wants —
  // the editor has just changed the content and expects to see it.
  revalidateTag('sanity', 'max')
  return NextResponse.json({ revalidated: true, tag: 'sanity' })
}
