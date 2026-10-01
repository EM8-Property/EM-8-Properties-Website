# EM8 website — handover, 2026-10-01 (em-8.com is live, through a Netlify proxy)

Follows `docs/handover-2026-09-29-publish-first-refresh.md`. Hunter asked to move the new
site onto em-8.com, with a launch deadline of 2026-10-03. **It went live on 2026-10-01 at
about 13:15 CDT.** The domain itself could not be moved, so it was not: em-8.com reaches the
new site through the old Netlify site, which proxies every request to Railway. This
document is why, how, how to change it, how to undo it, and what it still leaves open.

The launch test also found that **the investor lead form could not save anything** and had
not been able to for an unknown time. That is fixed; see its own section below.

## Where things are

| | |
|---|---|
| em-8.com | **The new site**, via the Netlify proxy. Netlify production deploy `6abea31a6b4c95b557bb6f8f`, published 2026-10-01 |
| Railway | `5aad98b`, deployment `ea7d8931`. `NEXT_PUBLIC_SITE_URL=https://em-8.com`, `LEAD_NOTIFICATION_EMAIL=info@em-8.com` with the matching info@em-8.com Resend key, and an Editor `SANITY_API_WRITE_TOKEN`. Its own hostname still serves, and canonicalises to em-8.com. `main` is ahead by docs only |
| Netlify site | `em8-properties` (id `8966d670-47d3-4566-a53b-042e6ccb8287`), in **"botanalagoz's team"** (Pro). Hunter's own account, hunter@em-8.com, has been an **Owner** there since 2026-10-01 |
| Old repo | `botanalagoz/em8-properties`, which Netlify builds from. `main` is `92f7fe1`, the same files as `ops/netlify-proxy/` here |
| Rollback | Netlify deploy `6a9216eacdc8b11e08799c32`, the old Vite site as of 2026-08-28 |
| Domain | Registered at **Wix, in the former employee's account. No access.** Expires **2027-09-03** |
| DNS | **Unchanged and unchangeable:** A `@` → `75.2.60.5` (Netlify), CNAME `www` → `em8-properties.netlify.app`, five Google Workspace MX, the `google-site-verification` TXT, `_dmarc` `p=none`. No SPF |
| Sanity CORS | `https://em-8.com` with credentials, added 2026-10-01, so `/studio` works on the real domain |
| Publish webhook | Unchanged and should stay that way: Railway URL `/api/revalidate`, `POST` on create/update/delete, filter `_type != "lead"`, drafts excluded, header `x-revalidate-secret`. Read with an admin token on 2026-09-29. It closes open item 2 of the 09-29 handover: form submissions do not purge the cache |

## Why there is a proxy at all

Found in this order, between 2026-09-29 and 2026-10-01:

1. **em-8.com is registered at Wix** (`Wix.com Ltd.` in RDAP, nameservers `ns10/ns11.wixdns.net`).
2. **Wix DNS cannot point a bare domain at Railway.** It allows only an A record at the
   root, Railway has no fixed IPs, and Railway documents a root CNAME only for Cloudflare,
   DNSimple, Namecheap and bunny.net.
3. **Wix will not change the nameservers of a Wix-registered domain**, so the only way off
   Wix DNS is to transfer the registration.
4. **Nobody at EM8 can log into that Wix account.** It belongs to a former employee.
5. **The domain already points at the old Netlify site.** Hunter's own Netlify account is a
   member of the former employee's team, but it was a **Reviewer**, which cannot deploy or
   change anything. Hunter reached the former employee, who made him an **Owner** on
   2026-10-01. That is what made the launch possible.

So no DNS record changed. The old Netlify site was turned into a proxy.

## How a request reaches the site now

```
visitor → em-8.com (Wix DNS, unchanged) → Netlify edge (old site; cert covers em-8.com + www)
        → 200 rewrite → https://em-8-properties-website-production.up.railway.app → Next.js
```

The rules are `ops/netlify-proxy/_redirects`, the whole of the Netlify site's content. In
order: `http://` and `www` 301 to `https://em-8.com`, keeping path and query. Everything
else is proxied. The `http` rules are explicit because Netlify warns that a proxied path
may not get its automatic HTTP → HTTPS redirect. `http://www` takes two hops and lands on
`https://em-8.com`.

