import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import {
  TRACK_RECORD_NEW,
  TRACK_RECORD_PATCH,
  TRACK_RECORD_SKIPPED,
} from '../../scripts/content/track-record.mjs'
import { DealStory } from '@/components/property/DealStory'
import { ASSET_CLASSES, STATUSES } from '@/lib/propertyTaxonomy'

/**
 * The realized track record, added 2026-09-15 from Hunter's transacted-assets sheet.
 *
 * These figures are the most consequential content on the site: a reader takes "29.2%" for
 * a measurement whoever typed it, which is the same argument `strategySections` made for
 * requiring a source on the market chart. The payload is generated rather than typed, so
 * what these tests guard is not arithmetic — it is the things a generator cannot check.
 */

const ALL = [...TRACK_RECORD_NEW.map((d) => d.dealStory), ...TRACK_RECORD_PATCH.map((p) => p.dealStory)]

describe('the track-record payload', () => {
  it('publishes no confidential figure from the sheet', () => {
    /*
     * The sheet carries total equity, project cost, purchase price, closing costs, net exit
     * proceeds to LPs, LTM NOI and realized cap rate beside the figures that are published.
     * None of them are marketing copy — LP capital and operating margins are exactly what
     * `contentSource.test.ts` already refuses lender names and debt balances for.
     *
     * Asserted against the VALUES rather than the column headings, because a heading never
     * reaches a page and a number does. These are the real ones, read from the sheet.
     */
    const blob = JSON.stringify([TRACK_RECORD_NEW, TRACK_RECORD_PATCH])
    const confidential: [number, string][] = [
      [5360000, 'Burbank total equity'],
      [15605900, 'Burbank total project cost'],
      [14637000, 'Burbank purchase price'],
      [9070837, 'Burbank net exit proceeds to LPs'],
      [1125842, 'Burbank LTM NOI'],
      [3135000, 'Mundelein total equity'],
      [3846570, 'Mundelein net exit proceeds to LPs'],
      [1712500, 'Knox & Kilpatrick total equity'],
      [658642, 'Knox & Kilpatrick LTM NOI'],
      [1078172, 'Crestline LTM NOI'],
    ]
    for (const [value, what] of confidential) {
      expect(blob, `${what} (${value}) leaked into the published payload`).not.toContain(
        String(value),
      )
    }
  })

  it('carries a gross IRR for every deal and never a net one', () => {
    // The sheet has a Net IRR to LPs for Burbank (42.45%) and Mundelein (16.46%) only.
    // Publishing gross across all eleven was the decision; a net figure finding its way
    // into `grossIrr` would be mislabelled on the page rather than merely wrong.
    for (const s of ALL) expect(typeof s.grossIrr).toBe('number')
    const irrs = ALL.map((s) => s.grossIrr)
    expect(irrs, 'a net IRR reached grossIrr').not.toContain(42.5)
    expect(irrs, 'a net IRR reached grossIrr').not.toContain(16.5)
    // Burbank's gross, which is what must appear rather than its 42.5% net.
    expect(irrs).toContain(51.7)
  })

  it('writes every new property as a valid, complete document', () => {
    for (const d of TRACK_RECORD_NEW) {
      // Each of these is `validation: (r) => r.required()` in the property schema. A
      // document missing one is rejected by Sanity at write time, which during a migration
      // means a partial apply.
      expect(d.title, `${d._id} title`).toBeTruthy()
      expect(d.slug?.current, `${d._id} slug`).toBeTruthy()
      expect(d.city, `${d._id} city`).toBeTruthy()
      expect(d.state, `${d._id} state`).toBeTruthy()
      expect(d.coordinates?.lat, `${d._id} lat`).toBeTypeOf('number')
      expect(d.coordinates?.lng, `${d._id} lng`).toBeTypeOf('number')
      expect(ASSET_CLASSES, `${d._id} assetClass`).toContain(d.assetClass)
      expect(STATUSES, `${d._id} status`).toContain(d.status)
      expect(d.cardBlurb?.length, `${d._id} cardBlurb over the 180 limit`).toBeLessThanOrEqual(180)
      // `_id` follows the dataset's own convention. Burbank is `property-burbank-manor`
      // behind the slug `burbank-manor-apartments`; the first dry run of this migration
      // conflated the two and reported a live property as missing.
      expect(d._id, `${d._id} id convention`).toBe(`property-${d.slug.current}`)
    }
  })

  it('places every property in the right hemisphere, and none of them transposed', () => {
    // Chicagoland and south-east Wisconsin. A transposed pair puts a marker in Asia, which
    // `contentSource.test.ts` already guards for the original eleven properties.
    for (const d of TRACK_RECORD_NEW) {
      expect(d.coordinates.lat, `${d._id} latitude`).toBeGreaterThan(41)
      expect(d.coordinates.lat, `${d._id} latitude`).toBeLessThan(43)
      expect(d.coordinates.lng, `${d._id} longitude`).toBeLessThan(-87)
      expect(d.coordinates.lng, `${d._id} longitude`).toBeGreaterThan(-89)
    }
  })

  it('records why each omitted row was omitted', () => {
    // Two rows are deliberately absent: ReVerb, which the site says is still owned, and
    // Old 157th, which sold to an EM8 affiliate rather than to a market. An omission with
    // no reason beside it reads as an oversight and gets "fixed" by the next person.
    expect(TRACK_RECORD_SKIPPED).toHaveLength(2)
    for (const s of TRACK_RECORD_SKIPPED) expect(s.why.length).toBeGreaterThan(40)
    expect(TRACK_RECORD_SKIPPED.map((s) => s.label).join(' ')).toMatch(/Reverb/i)
    expect(JSON.stringify(TRACK_RECORD_SKIPPED)).toMatch(/affiliate/i)
  })
})

