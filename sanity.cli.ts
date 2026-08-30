import { defineCliConfig } from 'sanity/cli'

export default defineCliConfig({
  api: {
    projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID,
    dataset: process.env.NEXT_PUBLIC_SANITY_DATASET,
  },
  deployment: {
    // Identifies the hosted Studio at em-8-properties.sanity.studio. Not a secret —
    // pinning it here stops `sanity deploy` prompting for an application id every time,
    // and stops a future deploy silently creating a second, parallel Studio.
    appId: 'ydy5hlii9ihxfon7a8kfxz89',
  },
  // Types are generated from the schema, so a renamed field fails the build with a clear
  // message rather than blanking a section in production.
  graphql: [],
})
