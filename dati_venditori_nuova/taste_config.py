"""
Config Taste / Pitti (archivio espositori).

Policy rete: ogni richiesta HTTP/HTTPS (inclusi **download** di file/immagini) verso la rete
pubblica per il lavoro su questi script passa **solo** da Tor (SOCKS5); usare
`tor_session.require_anonymous_tor_session()` e mai `requests` diretto.

Catena consigliata con **IPAnonimo** (o altra VPN a livello di sistema):
  tua rete → tunnel VPN (operatore vede solo questo) → Tor in locale → uscita Tor → sito
  (il sito vede solo l’IP del nodo Tor, non il tuo e non quello “diretto” del controllo,
   che con la VPN accesa è l’IP assegnato dal provider VPN).

Ordine operativo: (1) connetti IPAnonimo, (2) avvia Tor, (3) `verifica_tor_taste.py` / probe.

Nota: la config Tor/HTTP è in `tor_network_config.py` (non `config.py` per evitare conflitti).
"""

# Messaggio breve per i comandi di verifica (senza dipendenze esterne)
NETWORK_CHAIN_REMINDER_LINES = (
    "Flusso con IPAnonimo: ① VPN connessa (app di sistema) ② Tor attivo (9050/9150) ③ poi gli script.",
    "Così l’operatore vede il tunnel VPN; Taste vede solo l’uscita Tor.",
)

import os
from pathlib import Path

# File creati dagli script della cartella: solo utente proprietario (non leggibili da altri utenti sullo stesso host).
os.umask(0o077)

# Root di questa working copy (es. `dati_venditori_nuova/`)
DATI_VENDITORI_ROOT = Path(__file__).resolve().parent
OUTPUT_DIR = DATI_VENDITORI_ROOT / "output"

# Sito e edizione test (URL come da sito ufficiale)
TASTE_HOST = "https://taste.pittimmagine.com"
# Path archivio: taste19 = edizione in calendario sito (es. feb 2026)
ARCHIVE_SEGMENT = "taste19"
LISTING_PATH = f"/it/pittimmagine/archive/{ARCHIVE_SEGMENT}/exhibitors"


def listing_url(page: int = 1, query=None, archive_segment: str | None = None) -> str:
    """URL elenco espositori (paginazione server-side ?page=)."""
    seg = archive_segment or ARCHIVE_SEGMENT
    base = f"{TASTE_HOST}/it/pittimmagine/archive/{seg}/exhibitors"
    q = query if query is not None else ""
    return f"{base}?q%5B0%5D={q}&page={page}" if q else f"{base}?page={page}"
