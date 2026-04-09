"""
Session HTTP obbligatoriamente via Tor (`tor_proxy` + `tor_network_config`).

Policy dati_venditori: nessuna richiesta verso i siti target senza Tor; anche i **download**
(immagini, logo, banner, qualsiasi URL ottenuto dallo scraping) usano la stessa sessione SOCKS.
Prima del crawl si verifica che l’IP in uscita via SOCKS5 sia diverso dall’IP “diretto” della sessione
(senza Tor). Con **IPAnonimo** acceso, quel “diretto” è l’IP della VPN, non l’ISP di casa:
catena consigliata VPN → Tor → sito (vedi `taste_config`).

Stesso HTML del browser: variabile ``TASTE_NETSCAPE_COOKIES`` (file Netscape esportato da
Chrome per taste/www.pittimmagine.com) con ``require_anonymous_tor_session_with_browser_cookies()``.
Il traffico resta via Tor; i cookie replicano la sessione Pitti in locale.
"""

from __future__ import annotations

import os
import sys
from http.cookiejar import MozillaCookieJar
from pathlib import Path
from typing import Optional, Union

import requests

import tor_network_config as moto_config
from tor_proxy import (
    TorProxy,
    create_tor_session,
    resolve_tor_socks_ports,
    session_must_use_tor,
)


def get_tor_session() -> Optional[requests.Session]:
    """Session requests con SOCKS5; None se Tor non disponibile (senza verifica IP)."""
    ports = resolve_tor_socks_ports(moto_config.TOR_SOCKS_PORT)
    if not ports:
        return None
    socks_port, _ = ports
    session = create_tor_session(socks_port=socks_port)
    if session:
        session_must_use_tor(session)
    return session


def require_anonymous_tor_session() -> requests.Session:
    """
    Session SOCKS5 obbligatoria + prova IP Tor ≠ IP senza Tor sulla stessa macchina.
    Se usi IPAnonimo, connetti la VPN prima di Tor: il confronto sarà tra uscita Tor e IP VPN.
    """
    ports = resolve_tor_socks_ports(moto_config.TOR_SOCKS_PORT)
    if not ports:
        raise RuntimeError(
            "Tor obbligatorio: nessuna porta SOCKS in ascolto (prova 9050 o 9150). "
            "Nessuna richiesta verso il sito senza anonimato."
        )
    socks_port, _ = ports
    session = create_tor_session(socks_port=socks_port)
    if not session:
        raise RuntimeError(
            "Tor obbligatorio: impossibile aprire sessione SOCKS5. "
            "Avvia Tor e riprova."
        )
    session_must_use_tor(session)

    tp = TorProxy(socks_port=socks_port)
    tor_ip = tp.get_current_ip(session)
    if not tor_ip:
        raise RuntimeError(
            "Tor obbligatorio: non riesco a leggere l’IP in uscita dal circuito. "
            "Controlla Tor e ritenta."
        )

    try:
        direct_sess = requests.Session()
        direct_sess.trust_env = False
        direct_r = direct_sess.get(
            "https://api.ipify.org?format=json",
            timeout=15,
            proxies={"http": None, "https": None},
        )
        direct_r.raise_for_status()
        direct_ip = direct_r.json().get("ip")
    except Exception as exc:
        raise RuntimeError(
            "Verifica anonimato: impossibile confrontare IP diretto vs Tor. "
            f"Dettaglio: {exc}"
        ) from exc

    if direct_ip and tor_ip == direct_ip:
        raise RuntimeError(
            "Traffico NON anonimo: IP via Tor è uguale all’IP diretto. "
            "Non procedere verso il sito finché Tor non instrada davvero il traffico."
        )

    return session


