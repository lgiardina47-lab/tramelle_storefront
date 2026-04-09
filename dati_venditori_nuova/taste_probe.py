#!/usr/bin/env python3
"""
Test scraping archivio Taste (Pitti): elenco + tassonomia filtri + campione scheda dettaglio.
Tutto il traffico verso Taste passa **solo** da Tor; prima del crawl si verifica che l’IP
in uscita sia diverso da quello senza Tor. Con **IPAnonimo**: connetti la VPN prima di Tor
(catena VPN → Tor → sito — vedi `taste_config`).

Ambito (progetto food separato): solo ciò che arriva via HTTP pubblico — niente login,
niente esigenza di superare overlay / curtain UI o contenuti “sblocca con login”.

Uso (da questa cartella, dopo aver attivato Tor):
  python3 taste_probe.py

Output: output/probe_taste19_<timestamp>.json
"""

from __future__ import annotations

import html as html_lib
import json
import os
import re
import sys
from datetime import datetime, timezone
from typing import Any, Optional, Set, Tuple
from urllib.parse import urljoin, urlparse

from bs4 import BeautifulSoup
from bs4.element import Tag

from taste_config import ARCHIVE_SEGMENT, LISTING_PATH, OUTPUT_DIR, TASTE_HOST, listing_url
from tor_session import (
    http_headers,
    request_timeout,
    require_anonymous_tor_session_with_browser_cookies,
)


def _ensure_output_dir() -> None:
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)


def extract_filter_taxonomy(soup: BeautifulSoup) -> dict[str, Any]:
    """Ricostruisce catalogo filtri come nel pannello destro (checkbox + label)."""
    groups: dict[str, list[dict[str, Any]]] = {
        "sections": [],
        "merceologies": [],
        "countries": [],
        "certifications": [],
        "flags": [],
        "initial": [],
    }
    seen_cb: Set[Tuple[str, str]] = set()
    for inp in soup.find_all("input", attrs={"type": "checkbox"}):
        name = inp.get("name") or ""
        if name == "initial":
            continue  # gestiti sotto (evita doppio conteggio)
        if name not in groups:
            continue
        vid = inp.get("value") or ""
        if (name, vid) in seen_cb:
            continue
        seen_cb.add((name, vid))
        input_id = inp.get("id") or ""
        lab = soup.find("label", attrs={"for": input_id})
        label = html_lib.unescape(lab.get_text(strip=True)) if lab else ""
        groups[name].append({"id": vid, "label": label, "input_id": input_id})

    # Lettere A–Z e 0-9 (name=initial); dedup per value (spesso doppio markup responsive)
    seen_initial: Set[str] = set()
    for inp in soup.find_all("input", attrs={"name": "initial"}):
        vid = inp.get("value") or ""
        if vid in seen_initial:
            continue
        seen_initial.add(vid)
        input_id = inp.get("id") or ""
        lab = soup.find("label", attrs={"for": input_id}) if input_id else None
        label = html_lib.unescape(lab.get_text(strip=True)) if lab else vid
        groups["initial"].append({"value": vid, "label": label, "input_id": input_id})

    # Conteggi riepilogo
    summary = {k: len(v) for k, v in groups.items()}
    return {"groups": groups, "summary_counts": summary}


def _listing_country_from_exhibitor_anchor(a: Tag) -> Optional[str]:
    """Regione/provenienza nella card: `p.box-card-body-country`."""
    el: Optional[Tag] = a.parent
    for _ in range(14):
        if el is None:
            return None
        p = el.select_one("p.box-card-body-country")
        if p:
            t = html_lib.unescape(p.get_text(strip=True))
            return t if t else None
        el = el.parent
    return None


def _accordion_content_ul_after_button(button: Tag) -> Optional[Tag]:
    """
    Il menu Merceology usa `aria-controls` duplicato (`content-title`); il blocco checkbox
    è il `ul.accordion-content` immediatamente dopo il `button.subcategory`.
    """
    sib = button.next_sibling
    while sib is not None:
        if isinstance(sib, Tag) and sib.name == "ul":
            classes = sib.get("class") or []
            if "accordion-content" in classes:
                return sib
        sib = sib.next_sibling
    return None


def _filter_accordion_section_label(button: Tag) -> Optional[str]:
    """Titolo macro-sezione del menu (es. «Merceology»): `label.filter-accordion-label` nel `div.filter-accordion`."""
    el: Optional[Tag] = button.parent
    for _ in range(16):
        if el is None:
            return None
        classes = el.get("class") or []
        if el.name == "div" and "filter-accordion" in classes:
            lab = el.select_one("label.filter-accordion-label")
            if lab:
                t = html_lib.unescape(lab.get_text(" ", strip=True))
                return t if t else None
            return None
        el = el.parent
    return None


