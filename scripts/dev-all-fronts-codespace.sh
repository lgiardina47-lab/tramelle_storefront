#!/usr/bin/env bash
# Codespace / dev locale: API + storefront + admin + vendor (porte dal monorepo).
# Avvio in ordine: prima il backend (Medusa), poi gli altri — così il middleware Next non fa fetch a vuoto
# e si riduce il picco RAM/esbuild che fa crashare l’admin se tutto parte insieme.
# Sul VPS in produzione: scripts/pm2-work-one.sh
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
read -r P_STORE P_API P_ADMIN P_VENDOR < <(
  node -e 'const p=require("./deploy/monorepo-default-ports.cjs"); console.log(p.STOREFRONT,p.BACKEND,p.ADMIN,p.VENDOR)'
)

# Senza Postgres/Redis il backend muore subito: riallinea i container dev se spenti (es. dopo restart Docker).
ensure_dev_db() {
  if ! command -v docker >/dev/null 2>&1 || ! docker info >/dev/null 2>&1; then
    echo "Docker non disponibile: verifica REDIS_URL e DATABASE_URL nel backend/.env" >&2
    return 0
  fi
  if docker exec marketplace-dev-redis redis-cli ping >/dev/null 2>&1 \
    && docker exec marketplace-dev-postgres pg_isready -U medusa -d medusa >/dev/null 2>&1; then
    echo "Postgres/Redis (Docker) già attivi."
    return 0
  fi
  echo "Avvio Postgres/Redis: docker compose -f deploy/docker-compose.dev-db.yml up -d"
  docker compose -f "$ROOT/deploy/docker-compose.dev-db.yml" up -d
  local i=0
  while [ "$i" -lt 90 ]; do
    if docker exec marketplace-dev-redis redis-cli ping >/dev/null 2>&1 \
      && docker exec marketplace-dev-postgres pg_isready -U medusa -d medusa >/dev/null 2>&1; then
      echo "Postgres e Redis pronti."
      return 0
    fi
    sleep 1
    i=$((i + 1))
  done
  echo "Timeout in attesa di Postgres/Redis Docker. Vedi: docker ps -a" >&2
  return 1
}
ensure_dev_db

for p in "$P_API" "$P_STORE" "$P_ADMIN" "$P_VENDOR"; do
  fuser -k "${p}/tcp" >/dev/null 2>&1 || true
done
sleep 1

LOG=/tmp/tramelle-dev
mkdir -p "$LOG"

wait_health() {
  local url="http://127.0.0.1:${P_API}/health"
  local max="${1:-120}"
  local i=0
  echo "Attendo backend ${url} (max ${max}s)…"
  while [ "$i" -lt "$max" ]; do
    if curl -sf "$url" >/dev/null 2>&1; then
      echo "Backend pronto."
      return 0
    fi
    sleep 1
    i=$((i + 1))
  done
  echo "Timeout: backend non risponde. Vedi $LOG/backend.log" >&2
  return 1
}

echo "1) Backend…"
(
  cd "$ROOT/backend"
  export PORT="$P_API"
  exec yarn dev
) >"$LOG/backend.log" 2>&1 &
echo $! >"$LOG/backend.pid"
wait_health 120

echo "2) Storefront (loop riavvio se il processo esce)…"
(
  cd "$ROOT/storefront"
  unset PORT
  while true; do
    yarn dev || true
    echo "--- $(date -Iseconds) storefront fermato, riavvio tra 4s ---" >>"$LOG/storefront.log"
    sleep 4
  done
) >>"$LOG/storefront.log" 2>&1 &
echo $! >"$LOG/storefront.pid"

echo "3) Vendor (loop riavvio)…"
sleep 2
(
  cd "$ROOT/vendor-panel"
  export PORT="$P_VENDOR"
  while true; do
    yarn dev || true
    echo "--- $(date -Iseconds) vendor fermato, riavvio tra 4s ---" >>"$LOG/vendor.log"
    sleep 4
  done
) >>"$LOG/vendor.log" 2>&1 &
echo $! >"$LOG/vendor.pid"

echo "4) Admin (ultimo; loop riavvio se esce con SIGTERM/esbuild)…"
sleep 6
(
  cd "$ROOT/admin-panel"
  export PORT="$P_ADMIN"
  export NODE_OPTIONS="${NODE_OPTIONS:-} --max-old-space-size=6144"
  while true; do
    yarn dev || true
    echo "--- $(date -Iseconds) admin fermato, riavvio tra 4s ---" >>"$LOG/admin.log"
    sleep 4
  done
) >>"$LOG/admin.log" 2>&1 &
echo $! >"$LOG/admin.pid"

echo ""
echo "Avviati (log in $LOG/)"
echo "  API:        http://127.0.0.1:${P_API}"
echo "  Storefront: http://127.0.0.1:${P_STORE}"
echo "  Admin:      http://127.0.0.1:${P_ADMIN}"
echo "  Vendor:     http://127.0.0.1:${P_VENDOR}"
echo "tail: tail -f $LOG/*.log"
echo "stop: kill \$(cat $LOG/*.pid)  # ogni servizio ha un loop supervisor (un PID ciascuno)"
# Resta in esecuzione così i job in background non ricevono SIGHUP a fine script (terminal non interattivo).
wait
