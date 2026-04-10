#!/bin/bash
# Build Next.js (standalone) + sync public/.next/static (obbligatorio per CSS/asset in prod).
# Eseguire sul server Hetzner dopo modifiche a codice o env storefront.
set -euo pipefail
cd "$(dirname "$0")/../storefront"
export NODE_ENV=production
yarn build:production
pm2 restart mercur-storefront --update-env
echo "Storefront production build deployed."
