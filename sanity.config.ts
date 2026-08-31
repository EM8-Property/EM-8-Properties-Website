'use client'

// The directive above is required and must stay the first statement in this file.
// Without it, Next pulls the whole `sanity` package into the React Server Component
// graph, where `swr` resolves to its `react-server` build — which has no default export,
// while Sanity does `import useSWR from "swr"`. The Studio then 500s with
// "Export default doesn't exist in target module".

import { defineConfig } from 'sanity'
import { structureTool } from 'sanity/structure'
import { visionTool } from '@sanity/vision'
import { schemaTypes, SINGLETON_TYPES } from './src/sanity/schema'

/**
 * Every pinned singleton, shared with the schema module so the Studio structure and the
 * schema cannot disagree about which documents are one-of-a-kind.
 */
const SINGLETONS = SINGLETON_TYPES

export default defineConfig({
  // '/studio' for the Studio embedded in this Next app; '/' for the Sanity-hosted Studio
  // at em-8-properties.sanity.studio, which serves from its own root. One config, both
  // targets, no forked copy to drift out of sync.
  //
  // This is a boolean flag rather than the basePath itself on purpose: passing a bare "/"
  // through an environment variable is mangled by Git Bash's MSYS path translation on
  // Windows, which rewrites it to "C:/Program Files/Git/" and fails the schema deploy
  // with a message that blames the workspace config rather than the shell.
  basePath: process.env.SANITY_STUDIO_HOSTED === 'true' ? '/' : '/studio',

  // Two names for each value, and both are needed — this file is built by two different
  // bundlers that inline different prefixes.
  //
  //   Next    inlines NEXT_PUBLIC_*     -> serves the embedded /studio route
  //   Sanity  inlines SANITY_STUDIO_*   -> builds the hosted em-8-properties.sanity.studio
  //
  // The Sanity CLI knows nothing about NEXT_PUBLIC_, so reading only that name compiled
  // `projectId` to undefined in the hosted bundle and the Studio died on load with
  // "Configuration must contain `projectId`" — while the embedded route kept working,
  // which is exactly what makes this easy to miss. `sanity deploy` prints the variables
  // it inlined; if SANITY_STUDIO_PROJECT_ID is not in that list, the deploy is broken.
  projectId: process.env.SANITY_STUDIO_PROJECT_ID ?? process.env.NEXT_PUBLIC_SANITY_PROJECT_ID!,
  dataset: process.env.SANITY_STUDIO_DATASET ?? process.env.NEXT_PUBLIC_SANITY_DATASET!,
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
            // Page copy first: it is what an editor reaches for most often.
            ...(
              [
                ['homePage', 'Home page'],
                ['aboutPage', 'About page'],
                ['partnersPage', 'Partners page'],
                ['investorsPage', 'Investors page'],
              ] as const
            ).map(([type, title]) =>
              S.listItem()
                .title(title)
                .id(type)
                .child(S.document().schemaType(type).documentId(type)),
            ),
            S.divider(),
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
