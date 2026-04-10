#!/usr/bin/env bash
# Avvia UN SOLO servizio “pesante” alla volta (storefront / admin / vendor / backend).
# Gli altri due front (tra storefront, admin, vendor) vengono fermati → evita di saturare il server.
# Se porta ancora occupata: fuser -k sulla porta di default del progetto.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

PORTS="$(node -e 'const p=require("./deploy/monorepo-default-ports.cjs"); console.log([p.STOREFRONT,p.BACKEND,p.ADMIN,p.VENDOR].join(" "))')"
read -r P_STORE P_API P_ADMIN P_VENDOR <<<"$PORTS"

kill_port() {
  local p="$1"
  fuser -k "${p}/tcp" 2>/dev/null || true
}

stop_except_storefront() {
  pm2 stop mercur-admin mercur-vendor 2>/dev/null || true
}
stop_except_admin() {
  pm2 stop mercur-storefront mercur-vendor 2>/dev/null || true
}
stop_except_vendor() {
  pm2 stop mercur-storefront mercur-admin 2>/dev/null || true
}

restart_or_start() {
  local name="$1"
  if pm2 describe "$name" >/dev/null 2>&1; then
    pm2 restart "$name" --update-env
  else
    pm2 start ecosystem.config.cjs --only "$name"
  fi
}

usage() {
  echo "Uso: $0 storefront | admin | vendor | backend" >&2
  echo "  Solo uno alla volta tra shop + pannelli; gli altri due front sono sempre fermi." >&2
  echo "  backend: ferma storefront+admin+vendor e tiene solo API (api.tramelle.com)." >&2
  exit 1
}

[[ "${1:-}" ]] || usage

case "$1" in
  storefront|shop|tramelle)
    stop_except_storefront
    pm2 stop mercur-storefront 2>/dev/null || true
    kill_port "$P_STORE"
    sleep 1
    restart_or_start mercur-storefront
    ;;
  admin|manage)
    stop_except_admin
    pm2 stop mercur-admin 2>/dev/null || true
    kill_port "$P_ADMIN"
    sleep 1
    restart_or_start mercur-admin
    ;;
  vendor)
    stop_except_vendor
    pm2 stop mercur-vendor 2>/dev/null || true
    kill_port "$P_VENDOR"
    sleep 1
    restart_or_start mercur-vendor
    ;;
  backend|api)
    pm2 stop mercur-storefront mercur-admin mercur-vendor 2>/dev/null || true
    pm2 stop mercur-backend 2>/dev/null || true
    kill_port "$P_API"
    sleep 1
    restart_or_start mercur-backend
    ;;
  *)
    usage
    ;;
esac

pm2 save
echo "OK: attivo tra front/API il contesto «$1». Verifica: pm2 status"