## The caching trap, and the code that closes it

**Netlify caches proxied responses that say they may be cached**, and every prerendered page
here says so: `Cache-Control: s-maxage=31536000`. Proxied naively, em-8.com would have
served whatever Netlify first fetched for a year, while a Studio publish purged Next's
cache on Railway and never reached a visitor.

`next.config.ts` sends `Netlify-CDN-Cache-Control: no-store` on every path (PR #64). It is
the most specific of the three headers Netlify reads, it binds only Netlify's CDN, and
Netlify strips it before the browser. So the browser still gets Next's own
`Cache-Control`, including `immutable` on hashed assets. `tests/unit/cdnHeaders.test.ts`
pins it.

**Measured on em-8.com:** every repeated fetch reads `Cache-Status: "Netlify Edge"; fwd=miss`.
Hunter published a homepage SEO change at 18:26 UTC. The next fetch of `/` was
`X-Nextjs-Cache: MISS` with the new title, the one after was `HIT`, and both were `fwd=miss`.
Publish → live on the next page load holds through the proxy. This is also the real-publish
check the 09-29 handover could not run.

## How it was deployed, and how to change it

**The Git route does not work yet, so deploys go through the Netlify CLI.**

- PR [botanalagoz/em8-properties#1](https://github.com/botanalagoz/em8-properties/pull/1)
  got no Deploy Preview: *"Deploy request pending review. A Netlify team Owner will need to
  approve the deploy."* Hunter was a Reviewer then. Netlify treats only Owners, Developers
  and recognised Git contributors as trusted authors.
- After Hunter became Owner, merging that PR (`92f7fe1`) produced **no deploy and no GitHub
  status at all**. The likeliest cause is that Netlify cannot match the GitHub committer to
  Hunter's Netlify user, which needs the GitHub account connected under Netlify user
  settings. That is untested.
- So the identical, already-tested folder was published with the CLI. The old repo's
  `main` holds the same files, so if anyone later approves that pending Git deploy, it
  publishes the same thing.

The CLI works only with Hunter's login on this PC (`netlify login`), and has five traps:

1. **`netlify deploy` builds by default.** Always pass `--no-build`.
2. **Run it from a folder outside any project.** From inside a repo it detects the
   framework there. `--site <id>` on its own failed with "Project not found", so run
   `netlify link --id 8966d670-47d3-4566-a53b-042e6ccb8287` in that folder first.
3. **Deploy a subfolder** (`--dir site`), so the `.netlify/state.json` that `link` writes is
   not uploaded.
4. **Draft first:** `--alias proxy-test` gives `https://proxy-test--em8-properties.netlify.app`
   without touching em-8.com. Only then `--prod`.
5. **In PowerShell, `npx` is blocked by the execution policy** (`npx.ps1 cannot be loaded`).
   Use `npx.cmd netlify-cli …` rather than changing the policy.

**Keep the old repo's `main` matching what is deployed.** Change `ops/netlify-proxy/` here
first, copy it to `netlify-proxy/` there, then deploy.

## The lead form had been failing, and every gate was green

The launch's test lead came back `500 Could not save your message`. Railway's logs showed
Sanity refusing the write: `403 Insufficient permissions; permission "create" required`.

- **`SANITY_API_WRITE_TOKEN` on Railway was a robot token named "Claude (Robot)" with the
  Viewer role.** It was the same token as the main checkout's `.env.local`. Whether it was
  made read-only on purpose is not known. On Railway it meant that **no lead could be saved**: the site
  showed every investor an error.
- **There were zero `lead` documents in the dataset** when this was found. Railway keeps no
  runtime logs for removed deployments, so whether any real investor hit this before
  2026-10-01 **cannot be known**.
- **Nothing could have caught it.** The unit suite mocks the write, the E2E suite mocks the
  endpoint (deliberately, so CI does not write leads), and `test:content` only reads. A real
  submission against production is the only test of this path.
- **Fixed by Hunter on 2026-10-01:** a new token, `EM8 website - lead form (Railway)`, Editor
  role, set only on Railway, then redeployed. The "Claude (Robot)" token was left as it is.
  **Never copy `.env.local`'s write token into Railway.**
- Verified: test lead `JnaMs9ug0qXwf9go3tD6gk` (`TEST` / `launch-test@example.com`) saved
  with `emailed: true`, and Hunter received the notification.

## Lead emails now go to info@em-8.com, from Resend's sandbox

Resend's sandbox sender, `onboarding@resend.dev`, delivers **only to the address that owns
the Resend account**. Until 2026-10-01 that was hsheyman@gmail.com, a personal Gmail.

**Changed on 2026-10-01:**
- Hunter opened a **new Resend account signed up as info@em-8.com** and put its key in
  Railway's `RESEND_API_KEY`.
- He deployed with `LEAD_NOTIFICATION_EMAIL` still `hsheyman@gmail.com`, a mismatch that
  makes Resend refuse every send. Caught by checking the variables after his deploy.
- Claude set it to `info@em-8.com` and redeployed (`ea7d8931`).
- A second test lead, `JnaMs9ug0qXwf9go3tJ1tu`, was then saved with `emailed: true`.

**The key and the recipient are one setting in two places.** Change either one alone and
every notification fails, while leads are saved with `emailed: false` and nobody is told.

- **The old Resend account** (hsheyman@gmail.com) is no longer used by the site. Its
  unverified em-8.com domain entry, `f8e6872e-…`, can go with it.
- **The main checkout's `.env.local` still holds the OLD account's key.** Nothing local
  sends mail, but do not copy it to Railway.
- **The emails still come from `onboarding@resend.dev`**, so the first ones may land in
  spam at info@em-8.com.

**The permanent fix needs the domain.**
1. Add em-8.com in the **new** Resend account. It issues its own DKIM key: the values the
   old account showed (`resend._domainkey`, plus `send` and `rsend` CNAMEs to
   `*.forge.rmta.net`) will not match, so copy them from the new account's domain page.
2. Add them in the domain's DNS and verify.
3. Then set `RESEND_FROM=EM8 Website <website@em-8.com>` on Railway, unquoted (see
   `.env.example`).

## Two test leads to delete

`JnaMs9ug0qXwf9go3tD6gk` and `JnaMs9ug0qXwf9go3tJ1tu`, both first name `TEST`,
`launch-test@example.com`. Delete them in the Studio under Leads.

## Decided against, on purpose

- **Re-keying the lead form's rate limit.** `callerKey` in `src/app/api/lead/route.ts` keys
  on the right-most `X-Forwarded-For` hop, which behind Netlify is Netlify's egress IP. So
  visitors through the same Netlify node share the per-caller budget of 5 a minute. Netlify's
  `x-nf-client-connection-ip` would fix that, but anyone can forge it by calling the Railway
  URL directly, which would give every caller a fresh bucket. At EM8's volume the sharing
  never triggers. Revisit when the proxy goes.
- **Redirecting the Railway hostname to em-8.com.** The webhook targets it, and it is the
  only way to reach the origin without Netlify. Its canonicals point at em-8.com.

## Verified

| check | result |
|---|---|
| CI on PR #64 | 4/4 |
| unit · tsc · eslint | 672/672 · clean · clean |
| Draft proxy, `proxy-test--em8-properties.netlify.app` | 13 routes 200 with titles identical to Railway, a missing page still 404, images with query strings, RSC navigation byte-identical (28,332 bytes), POST reaches the app, `fwd=miss` throughout. E2E **46/47**: the one failure was the canonical-origin test, expected on a test host |
| **em-8.com, after publishing** | **E2E 47/47.** Canonical, `og:url`, `og:image` and the sitemap all on `https://em-8.com`. The redirects above hold. Cert `CN=em-8.com`, valid to 2026-11-18, and Netlify renews it because both names still resolve there |
| `em-8.com/studio` | Sanity's login screen, no console or CORS errors. Not logged in: that is Hunter's |
| Lead form on em-8.com | saved and emailed, after the token fix |
| Publish → first load | MISS with the new title, then HIT |

## Rollback

1. Netlify → `em8-properties` → **Deploys** → `6a9216ea…` (2026-08-28) → **Publish deploy**.
   Or `netlify api restoreSiteDeploy --data '{"site_id":"8966d670-47d3-4566-a53b-042e6ccb8287","deploy_id":"6a9216eacdc8b11e08799c32"}'`.
   The old site is back on em-8.com immediately.
2. Revert `92f7fe1` in `botanalagoz/em8-properties`, so a later rebuild does not republish
   the proxy.
3. If the new site is not coming back soon, set `NEXT_PUBLIC_SITE_URL` back to the Railway
   URL and redeploy, so its canonicals stop pointing at a site that is not there.

## Open, in order of consequence

1. **Recover the domain.** It renews on **2027-09-03** through the former employee's Wix
   account. If that lapses, **the website and EM8's company email go down together**: the
   Google MX records live in the same zone. He is cooperating now. Ask him to move em-8.com
   into an EM8-controlled Wix account, then transfer it to Namecheap, point both names at
   Railway, and delete the proxy, the header and `ops/netlify-proxy/`.
2. **The Netlify site lives in the former employee's Pro team.** Find out who pays for it.
   As an Owner, Hunter can now move the site into his own team (`hunter-iaih9p8`, Free,
   which supports proxying). The custom domain and certificate should move with it.
   **Untested:** do it at a quiet hour and re-run the verification above.
3. **Google Search Console.** The `google-site-verification` TXT belongs to some Google
   account. Confirm Hunter can see that property, then submit `https://em-8.com/sitemap.xml`.
4. **Sending from website@em-8.com**, and **SPF**, both wait on the domain. See above.
5. **No check proves production can save a lead.** This bit once. A scheduled synthetic
   submission, or a check of the Railway token's role, would catch it.
6. Spec §8 launch blockers, unchanged and launched past by Hunter's decision on 2026-09-29:
   Railway is on a personal workspace, the footer disclaimer has not been through counsel,
   and the GitHub org has one owner.
7. **Two copies of the proxy rules.** `ops/netlify-proxy/` here and `netlify-proxy/` in the
   old repo must match, and nothing checks that they do. If anyone approves the pending
   Git deploy of `92f7fe1`, or pushes to the old repo, Netlify publishes that copy over the
   CLI deploy.
8. **Netlify edge caching is off for everything, immutable assets included.** Every hashed
   `/_next/static` file and optimised image costs a Netlify → Railway round trip, roughly
   0.2–0.3 s measured. Scoping the header to exclude `/_next/static` would let Netlify cache
   what can never go stale. Deliberately not changed on launch day.
9. Rate-limit sharing behind Netlify, and connecting GitHub so Netlify builds from Git.
   Both are minor.

## Code review, 2026-10-01

A high-effort review ran over `17f645b...handover-2026-10-01-results`, which is PR #64, this
PR and the proxy rules. It found seven things:

- **Fixed in this PR (three):**
  - The lead-email docs went stale the moment the Resend account changed.
  - `.env.example` quoted `RESEND_FROM`, and pasted into Railway the quotes would have
    broken every send. It is now unquoted; Node's `--env-file` and `@next/env` both parse it
    identically, checked.
  - The docs called the local Viewer token "on purpose" without anyone establishing that.
- **Recorded above as open items 5, 7, 8 and 9 (four):**
  - no production lead check
  - two copies of the proxy rules
  - no edge caching of immutable assets
  - the rate-limit sharing

None of them is wrong behaviour today.

## Housekeeping

- A `www.em-8.com` custom domain was added to Railway on 2026-09-29 for a plan Wix made
  impossible. It was removed on 2026-10-01, and Railway lists only its own hostname.
- `.env.example` now says the write token must be an Editor and that `NEXT_PUBLIC_SITE_URL`
  is `https://em-8.com` in production.
- The README carries this session's traps under "Found on 2026-10-01".

---

## For Hunter — add anything below this line

Nothing below here is written by Claude.

### Corrections to anything above

-
