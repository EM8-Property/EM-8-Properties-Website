# Deploys and content migrations

The site is statically generated from Sanity at build time and revalidated by a publish
webhook. That means **the dataset and the code are two moving parts that ship separately**,
and the order you move them in decides whether the live site survives it.

This document exists because getting that order wrong took the live homepage's call to
action down on 2026-08-31. Everything below is written from that.

---

## The rule

> **Adding a field ahead of the code is safe. Removing or moving one is a breaking change
> to production, and must wait until the code that stopped reading it is deployed.**

Older code ignores fields it does not know about, so a new field can land in the dataset
days before the branch that reads it. That is genuinely safe, and it is convenient: the
content is already in place when the deploy happens.

The symmetry is a trap. Removing a field is *not* the mirror of adding one. The deployed
build is still reading it, and the publish webhook will re-render the page within seconds
of the mutation — so the damage is immediate, silent, and on the live site rather than in
a branch.

### What that looks like in practice

| Change | Safe to apply before the code deploys? |
|---|---|
| Add a new field | **Yes.** Deployed code ignores it. |
| Add a new document | **Yes.** Nothing queries it yet. |
| Fill a field that was empty | **Yes**, if the deployed code already tolerated it empty. |
| Rename a field | **No.** It is a remove plus an add. |
| Move a field between documents | **No.** The old location is what the deployed build reads. |
| Delete a field or document | **No.** |
| Make an optional field required | **No** — see "required is a lie" below. |

### The safe sequence for a removal or a move

1. Merge and deploy the code that reads the **new** location, written so it tolerates the
   old data still being present.
2. Verify on the running site that the new path works.
3. *Then* run the migration step that unsets the old field.
4. Verify again — the page still renders, which is what proves the deployed code is reading
   the new location rather than the leftover.

`scripts/migrate-content.mjs` is built for this: `moveCtaBandToSettings` writes the new
location and unsets the old one as two mutations, and the unset is a no-op once the field
is already gone. Running it a second time after the deploy is the cleanup step, and it is
idempotent.

---

## What actually happened

The closing call to action lived on `homePage.ctaBand` and was read only by the homepage —
so every property page rendered the band with no copy at all: no heading, no intro, no
book-a-call. Fixing that meant moving the field to `siteSettings`, where a record every
page reads belongs.

The migration was applied to the production dataset while that branch was still open. It
did exactly what it was told: wrote `siteSettings.ctaBand`, unset `homePage.ctaBand`. The
deployed build still read `homePage.ctaBand`. The publish webhook revalidated the homepage.
The live homepage then rendered the same headless email box the change existed to remove —
now on the most important page on the site.

It stayed that way until someone asked whether everything was live.