describe('DealStory with figures and no prose', () => {
  it('labels the IRR as gross, not as IRR', () => {
    // Gross is before fees and promote. On Burbank that is nine points above what an
    // investor received, so the word is load-bearing and must not be tidied away.
    render(<DealStory story={{ grossIrr: 29.2, equityMultiple: '3.10x' }} />)
    expect(screen.getByText(/Realized Gross IRR/i)).toBeInTheDocument()
    expect(screen.getByText('29.2%')).toBeInTheDocument()
  })

  it('renders no empty stage headings when a deal has figures but no story', () => {
    // The seven new properties have figures and no prose. The previous version of this
    // component rendered Acquired/Executed/Exited unconditionally, which would have given
    // each of them three headings above three empty paragraphs.
    render(<DealStory story={{ grossIrr: 18.1, equityMultiple: '1.81x' }} />)
    expect(screen.queryByText('Acquired')).toBeNull()
    expect(screen.queryByText('Executed')).toBeNull()
    expect(screen.queryByText('Exited')).toBeNull()
  })

  it('renders nothing at all when the deal story is empty', () => {
    const { container } = render(<DealStory story={{}} />)
    expect(container.firstChild).toBeNull()
  })

  it('shows a hold period instead of a bare exit year when both ends are known', () => {
    render(<DealStory story={{ acquiredYear: 2019, exitYear: 2025, equityMultiple: '3.10x' }} />)
    expect(screen.getByText('2019–2025')).toBeInTheDocument()
    expect(screen.queryByText('Exit Year')).toBeNull()
  })

  it('still shows the exit year alone when the acquisition year is unknown', () => {
    render(<DealStory story={{ exitYear: 2022, equityMultiple: '1.81x' }} />)
    expect(screen.getByText('Exit Year')).toBeInTheDocument()
  })

  it('formats whole millions without a trailing zero', () => {
    render(<DealStory story={{ salePrice: 8_000_000, equityMultiple: '1.87x' }} />)
    expect(screen.getByText('$8M')).toBeInTheDocument()
  })
})
