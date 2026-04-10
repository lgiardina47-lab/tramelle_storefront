#!/usr/bin/env bash
# Avvia TUTTI i servizi Mercur in PM2: API + storefront + admin + vendor (porte da monorepo).
# Usa quando ti servono tramelle.com + manage + vendor insieme (server più capiente o accetti il carico).
# Con poche risorse resta disponibile: scripts/pm2-work-one.sh (un solo front).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

PORTS="$(node -e 'const p=require("./deploy/monorepo-default-ports.cjs"); console.log([p.STOREFRONT,p.BACKEND,p.ADMIN,p.VENDOR].join(" "))')"
read -r P_STORE P_API P_ADMIN P_VENDOR <<<"$PORTS"

kill_port() { fuser -k "${1}/tcp" 2>/dev/null || true; }

for p in "$P_API" "$P_STORE" "$P_ADMIN" "$P_VENDOR"; do
  kill_port "$p"
done
sleep 1

restart_or_start() {
  local name="$1"
  if pm2 describe "$name" >/dev/null 2>&1; then
    pm2 restart "$name" --update-env
  else
    pm2 start ecosystem.config.cjs --only "$name"
  fi
}

wait_api() {
  local max="${1:-180}" i=0
  echo "Attendo http://127.0.0.1:${P_API}/health (max ${max}s)…"
  while [ "$i" -lt "$max" ]; do
    if curl -sf "http://127.0.0.1:${P_API}/health" >/dev/null 2>&1; then
      echo "API pronta."
      return 0
    fi
    sleep 1
    i=$((i + 1))
  done
  echo "Timeout API. Controlla: pm2 logs mercur-backend --lines 80" >&2
  return 1
}

pm2 stop mercur-backend mercur-storefront mercur-admin mercur-vendor 2>/dev/null || true
sleep 1

echo "1) mercur-backend…"
restart_or_start mercur-backend
wait_api 180

echo "2) mercur-storefront…"
restart_or_start mercur-storefront
sleep 2

echo "3) mercur-vendor…"
restart_or_start mercur-vendor
sleep 2

echo "4) mercur-admin…"
restart_or_start mercur-admin

pm2 save

echo ""
echo "OK — tutti e quattro in PM2. Verifica: pm2 status"
echo "  API:        http://127.0.0.1:${P_API}"
echo "  Storefront: http://127.0.0.1:${P_STORE}"
echo "  Admin:      http://127.0.0.1:${P_ADMIN}"
echo "  Vendor:     http://127.0.0.1:${P_VENDOR}"
