# EM8 website — handover, 2026-10-04 (favicon, /contact, a Contact tab, and the domain plan)

Follows `docs/handover-2026-10-01-netlify-proxy-cutover.md`. Hunter asked for three things:
the EM8 logo as the favicon, a contact page "for people who just want to reach out and
learn more about EM8 Properties", and to start the em-8.com domain transition now that he
has access to the Wix account the domain sits in. The first two shipped and were verified
on em-8.com. The third is researched and planned, and is waiting on answers from Hunter.

## Where things are

| | |
|---|---|
| em-8.com | Railway `b89e703`, deployment `1e1b40c2`, through the Netlify proxy (unchanged) |
| Favicon | PR #67, `77b4c79`. Deployment `59b11688` (the first attempt, `db573b7a`, failed; see below) |
| /contact + Contact tab | PR #68, `fa6036f`, plus PR #69, `b89e703`, an E2E count fix |
| Sanity, production | `contactPage` created, `navLabels.contact = "Contact"` set. `footerLabels.contact` was set and then unset (see below). Nothing else written |
| Test lead | `LE1W9QJ8akTXS54eZxW5Lj`, `TEST` / `contact-test@example.com`, source `contact`, `emailed: true`. **Hunter to delete** in the Studio under Leads |
| Local write token | `.env.local` line 12 now holds **"Claudev2 (Robot)"**, an Editor project token. **Hunter to delete it** at sanity.io/manage once nothing else needs a write |

## 1. Favicon

The scaffold favicon was replaced with the header's mark: `EM` in white and the teal `8`, in
Cormorant SemiBold, on an ink (`#1A1A1A`) tile. Hunter picked it from three mocks: mark on
white, mark on a dark tile, and a teal `8` alone.

- `src/app/favicon.ico`: 16, 32 and 48px, rounded tile, with the PNGs embedded in the ICO
- `src/app/icon.png`: 512px, rounded tile
- `src/app/apple-icon.png`: 180px, **square and full-bleed**, because iOS rounds the corners itself

There is no code change. Next's file conventions emit the three `<link>` tags, which were
verified on em-8.com, and the live bytes hash-match the merged files.

**How they were made, if they need remaking:** the mark was drawn on a `<canvas>` in a browser
from `public/fonts/CormorantGaramond-SemiBold-wordmark.ttf`, then exported with
`toDataURL`. The ICO was assembled by hand: a 6-byte header, a 16-byte entry per size, then
the PNGs. There is no Python, ImageMagick or canvas library on this machine, so that route
avoids installing anything.

### The first Railway build failed, and it was not the favicon

`db573b7a` failed inside `next build` with Turbopack reporting
`Can't resolve '@vercel/turbopack-next/internal/font/google/font'` for Cormorant. That means
`next/font/google` failed to fetch from Google Fonts on Railway's builder. The same commit had
just built in GitHub CI, and a straight retry (`59b11688`) succeeded. **If a build fails on a
`next/font/google` resolve error, retry once before debugging.** The live site keeps serving
the previous deployment meanwhile.

## 2. /contact

A previous session had drafted most of it (schema, seed copy, page, footer link) and left it
uncommitted and untested on the `contact-page` branch. This session finished it.

**The page.** It opens on the hero carousel ("Contact" / "Questions about EM8? Start here."),
then has "Other ways to reach us" with `siteSettings.contactEmail` and the book-a-call link,
then the form: name, email, optional phone, "I am a…" (Investor / Broker / Property owner /
Municipality / Resident / Other) and the message. Leads file under a new `contact` source,
which requires a name and never records accreditation. `investorType` holds the "I am a…"
answer, the same field /partners uses. Like /investors and /partners, the page carries no
`CtaBand`: the page *is* its form. `ctaCoverage.test.ts` lists it in `HAS_OWN_FORM`.

**The Contact tab.** Hunter wanted Contact in the top navigation beside About Us, Strategy,
Portfolio and Insights, with the text smaller "so everything fits". From three mocks he chose
the label **"Contact"** over "Contact Us", because the shorter word lets the phone type stay
a size larger.

