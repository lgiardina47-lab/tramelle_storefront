#!/usr/bin/env bash
# Usa PASSWORD_SSH da backend/.env con sshpass (OpenSSH non supporta password in ssh_config).
set -euo pipefail
ENV_FILE="${SSH_ENV_FILE:-/root/marketplace/backend/.env}"
if [[ ! -r "$ENV_FILE" ]]; then
  echo "ssh-with-backend-password: file non leggibile: $ENV_FILE" >&2
  exit 1
fi
line=$(grep -m1 '^PASSWORD_SSH=' "$ENV_FILE") || {
  echo "ssh-with-backend-password: PASSWORD_SSH mancante in $ENV_FILE" >&2
  exit 1
}
export SSHPASS="${line#PASSWORD_SSH=}"
SSHPASS="${SSHPASS//$'\r'/}"
SSHPASS="${SSHPASS#\"}"
SSHPASS="${SSHPASS%\"}"
SSHPASS="${SSHPASS#\'}"
SSHPASS="${SSHPASS%\'}"
if [[ -z "$SSHPASS" ]]; then
  echo "ssh-with-backend-password: PASSWORD_SSH vuoto" >&2
  exit 1
fi
exec sshpass -e /usr/bin/ssh "$@"
