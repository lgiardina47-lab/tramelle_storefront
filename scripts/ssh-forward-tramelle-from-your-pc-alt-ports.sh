#!/usr/bin/env bash
# Sul TUO PC, se 3000/7000/9000 sono GIÀ occupate (IIS, altro Node, Docker):
# mappa su porte locali libere → stesse porte sul server Hetzner.
#
# Uso:
#   bash scripts/ssh-forward-tramelle-from-your-pc-alt-ports.sh root@HOST
#
# Poi sul browser del PC:
#   http://127.0.0.1:13000/it   — storefront (server :3000)
#   http://127.0.0.1:17000      — admin (server :7000)
#   http://127.0.0.1:15173      — vendor (server :5173)
# Le app che chiamano http://127.0.0.1:9000 dal browser devono poter usare :19000
# se non hai anche forwardato 9000→9000; per vendor/admin in .env sul server
# resta 127.0.0.1:9000 lato server build — in forwarding "classico" usa lo script
# senza alt-ports e tieni tutte e 4 le porte uguali sul PC.

set -euo pipefail
HOST="${1:?Usage: $0 user@ssh-host}"

exec ssh -N \
  -o ExitOnForwardFailure=yes \
  -L 13000:127.0.0.1:3000 \
  -L 17000:127.0.0.1:7000 \
  -L 19000:127.0.0.1:9000 \
  -L 15173:127.0.0.1:5173 \
  "$HOST"