def extract_merceology_menu_context_by_id(soup: BeautifulSoup) -> dict[str, dict[str, Optional[str]]]:
    """
    Per ogni ID checkbox merceologia nel menu listing:

    - **section_menu_title**: label macro (`label.filter-accordion-label`, es. «Merceology»).
    - **parent_menu_title**: testo del `button.subcategory` (es. «beer and fermented drinks»).
    """
    out: dict[str, dict[str, Optional[str]]] = {}
    for button in soup.select("button.accordion-item.subcategory.js-accordion-trigger"):
        sub_title = button.get_text(" ", strip=True)
        if not sub_title:
            continue
        section = _filter_accordion_section_label(button)
        panel = _accordion_content_ul_after_button(button)
        if not panel:
            continue
        sub_title = html_lib.unescape(sub_title)
        for inp in panel.select('input[type="checkbox"][name="merceologies"]'):
            vid = (inp.get("value") or "").strip()
            if not vid:
                continue
            if vid not in out:
                out[vid] = {
                    "section_menu_title": section,
                    "parent_menu_title": sub_title,
                }
    return out


def extract_merceology_subcategory_titles_by_id(soup: BeautifulSoup) -> dict[str, str]:
    """
    Retrocompatibilità: solo `parent_menu_title` per id (come prima dell’aggiunta della sezione menu).
    """
    rich = extract_merceology_menu_context_by_id(soup)
    return {k: (v.get("parent_menu_title") or "") for k, v in rich.items() if v.get("parent_menu_title")}


def extract_exhibitor_links_from_listing_soup(
    soup: BeautifulSoup,
    base: str = TASTE_HOST,
) -> list[dict[str, Any]]:
    """Link scheda + testo card + `listing_country` da `p.box-card-body-country` sulla stessa card."""
    pattern = re.compile(r"/exhibitors/[A-Z0-9]/[a-z0-9-]+/?$")
    seen: Set[str] = set()
    out: list[dict[str, Any]] = []
    for a in soup.find_all("a", href=True):
        href = a["href"]
        if not pattern.search(href):
            continue
        abs_url = urljoin(base, href)
        if abs_url in seen:
            continue
        seen.add(abs_url)
        parts = [p for p in urlparse(href).path.split("/") if p]
        letter = parts[-2] if len(parts) >= 2 else ""
        slug = parts[-1] if parts else ""
        card_text = ""
        el = a
        for _ in range(6):
            if not el:
                break
            if el.name in ("article", "li", "div"):
                t = el.get_text(" ", strip=True)
                if 15 < len(t) < 600:
                    card_text = html_lib.unescape(t)
                    break
            el = el.parent
        listing_country = _listing_country_from_exhibitor_anchor(a)
        out.append(
            {
                "url": abs_url,
                "letter": letter,
                "slug": slug,
                "listing_card_text": card_text,
                "listing_country": listing_country,
            }
        )
    return out


def extract_exhibitor_links_from_listing(html: str, base: str = TASTE_HOST) -> list[dict[str, Any]]:
    """Parsing da stringa HTML (una BeautifulSoup interna)."""
    return extract_exhibitor_links_from_listing_soup(BeautifulSoup(html, "html.parser"), base)


def find_listing_row_for_detail_url(
    session: Any,
    detail_url: str,
    *,
    headers: dict[str, str],
    timeout: float,
    max_pages: Optional[int] = None,
) -> Optional[tuple[dict[str, Any], int]]:
    """
    Scorre `…/archive/<segment>/exhibitors?page=N` via Tor finché trova la card con lo stesso
    link della scheda: serve per **`listing_country`** e `listing_card_text` (non presenti nel solo HTML dettaglio).
    """
    from seller_extract import archive_segment_from_detail_url, slug_letter_from_detail_url

    detail_norm = (detail_url or "").split("#")[0].rstrip("/")
    seg = archive_segment_from_detail_url(detail_url)
    if not seg:
        return None
    slug, letter = slug_letter_from_detail_url(detail_url)
    lim = max_pages
    if lim is None:
        try:
            lim = max(1, int(os.environ.get("TASTE_LISTING_MAX_PAGES", "150")))
        except ValueError:
            lim = 150

    base = f"{TASTE_HOST}/it/pittimmagine/archive/{seg}/exhibitors"
    for page in range(1, lim + 1):
        list_url = f"{base}?page={page}"
        r = session.get(list_url, headers=headers, timeout=timeout)
        r.raise_for_status()
        soup = BeautifulSoup(r.text, "html.parser")
        rows = extract_exhibitor_links_from_listing_soup(soup)
        for row in rows:
            u = ((row.get("url") or "").split("#")[0]).rstrip("/")
            if u == detail_norm:
                return dict(row), page
            if slug and row.get("slug") == slug and (not letter or row.get("letter") == letter):
                return dict(row), page
        if not rows:
            break
    return None


