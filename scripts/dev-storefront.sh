#!/usr/bin/env bash
# Sviluppo Next.js: porta di progetto (deploy/monorepo-default-ports.cjs), senza build.
# Libera la porta se occupata, poi `yarn dev` (hot reload) nello storefront.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
PORT="$(node -e 'console.log(require("./deploy/monorepo-default-ports.cjs").STOREFRONT)')"
cd "$ROOT/storefront"
echo "dev-storefront: se :${PORT} è occupata, sospendo il/i processo/i sulla TCP e riavvio lo storefront sulla stessa porta…"
fuser -k "${PORT}/tcp" 2>/dev/null || true
sleep 1
# Dopo kill o crash Turbopack, .next può restare incoerente → ENOENT su build-manifest.json.
# TRAMELLE_DEV_CLEAN_NEXT=1 opzionale: `yarn dev:clean` in storefront fa lo stesso da package.json.
if [ "${TRAMELLE_DEV_CLEAN_NEXT:-}" = "1" ]; then
  echo "dev-storefront: TRAMELLE_DEV_CLEAN_NEXT=1 — rimuovo storefront/.next…"
  rm -rf "$ROOT/storefront/.next"
fi
exec yarn dev
