#!/usr/bin/env bash
# Carica GITHUB_TOKEN dalla root `.env` (gitignored) ed esegue `git push` senza salvare il token nel remote URL.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

load_env_file() {
  local f="$1"
  [[ -f "$f" ]] || return 1
  set -a
  # shellcheck disable=SC1090
  source "$f"
  set +a
  return 0
}

if ! load_env_file "$ROOT/.env"; then
  echo "Manca $ROOT/.env — oppure usa storefront/.env con GITHUB_TOKEN." >&2
fi

if [[ -z "${GITHUB_TOKEN:-}" ]] && load_env_file "$ROOT/storefront/.env"; then
  :
fi

if [[ -z "${GITHUB_TOKEN:-}" ]]; then
  echo "GITHUB_TOKEN è vuoto: impostalo in $ROOT/.env o in $ROOT/storefront/.env (PAT scope repo)." >&2
  exit 1
fi

BRANCH="${1:-main}"
ORIGIN="$(git remote get-url origin)"
PUSH_URL=""
if [[ "$ORIGIN" =~ ^https://github.com/(.+)$ ]]; then
  PUSH_URL="https://x-access-token:${GITHUB_TOKEN}@github.com/${BASH_REMATCH[1]}"
elif [[ "$ORIGIN" =~ ^git@github.com:(.+)$ ]]; then
  PUSH_URL="https://x-access-token:${GITHUB_TOKEN}@github.com/${BASH_REMATCH[1]}"
else
  echo "Remote origin non supportato per push HTTPS: $ORIGIN" >&2
  exit 1
fi
# Non usare `push -u` con URL che contiene il token: Git può stamparlo in chiaro.
GIT_TERMINAL_PROMPT=0 git push "$PUSH_URL" "$BRANCH"
if git rev-parse --abbrev-ref '@{upstream}' &>/dev/null; then
  :
else
  git branch --set-upstream-to="origin/$BRANCH" "$BRANCH" 2>/dev/null || true
fi
