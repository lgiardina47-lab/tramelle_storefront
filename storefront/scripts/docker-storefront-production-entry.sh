#!/usr/bin/env bash
# Entry produzione Docker: rispetta TRAMELLE_NEXT_DIST_DIR (blue `.next-production`, green `.next-production-staging`).
set -euo pipefail
cd /workspace/storefront

export HOSTNAME=0.0.0.0
export PORT=8000
DIST="${TRAMELLE_NEXT_DIST_DIR:-.next-production}"
export TRAMELLE_NEXT_DIST_DIR="$DIST"

if [[ "${SKIP_STOREFRONT_BUILD:-0}" == "1" ]] && [[ -f "$DIST/standalone/server.js" ]]; then
  node scripts/sync-standalone-assets.mjs
  exec node "$DIST/standalone/server.js"
fi

export CI=1
apt-get update -qq && apt-get install -y -qq git >/dev/null
corepack enable
NODE_ENV=development yarn install --frozen-lockfile --non-interactive
export NODE_ENV=production
yarn build
node scripts/sync-standalone-assets.mjs
exec node "$DIST/standalone/server.js"
