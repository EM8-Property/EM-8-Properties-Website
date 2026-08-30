import type { SchemaTypeDefinition } from 'sanity'
import { property } from './property'
import { post } from './post'
import { teamMember } from './teamMember'
import { heroStat } from './heroStat'
import { focusCard } from './focusCard'
import { testimonial } from './testimonial'
import { lead } from './lead'
import { siteSettings } from './siteSettings'

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
]
