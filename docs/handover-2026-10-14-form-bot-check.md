# EM8 website: handover, 2026-10-14 (a bot check on every lead form)

Follows `docs/handover-2026-10-14-nav-hover-and-property-copy.md`. Hunter asked for "a
captcha or something" on the forms, so fewer bots fill them out. Cloudflare Turnstile now
checks all five forms on em-8.com.

## Where things are

| | |
|---|---|
| em-8.com | Railway `b102ef3`, deployment `d5783b1c`, through the Netlify proxy (unchanged) |
| The change | PR #74, `b102ef3` |
| Cloudflare | Turnstile widget "EM8 website", Managed mode, in a Cloudflare account Hunter created on 10/14. Hostnames `em-8.com`, `www.em-8.com`, `em-8-properties-website-production.up.railway.app` |
| Railway variables | `NEXT_PUBLIC_TURNSTILE_SITE_KEY` (a build `ARG`, public) and `TURNSTILE_SECRET_KEY` (runtime only), both set by Hunter |
| Test lead to delete | `4va9zR1kOKU6h4oimSeMAL`, `TEST` / `x@example.test`, made by mistake (see below). Also still `LE1W9QJ8akTXS54eZxW5Lj` from 10/04 |

## What the bot was doing

There were only nine leads. Their counts by form and time (no contact details were read)
showed this:

| UTC | forms, in order |
|---|---|
| 10/10 04:38–04:39 | contact, keep-in-touch (/investors), site-submission (/partners) |
| 10/14 09:00 | contact, site-submission, keep-in-touch |

That is three forms in about 35 seconds, in the middle of the night, twice. The honeypot
(`contact_ref_2`, `display: none`) did not catch it, so it fills only the fields a person
can see. That is why a browser check was chosen over another trap field or a timing check.

## How it works

All five forms (/contact, /investors, /partners, the homepage popup and the homepage email
signup) render `LeadForm` and post to `/api/lead`, so the change lives in three places:

- **`src/lib/turnstile.ts`**, `verifyTurnstile`, asks Cloudflare's siteverify:
  - `pass` when the token checks out.
  - `fail` for a missing or malformed token, or one Cloudflare rejects. That includes a
    rejection sent with a **400**: Cloudflare answers some bad input with a 400 and an error
    code, so treating every non-200 as an outage would let a forged token through.
  - `unavailable` for a network error, a 5xx, `internal-error`, or a bad or missing secret.
    **The lead is accepted** and `console.error` logs it. This follows the same
    capture-first rule as `submitLead`: an outage, or a typo in Railway's secret, must not
    turn away every investor.
  - `disabled` unless **both** the secret and the build's site key are set. The site key
    counts too, because a build without one renders no widget, so no visitor could ever
    send a token.
- **`/api/lead`** runs the check **after `parseLead`**. The honeypot still answers bots
  with a quiet success, and a mistyped email does not use up the token, which is
  single-use. A failure returns a 400 asking the visitor to reload and try again. That
  is an error, unlike the honeypot's success, because a person can fail it too.
- **`useTurnstile`** (`src/components/forms/useTurnstile.ts`) loads Cloudflare's script
  once per page and renders the widget:
  - `interaction-only`: most visitors see nothing. Someone Cloudflare is unsure about gets
    one "Verify you are human" checkbox.
  - `theme: 'light'`. Cloudflare's `auto` follows the OS, which put a black box on the
    cream form on a phone in dark mode. The site has no dark mode.
  - `compact` when the form is under 300px wide. The homepage popup's form is 278px on a
    360px phone, and the full widget needs 300px.
  - The widget is `absolute` until the checkbox shows. Even at zero height an in-flow grid
    row adds a gap, which pushed the button 12px lower. Measured after the fix: 12px from
    the last field to the button, as before.
  - Submit waits up to 60s for a token, so a visitor can tick the box. The widget resets
    after any failed submission. If the script cannot load at all, submit goes straight to
    the server's message.

## Testing it locally writes REAL leads

The dev server uses `.env.local`, whose write token is a real Editor token on production.
With Cloudflare's always-pass test secret, **any** token passes, so a well-formed local
submission is saved to production. That is how `4va9zR1kOKU6h4oimSeMAL` was created on 10/14
(`emailed: false`, because the local Resend key is the old account's). Locally, test only
paths that are refused before the write: a missing token, the honeypot, or a bad email.
Cloudflare's test keys are listed in `.env.example`.

To see the checkbox, use the site key `3x00000000000000000000FF`. It always shows one, with
a red "For testing only" strip under it.

## Verified on em-8.com

PR #74 merged with all four CI checks passing. Deployment `d5783b1c` built `b102ef3`.

| check | result |
|---|---|
| POST `/api/lead` with valid fields and no token | 400, the "could not confirm" message |
| The same with a forged token | 400. This proves the **real secret works**: with a bad secret Cloudflare answers `invalid-input-secret`, which is `unavailable`, and the lead would have been saved |
| Leads written by those two checks | none (queried by their email) |
| `/contact` in a browser | `challenges.cloudflare.com/turnstile/v0/api.js?render=explicit` loads and the widget renders with the real key. Full width at 1280px |
| Claude's automated browser | **Cloudflare showed it the checkbox**, which is what a bot should get. Claude did not tick it |

**Not verified by Claude:** that a real visitor passes without seeing anything, and that a
real submission still saves and emails. Solving the challenge from an automated browser
is not something Claude does. Hunter should send one message through /contact from his
phone and confirm it reaches info@em-8.com.

A page first loaded under 300px wide keeps the compact widget if the window is then
widened. The size is chosen once, at render. That is harmless: it only matters to a
visitor who is challenged and then rotates the phone.

## If it needs undoing

Delete `TURNSTILE_SECRET_KEY` on Railway and redeploy. With the secret missing the server
skips the check, and the widget's token is ignored. To remove the widget as well, delete
`NEXT_PUBLIC_TURNSTILE_SITE_KEY` too. It is inlined at build, so that needs a full rebuild,
which `NO_CACHE=1` already forces.

## Open

1. **Delete the two test leads** above in the Studio under Leads.
2. **Watch Railway's logs for a week.** `Turnstile refused a submission` should match bot
   traffic: odd hours, several forms in a row. `Turnstile could not be checked` means the
   secret is wrong or Cloudflare was down, so look at the error codes. `Honeypot tripped`
   still works as before.
3. If a real person reports being refused, the likely cause is a privacy extension
   blocking `challenges.cloudflare.com`. /contact lists the email address as the way
   around it.
4. The earlier handovers' open items are unchanged: the domain, the read token in Railway
   build logs, and the Editor token.

---

## For Hunter: add anything below this line

Nothing below here is written by Claude.

### Corrections to anything above

-
