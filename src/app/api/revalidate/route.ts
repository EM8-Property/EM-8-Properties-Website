import { NextResponse } from 'next/server'
import { revalidateTag } from 'next/cache'
import { verifyRevalidateRequest } from '@/lib/revalidate'

/**
 * Sanity publish webhook target.
 *
 * Every read in the app goes through `fetchSanity`, which tags its request `sanity`.
 * Purging that one tag re-renders anything backed by CMS content, so a publish reaches
 * the live site on the next page load, without a rebuild or a redeploy.
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

  // `{ expire: 0 }`, not 'max'. 'max' is stale-while-revalidate: the first visit after a
  // publish is served the old page while the new one renders, so the editor refreshes,
  // sees no change, and it appears only on the second or third refresh. `{ expire: 0 }`
  // makes that first visit wait for fresh content instead. It is Next's documented choice
  // for a webhook — `updateTag` would do the same but only runs inside Server Actions.
  revalidateTag('sanity', { expire: 0 })
  return NextResponse.json({ revalidated: true, tag: 'sanity' })
}
