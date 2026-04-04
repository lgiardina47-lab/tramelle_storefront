#!/usr/bin/env bash
# Sviluppo Next.js: porta di progetto (deploy/monorepo-default-ports.cjs), senza build.
# Libera la porta se occupata, poi `yarn dev` (hot reload) nello storefront.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
PORT="$(node -e 'console.log(require("./deploy/monorepo-default-ports.cjs").STOREFRONT)')"
cd "$ROOT/storefront"
echo "dev-storefront: liberando :${PORT} se occupata..."
fuser -k "${PORT}/tcp" 2>/dev/null || true
sleep 1
exec yarn dev