The recovery was to copy the value back from `siteSettings` to `homePage` (from the live
record, not from the seed constant, so the team's own wording survived), confirm the
homepage recovered, ship the code, and only then run the unset for real.

**Why it was easy to get wrong:** the same "apply the migration early" pattern had been
used three times that day without incident — for `seo` fields and three new page documents,
all of which were *additions*. The habit formed on the safe case and was carried into the
unsafe one.

---

## Verifying a deploy actually landed

Railway auto-deploy is **off**. Merging to `main` does nothing on its own; the deploy is
triggered through the API every time.

`SUCCESS` on its own is not evidence. The status query returns the most recent deployment,
which may be the *previous* one — a poll started too early will report the last success and
look like the new one. Check the commit:

```
SUCCESS  commit bbeab72  "Close every page with the call to action…"
```

If the commit is not the one you just merged, the deploy has not finished starting.

After that, read the running site rather than the build output. Almost every real defect in
this project was invisible to the build, the tests, lint and Lighthouse, and showed up only
by fetching the deployed page: five pages with no `<h1>`, a mobile nav painted off-screen,
an `og:image` that applied to exactly one route, a `quality` prop that did nothing, and the
headless CTA above.

---

## `required()` is a lie, for this purpose

Sanity's `validation: (r) => r.required()` is **Studio-side only**. It greys out the
Publish button. It does not gate the API, a GROQ query, `next build`, or anything written
through Vision, the CLI, or a migration script.

So a field being "required" in the schema tells you nothing about whether the deployed site
can render without it. If the site genuinely cannot, the guard has to be in the code — the
pattern used in `(site)/layout.tsx`, which throws with a message naming the document and
where to fix it. That is the rule the whole project runs on: missing required content fails
loudly rather than rendering a shell.

A pre-deploy check belongs in `tests/integration/content-integrity.test.ts`, which reads
the live dataset. That turns "the build will fail at deploy time" into "the release gate
failed", which is a much better place to meet it.

### And on a boolean it is weaker still

`required()` on a boolean rejects `null` and `undefined` and **accepts `false`**. So on a
field whose `initialValue` is `false`, it permits the untouched default — which is
usually the exact value you were trying to prevent.

That is what happened to `testimonial.consentOnRecord` on 2026-09-03. The field carried
`required()`, looked gated, and was not: a real testimonial published with consent
unticked, validated, reported success, and then appeared on no page at all, because
`TESTIMONIALS_QUERY` filters on `consentOnRecord == true`. No error, no warning, no
rendered fallback — just absence. The release gate caught it, which is that gate working
correctly, but a release gate meets the mistake days after the edit that caused it.

If a field must hold a *particular* value rather than merely some value, `required()` is
not the rule. `.custom()` is, and its message is the only place the editor will ever be
told why. It still only binds the Studio — see the top of this section — so the query
filter and the content gate remain the things that actually protect the site.

---

## A draft can hide a published document without touching it

Sanity's Studio shows the **draft** of a document whenever one exists. A mutation that
writes `drafts.<id>` therefore changes what an editor sees while leaving the published
document — the one the site renders — completely alone.

That combination defeats every check this project has. On 2026-08-31 the content
migration seeded its two sample testimonials to `drafts.testimonial-sample-1` and `-2`,
as it is designed to. But the *published* documents of those ids had already been
replaced with real testimonials, so the effect was placeholder scaffolding laid over
somebody's real work in the editing surface. The site kept rendering the real
testimonials. `next build`, the unit suite, ESLint, Lighthouse, the release gate and the
deployed pages were all unaffected and all green. It was visible only by opening that
document in the Studio, and it sat there for three days.

Two things follow:

1. **Never seed a sample over an id that already has a published document.**
   `sampleTestimonialDrafts(publishedIds)` in `scripts/content/em8-content.mjs` is that
   guard, and `buildDocuments` consults it.
2. **When someone reports that the CMS is showing them the wrong content, query for
   drafts before anything else:**

   ```groq
   *[_id in path("drafts.**")]{ _id, _type, _updatedAt }
   ```

   A draft nobody remembers creating is the likeliest explanation, and it is invisible
   from every other direction.

---

## `setIfMissing` on an object is all-or-nothing

`setIfMissing: { seo: {...} }` fills the key when it is absent and does nothing when it is
present — including when it is present but *half filled*. A document with `seo.title` and
no `seo.description` is skipped forever, reported as "already has one" on every re-run,
while the build keeps failing on it.

Patch per leaf instead, and drop any `!defined(parent)` pre-filter:

```js
{ patch: { id, setIfMissing: { seo: {} } } },
{ patch: { id, setIfMissing: { 'seo.title': …, 'seo.description': … } } }
```

That keeps the guarantee that matters — an editor's own words are never overwritten — at
field granularity rather than object granularity, and makes the migration *repairing*
rather than merely idempotent. Both `backfillPageSeo` and `moveCtaBandToSettings` work this
way, and it is worth verifying against the real dataset by breaking one field deliberately
and watching the migration put it back while leaving a customised sibling alone.

### It keys on absence at leaf level too, which is not the same as falsiness

The same trap one level down: `setIfMissing: { 'headerCta.label': … }` fills the path when
it is **absent** and does nothing when it holds `''`. An empty string is falsy but
present.

So a step that decides what is missing by falsiness — which is what the code guards throw
on — and then writes it with `setIfMissing` will report "filling label", write nothing,
print "backfilled", and say the same thing on every future run while the build stays broken
on that empty string. A migration that claims a repair it did not make is worse than one
that does nothing, because it is believed.

Match the predicate to the mutation. Either push the check into GROQ as `!defined(...)`,
which is what `backfillPageSeo` and `backfillPageHeadings` do, or keep the falsiness check
and `set` exactly the leaves it found blank, which is what `backfillHeaderCta` does — that
version also repairs an empty string rather than only an absent key.

---

## Schema changes need the Studio redeployed

`bash scripts/deploy-studio.sh` after every schema change, or editors are filling in a
stale set of fields.

There is a subtler version of this that bit during the same work. The hosted Studio was
deployed from a feature branch, so for a while the Studio showed the CTA copy field on
**Site settings** — where the live code was not yet reading it — and no longer showed it on
**Home page**, where the live code *was*. Nothing was broken, and an editor could not have
changed the live copy. Deploy the Studio from what is merged, or accept that the editing
surface is ahead of the site until the code follows.

---

## Checklist

Before applying a migration to the production dataset:

- [ ] Is every change an **addition**? If yes, apply freely.
- [ ] If anything is removed, renamed or moved — is the code that stops reading it
      **deployed and verified** already?
- [ ] Dry run first. It writes nothing and names every document it would touch.
- [ ] Apply, then run the dry run again. It should report nothing pending.
- [ ] Read the affected page on the **live site**, not the build output.
- [ ] Schema changed? `bash scripts/deploy-studio.sh`, and check
      `SANITY_STUDIO_PROJECT_ID` appears in the inlined-variables list.
- [ ] Does anything you are writing target a `drafts.` id? If so, check whether that id
      already has a **published** document. Seeding a sample over real work is invisible to
      every automated check — see "A draft can hide a published document" above.
