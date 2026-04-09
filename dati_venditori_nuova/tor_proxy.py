"""
Connessioni Tor e proxy SOCKS5 (`tor_network_config` per timeout e porte default).
"""

import re
import socket
import logging
from typing import Optional, Dict, Tuple, List

import requests

import tor_network_config as config


def session_must_use_tor(session: Optional[requests.Session]) -> None:
    if session is None:
        raise RuntimeError(
            "Policy dati_venditori: sessione assente — usare solo create_tor_session() con Tor attivo."
        )
    proxies = getattr(session, "proxies", None) or {}
    socks_ok = any(
        p and "socks5" in str(p).lower() for p in proxies.values()
    )
    if not socks_ok:
        raise RuntimeError(
            "Policy dati_venditori: sessione senza proxy SOCKS5 (Tor). "
            "Vietato richiedere siti target senza Tor."
        )


logger = logging.getLogger(__name__)

TOR_VERIFY_TIMEOUT: Tuple[float, float] = config.TOR_HTTP_TIMEOUT

_TOR_IP_CHECK_URLS: List[str] = [
    "https://api.ipify.org?format=json",
    "http://icanhazip.com",
    "http://ip-api.com/json/?fields=query",
]


def _ip_from_check_response(url: str, response: requests.Response) -> Optional[str]:
    if response.status_code != 200:
        return None
    u = url.lower()
    try:
        if "format=json" in u or "ipify" in u or "ip-api.com" in u or "torproject.org" in u:
            data = response.json()
            if isinstance(data, dict):
                return (
                    data.get("ip")
                    or data.get("IP")
                    or data.get("query")
                )
    except ValueError:
        pass
    body = (response.text or "").strip().splitlines()
    if not body:
        return None
    line = body[0].strip()
    if re.match(r"^[\dA-Fa-f.:]+$", line) and len(line) <= 45:
        return line
    return None


def _fetch_ip_via_proxy(proxy_config: Dict[str, str]) -> Tuple[Optional[str], Optional[str]]:
    last_err: Optional[str] = None
    for check_url in _TOR_IP_CHECK_URLS:
        try:
            r = requests.get(
                check_url,
                proxies=proxy_config,
                timeout=TOR_VERIFY_TIMEOUT,
            )
            ip = _ip_from_check_response(check_url, r)
            if ip:
                return ip, check_url
        except requests.RequestException as e:
            last_err = str(e)
            logger.debug("Tor check fallito su %s: %s", check_url, e)
    if last_err:
        logger.warning("Tutti i check IP Tor falliti. Ultimo errore: %s", last_err)
    return None, None


class TorProxy:
    def __init__(self, socks_port: int = 9050, control_port: int = 9051):
        self.socks_port = socks_port
        self.control_port = control_port
        self.control_connection = None
        self._is_available = None

    def is_tor_available(self) -> bool:
        if self._is_available is not None:
            return self._is_available

        try:
            sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            sock.settimeout(2)
            result = sock.connect_ex(("127.0.0.1", self.socks_port))
            sock.close()

            self._is_available = result == 0

            if self._is_available:
                logger.info("Tor disponibile sulla porta %s", self.socks_port)
            else:
                logger.warning("Tor non disponibile sulla porta %s", self.socks_port)

            return self._is_available
        except Exception as e:
            logger.warning("Errore verificando Tor: %s", e)
            self._is_available = False
            return False

    def get_proxy_config(self) -> Optional[Dict[str, str]]:
        if not self.is_tor_available():
            return None

        return {
            "http": f"socks5h://127.0.0.1:{self.socks_port}",
            "https": f"socks5h://127.0.0.1:{self.socks_port}",
        }

    def get_current_ip(self, session: Optional[requests.Session] = None) -> Optional[str]:
        try:
            if session:
                for check_url in _TOR_IP_CHECK_URLS:
                    try:
                        response = session.get(check_url, timeout=TOR_VERIFY_TIMEOUT)
                        ip = _ip_from_check_response(check_url, response)
                        if ip:
                            return ip
                    except requests.RequestException:
                        continue
            else:
                proxy_config = self.get_proxy_config()
                if not proxy_config:
                    return None
                ip, _ = _fetch_ip_via_proxy(proxy_config)
                return ip
        except Exception as e:
            logger.warning("Errore ottenendo IP: %s", e)
        return None

    def rotate_circuit(self) -> bool:
        try:
            from stem import Signal
            from stem.control import Controller

            if not self.is_tor_available():
                logger.warning("Tor non disponibile, impossibile ruotare circuito")
                return False

            try:
                controller = Controller.from_port(port=self.control_port)
            except Exception:
                alt_port = 9151 if self.control_port == 9051 else 9051
                try:
                    controller = Controller.from_port(port=alt_port)
                    logger.debug("Usata porta controllo alternativa: %s", alt_port)
                except Exception:
                    logger.warning(
                        "Impossibile connettersi alla porta controllo %s o %s",
                        self.control_port,
                        alt_port,
                    )
                    raise

            try:
                controller.authenticate()
            except Exception as e:
                logger.debug("Autenticazione controllo Tor: %s", e)

            controller.signal(Signal.NEWNYM)
            controller.close()

            logger.info("Circuito Tor ruotato con successo")
            return True

        except ImportError:
            logger.warning(
                "Stem non installato, rotazione circuiti non disponibile. pip install stem"
            )
            return False
        except Exception as e:
            logger.warning("Errore ruotando circuito Tor: %s", e)
            return False

    def test_connection(self) -> bool:
        try:
            proxy_config = self.get_proxy_config()
            if not proxy_config:
                return False
            ip, used = _fetch_ip_via_proxy(proxy_config)
            if ip:
                logger.info(
                    "Connessione Tor OK tramite %s. IP: %s",
                    used or "?",
                    ip,
                )
                return True
        except Exception as e:
            logger.error("Errore testando connessione Tor: %s", e)
        return False


def resolve_tor_socks_ports(preferred_socks: int = 9050) -> Optional[Tuple[int, int]]:
    order: List[int] = []
    seen: set = set()
    for p in (preferred_socks, 9150, 9050):
        if p not in seen:
            seen.add(p)
            order.append(p)
    for socks_port in order:
        tp = TorProxy(socks_port=socks_port)
        tp._is_available = None
        if tp.is_tor_available():
            control = 9151 if socks_port == 9150 else 9051
            logger.info(
                "Tor SOCKS rilevato: porta %s (controllo %s)",
                socks_port,
                control,
            )
            return socks_port, control
    return None


def create_tor_session(socks_port: int = 9050) -> Optional[requests.Session]:
    tor_proxy = TorProxy(socks_port=socks_port)

    if not tor_proxy.is_tor_available():
        logger.warning("Tor non disponibile sulla porta %s", socks_port)
        return None

    session = requests.Session()
    proxy_config = tor_proxy.get_proxy_config()

    if proxy_config:
        session.proxies.update(proxy_config)
        logger.info("Session Tor creata sulla porta %s", socks_port)
        return session

    return None
