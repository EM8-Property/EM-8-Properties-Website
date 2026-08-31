# syntax=docker/dockerfile:1

# ---- build ------------------------------------------------------------------
FROM node:22-alpine AS builder
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

# Required at BUILD time, not just at runtime.
#
# `next build` runs generateStaticParams and prerenders every route, which means it
# executes GROQ queries against Sanity during the build. Without these the build fails
# with "Configuration must contain `projectId`" — the original plan's Dockerfile passed
# no environment at all and could not have produced an image.
#
# The NEXT_PUBLIC_* values are inlined into the client bundle by design and are not
# secrets. The write token, Resend key, and revalidate secret are runtime-only and must
# never appear here.
ARG NEXT_PUBLIC_SANITY_PROJECT_ID
ARG NEXT_PUBLIC_SANITY_DATASET
ARG NEXT_PUBLIC_SITE_URL
ENV NEXT_PUBLIC_SANITY_PROJECT_ID=$NEXT_PUBLIC_SANITY_PROJECT_ID \
    NEXT_PUBLIC_SANITY_DATASET=$NEXT_PUBLIC_SANITY_DATASET \
    NEXT_PUBLIC_SITE_URL=$NEXT_PUBLIC_SITE_URL \
    NEXT_TELEMETRY_DISABLED=1

# The read token is required at BUILD time too, which is easy to get wrong.
#
# The dataset is private. Prerendering runs GROQ as the anonymous role, which returns
# an empty result set rather than an error, so the build fails on a missing siteSettings
# document. That error names the content and sends you to the Studio, when the real
# problem is a missing credential. The check below exists to stop that misdirection.
#
# Confined to this builder stage and never promoted to ENV in the runner, so it does
# not reach the published image. Railway needs the explicit ARG: it does not pass
# service variables into a Dockerfile build automatically.
ARG SANITY_API_READ_TOKEN

RUN if [ -z "$SANITY_API_READ_TOKEN" ]; then \
      echo "ERROR: SANITY_API_READ_TOKEN is empty."; \
      echo "The Sanity dataset is private, so prerendering needs it at BUILD time."; \
      echo "Set it as a service variable in Railway. Without it this build fails"; \
      echo "later with a misleading siteSettings error."; \
      exit 1; \
    fi \
 && SANITY_API_READ_TOKEN="$SANITY_API_READ_TOKEN" npm run build

# ---- run --------------------------------------------------------------------
FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000

# Run as a non-root user rather than root, which is the node:alpine default.
RUN addgroup --system --gid 1001 nodejs \
 && adduser --system --uid 1001 nextjs

COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs
EXPOSE 3000

CMD ["node", "server.js"]
