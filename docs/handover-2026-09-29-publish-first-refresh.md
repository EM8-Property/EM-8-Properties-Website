# EM8 website — handover, 2026-09-29 (publish shows on the first refresh)

Follows `docs/handover-2026-09-23-phone-hero-concept-b.md`. Hunter asked why a change
published in the Studio took "a few refreshes" to appear on the live site. One-line cause,
one-line fix, shipped as PR #62 (`52e9584`) and deployed.

## The cause

`/api/revalidate` called `revalidateTag('sanity', 'max')`. In Next 16, `'max'` is
**stale-while-revalidate**: the tag is marked stale, the first visit after a publish is
served the **old** page and kicks off a background render, and only a later visit sees the
new one. The comment above it claimed `'max'` purged immediately. It never did.

Measured on the live site before the fix: `x-nextjs-cache: STALE` on the first load, then
`HIT` with the new render.

## The fix

`revalidateTag('sanity', { expire: 0 })`. Next's own docs name it for this case: "when the
invalidation comes from outside a Server Action, for example a webhook". `updateTag` does
the same thing but only runs in Server Actions. Stale content is never served; the first
visit after a publish blocks on a fresh render. The comments in `route.ts` and
`src/sanity/client.ts` now say "on the next page load" instead of "in about a minute".

**Trade-off, accepted:** that first visit is slower, because it renders instead of serving
from cache.

## Verified, and what was not

| check | result |
|---|---|
| `tsc`, `eslint`, vitest | clean, 670/670 |
| local `next build` + `next start`, POST the webhook, curl `/` | before `HIT` → after webhook `MISS` → `HIT`. No `STALE`. |
| CI on PR #62 | 4/4 passing |
| Railway | deployment for `52e9584` reached `SUCCESS` (confirmed by commit hash) |
| **a real Studio publish against the live site** | **not done.** See below. |

The end-to-end check was not run. Claude Code's auto-mode classifier blocked the planned
edit-and-revert of `strategyPage.seo.description` through the write token because it
modifies live shared content. Hunter was asked to publish any small edit and refresh
once. **If the next session has no report back from Hunter, ask him first.** If it still
takes more than one refresh, the website side is ruled out and the suspect is the Sanity
webhook itself (see open item 2).

## Permissions, for the next session

- **The Railway deploy was blocked by the classifier** until Hunter gave explicit
  permission in chat, and then it went through. Expect the same prompt every session
  unless he adds a permission rule.
- **Writes to the Sanity dataset from a script are blocked** the same way. Ask before
  planning any verification that publishes content.

## Deploying (unchanged, still manual)

Auto-deploy is off; merging ships nothing. The full sequence is in
`docs/handover-2026-09-15.md` § Deploying. Two things added this session:

- `gh pr merge` worked from the main checkout (no worktree), so the worktree caveat did not
  apply.
- To poll for your commit, query the service's deployments and match `meta.commitHash`:

```bash
node --env-file=.env.local -e 'const q=`{ deployments(first: 3, input: { serviceId: "5d00810f-87c2-4254-963e-b654812d53fd", environmentId: "4260bc70-c3ea-448f-ad04-6541f3acc773" }) { edges { node { status createdAt meta } } } }`; const r=await fetch("https://backboard.railway.com/graphql/v2",{method:"POST",headers:{"Content-Type":"application/json","Project-Access-Token":process.env.RAILWAY_API_TOKEN},body:JSON.stringify({query:q})}); for (const e of (await r.json()).data.deployments.edges) console.log(e.node.status, e.node.createdAt, (e.node.meta?.commitHash||"").slice(0,7))'
```

The build took about two minutes.

## Still open: code review of PR #62 (high effort, not verified)

None of these block the fix. They are ordered by how likely they are to matter to Hunter.

1. **The browser's Router Cache can still show an old page for up to 5 minutes.** The live
   site sends `x-nextjs-stale-time: 300`. If Hunter has the site open and gets back to the
   edited page by clicking a nav link rather than refreshing, the tab can serve the page it
   already holds. It looks like the original bug, but a hard refresh clears it. Tell Hunter
   before changing anything. If it bites, the lever is `experimental.staleTimes.static`
   in `next.config.ts`. Read `node_modules/next/dist/docs/` first.
2. **The Sanity webhook's filter is not recorded anywhere in the repo.** If it fires on
   every document type, then each investor form submission (a `lead` doc created by
   `/api/lead`) now empties the cache for every page, where before it only marked them
   stale. Check the webhook in sanity.io/manage: its filter should exclude `lead`, and it
   should not fire on drafts. Write the filter into the README's webhook step.
3. **No test pins the `revalidateTag` argument.** The tests cover only the secret check. A
   revert to `'max'`, which the old comment recommended, would pass CI. A route test that
   mocks `next/cache` and asserts `{ expire: 0 }` would close that.
4. **Concurrent first visits each render.** Right after a publish, simultaneous requests
   for an uncached page can each run a full render with uncached Sanity fetches. At this
   site's traffic that is theoretical.
5. **One site-wide `sanity` tag.** Any publish empties the cache for every page. Tags per
   document type would limit it to the pages affected. Only worth doing if items 2 or 4
   ever show up.

## Housekeeping

- The README doc-index row still pointed at `handover-2026-09-15-logo-and-track-record.md`.
  Neither 09-23 handover updated it. This commit points it here.
- `npm ci` warns that `unrs-resolver`'s postinstall is not approved (`npm approve-scripts`).
  Build and tests ran fine without it, so it was left alone.

---

## For Hunter — add anything below this line

Nothing below here is written by Claude.

### Did the first-refresh fix work on a real publish?

-

### Priorities for the next session

-

### Corrections to anything above

-
