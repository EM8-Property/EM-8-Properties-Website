import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { schemaTypes } from '@/sanity/schema'
import { LEAD_SOURCES } from '@/lib/leads'

/* eslint-disable @typescript-eslint/no-explicit-any -- asserting on raw schema shape */

/**
 * /investors marks the accreditation checkbox required, so every `keep-in-touch` lead has
 * always carried a true accreditation flag — that field is the Rule 506(c) artifact.
 *
 * The homepage overlay asks for a name and an email only. Filing those under the same
 * source would put leads into the investor list carrying `accreditedConfirmed: false`
 * against a form that cannot produce one, which quietly degrades the artifact into
 * something nobody can rely on. It gets its own source instead.
 */
describe('lead sources', () => {
  it('gives the homepage overlay its own source', () => {
    expect(LEAD_SOURCES).toContain('homepage-popup')
  })

  it('offers every source in the Studio, so no lead shows a blank origin', () => {
    const list = (schemaTypes.find((t: any) => t.name === 'lead') as any).fields.find(
      (f: any) => f.name === 'source',
    ).options.list
    expect([...list].sort()).toEqual([...LEAD_SOURCES].sort())
  })

  it('does not file the overlay under keep-in-touch', () => {
    const src = readFileSync(
      resolve(import.meta.dirname, '../../src/components/home/InvestorPopup.tsx'),
      'utf8',
    )
    expect(src).toContain('source="homepage-popup"')
    expect(src).not.toContain('source="keep-in-touch"')
  })
})
