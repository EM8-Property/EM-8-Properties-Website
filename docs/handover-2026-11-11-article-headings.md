# EM8 website: handover, 2026-11-11 (headings and bold in Studio rich text)

Follows `docs/handover-2026-10-14-form-bot-check.md`. Hunter updated the NITA article in the
Studio and said the headings and bolding did not show on the website.

## Where things are

| | |
|---|---|
| em-8.com | Railway `c2c2779`, deployment `241ca649`, through the Netlify proxy (unchanged) |
| The change | `c2c2779`, pushed straight to `main` at Hunter's choice (no branch, no PR) |
| The article | `post-what-a-village-wants-built`, slug `NITA-case-for-TOD`, published 15:27 UTC |

## What was wrong

The content was fine. The article's eight "Heading 2" blocks were saved as `style: 'h2'` and
the live HTML had eight `<h2>` elements. They rendered at **15px, weight 400**, the same as
the paragraphs around them, so they read as one more line of body text.

`PortableText`'s default components emit a bare `<h2>` with no class, and Tailwind's preflight
resets every heading to `font-size: inherit; font-weight: inherit`. Only `/privacy` had its
own components (added in #77). Every other rich-text field on the site had the same gap:
insight bodies, property overview and business plan, the Strategy body and About's
"Why EM8". None had used a heading until now, so nobody had seen it.

## What changed

`src/components/ui/RichText.tsx` is now the one renderer for Studio rich text, used by
`/insights/[slug]`, `/portfolio/[slug]`, `/strategy` and `/about`. `/privacy` keeps its own
components (smaller heading, legal page). It styles:

| Studio | On the page |
|---|---|
| Heading 1 and Heading 2 | 20px bold `<h2>`, ink. H1 is drawn as `<h2>` because the page title is the only `<h1>` |
| Heading 3 / Heading 4 | 16px bold / semibold |
| Quote | teal rule on the start side, italic |
| Bullet / numbered list | discs / numbers back, indented |
| Bold | semibold, ink, so it stands out from the grey body text |
| Italic | italic |
| Link | teal, underlined. `http(s)` links open in a new tab |

`tests/unit/richText.test.tsx` pins each of these. Lint requires logical properties
(`border-s`, `ps-`) for the planned Hebrew mirror.

## Bold

**No revision of the NITA article has ever contained bold.** Today's three publishes
(15:01, 15:13, 15:27 UTC) were checked through the history API: zero `strong` marks in each.
Bold was either never applied or was dropped when the text was pasted in. Sanity's paste
handling can drop bold from Word and Google Docs. Bold applied in the Studio (Ctrl+B, or
the **B** button) now shows on the site. The browser already bolded `<strong>`. This change
makes it darker too, so it stands out against the grey body text.

## Verified

**CI was not fully green when this deployed. Hunter chose to deploy anyway.** In run
43049864899 the `checks` job passed: lint, typecheck and the 710 unit tests. The `build` job
ran `npm run build` successfully, then failed three times at the Playwright browser install
(see "CI flake" below), so its E2E and Lighthouse steps never ran. As a substitute, the
production build and all 49 E2E tests passed locally. **Lighthouse has not been run on this
commit.** The next CI run that gets past the install will cover it.

Railway deployment `241ca649` reached `SUCCESS`. Its build log has `Compiled successfully`
and `Generating static pages (39/39)`, so it was a real Next build, not a cached layer.

On em-8.com after the deploy, at 390px:

| check | result |
|---|---|
| `/insights/NITA-case-for-TOD`, `article h2` | 8 headings, all `20px 700`. Body text 15px. Before: `15px 400` |
| The bullet list under The Boulevard section | `list-style-type: disc` |
| `/`, `/strategy`, `/about`, `/portfolio`, `/insights`, `/privacy`, both other articles, two property pages | 200 |

## CI flake on 11/11

The first run's `build` job failed in `npx playwright install --with-deps chromium`:
`Temporary failure resolving 'archive.ubuntu.com'` while apt fetched fonts. That is the
runner's DNS, not the code. `npm run build` had passed in the same job. Two reruns with
`gh run rerun <id> --failed` (16:00 and 16:12 UTC) failed the same way. The runner image
(`ubuntu-26.04`, `20261101.186.1`) is the same one that passed #77 on 11/4. GitHub's status
page said all systems operational. If it persists, a cached Playwright install, or
dropping `--with-deps` in favour of the image's own fonts, would take apt out of the path.

## Open

1. Bold in the NITA article, if Hunter wants any: apply it in the Studio and publish.
2. Confirm the next CI run on `main` is fully green (E2E and Lighthouse), since this
   commit's never got past the browser install.
3. The Railway token in `.env.local` is still the dead one. Hunter pasted a new project
   token in chat on 11/11 and it deployed this change. The credential guard blocks writing
   it to `.env.local`.
4. Earlier open items are unchanged: the domain, the read token in Railway build logs, the
   Editor token, and the hosted Studio redeploy for "Privacy page".
