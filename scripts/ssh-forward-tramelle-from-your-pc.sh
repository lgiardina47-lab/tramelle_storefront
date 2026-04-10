#!/usr/bin/env bash
# Esegui sul TUO PC (Windows Git Bash / WSL / macOS / Linux), NON sul server Hetzner.
# Tieni il terminale aperto: chiudendo SSH i tunnel si chiudono.
#
# Uso:
#   bash scripts/ssh-forward-tramelle-from-your-pc.sh root@TUO_HOST_SSH
#
# Poi sul PC apri:
#   http://127.0.0.1:3000/it     — storefront
#   http://127.0.0.1:7000        — admin
#   http://127.0.0.1:15173       — vendor (porta LOCALE 15173 → server :5173; su Windows
#                                 la 5173 locale spesso dà "Permission denied" per range
#                                 riservati Hyper-V — non usare -L 5173:... sul PC)
# Le app che usano VITE_MEDUSA_BACKEND_URL=http://127.0.0.1:9000 chiameranno
# l'API sulla tua macchina :9000, che è inoltrata al backend sul server Hetzner.
#
# Se 3000 o 7000 "non si vedono" sul PC ma 5173 sì: quasi sempre mancano i -L per
# 3000/7000 oppure su Windows quelle porte sono occupate. Verifica:
#   netstat -ano | findstr ":3000"
#   netstat -ano | findstr ":7000"
# Prova: ssh -v ... e cerca "Local forwarding listening" / errori "bind".
# Alternativa: script ssh-forward-tramelle-from-your-pc-alt-ports.sh (porte locali 13xxx/17xxx).

set -euo pipefail
HOST="${1:?Usage: $0 user@ssh-host (es. root@82.165.134.103)}"

exec ssh -N \
  -o ExitOnForwardFailure=yes \
  -L 13000:127.0.0.1:3000 \
  -L 7000:127.0.0.1:7000 \
  -L 9000:127.0.0.1:9000 \
  -L 15173:127.0.0.1:5173 \
  "$HOST"
