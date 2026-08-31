# Footer disclaimer — DRAFT, NOT REVIEWED

> **This is a starting draft, not legal text.** It was written by an AI assistant, not by
> a securities lawyer, and it has not been reviewed by anyone qualified to approve it.
> It is here so counsel has something concrete to edit rather than a blank page.
>
> **Do not publish this as-is.** Take it to whoever handles EM8's securities work, get
> their version, and paste *that* into the `disclaimer` field in Sanity.

## Why this field exists

It renders in the footer of every page (`SiteFooter`), and it is required content — the
site will not build without it. It lives in Sanity rather than in code specifically so it
can be corrected without a developer and without a deploy.

## Context counsel will want

- The site markets offerings intended to be made under **Rule 506(c)**, with accreditation
  verification performed by Agora. The `publiclyOffered` toggle gates whether any given
  property's offering block appears publicly, and defaults to off.
- `/track-record` publishes **realized** deal-level results, including equity multiples
  and exit years, described in the past tense.
- Property pages may describe business plans and, where `publiclyOffered` is on, point to
  offering materials held in Agora.
- The site never states a forward-looking return as a promise. The permitted vocabulary
  is *targeted, projected, underwritten, estimated, pro forma*; a test rejects
  *guaranteed, will return, assured, risk-free* anywhere in the source or the CMS.

## Draft text

EM8 Properties LLC. This website is for informational purposes only and does not
constitute an offer to sell, or a solicitation of an offer to buy, any security. Offers
are made only to verified accredited investors, and only through definitive offering
documents that describe the terms, conditions, and risks of a particular investment. In
the event of any conflict between this website and those documents, the offering
documents govern.

Real estate investments involve substantial risk, including illiquidity, loss of
principal, and the risk that projected results are not achieved. Past performance is not
indicative of future results, and realized results described here reflect specific assets
under specific market conditions that may not recur. Any targeted, projected, or
underwritten figures are estimates based on assumptions that may prove incorrect, and are
not a prediction or a promise of performance.

Statements about future plans, market conditions, or anticipated results are
forward-looking and subject to change without notice. Nothing on this website is
investment, legal, tax, or accounting advice, and it does not take account of any
individual's circumstances. Prospective investors should consult their own advisers.

EM8 Properties LLC is not a registered broker-dealer or investment adviser.

## Structured data — a boundary drawn in code, pending counsel

The site emits JSON-LD (`src/lib/structuredData.ts`), and the boundary is deliberate:
**Organization** site-wide and **Article** on insight posts, and **nothing describing
properties, offerings, or returns.**

The reasoning, so nobody "completes" the markup later without asking. Schema.org's
real-estate and product vocabularies (`RealEstateListing`, `Product`, `Offer`, `price`)
exist to describe things that are for sale. Restating a targeted IRR or an equity multiple
as a machine-readable, price-like claim — stripped of the realized/targeted distinction and
the qualifying language the surrounding page carries — is a materially different statement
from the same figure rendered in prose, and it would be republished by aggregators outside
EM8's control. Neither type earns a Google rich result that would help this site, so there
is no upside to weigh against it.

**A question for counsel:** is any structured-data description of a `publiclyOffered`
property acceptable, and if so with what qualifying fields? Until that is answered the
markup stays as it is.

The same rule applies as to visible copy: nothing is asserted that the CMS does not hold.
Organization carries name, url, and contact email only — no address, logo, founding date,
or social profiles, because a crawler cannot tell a confident guess from a fact.

## Questions worth asking counsel

1. Should the entity name be the LLC, or a different named issuer?
2. Is a 506(c) general-solicitation acknowledgement wanted explicitly, given the site
   markets publicly?
3. Does publishing realized deal-level multiples on `/track-record` require any additional
   qualifying language about selection or composite presentation?
4. Is anything needed about the relationship with Agora as the verification provider?
5. Should the footer link to a fuller terms-of-use or privacy page? Neither exists yet —
   the site does collect contact details and store them in a CMS, so a privacy statement
   may be expected regardless of securities requirements.
