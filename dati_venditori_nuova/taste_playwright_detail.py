"""
Fetch scheda espositore con browser (Playwright) per contenuti lazy-loaded nel carousel.

Nota: con `loggedIn: false` nel sorgente il **server** spesso non mette tutte le slide nel HTML;
Playwright/Tor non possono inventare URL assenti. Con cookie/client come nel tuo Chrome locale il
server può invece rispondere con `loggedIn: true` e markup più lungo — senza implicare un login
formale nel senso password.

Policy: usare **lo stesso SOCKS Tor** degli altri script (vedi `tor_session`).

Uso:
  pip install playwright && playwright install chromium
  TASTE_PLAYWRIGHT=1 python3 -u taste_extract_exhibitor.py --listing-url 'https://taste.pittimmagine.com/.../exhibitors?page=1'

Cookie (stesso HTML di Chrome ancora via Tor):
  export TASTE_NETSCAPE_COOKIES=/percorso/cookies.txt
  oppure TASTE_PLAYWRIGHT_STORAGE=/percorso/storage.json (export Playwright `storage_state`)

Tempi di attesa (facoltativo, ms):
  TASTE_PLAYWRIGHT_SETTLE_MS   default 6000 — pausa dopo load + cookie prima del carousel
  TASTE_PLAYWRIGHT_SLIDE_MS    default 500  — pausa tra uno step carousel e l’altro
  TASTE_PLAYWRIGHT_CAROUSEL_STEPS  default 45 — quante volte provare avanti (lazy slide)

Se Playwright non è installato o la variabile non è impostata, gli script usano solo `requests`.
"""

from __future__ import annotations

import os
import sys
from pathlib import Path

_DATI_VENDITORI = Path(__file__).resolve().parent
if str(_DATI_VENDITORI) not in sys.path:
    sys.path.insert(0, str(_DATI_VENDITORI))

from tor_session import cookies_for_playwright_from_netscape  # noqa: E402


def _playwright_context_kwargs(proxy: dict) -> dict:
    """`storage_state` Playwright da JSON, se impostato."""
    storage = os.environ.get("TASTE_PLAYWRIGHT_STORAGE", "").strip()
    if storage:
        return {"proxy": proxy, "storage_state": storage}
    return {"proxy": proxy}


def _socks_port() -> int:
    import tor_network_config as moto_config  # noqa: E402
    from tor_proxy import resolve_tor_socks_ports  # noqa: E402

    resolved = resolve_tor_socks_ports(moto_config.TOR_SOCKS_PORT)
    if not resolved:
        return int(getattr(moto_config, "TOR_SOCKS_PORT", 9050) or 9050)
    socks_port, _control = resolved
    return int(socks_port)


def _dismiss_page_overlays(page) -> None:
    """
    Rimuove blocchi comuni che intercettano i click (cookie Pitti/CookieScript, ecc.).
    Senza questo, frecce carousel / lazy spesso non girano davvero.
    """
    selectors = (
        "#cookiescript_accept",
        "button#cookiescript_accept",
        "[data-cs-accept-all]",
        ".cs-accept-all",
        "button.cs-accept-all",
    )
    for sel in selectors:
        try:
            loc = page.locator(sel).first
            if loc.is_visible(timeout=800):
                loc.click(timeout=3000)
                page.wait_for_timeout(600)
                break
        except Exception:
            continue
    for name in ("Accetta tutti", "Accetta tutto", "Accetta", "Accept all"):
        try:
            page.get_by_role("button", name=name).first.click(timeout=1500)
            page.wait_for_timeout(500)
            break
        except Exception:
            continue


def _env_int(name: str, default: int) -> int:
    try:
        return max(0, int(os.environ.get(name, "").strip() or default))
    except ValueError:
        return default


def _carousel_advance_step(page, step_ms: int) -> None:
    """Prova più selettori (Pitti / Slick) poi fallback tastiera."""
    selectors = (
        ".gallery__arrow--right",
        "button.gallery__arrow--right",
        ".slick-next",
        "button.slick-next",
        ".custom-carousel .slick-arrow.slick-next",
        "[class*='gallery'][class*='arrow'][class*='right']",
    )
    for sel in selectors:
        try:
            loc = page.locator(sel).first
            if loc.is_visible(timeout=400):
                loc.click(timeout=1500)
                page.wait_for_timeout(step_ms)
                return
        except Exception:
            continue
    try:
        page.keyboard.press("ArrowRight")
    except Exception:
        pass
    page.wait_for_timeout(step_ms)


def fetch_detail_html_playwright(
    detail_url: str,
    *,
    socks_host: str = "127.0.0.1",
    socks_port: int | None = None,
    goto_timeout_ms: int = 120_000,
    settle_after_load_ms: int | None = None,
    slide_step_ms: int | None = None,
) -> str:
    """
    Apre la scheda, aspetta il caricamento, scroll su `#section-stand`, scorre il carousel
    con frecce (se presenti) per far caricare `data-src` lazy; ritorna `page.content()`.
    """
    settle_ms = (
        settle_after_load_ms
        if settle_after_load_ms is not None
        else _env_int("TASTE_PLAYWRIGHT_SETTLE_MS", 6000)
    )
    step_ms = slide_step_ms if slide_step_ms is not None else _env_int("TASTE_PLAYWRIGHT_SLIDE_MS", 500)
    try:
        from playwright.sync_api import sync_playwright
    except ImportError as exc:
        raise RuntimeError(
            "Playwright non disponibile. Installa con:\n"
            "  pip install playwright && playwright install chromium"
        ) from exc

    port = socks_port if socks_port is not None else _socks_port()
    proxy = {"server": f"socks5://{socks_host}:{port}"}
    netscape = os.environ.get("TASTE_NETSCAPE_COOKIES", "").strip()

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True, proxy=proxy)
        try:
            context = browser.new_context(**_playwright_context_kwargs(proxy))
            if not os.environ.get("TASTE_PLAYWRIGHT_STORAGE", "").strip() and netscape:
                context.add_cookies(cookies_for_playwright_from_netscape(netscape))
            page = context.new_page()
            page.goto(detail_url, wait_until="load", timeout=goto_timeout_ms)
            try:
                page.wait_for_load_state("networkidle", timeout=min(90_000, goto_timeout_ms))
            except Exception:
                pass
            _dismiss_page_overlays(page)
            page.wait_for_timeout(settle_ms)
            stand = page.locator("section#section-stand").first
            try:
                stand.wait_for(state="attached", timeout=60_000)
            except Exception:
                pass
            try:
                stand.scroll_into_view_if_needed(timeout=30_000)
            except Exception:
                pass
            page.wait_for_timeout(2500)
            n_steps = _env_int("TASTE_PLAYWRIGHT_CAROUSEL_STEPS", 45)
            for _ in range(n_steps):
                _carousel_advance_step(page, step_ms)
            page.wait_for_timeout(2500)
            page.evaluate("window.scrollTo(0, document.body.scrollHeight)")
            page.wait_for_timeout(2000)
            return page.content()
        finally:
            browser.close()