- `contact` joins `NAV_TREE` and `navLabels`, as a required leaf seeded "Contact", max 10
  characters. The footer link reads the same label.
- An earlier draft gave the footer link its own `footerLabels.contact`. That was dropped
  once Contact became a nav destination. `footerLabels` exists for links with no nav key,
  and the schema's own docblock argues exactly that. The value had already been written to
  production, so it was **unset after the deploy**: removal follows the code, per
  `docs/deploys-and-migrations.md`.
- **Phone nav type is `clamp(9px, 2.4vw, 11px)` with a 10px gap.** The minimum size that
  fits all five tabs on one row was measured on `/about` with the webfonts loaded:

  | width | "Contact Us" | "Contact" | 2.4vw gives |
  |---|---|---|---|
  | 360px | 8px | 8.5px | 9px (the floor), so it wraps to 2 rows |
  | 375px | 8.5px | 9px | 9.0px, one row |
  | 390px | 9px | 9.5px | 9.4px, one row |
  | 414px | 10px | 10.5px | 9.9px, one row |
  | 430px | 10.5px | 11px | 10.3px, one row |

  Below about 360px, or before the webfonts arrive, the row wraps to two lines. That is the
  height `HEADER_RESERVATION` was already sized for, so hero clearance is no worse than it
  was. On a phone where the row fits, the header drops from 114px to 89px. Desktop is
  unchanged: 12px, one row, header 61px.
- **If anyone lengthens a tab label in the Studio**, the phone row will wrap back to two
  lines. That is safe but is no longer what Hunter chose. The `contact` field description
  says to keep it short.

**Verified on em-8.com:** every top-level route returns 200, including `/sitemap.xml` (which
lists /contact) and `/studio`. The tab sits on one row at 375px at 9.008px. Netlify reads
`fwd=miss`. A real submission through the live form showed the success message, was saved
with `source: contact` and `emailed: true`, and so reached info@em-8.com.

### Never run an unscoped `--apply`

The PR's first description said to run `scripts/migrate-content.mjs --apply`. **That would
have overwritten every property, team member and post with the seed copies**, because
`buildDocuments` writes them with `createOrReplace`. That wipes Studio edits. Caught on the dry
run ("31 documents prepared"), corrected before anything ran.
The content went in through the scoped steps only:

```
node --env-file=.env.local scripts/migrate-content.mjs --only=pages --apply
node --env-file=.env.local scripts/migrate-content.mjs --only=nav-labels --apply
```

Both are additive and idempotent. Always dry-run first: the same commands without `--apply`.

### The local token was read-only, and getting a working one took three tries

`.env.local`'s write token was the Viewer-role "Claude (Robot)" the 10-01 handover describes.
A `dryRun=true` mutation is the cheap way to check a token's role without writing anything:

```js
fetch(`https://${projectId}.api.sanity.io/v2024-01-01/data/mutate/${dataset}?dryRun=true`, …)
```

- **Try 1, "Claude-Edits (Robot)":** `projectUserNotFoundError`. Its user id starts with `g-`,
  unlike the project robots (`p…`). It was an **organization-level** token, not a member of
  project `v425a6nq`. Create tokens inside the project: Project → API → Tokens.
- **Try 2:** `401 Session not found`. The line was well formed, so the copied value was
  wrong or the token had already been deleted. Use the copy button; the token shows once.
- **Try 3, "Claudev2 (Robot)":** Editor, works. It is the one now in `.env.local`.

### CI failed after the merge

`gh pr checks 68 --watch` followed by `gh pr merge` merged with the CI **build** job red.
Branch protection does not require it. The failure was `the four nav parents are visible on a
phone without a tap`, which counts `#site-nav` children and needed 5. It was fixed in #69 and
deployed only once all four checks passed. Nothing broken was ever deployed, because Railway
deploys only on an explicit call. **Check that `gh pr checks` is all `pass` before merging.**

### Worktrees cannot borrow `node_modules`

