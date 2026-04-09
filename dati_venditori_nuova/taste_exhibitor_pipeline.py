"""
Pipeline unica: scheda espositore Taste → HTML (Tor) → `build_marketplace_seller` → JSON.

Usata da `taste_extract_exhibitor.py` e dagli script test ridotti a wrapper.
"""

from __future__ import annotations

import json
import os
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Optional

from bs4 import BeautifulSoup

from seller_extract import build_marketplace_seller
from taste_config import OUTPUT_DIR
from taste_probe import (
    extract_exhibitor_links_from_listing_soup,
    extract_merceology_menu_context_by_id,
    find_listing_row_for_detail_url,
)
from tor_session import http_headers, request_timeout, require_anonymous_tor_session_with_browser_cookies


def env_use_playwright(default: bool = True) -> bool:
    raw = os.environ.get("TASTE_PLAYWRIGHT", "").strip().lower()
    if raw in ("0", "false", "no", "off"):
        return False
    if raw in ("1", "true", "yes", "on"):
        return True
    return default


def fetch_detail_html_tor(
    session: Any,
    detail_url: str,
    *,
    use_playwright: bool,
) -> tuple[str, str]:
    """Ritorna (html, fetch_mode)."""
    headers = http_headers()
    timeout = request_timeout()

    if use_playwright:
        try:
            from taste_playwright_detail import fetch_detail_html_playwright

            return fetch_detail_html_playwright(detail_url), "playwright_tor"
        except Exception as exc:
            print(f"Playwright fallito, GET: {exc}", file=sys.stderr)

    r = session.get(detail_url, headers=headers, timeout=timeout)
    r.raise_for_status()
    mode = "requests_get_tor_fallback" if use_playwright else "requests_get_tor"
    return r.text, mode


def listing_context_for_detail(
    session: Any,
    detail_url: str,
) -> tuple[Optional[dict[str, Any]], Optional[int]]:
    headers = http_headers()
    timeout = request_timeout()
    try:
        hit = find_listing_row_for_detail_url(session, detail_url, headers=headers, timeout=timeout)
        if hit:
            row, page = hit
            return row, page
    except Exception as exc:
        print(f"Listing lookup (country): {exc}", file=sys.stderr)
    return None, None


