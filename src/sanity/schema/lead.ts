import { defineType, defineField } from 'sanity'

/**
 * Written by the site, never edited in the Studio — hence readOnly throughout.
 *
 * Email is the working channel: each submission emails the team, who assemble the Agora
 * import sheet from those emails. This document is the safety net, and it is the only
 * thing standing between a spam-filtered notification and a permanently lost investor.
 */
export const lead = defineType({
  name: 'lead',
  type: 'document',
  fields: [
    defineField({
      name: 'source',
      type: 'string',
      options: { list: ['keep-in-touch', 'site-submission'] },
      readOnly: true,
    }),
    defineField({ name: 'firstName', type: 'string', readOnly: true }),
    defineField({ name: 'lastName', type: 'string', readOnly: true }),
    defineField({ name: 'email', type: 'string', readOnly: true }),
    defineField({ name: 'phone', type: 'string', readOnly: true }),
    defineField({ name: 'investorType', type: 'string', readOnly: true }),
    defineField({ name: 'checkSize', type: 'string', readOnly: true }),
    defineField({ name: 'accreditedConfirmed', type: 'boolean', readOnly: true }),
    defineField({ name: 'propertyAddress', type: 'string', readOnly: true }),
    defineField({ name: 'message', type: 'text', readOnly: true }),
    defineField({ name: 'submittedAt', type: 'datetime', readOnly: true }),
    // Written by the API after the notification attempt, not by an editor.
    //
    // This is what makes the capture-first design actually recoverable: a lead with
    // emailed:false was saved but never announced to anyone. Query
    // *[_type=="lead" && emailed != true] to find every investor the team was not told
    // about — the search that was impossible when this flag went unrecorded.
    defineField({
      name: 'emailed',
      title: 'Team was notified',
      type: 'boolean',
      readOnly: true,
      description: 'False means the lead was captured but the notification email failed.',
    }),
    defineField({ name: 'exportedToAgora', type: 'boolean', initialValue: false }),
  ],
  preview: { select: { title: 'email', subtitle: 'source' } },
})
