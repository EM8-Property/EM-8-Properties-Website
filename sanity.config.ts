'use client'

// The directive above is required and must stay the first statement in this file.
// Without it, Next pulls the whole `sanity` package into the React Server Component
// graph, where `swr` resolves to its `react-server` build — which has no default export,
// while Sanity does `import useSWR from "swr"`. The Studio then 500s with
// "Export default doesn't exist in target module".

import { defineConfig } from 'sanity'
import { structureTool } from 'sanity/structure'
import { visionTool } from '@sanity/vision'
import { schemaTypes } from './src/sanity/schema'

const SINGLETONS = ['siteSettings'] as const

export default defineConfig({
  basePath: '/studio',
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID!,
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET!,
  schema: { types: schemaTypes },
  plugins: [
    structureTool({
      // siteSettings is a singleton (spec §4). Without this the Studio happily lets an
      // editor create a second one, which SITE_SETTINGS_QUERY would then silently ignore
      // via [0] — edits land in a document the site never reads. Pin it to one known id.
      structure: (S) =>
        S.list()
          .title('Content')
          .items([
            S.listItem()
              .title('Site settings')
              .id('siteSettings')
              .child(S.document().schemaType('siteSettings').documentId('siteSettings')),
            S.divider(),
            ...S.documentTypeListItems().filter(
              (item) => !SINGLETONS.includes(item.getId() as (typeof SINGLETONS)[number]),
            ),
          ]),
    }),
    visionTool(),
  ],
  document: {
    // Keep singletons out of the global "create new" menu for the same reason.
    newDocumentOptions: (prev) =>
      prev.filter((t) => !SINGLETONS.includes(t.templateId as (typeof SINGLETONS)[number])),
  },
})