def export_detail_url_tor(
    detail_url: str,
    *,
    use_playwright: Optional[bool] = None,
    playwright_env_default: bool = True,
    listing_lookup: bool = True,
    out_path: Optional[Path] = None,
    output_filename_slug: Optional[str] = None,
    metadata_extra: Optional[dict[str, Any]] = None,
) -> Path:
    """
    Sessione Tor obbligatoria: scarica scheda, opz. Playwright, opz. paginazione listing per `listing_country`.
    `playwright_env_default`: se `use_playwright` è None, default env quando `TASTE_PLAYWRIGHT` non è impostato.
    """
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    session = require_anonymous_tor_session_with_browser_cookies()

    pw = (
        env_use_playwright(default=playwright_env_default)
        if use_playwright is None
        else use_playwright
    )
    detail_html, fetch_mode = fetch_detail_html_tor(session, detail_url, use_playwright=pw)

    listing_row: Optional[dict[str, Any]] = None
    listing_page: Optional[int] = None
    if listing_lookup:
        listing_row, listing_page = listing_context_for_detail(session, detail_url)

    seller = build_marketplace_seller(
        detail_html,
        detail_url,
        listing_card_text=(listing_row or {}).get("listing_card_text") or None,
        listing_country=(listing_row or {}).get("listing_country"),
    )

    ts = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    slug = output_filename_slug or (seller.get("slug") or "exhibitor").replace(" ", "_")
    path = out_path or (OUTPUT_DIR / f"taste_detail_{slug}_{ts}.json")

    meta: dict[str, Any] = {
        "detail_url": detail_url,
        "scraped_at_utc": datetime.now(timezone.utc).isoformat(),
        "tor": True,
        "fetch_mode": fetch_mode,
        "listing_lookup_page": listing_page,
        "note": (
            "`listing_country` dalla card listing (paginazione). Gallery corta in anonimo: "
            "TASTE_NETSCAPE_COOKIES + Playwright, o `taste_seller_from_saved_html.py`."
        ),
    }
    if metadata_extra:
        meta.update(metadata_extra)

    path.write_text(
        json.dumps({"metadata": meta, "sellers": [seller]}, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    print(f"product_image_urls: {len(seller.get('product_image_urls') or [])}", file=sys.stderr)
    return path


def export_from_saved_html(detail_url: str, html_path: Path, *, out_path: Optional[Path] = None) -> Path:
    """Nessuna rete: stesso JSON schema da file HTML salvato dal browser."""
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    html = html_path.read_text(encoding="utf-8", errors="replace")
    seller = build_marketplace_seller(html, detail_url)
    ts = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    slug = (seller.get("slug") or "seller").replace(" ", "_")
    path = out_path or (OUTPUT_DIR / f"taste_detail_from_saved_html_{slug}_{ts}.json")
    meta = {
        "source_html_file": str(html_path.resolve()),
        "detail_url": detail_url,
        "scraped_at_utc": datetime.now(timezone.utc).isoformat(),
        "note": "HTML da salvataggio browser (post-JS); `listing_country` non dal listing.",
    }
    path.write_text(
        json.dumps({"metadata": meta, "sellers": [seller]}, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    print(f"product_image_urls: {len(seller.get('product_image_urls') or [])}", file=sys.stderr)
    return path


def export_from_listing_url_tor(
    listing_url: str,
    *,
    row_index: int = 0,
    use_playwright: Optional[bool] = None,
    out_path: Optional[Path] = None,
    output_name_prefix: Optional[str] = None,
    metadata_extra: Optional[dict[str, Any]] = None,
) -> Path:
    """
    GET listing (Tor) → contesto merceologie + card → GET/Playwright dettaglio primo (o `row_index`) link.
    """
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    session = require_anonymous_tor_session_with_browser_cookies()
    headers = http_headers()
    timeout = request_timeout()

    r = session.get(listing_url, headers=headers, timeout=timeout)
    r.raise_for_status()
    soup = BeautifulSoup(r.text, "html.parser")
    merceology_menu_context_by_id = extract_merceology_menu_context_by_id(soup)
    rows = extract_exhibitor_links_from_listing_soup(soup)
    if not rows or row_index >= len(rows):
        raise RuntimeError(f"Nessuna card espositore (listing o indice {row_index}).")

    row = rows[row_index]
    detail_url = row["url"]

    pw = env_use_playwright(default=False) if use_playwright is None else use_playwright
    detail_html, fetch_mode = fetch_detail_html_tor(session, detail_url, use_playwright=pw)

    seller = build_marketplace_seller(
        detail_html,
        detail_url,
        listing_card_text=row.get("listing_card_text") or None,
        listing_country=row.get("listing_country"),
        merceology_menu_context_by_id=merceology_menu_context_by_id,
    )

    ts = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    slug = (seller.get("slug") or "exhibitor").replace(" ", "_")
    if out_path is not None:
        path = out_path
    elif output_name_prefix:
        path = OUTPUT_DIR / f"{output_name_prefix}_{ts}.json"
    else:
        path = OUTPUT_DIR / f"taste_detail_{slug}_{ts}.json"

    meta: dict[str, Any] = {
        "listing_url": listing_url,
        "detail_url": detail_url,
        "listing_row_index": row_index,
        "scraped_at_utc": datetime.now(timezone.utc).isoformat(),
        "tor": True,
        "fetch_mode": fetch_mode,
    }
    if metadata_extra:
        meta.update(metadata_extra)

    path.write_text(
        json.dumps({"metadata": meta, "sellers": [seller]}, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    print(f"product_image_urls: {len(seller.get('product_image_urls') or [])}", file=sys.stderr)
    return path
