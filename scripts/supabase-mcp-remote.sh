#!/usr/bin/env bash
# Avvia il bridge stdio → Supabase MCP hosted (Cursor).
# Uso in mcp.json: command + args: ["<project_ref>"]
# Richiede SUPABASE_ACCESS_TOKEN in .env (Dashboard → Account → Access Tokens).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"

for f in "$ROOT/.env" "$ROOT/backend/.env"; do
  [[ -f "$f" ]] || continue
  set -a
  # shellcheck source=/dev/null
  source "$f"
  set +a
done

PROJECT_REF="${1:?Usage: $0 <project_ref>}"
if [[ -z "${SUPABASE_ACCESS_TOKEN:-}" ]]; then
  echo "supabase-mcp-remote: imposta SUPABASE_ACCESS_TOKEN (sbp_...) in $ROOT/.env oppure $ROOT/backend/.env" >&2
  exit 1
fi

exec npx -y mcp-remote \
  "https://mcp.supabase.com/mcp?project_ref=${PROJECT_REF}" \
  --header "Authorization:Bearer ${SUPABASE_ACCESS_TOKEN}"
