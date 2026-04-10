#!/usr/bin/env bash
# Deploy storefront Next.js su Workers (OpenNext). Richiede: `wrangler login`, variabili in Cloudflare.
#
# Se https://tramelle.com mostra solo "Hello world" in text/plain, il dominio è agganciato a un Worker
# di default o a un deploy vuoto: va sostituito con questo worker (`wrangler.toml` → name tramelle-storefront).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT/storefront"
export NODE_ENV=production
corepack enable 2>/dev/null || true
yarn install --frozen-lockfile 2>/dev/null || yarn install
yarn build:cloudflare
exec npx wrangler deploy
