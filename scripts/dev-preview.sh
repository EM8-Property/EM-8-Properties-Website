#!/usr/bin/env bash
#
# Runs the dev server against the `preview` dataset instead of `production`.
#
# For design review: preview holds sample content so pages can be judged with something
# in them. Nothing in that dataset is real, and the deployed site never reads it.
#
#   bash scripts/dev-preview.sh
#
# Re-seed it any time with:  node --env-file=.env.local scripts/seed-preview.mjs

set -euo pipefail
cd "$(dirname "$0")/.."

set -a
# shellcheck disable=SC1091
. ./.env.local
set +a

export NEXT_PUBLIC_SANITY_DATASET=preview

echo "dev server -> dataset: preview (sample content, not production)"
npx next dev