def sibling_tor_session_from(verified: requests.Session) -> requests.Session:
    """
    Nuova sessione SOCKS (stessa porta Tor) con gli stessi cookie di `verified`.
    Utile per worker paralleli: una sola `require_anonymous_tor_session*` fa il check IP,
    poi ogni thread usa una sessione dedicata (``requests.Session`` non è thread-safe).
    """
    ports = resolve_tor_socks_ports(moto_config.TOR_SOCKS_PORT)
    if not ports:
        raise RuntimeError(
            "Tor obbligatorio: nessuna porta SOCKS in ascolto (prova 9050 o 9150)."
        )
    socks_port, _ = ports
    session = create_tor_session(socks_port=socks_port)
    if not session:
        raise RuntimeError("Tor obbligatorio: impossibile aprire sessione SOCKS5.")
    session_must_use_tor(session)
    for c in verified.cookies:
        session.cookies.set_cookie(c)
    return session


def apply_netscape_cookies_to_session(session: requests.Session, cookie_file: str | Path) -> int:
    """
    Carica un file **Netscape / cookies.txt** (es. estensione «Get cookies.txt LOCALLY») nella
    sessione Requests. Domini tipici da esportare: `taste.pittimmagine.com`, `www.pittimmagine.com`.
    """
    path = Path(cookie_file).expanduser().resolve()
    if not path.is_file():
        raise FileNotFoundError(f"File cookie Netscape non trovato: {path}")
    jar = MozillaCookieJar(str(path))
    jar.load(ignore_discard=True, ignore_expires=True)
    n = 0
    for cookie in jar:
        session.cookies.set_cookie(cookie)
        n += 1
    return n


def cookies_for_playwright_from_netscape(cookie_file: str | Path) -> list[dict]:
    """Stesso file Netscape → formato `browser_context.add_cookies` di Playwright."""
    path = Path(cookie_file).expanduser().resolve()
    if not path.is_file():
        raise FileNotFoundError(f"File cookie Netscape non trovato: {path}")
    jar = MozillaCookieJar(str(path))
    jar.load(ignore_discard=True, ignore_expires=True)
    out: list[dict] = []
    for c in jar:
        dom = (c.domain or "").lstrip(".")
        entry: dict = {
            "name": c.name,
            "value": c.value,
            "path": c.path or "/",
            "secure": bool(c.secure),
        }
        if dom:
            entry["domain"] = dom
        if c.expires:
            entry["expires"] = int(c.expires)
        out.append(entry)
    return out


def require_anonymous_tor_session_with_browser_cookies() -> requests.Session:
    """
    Come `require_anonymous_tor_session`, con cookie opzionali dal tuo browser.

    Imposta **`TASTE_NETSCAPE_COOKIES`** sul path assoluto (o relativo) di un `cookies.txt`
    in formato Netscape. Il traffico verso il sito resta **via Tor**; i cookie fanno sì che
    il server possa rispondere con lo stesso HTML esteso che vedi in Chrome (gallery completa).

    Con **`TASTE_VERBOSE=1`** stampa su stderr quanti cookie sono stati caricati.
    """
    session = require_anonymous_tor_session()
    raw = os.environ.get("TASTE_NETSCAPE_COOKIES", "").strip()
    if raw:
        n = apply_netscape_cookies_to_session(session, raw)
        if os.environ.get("TASTE_VERBOSE", "").strip().lower() in ("1", "true", "yes"):
            print(f"[taste] Caricati {n} cookie Netscape da {raw}", file=sys.stderr)
    return session


def http_headers():
    return dict(moto_config.HEADERS)


def request_timeout() -> Union[float, Tuple[float, float]]:
    """
    Default da ``tor_network_config.TOR_HTTP_TIMEOUT``.
    Override: ``TASTE_TOR_HTTP_TIMEOUT=45`` (connect+read) oppure ``12,45`` (tuple).
    """
    raw = os.environ.get("TASTE_TOR_HTTP_TIMEOUT", "").strip()
    if raw:
        for sep in (";", ","):
            if sep in raw:
                parts = [p.strip() for p in raw.split(sep) if p.strip()]
                if len(parts) == 2:
                    try:
                        return (float(parts[0]), float(parts[1]))
                    except ValueError:
                        break
        try:
            v = float(raw)
            return (v, v)
        except ValueError:
            pass
    return moto_config.TOR_HTTP_TIMEOUT
