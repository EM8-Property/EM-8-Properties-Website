import { defineCliConfig } from 'sanity/cli'

export default defineCliConfig({
  api: {
    projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID,
    dataset: process.env.NEXT_PUBLIC_SANITY_DATASET,
  },
  // Types are generated from the schema, so a renamed field fails the build with a clear
  // message rather than blanking a section in production.
  graphql: [],
})
