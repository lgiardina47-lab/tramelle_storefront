#!/usr/bin/env bash
# VPS: tra shop / admin / vendor resta attivo solo storefront. Se gia cosi, niente restart.
# Altrimenti: pm2-work-one.sh storefront (ferma admin+vendor, libera porta 3000, riavvia shop).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

pm2_table() {
  pm2 list --no-color 2>/dev/null || true
}

if pm2_table | grep mercur-storefront | grep -q online \
  && ! pm2_table | grep mercur-admin | grep -q online \
  && ! pm2_table | grep mercur-vendor | grep -q online; then
  echo "pm2-ensure-storefront-only: solo mercur-storefront online tra i tre front - OK."
  exit 0
fi

exec bash "$ROOT/scripts/pm2-work-one.sh" storefront