A junction from a worktree to the main checkout's `node_modules` makes Turbopack panic:
`Symlink [project]/node_modules is invalid, it points out of the filesystem root`. Without
the link, it cannot find `next/package.json`. To run the dev server in a worktree, give it
its own `npm ci`. When removing a junction, use `rmdir`, never a recursive delete, which
would follow it into the real `node_modules`.

## 3. The domain: researched, nothing changed

Hunter has access to the Wix account the domain is in. What kind of access is not yet known.
No DNS, registrar or Wix setting was touched.

**Public DNS on 10-04**, which matches the 10-01 handover: A `@` → `75.2.60.5`, CNAME `www` →
`em8-properties.netlify.app`, five Google MX, the `google-site-verification` TXT, and `_dmarc`
`v=DMARC1; p=none;`. There is **no SPF and no Google DKIM** (`google._domainkey`). Namecheap
will need to rebuild these records before the cutover.

**Registry RDAP (Verisign) on 10-04:** created 2020-09-03, expires 2027-09-03, status
`client transfer prohibited` and `client update prohibited` (the normal Wix lock), DNSSEC off.
**Last changed 2026-10-02 19:59Z, cause unknown.**

What the research found (Wix, Namecheap, ICANN and Railway docs):

- **60-day lock.** Wix locks transfers for 60 days after any registrant contact change, with
  no opt-out. If the 10-02 change was a contact edit, the earliest transfer is about
  2026-12-01. **Do not edit the registrant name or email until after the Namecheap transfer.**
  A completed transfer also locks the domain at Namecheap for about 60 days.
- **Who can transfer.** Only the Wix account owner, or a co-owner who also owns the payment
  method. **The EPP code is emailed to the registrant contact**, probably the former
  employee's address. It is not shown on screen.
- **DNS gap.** Wix will not change nameservers on a domain it registers, and it stops serving
  the zone once the domain leaves. Its own help page says business email MX records "must be
  added again" afterwards. So the new zone has to be built at Namecheap before the transfer
  completes, and switched the moment it lands.
- **Namecheap** keeps the existing nameservers through a transfer, adds a year, and takes up
  to about 5 days unless the losing side approves sooner. It supports **ALIAS at `@`**
  alongside MX, which is what Railway's apex domain needs. Do not use a CNAME at `@`, which
  breaks MX. Price was not confirmed: roughly $12–15.

**Recommended order:**
1. **Wix "Transfer to a different Wix account"**, into a Wix account EM8 owns. The sending
   owner types the receiving account's login. It takes the domain out of the former
   employee's control without touching DNS or the registrar. Whether this carries DNS records
   over or itself sets off a lock was not confirmed in Wix's docs, so check it in the UI first.
2. **Transfer to Namecheap**, with every record rebuilt there first.
3. **Point `@` at Railway with an ALIAS**, delete the Netlify proxy, the
   `Netlify-CDN-Cache-Control` header and `ops/netlify-proxy/`. Then set up Resend DKIM and
   SPF, and `RESEND_FROM`.

**Waiting on Hunter:** what his Wix access is (logged in as the owner, or added as a
collaborator); whether EM8 has its own Wix and Namecheap accounts; what changed on 10-02;
and the registrant email shown under the domain's contact info.

## Open, in order of consequence

1. **The domain**, above. It is still the 10-01 handover's item 1, and the renewal date
   (2027-09-03) also carries company email.
2. **Railway build logs print the Sanity read token in plain text.** `SANITY_API_READ_TOKEN`
   is passed as a Docker `ARG`, and the build step's `RUN` line echoes its value, so anyone
   who can read the Railway project's logs can read the dataset. Docker's own lint flags it
   (`SecretsUsedInArgOrEnv`). Fix: a BuildKit secret mount. Then rotate that token.
3. **Delete the test lead** `LE1W9QJ8akTXS54eZxW5Lj`. It is the only `TEST` lead left; the
   two from 10-01 were already gone when checked on 10-04.
4. **Delete the "Claudev2" Editor token** once nothing else needs a write. `.env.local` will
   then hold a dead token, which nothing local depends on.
5. The 10-01 handover's items 2–9 are unchanged.

---

## For Hunter — add anything below this line

Nothing below here is written by Claude.

### Corrections to anything above

-
