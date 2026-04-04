#!/usr/bin/env bash
# Avvio PM2 / produzione: sincronizza SEMPRE public + .next/static in standalone
# (altrimenti il sito è HTML senza CSS — vedi https://tramelle.com/_next/static/... → 404).
set -euo pipefail
cd "$(dirname "$0")"
if [[ -f .env.local ]]; then
  set -a
  # shellcheck disable=SC1091
  source ./.env.local
  set +a
fi
export NODE_ENV="${NODE_ENV:-production}"
# Bash imposta HOSTNAME al nome host; Next standalone legge HOSTNAME per il bind.
# Se resta il nome macchina, Node ascolta solo su quell’IP → nginx su 127.0.0.1:3000 → 502.
export HOSTNAME="0.0.0.0"
# Porta fissa come nginx Plesk (tramelle.com → 3000): non usare altre da .env.
export PORT=3000
node scripts/sync-standalone-assets.mjs
exec node .next/standalone/server.js
