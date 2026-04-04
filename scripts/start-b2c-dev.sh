#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"

echo "== 1) Backend: migrazioni"
cd "$ROOT/backend"
npx medusa db:migrate

if ! npx medusa user --email admin@mercurjs.com --password admin 2>/dev/null; then
  echo "(user admin potrebbe già esistere — ok)"
fi

echo "== 2) Seed (se il DB è già popolato può fallire su regioni — ok)"
yarn seed || true

if [[ "${1:-}" == "--serve" ]]; then
  echo "== 3) Avvio backend e storefront in background (log: /tmp/medusa-dev.log, /tmp/storefront-dev.log)"
  fuser -k 9000/tcp 2>/dev/null || true
  fuser -k 3000/tcp 2>/dev/null || true
  sleep 1
  cd "$ROOT/backend"
  nohup yarn dev > /tmp/medusa-dev.log 2>&1 &
  cd "$ROOT/storefront"
  nohup npm run dev > /tmp/storefront-dev.log 2>&1 &
  echo "   API:  http://localhost:9000"
  echo "   Shop: http://localhost:3000"
  echo "   tail -f /tmp/medusa-dev.log /tmp/storefront-dev.log"
else
  echo "== 3) Avvio manuale:"
  echo "   Terminale 1: cd backend && yarn dev"
  echo "   Terminale 2: cd storefront && npm run dev"
  echo "   Oppure: $0 --serve"
fi
