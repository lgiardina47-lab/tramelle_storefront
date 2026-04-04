#!/usr/bin/env bash
set -euo pipefail
ENV_FILE="${SSH_ENV_FILE:-/root/marketplace/backend/.env}"
if [[ ! -r "$ENV_FILE" ]]; then
  echo "scp-with-backend-password: file non leggibile: $ENV_FILE" >&2
  exit 1
fi
line=$(grep -m1 '^PASSWORD_SSH=' "$ENV_FILE") || {
  echo "scp-with-backend-password: PASSWORD_SSH mancante in $ENV_FILE" >&2
  exit 1
}
export SSHPASS="${line#PASSWORD_SSH=}"
SSHPASS="${SSHPASS//$'\r'/}"
SSHPASS="${SSHPASS#\"}"
SSHPASS="${SSHPASS%\"}"
SSHPASS="${SSHPASS#\'}"
SSHPASS="${SSHPASS%\'}"
if [[ -z "$SSHPASS" ]]; then
  echo "scp-with-backend-password: PASSWORD_SSH vuoto" >&2
  exit 1
fi
exec sshpass -e /usr/bin/scp "$@"