def extract_detail_public(soup: BeautifulSoup, url: str) -> dict[str, Any]:
    """Campi utili da HTML scheda senza autenticazione (overlay/login ignorati)."""
    og_title = None
    og_desc = None
    tag = soup.find("meta", attrs={"property": "og:title"})
    if tag and tag.get("content"):
        og_title = html_lib.unescape(tag["content"].strip())
    tag = soup.find("meta", attrs={"property": "og:description"})
    if tag and tag.get("content"):
        og_desc = html_lib.unescape(tag["content"].strip())

    h2_brand = None
    for h2 in soup.find_all("h2"):
        t = h2.get_text(strip=True)
        if t and t.upper() == t and len(t) > 2 and "featured" not in t.lower():
            h2_brand = html_lib.unescape(t)
            break
        if t and not h2_brand:
            h2_brand = html_lib.unescape(t)

    company_profile = None
    h3 = soup.find("h3", string=lambda x: x and "Company Profile" in x)
    if h3:
        block = h3.parent
        if block:
            following = []
            for sib in block.next_siblings:
                if getattr(sib, "name", None) == "h3":
                    break
                if hasattr(sib, "get_text"):
                    following.append(sib.get_text("\n", strip=True))
            company_profile = "\n".join(x for x in following if x).strip() or None

    return {
        "url": url,
        "og_title": og_title,
        "og_description": og_desc,
        "brand_heading_h2": h2_brand,
        "company_profile_text": company_profile,
    }


def run_probe() -> dict[str, Any]:
    try:
        session = require_anonymous_tor_session_with_browser_cookies()
    except RuntimeError as e:
        print(f"ERRORE anonimato/Tor: {e}", file=sys.stderr)
        sys.exit(1)

    headers = http_headers()
    timeout = request_timeout()

    listing_page_1 = listing_url(page=1)
    r_list = session.get(listing_page_1, headers=headers, timeout=timeout)
    r_list.raise_for_status()

    soup = BeautifulSoup(r_list.text, "html.parser")
    filters = extract_filter_taxonomy(soup)
    exhibitors_p1 = extract_exhibitor_links_from_listing(r_list.text)

    # Pagina 2 per verificare paginazione
    r_p2 = session.get(listing_url(page=2), headers=headers, timeout=timeout)
    r_p2.raise_for_status()
    exhibitors_p2 = extract_exhibitor_links_from_listing(r_p2.text)

    detail_url = exhibitors_p1[0]["url"] if exhibitors_p1 else None
    detail_block: Optional[dict[str, Any]] = None
    if detail_url:
        r_d = session.get(detail_url, headers=headers, timeout=timeout)
        r_d.raise_for_status()
        detail_block = extract_detail_public(BeautifulSoup(r_d.text, "html.parser"), detail_url)

    document = {
        "metadata": {
            "probe": "taste_pitti_exhibitors",
            "archive_segment": ARCHIVE_SEGMENT,
            "listing_path": LISTING_PATH,
            "scraped_at_utc": datetime.now(timezone.utc).isoformat(),
            "listing_url_sample": listing_page_1,
            "tor_required": True,
            "tor_anonymity_verified": True,
            "scope": "Solo scraping pubblico: niente login; overlay / aree opache e messaggi “sblocca contenuti” fuori obiettivo — non servono per catalogo + filtri.",
        },
        "feasibility_notes": {
            "listing": "HTML server-rendered (classe listing archived); paginazione ?page=N; form filtri GET sulla stessa URL.",
            "filters": "Tassonomia completa embedded nella prima pagina: sections, merceologies (IDs), countries (provenienza), certifications, flags, initial (lettera). Stessi parametri query replicano i filtri del sito.",
            "detail": "Da HTML aperto: meta og, titolo in pagina, Company Profile. Gallery avanzata dietro curtain/login non è nel perimetro.",
            "full_catalog": "Strategia: (1) taxonomy JSON una tantum; (2) paginare listing senza filtri; (3) merge card lista; (4) GET scheda per slug per testo/meta; (5) label→id merceologie dal dizionario filtri se serve.",
        },
        "filter_taxonomy": filters,
        "listing_page_1_exhibitors_count": len(exhibitors_p1),
        "listing_page_2_exhibitors_count": len(exhibitors_p2),
        "listing_page_1_exhibitors_sample": exhibitors_p1[:15],
        "listing_page_2_exhibitors_sample": exhibitors_p2[:10],
        "detail_sample": detail_block,
    }
    return document


def main() -> None:
    _ensure_output_dir()
    doc = run_probe()
    ts = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    out_path = OUTPUT_DIR / f"probe_{ARCHIVE_SEGMENT}_{ts}.json"
    out_path.write_text(json.dumps(doc, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"Scritto: {out_path}")
    print(json.dumps(doc["metadata"], ensure_ascii=False, indent=2))
    print("Conteggi filtri:", doc["filter_taxonomy"]["summary_counts"])


if __name__ == "__main__":
    main()
