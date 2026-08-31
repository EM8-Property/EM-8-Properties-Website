#!/usr/bin/env bash
#
# Runs Lighthouse against a locally running production build, using the Chromium that
# Playwright already installed rather than requiring a separate system Chrome.
#
# Usage:
#   npm run build && npm start &
#   bash scripts/lighthouse.sh [url]
#
# Writes lh.json (gitignored) and prints the category scores plus the budget verdict.

set -euo pipefail
cd "$(dirname "$0")/.."

URL="${1:-http://localhost:3000/}"

# Prefer a real installed Chrome. chrome-launcher cannot spawn Playwright's bundled
# Chromium on Windows ("spawn UNKNOWN"), so that is a fallback rather than the default.
for candidate in \
  "/c/Program Files/Google/Chrome/Application/chrome.exe" \
  "/c/Program Files (x86)/Google/Chrome/Application/chrome.exe" \
  "$LOCALAPPDATA/Google/Chrome/Application/chrome.exe" \
  "$(command -v google-chrome || true)" \
  "$(command -v chromium || true)"
do
  if [ -n "$candidate" ] && [ -x "$candidate" ]; then
    CHROME_PATH="$candidate"
    break
  fi
done

if [ -z "${CHROME_PATH:-}" ]; then
  CHROME_PATH="$(node -e "console.log(require('playwright').chromium.executablePath())")"
fi
export CHROME_PATH
echo "using chrome: $CHROME_PATH"

npx lighthouse "$URL" \
  --only-categories=performance,accessibility,best-practices,seo \
  --budget-path=./lighthouse-budget.json \
  --output=json --output-path=./lh.json \
  --chrome-flags="--headless=new --no-sandbox --disable-gpu" \
  --quiet

node scripts/lighthouse-report.mjs
