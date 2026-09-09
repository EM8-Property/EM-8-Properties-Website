import { describe, it, expect } from 'vitest'
import { schemaTypes, SINGLETON_TYPES } from '@/sanity/schema'

/* eslint-disable @typescript-eslint/no-explicit-any -- asserting on raw schema shape */
const byName = (n: string) => schemaTypes.find((t: any) => t.name === n) as any
const field = (doc: any, n: string) => doc.fields.find((f: any) => f.name === n)

type RuleCall = { method: string; arg: unknown }

/**
 * Runs a field's `validation` callback against a recording stand-in for Sanity's Rule,
 * returning the chain that was invoked.
 *
 * Character limits are asserted this way rather than via `options.maxLength`, which the
 * original plan used: `maxLength` exists only on SlugOptions, so on a string or text
 * field it is silently inert — TypeScript rejects it outright. `validation.max()` is what
 * enforces the cap and what drives the Studio's live character counter, so that is the
 * guardrail worth testing.
 */
function captureValidation(validation: (rule: any) => unknown): RuleCall[] {
  const calls: RuleCall[] = []
  const rule: any = new Proxy(
    {},
    {
      get(_target, prop) {
        return (...args: unknown[]) => {
          calls.push({ method: String(prop), arg: args[0] })
          return rule
        }
      },
    },
  )
  validation(rule)
  return calls
}

describe('property schema', () => {
  const property = byName('property')

  it('exists with a required unique slug', () => {
    expect(property).toBeDefined()
    expect(field(property, 'slug').validation).toBeDefined()
    expect(captureValidation(field(property, 'slug').validation)).toContainEqual({
      method: 'required',
      arg: undefined,
    })
  })

  it('carries Metra station and walk minutes as first-class fields', () => {
    expect(field(property, 'metraStation')).toBeDefined()
    expect(field(property, 'walkMinutes').type).toBe('number')
  })

  it('counts residential and retail units separately', () => {
    // The live site published residential units while the internal portfolio sheet
    // published residential + retail as one total, which is why the two disagreed by
    // exactly the retail count on three properties. Splitting the fields is what stops
    // that ambiguity being re-encoded into the CMS.
    expect(field(property, 'unitCount').title).toMatch(/residential/i)
    expect(field(property, 'retailUnitCount')).toBeDefined()
    expect(field(property, 'retailUnitCount').type).toBe('number')
    expect(captureValidation(field(property, 'retailUnitCount').validation)).toContainEqual({
      method: 'min',
      arg: 0,
    })
  })

  it('caps the card blurb so it cannot overrun the card', () => {
    const calls = captureValidation(field(property, 'cardBlurb').validation)
    expect(calls).toContainEqual({ method: 'max', arg: 180 })
    expect(calls).toContainEqual({ method: 'required', arg: undefined })
  })

  it('hides deal story fields unless the property is sold', () => {
    expect(field(property, 'dealStory').hidden).toBeInstanceOf(Function)
    expect(field(property, 'dealStory').hidden({ parent: { status: 'stabilized' } })).toBe(true)
    expect(field(property, 'dealStory').hidden({ parent: { status: 'sold' } })).toBe(false)
  })

  it('defaults publiclyOffered to false so a 506(b) deal is never public by accident', () => {
    expect(field(property, 'publiclyOffered').initialValue).toBe(false)
  })

  it('requires alt text on every gallery image', () => {
    const galleryImage = field(property, 'gallery').of[0]
    const alt = galleryImage.fields.find((f: any) => f.name === 'alt')
    expect(captureValidation(alt.validation)).toContainEqual({ method: 'required', arg: undefined })
  })
})

describe('teamMember schema', () => {
  it('caps bios at 1500 characters', () => {
    expect(captureValidation(field(byName('teamMember'), 'bio').validation)).toContainEqual({
      method: 'max',
      arg: 1500,
    })
  })

  it('enables hotspot cropping so portrait headshots keep their subject', () => {
    expect(field(byName('teamMember'), 'photo').options?.hotspot).toBe(true)
  })
})

describe('testimonial schema', () => {
  it('carries a consent flag, since an unconsented name must never reach the site', () => {
    const consent = field(byName('testimonial'), 'consentOnRecord')
    expect(consent.type).toBe('boolean')
    expect(consent.initialValue).toBe(false)
  })

  it('refuses to publish one without consent, rather than letting the query hide it', () => {
    /*
     * `required()` on a boolean is not this check. It rejects null and undefined and
     * accepts `false` — which is the default — so on its own it permits exactly the
     * mistake that matters.
     *
     * And the mistake is silent everywhere else. TESTIMONIALS_QUERY filters on
     * `consentOnRecord == true`, so an unconsented testimonial publishes cleanly,
     * validates, reports success, and then simply never appears, on any page, with no
     * message anywhere. That happened on 2026-09-03 to a real, wanted testimonial. The
     * release gate does catch it, but only when someone runs `npm run test:content`,
     * which is a release step and not an edit step.
     *
     * So the refusal belongs at the moment of the mistake. The consent box is the one
     * field where the honest default is "no" and the Studio should say so out loud.
     */
    const rule = field(byName('testimonial'), 'consentOnRecord').validation
    const custom = captureValidation(rule).find((c) => c.method === 'custom')
    expect(custom, 'consentOnRecord has no rule that actually requires true').toBeDefined()

    const check = custom!.arg as (v: unknown) => true | string
    expect(check(true)).toBe(true)
    expect(check(false)).toEqual(expect.stringContaining('consent'))
    // undefined is required()'s case, not this rule's. Reporting it here too would put
    // two errors on one field for one problem.
    expect(check(undefined)).toBe(true)
  })
})

