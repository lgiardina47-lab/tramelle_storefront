"""
Parametri rete / Tor per `dati_venditori` (headers, timeout, pause tra richieste).
"""

from __future__ import annotations

import random
import time

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
        "(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    ),
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
    "Accept-Language": "it-IT,it;q=0.9,en-US;q=0.8,en;q=0.7",
    "Accept-Encoding": "gzip, deflate, br",
    "Connection": "keep-alive",
    "Upgrade-Insecure-Requests": "1",
}

HUMAN_DELAY_MIN = 0.8
HUMAN_DELAY_MAX = 3.2

TOR_SOCKS_PORT = 9050
TOR_CONTROL_PORT = 9051
TOR_HTTP_TIMEOUT = (50.0, 150.0)


def human_request_pause() -> None:
    """Pausa casuale tra richieste (export listing / schede)."""
    time.sleep(random.uniform(HUMAN_DELAY_MIN, HUMAN_DELAY_MAX))
