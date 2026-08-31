import type { SchemaTypeDefinition } from 'sanity'
import { property } from './property'
import { post } from './post'
import { teamMember } from './teamMember'
import { heroStat } from './heroStat'
import { focusCard } from './focusCard'
import { testimonial } from './testimonial'
import { lead } from './lead'
import { siteSettings } from './siteSettings'
import { ctaLink, headingBlock, heroBlock, labelledCard, stepItem, factItem } from './pageBlocks'
import { homePage, aboutPage, partnersPage, investorsPage, ctaBand, popupBlock } from './pages'

// No `pullQuote`: it existed only to hold the Buffett quote, which is out permanently.
export const schemaTypes: SchemaTypeDefinition[] = [
  property,
  post,
  teamMember,
  heroStat,
  focusCard,
  testimonial,
  lead,
  siteSettings,

  // Per-page copy singletons, closing plan revision D4. The blocks are shared object
  // types rather than repeated field lists, so a heading behaves the same everywhere.
  homePage,
  aboutPage,
  partnersPage,
  investorsPage,
  ctaLink,
  headingBlock,
  heroBlock,
  labelledCard,
  stepItem,
  factItem,
  ctaBand,
  popupBlock,
]

/**
 * Documents that must exist exactly once. The Studio pins each to a fixed id and hides it
 * from the "create new" menu — without that an editor can make a second one, which the
 * `[0]` in every singleton query would silently ignore, so their edits land in a document
 * the site never reads.
 */
export const SINGLETON_TYPES = [
  'siteSettings',
  'homePage',
  'aboutPage',
  'partnersPage',
  'investorsPage',
] as const