describe('siteSettings schema', () => {
  const settings = byName('siteSettings')

  it('holds the header call to action, reusing the button block', () => {
    // ctaLink rather than a bare string: the label and its destination are edited
    // together, and reusing the block means the Studio shows the same two fields here as
    // it does for every other button on the site.
    const cta = field(settings, 'headerCta')
    expect(cta).toBeDefined()
    expect(cta.type).toBe('ctaLink')
  })

  it('caps the label shorter than ctaLink does, because it shares a row with the nav', () => {
    /*
     * ctaLink allows 40, which is right for a button in a page body and wrong here. The
     * header is one flex-wrap row holding the wordmark, five nav links, Investor Login
     * and this button, so the label decides how tall the header is. Measured on /about
     * at the md breakpoint, where it is tightest:
     *
     *   768px   11 chars -> header 62px    14 -> 102px    39 -> 118px
     *   820px   18 chars -> header 62px    21 -> 102px
     *   900px   25 chars -> header 62px    39 -> 102px
     *
     * Nothing here collides — even 39 chars leaves 45px between the header and the hero
     * eyebrow — so this is a design guardrail, not a correctness fix. It stops a header
     * three rows deep on a tablet, and it gives the editor a live character counter at
     * the length the design actually wants.
     *
     * A field-level custom rule rather than a tighter max on ctaLink: narrowing the
     * shared block would move the cap on every other button on the site.
     */
    const rule = field(settings, 'headerCta').validation
    const custom = captureValidation(rule).find((c) => c.method === 'custom')
    expect(custom, 'headerCta has no length rule of its own').toBeDefined()

    const check = custom!.arg as (v: unknown) => true | string
    expect(check({ label: 'Invest With Us', href: '/investors' })).toBe(true)
    expect(check({ label: 'Register Your Interest In Our Offerings', href: '/investors' })).toEqual(
      expect.stringContaining('20'),
    )
  })

  it('makes it required, because the layout throws without it', () => {
    // Studio-side only, as ever — the real guard is in (site)/layout.tsx and the release
    // gate is in content-integrity. This is here so an editor is told before publishing
    // rather than after the build fails.
    expect(captureValidation(field(settings, 'headerCta').validation)).toContainEqual({
      method: 'required',
      arg: undefined,
    })
  })
})

describe('schema completeness', () => {
  it('registers every document type the site needs', () => {
    const names = schemaTypes.map((t: any) => t.name)
    for (const n of ['property', 'post', 'teamMember', 'heroStat', 'focusCard', 'testimonial', 'lead', 'siteSettings']) {
      expect(names).toContain(n)
    }
  })

  it('does not register pullQuote — the Buffett quote was cut', () => {
    expect(schemaTypes.map((t: any) => t.name)).not.toContain('pullQuote')
  })
})

