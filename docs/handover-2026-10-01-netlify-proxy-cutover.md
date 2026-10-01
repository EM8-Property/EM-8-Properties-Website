# EM8 website — handover, 2026-10-01 (em-8.com goes live through a Netlify proxy)

Follows `docs/handover-2026-09-29-publish-first-refresh.md`. Hunter asked to move the new
site onto em-8.com, with a launch deadline of 2026-10-03. **The domain could not be moved,
so it was not.** em-8.com now reaches the new site through the old Netlify site, which
proxies every request to Railway. This document is why, how, and how to undo it.

## Why there is a proxy at all

Found on 2026-09-29 and 2026-10-01, in this order:

1. **em-8.com is registered at Wix** (`Wix.com Ltd.` in RDAP, nameservers
   `ns10/ns11.wixdns.net`, registered 2020-09-03, **expires 2027-09-03**).
2. **Wix DNS cannot point a bare domain at Railway.** Wix allows only an A record (an IP)
   at the root, and Railway has no fixed IPs — it needs a CNAME-style record there, which
   Railway documents for Cloudflare, DNSimple, Namecheap and bunny.net only.
3. **Wix will not let you change the nameservers of a Wix-registered domain.** The only way
   off Wix DNS is to transfer the registration away.
4. **Nobody at EM8 can log into that Wix account.** It belongs to a former employee who
   cannot be reached. So no DNS change of any kind is possible: not the site, not Resend,
   not SPF.
5. **Hunter can log into the Netlify account** that hosts the old site — also the former
   employee's — and the domain's DNS already points there: the root A record is
   `75.2.60.5` (Netlify's load balancer) and `www` is a CNAME to
   `em8-properties.netlify.app`. Netlify is therefore the only thing EM8 can reach that sits
   in the domain's path.

So the old Netlify site was turned into a proxy. No DNS record changed.

## How a request reaches the site now

```
visitor → em-8.com (Wix DNS, unchanged) → Netlify edge (old site, cert for em-8.com + www)
        → 200 rewrite → https://em-8-properties-website-production.up.railway.app → Next.js
```

The rules are `ops/netlify-proxy/_redirects`, deployed as the old Netlify site's only
content. In order: `http://` and `www` 301 to `https://em-8.com`, then everything else is
proxied. The http rules are explicit because Netlify warns that a proxied path may not get
its automatic HTTP → HTTPS redirect.

**The Sanity publish webhook still points at the Railway URL**, not at em-8.com, and should
stay that way: it is one hop shorter and does not depend on Netlify. Read on 2026-09-29 with
an admin token: URL `…up.railway.app/api/revalidate`, `POST`, on create/update/delete,
filter `_type != "lead"`, drafts excluded, header `x-revalidate-secret`. That closes open
item 2 of the 09-29 handover — investor form submissions do not purge the cache.

## The one trap, and the code that closes it

**Netlify caches proxied responses that say they may be cached**, and every prerendered page
here says so: `Cache-Control: s-maxage=31536000`. Proxied naively, em-8.com would have
served whatever Netlify first fetched for a year, and a Studio publish would have purged
Next's cache on Railway and never reached a visitor. That is the "several refreshes" bug from
09-29, made permanent.

`next.config.ts` now sends `Netlify-CDN-Cache-Control: no-store` on every path. It is the
most specific of the three headers Netlify reads and binds only Netlify's CDN, so the browser
still receives Next's own `Cache-Control` unchanged — including `immutable` on hashed assets.
`tests/unit/cdnHeaders.test.ts` pins both halves. Measured on a local production build before
merge: present on `/`, `/portfolio`, a hashed CSS chunk, a `/_next/image` response,
`/sitemap.xml`, `/robots.txt`, `/api/lead`, `/share-card` and a 404, with each response's
`Cache-Control` exactly what it was before.

## Decided against, on purpose

- **Re-keying the lead form's rate limit.** `callerKey` in `src/app/api/lead/route.ts` keys
  on the right-most `X-Forwarded-For` hop, which behind Netlify is Netlify's egress IP — so
  visitors arriving through the same Netlify node share the per-caller budget of 5 a minute.
  The alternative, Netlify's `x-nf-client-connection-ip`, is a header anyone can forge by
  calling the Railway URL directly, which would hand every caller a fresh bucket. At EM8's
  lead volume the sharing never triggers; the forgery would weaken the only spam control
  that is not the honeypot. Revisit when the proxy goes.
- **Redirecting the Railway hostname to em-8.com.** The webhook targets it, and it is the
  only way to reach the origin without Netlify. Its canonicals point at em-8.com, which is
  what tells search engines which address is the real one.

## Configuration this depends on

| where | what | value |
|---|---|---|
| Railway | `NEXT_PUBLIC_SITE_URL` | `https://em-8.com` — **build-time**, so changing it needs a redeploy |
| Netlify, old site | content | `ops/netlify-proxy/` (the `_redirects` file is the whole job) |
| Netlify, old site | builds | **stopped**, so a push to the old repo can never overwrite the proxy |
| Netlify, old site | domains | `em-8.com` primary, `www.em-8.com` alias — both must stay, the cert covers both |
| Sanity | CORS | `https://em-8.com` with credentials, for `/studio` on the real domain |

## Rollback

Netlify → the old site → **Deploys** → the last deploy before the proxy → **Publish
deploy**. The old site is back on em-8.com immediately; nothing else needs to change. Then,
if the new site is not coming back soon, set `NEXT_PUBLIC_SITE_URL` back to the Railway URL
and redeploy so its canonicals stop pointing at a site that is not there.

## What cannot be done until the domain is recovered

- **Lead emails from @em-8.com.** Resend needs three DNS records (a TXT at
  `resend._domainkey`, CNAMEs at `send` and `rsend`). Leads keep going to
  `LEAD_NOTIFICATION_EMAIL` (hsheyman@gmail.com) from Resend's sandbox sender, which can
  only send to the Resend account's owner. Every lead is still saved in Sanity first.
- **SPF for Google Workspace.** em-8.com has none. `v=spf1 include:_spf.google.com ~all`.
- **Any DNS change at all.** If a record breaks, nobody at EM8 can fix it.

## The deadline that is not in the code

**The domain renews on 2027-09-03 through the former employee's Wix account.** If that
lapses, the website and EM8's company email (Google Workspace MX records live in that same
Wix zone) go down together. Recovering the domain is not blocking anything today, and it is
the most important open item in this repository.

Paths, in order of effort: the former employee moves the domain to an EM8 Wix account (a
couple of minutes on their side); Wix support with proof that EM8 owns the business; then,
once EM8 holds it, transfer to Namecheap, point both names at Railway, and delete the proxy
— the `Netlify-CDN-Cache-Control` header and `ops/netlify-proxy/` go with it.

---

## For Hunter — add anything below this line

Nothing below here is written by Claude.

### Corrections to anything above

-
