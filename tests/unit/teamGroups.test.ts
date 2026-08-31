import { describe, it, expect } from 'vitest'
import { schemaTypes } from '@/sanity/schema'
import { TEAM_GROUPS, TEAM_GROUP_LABELS } from '@/lib/teamGroups'

/* eslint-disable @typescript-eslint/no-explicit-any -- asserting on raw schema shape */
const byName = (n: string) => schemaTypes.find((t: any) => t.name === n) as any
const field = (doc: any, n: string) => doc.fields.find((f: any) => f.name === n)

/**
 * /about listed one flat team. Partners and board members are a different relationship to
 * the firm than employees — a board seat is not a job title — so they need their own
 * grouping rather than being mixed into the staff list.
 */
describe('team groups', () => {
  it('offers leadership and partner-board', () => {
    expect(TEAM_GROUPS).toContain('leadership')
    expect(TEAM_GROUPS).toContain('partner-board')
  })

  it('labels every group', () => {
    for (const g of TEAM_GROUPS) expect(TEAM_GROUP_LABELS[g]).toBeTruthy()
  })
})

describe('teamMember schema', () => {
  const group = field(byName('teamMember'), 'group')

  it('carries a group field', () => {
    expect(group).toBeDefined()
  })

  it('offers exactly the groups the UI knows how to render', () => {
    // A value here with no matching section on /about would make a member vanish from the
    // page entirely while still existing in the CMS.
    expect(group.options.list.map((o: any) => o.value ?? o)).toEqual([...TEAM_GROUPS])
  })

  it('defaults to leadership, so an existing member keeps its place', () => {
    expect(group.initialValue).toBe('leadership')
  })
})