describe('navLabels on siteSettings', () => {
  const settings = byName('siteSettings')
  const navLabels = field(settings, 'navLabels')
  const KEYS = [
    'aboutUs',
    'aboutEm8',
    'whyEm8',
    'ourTeam',
    'strategy',
    'whyMidwest',
    'partners',
    'portfolio',
    'insights',
  ]

  it('carries one field per nav node, in bar order', () => {
    expect(navLabels).toBeDefined()
    expect(navLabels.fields.map((f: any) => f.name)).toEqual(KEYS)
  })

  it('describes the destination each label points at', () => {
    /*
     * The only guard available against the one failure this design cannot test for: a
     * label that lies about where it goes. "Insights" over a link to /partners is valid on
     * both halves and catchable by nothing. §5's mitigation is that each field description
     * names its destination, so the editor is told. Asserting that a description mentions
     * a path is weak; it is the difference between a field that explains itself and one
     * that does not.
     */
    for (const f of navLabels.fields) {
      expect(f.description, `navLabels.${f.name} has no description`).toBeTruthy()
      expect(
        f.description,
        `navLabels.${f.name}'s description does not name its destination`,
      ).toMatch(/\//)
    }
  })

  it('caps the four bar labels at 12 characters and the panel labels at 24', () => {
    /*
     * The phone bar is measured in characters and, now that the labels are CMS fields, the
     * count is not knowable at build time — "Our Investment Strategy" is a legal edit.
     * §5's arithmetic at the 11px semibold the bar uses: four 14-character labels reach
     * ~356px, fitting 390px but not 320px; 12 characters reach ~312px and fit both. Task 6
     * confirms 12 by measurement rather than by that arithmetic.
     *
     * The five children cap at 24 instead, because a panel row has the width of the panel
     * and none of the bar's problem. Same shape as `headerCta.label`'s cap of 20 against
     * ctaLink's own 40: a guardrail on the design, not on correctness.
     */
    const cap = (name: string) => {
      const f = navLabels.fields.find((x: any) => x.name === name)
      return captureValidation(f.validation).find((c: RuleCall) => c.method === 'max')?.arg
    }
    for (const bar of ['aboutUs', 'strategy', 'portfolio', 'insights']) {
      expect(cap(bar), `navLabels.${bar} is a bar label and must cap at 12`).toBe(12)
    }
    for (const child of ['aboutEm8', 'whyEm8', 'ourTeam', 'whyMidwest', 'partners']) {
      expect(cap(child), `navLabels.${child} is a panel label and should cap at 24`).toBe(24)
    }
  })

  it('marks every label required in the Studio too', () => {
    // A courtesy to the editor, not the guard. Sanity's required() greys out Publish and
    // gates nothing else — not the API, not a GROQ query, not `next build`. The guard is
    // the per-leaf throw in (site)/layout.tsx via REQUIRED_SITE_SETTINGS, added in Task 4.
    for (const f of navLabels.fields) {
      expect(
        captureValidation(f.validation),
        `navLabels.${f.name} is not required`,
      ).toContainEqual({ method: 'required', arg: undefined })
    }
  })
})

describe('the realized-results heading', () => {
  const settings = byName('siteSettings')
  const heading = field(settings, 'dealStoryHeading')

  it('is a siteSettings field, so the words are editable', () => {
    /*
     * Hunter's instruction, 2026-09-08: every string this PR writes has to be editable in
     * the Studio. This was the only one that would have been a literal in TSX — the h2
     * above a sold property's realized figures — so it is a field.
     *
     * On siteSettings rather than on the property, because it is a section label read by
     * every property page rather than a fact about any one of them. Same reasoning as
     * `ctaBand`, whose account of the "one record every page reads" rule is on that field.
     */
    expect(heading).toBeDefined()
    expect(heading.type).toBe('string')
  })

  it('is optional, so blanking it cannot fail a build', () => {
    /*
     * Deliberately NOT required, unlike the nine nav labels. A missing nav label renders a
     * tab with no words in it, which is a broken page; a missing heading here renders the
     * deal figures with no heading, which is exactly how they looked on /track-record for
     * the last three weeks. So the cost of an editor clearing it is a slightly plainer
     * section, not 29 failed pages — and there is no reason to buy a tenth build-failure
     * vector for a heading that degrades gracefully.
     */
    expect(heading.validation).toBeDefined()
    const rules = captureValidation(heading.validation)
    expect(rules.map((r: RuleCall) => r.method)).not.toContain('required')
    expect(rules).toContainEqual({ method: 'max', arg: 60 })
  })
})

describe('strategyPage', () => {
  const strategy = byName('strategyPage')

  it('is shaped like the other page singletons, plus a body', () => {
    expect(strategy).toBeDefined()
    expect(strategy.fields.map((f: any) => f.name)).toEqual(['seo', 'heading', 'body'])
  })

  it('requires seo and heading, and leaves the body optional', () => {
    /*
     * The body is the Why Midwest argument, and it is copy EM8 owes — §3 lists it under
     * "Owed by people". So the page ships with its structure in place and its body empty,
     * which is what means nobody needs a developer when the words arrive. `heading` is
     * required for the same reason it is on /portfolio and /insights: the component throws
     * without a title, and a titleless page failing the build loudly is what this project
     * prefers to a shell.
     */
    for (const name of ['seo', 'heading']) {
      expect(
        captureValidation(field(strategy, name).validation),
        `strategyPage.${name} should be required`,
      ).toContainEqual({ method: 'required', arg: undefined })
    }
    expect(field(strategy, 'body').validation).toBeUndefined()
  })

  it('is registered as a pinned singleton', () => {
    // Unpinned, the Studio lets an editor create a second one, which the [0] in
    // STRATEGY_PAGE_QUERY silently ignores — so their edits land in a document the site
    // never reads.
    expect([...SINGLETON_TYPES]).toContain('strategyPage')
  })
})

describe('whyEm8 on aboutPage', () => {
  const whyEm8 = field(byName('aboutPage'), 'whyEm8')

  it('is an optional block with its own heading and body', () => {
    expect(whyEm8).toBeDefined()
    expect(whyEm8.fields.map((f: any) => f.name)).toEqual(['heading', 'body'])
    // Optional at the top: the section ships empty and renders nothing until the copy
    // lands. §5: "A section whose body is absent renders nothing, and its nav entry goes
    // with it." An empty <h2> on /about would be worse than no section at all.
    expect(whyEm8.validation).toBeUndefined()
  })
})
