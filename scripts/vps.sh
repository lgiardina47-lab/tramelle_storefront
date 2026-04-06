#!/usr/bin/env bash
# Esegue SSH sul VPS usando PASSWORD_SSH da backend/.env (scripts/ssh-with-backend-password.sh).
# Opzionale in backend/.env: VPS_SSH_HOST, VPS_SSH_USER (default root).
# Esempio: bash scripts/vps.sh 'pm2 status'
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ENV="$ROOT/backend/.env"
HOST=""
USERVAL="root"
if [[ -r "$ENV" ]]; then
  line="$(grep -m1 '^VPS_SSH_HOST=' "$ENV" || true)"
  [[ "$line" ]] && HOST="${line#VPS_SSH_HOST=}"
  line="$(grep -m1 '^VPS_SSH_USER=' "$ENV" || true)"
  [[ "$line" ]] && USERVAL="${line#VPS_SSH_USER=}"
fi
HOST="${HOST//$'\r'/}"
HOST="${HOST#\"}"
HOST="${HOST%\"}"
HOST="${HOST#\'}"
HOST="${HOST%\'}"
USERVAL="${USERVAL//$'\r'/}"
USERVAL="${USERVAL#\"}"
USERVAL="${USERVAL%\"}"
: "${HOST:=82.165.134.103}"
export SSH_ENV_FILE="$ENV"
exec "$ROOT/scripts/ssh-with-backend-password.sh" -o StrictHostKeyChecking=accept-new "${USERVAL}@${HOST}" "$@"
