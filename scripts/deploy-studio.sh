#!/usr/bin/env bash
#
# Deploy the Sanity-hosted Studio to em8-properties.sanity.studio.
#
# This is the Studio the team uses day to day. It is separate from the Studio embedded
# at /studio in the Next app — same project, same dataset, same schema, two front doors.
# Redeploy this whenever the schema in src/sanity/schema/ changes, or editors will be
# working against a stale set of fields.
#
# Usage:
#   bash scripts/deploy-studio.sh                      # deploy to $STUDIO_HOSTNAME
#   bash scripts/deploy-studio.sh --dry-run            # report only, create nothing
#   STUDIO_HOSTNAME=other bash scripts/deploy-studio.sh
#
# Hostnames are global across all of Sanity, so availability is only checked at deploy
# time — a dry run cannot tell you whether a name is free.
#
# Requires .env.local with NEXT_PUBLIC_SANITY_PROJECT_ID, NEXT_PUBLIC_SANITY_DATASET,
# and SANITY_API_WRITE_TOKEN. Nothing here is written to disk or logged.

set -euo pipefail

cd "$(dirname "$0")/.."

if [ ! -f .env.local ]; then
  echo "error: .env.local not found. Copy .env.example and fill it in." >&2
  exit 1
fi

set -a
# shellcheck disable=SC1091
. ./.env.local
set +a

export SANITY_AUTH_TOKEN="${SANITY_API_WRITE_TOKEN:?SANITY_API_WRITE_TOKEN is empty}"

# The hosted Studio serves from the root of its own subdomain, unlike the embedded one at
# /studio. sanity.config.ts reads this flag and picks the basePath itself — deliberately a
# boolean rather than the path, because Git Bash's MSYS path translation rewrites a bare
# "/" in an env var to "C:/Program Files/Git/" and breaks the schema deploy.
export SANITY_STUDIO_HOSTED=true

STUDIO_HOSTNAME="${STUDIO_HOSTNAME:-em-8-properties}"

echo "Deploying to https://${STUDIO_HOSTNAME}.sanity.studio"
npx sanity deploy --url "$STUDIO_HOSTNAME" -y "$@"
