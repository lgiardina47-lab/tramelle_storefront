#!/usr/bin/env bash
# Carica GITHUB_TOKEN dalla root `.env` (gitignored) ed esegue `git push` senza salvare il token nel remote URL.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if [[ ! -f "$ROOT/.env" ]]; then
  echo "Manca $ROOT/.env — imposta GITHUB_TOKEN lì (vedi .env.example)." >&2
  exit 1
fi

set -a
# shellcheck disable=SC1090
source "$ROOT/.env"
set +a

if [[ -z "${GITHUB_TOKEN:-}" ]]; then
  echo "GITHUB_TOKEN è vuoto in $ROOT/.env — incolla il PAT e riprova." >&2
  exit 1
fi

BRANCH="${1:-main}"
exec git -c "http.extraHeader=Authorization: Bearer ${GITHUB_TOKEN}" push -u origin "$BRANCH"
