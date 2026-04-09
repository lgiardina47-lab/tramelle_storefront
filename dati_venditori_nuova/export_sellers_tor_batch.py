#!/usr/bin/env python3
"""
Estrazione batch schede Taste → JSON (GET via Tor, parallelo, checkpoint). Cartella pulita: `dati_venditori_nuova/`.

**Default:** niente Playwright (veloce). Playwright solo con `--playwright` (lento, più HTML nel DOM).

Checkpoint durante il run (stesso timestamp `TIMESTAMP`, sotto `output/`):
  marketplace_sellers_tor_requests_TIMESTAMP.checkpoint.jsonl  (append ogni scheda ok/fallita)
  marketplace_sellers_tor_requests_TIMESTAMP.partial.json     (snapshot allineato all’input)

Env utili:
  TASTE_CHECKPOINT_EVERY   default 1 = riscrivi il partial.json ogni N schede completate
  TASTE_TOR_HTTP_TIMEOUT   default 15,45 (connect, read) se non impostato
  TASTE_FETCH_RETRIES      default 4
  TASTE_NETSCAPE_COOKIES   cookie Netscape opzionali

Uso (da `dati_venditori_nuova/`):
  python3 export_sellers_tor_batch.py /percorso/export_con_sellers.json
  python3 export_sellers_tor_batch.py ../dati_venditori/output/merged_new_only_plus_taste19_dedup_domain.json
  python3 export_sellers_tor_batch.py input.json --limit 100 --concurrency 12
  python3 export_sellers_tor_batch.py input.json --playwright   # raro: browser + carousel
"""

from __future__ import annotations

import argparse
import json
import os
import sys
import threading
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Optional

import requests

from seller_extract import (
    archive_segment_from_detail_url,
    build_marketplace_seller,
    slug_letter_from_detail_url,
)
from taste_config import OUTPUT_DIR
from taste_exhibitor_pipeline import fetch_detail_html_tor, listing_context_for_detail
from tor_session import (
    require_anonymous_tor_session_with_browser_cookies,
    sibling_tor_session_from,
)

_thread_local = threading.local()

_DEFAULT_PARALLEL_TOR_TIMEOUT = "15,45"
_DEFAULT_FETCH_RETRIES = 4
_DEFAULT_CHECKPOINT_EVERY = 1
_DEFAULT_CONCURRENCY = 10


def _env_int(name: str, default: int) -> int:
    raw = os.environ.get(name, "").strip()
    if not raw:
        return default
    try:
        return max(1, int(raw))
    except ValueError:
        return default


def _write_tor_checkpoint_snapshot(
    *,
    partial_path: Path,
    raw_meta: dict[str, Any],
    sellers_in: list[dict[str, Any]],
    finished: dict[int, Optional[dict[str, Any]]],
    skipped: set[int],
    purpose: str,
    note: str,
    n_workers: int,
    checkpoint_ts: str,
    source_export: str,
) -> None:
    """File JSON consultabile durante il batch: `sellers` allineato all’input (`null` = non ancora fatto o skip)."""
    ordered: list[Optional[dict[str, Any]]] = []
    for i in range(len(sellers_in)):
        if i in skipped:
            ordered.append(None)
        elif i in finished:
            ordered.append(finished[i])
        else:
            ordered.append(None)
    n_ok = sum(1 for i in range(len(sellers_in)) if i in finished)
    n_fail = sum(
        1 for i in range(len(sellers_in)) if (finished.get(i) or {}).get("_scrape_failed")
    )
    meta: dict[str, Any] = {
        **raw_meta,
        "purpose": purpose,
        "fetch": "tor_requests",
        "checkpoint": True,
        "checkpoint_ts_utc": checkpoint_ts,
        "source_export": source_export,
        "partial_completed": n_ok,
        "partial_total": len(sellers_in),
        "partial_skipped_no_url": len(skipped),
        "scrape_failed_count": n_fail,
        "tor_http_timeout_env": os.environ.get("TASTE_TOR_HTTP_TIMEOUT", ""),
        "concurrency_workers": n_workers,
        "note": note + " Snapshot intermedio: elementi `null` in `sellers` = non ancora scaricati.",
    }
    partial_path.write_text(
        json.dumps({"metadata": meta, "sellers": ordered}, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )


def main() -> None:
    if hasattr(sys.stdout, "reconfigure"):
        try:
            sys.stdout.reconfigure(line_buffering=True)
        except Exception:
            pass

    p = argparse.ArgumentParser(
        description="Estrae schede Taste via GET Tor (default, parallelo + checkpoint). Opzionale --playwright."
    )
    p.add_argument("taste_export_json", type=Path)
    p.add_argument("--limit", type=int, default=None, metavar="N")
    p.add_argument(
        "--playwright",
        action="store_true",
        help="Usa Playwright+Tor (lento, carousel; più lookbook se il server lo manda nel DOM).",
    )
    p.add_argument(
        "--concurrency",
        type=int,
        default=_DEFAULT_CONCURRENCY,
        metavar="N",
        help=f"Worker paralleli in modalità GET (default {_DEFAULT_CONCURRENCY}). Ignorato con --playwright.",
    )
    args = p.parse_args()

    if args.playwright:
        os.environ.setdefault("TASTE_PLAYWRIGHT", "1")
        os.environ.setdefault("TASTE_PLAYWRIGHT_CAROUSEL_STEPS", "55")
        os.environ.setdefault("TASTE_PLAYWRIGHT_SETTLE_MS", "8000")
    else:
        os.environ.setdefault("TASTE_TOR_HTTP_TIMEOUT", _DEFAULT_PARALLEL_TOR_TIMEOUT)

    raw = json.loads(args.taste_export_json.read_text(encoding="utf-8"))
    sellers_in: list[dict[str, Any]] = raw.get("sellers") or []
    if args.limit is not None:
        sellers_in = sellers_in[: args.limit]

    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    verified_session = require_anonymous_tor_session_with_browser_cookies()

    out_sellers: list[dict[str, Any]] = []
    checkpoint_ts = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")

    if not args.playwright:
        n_workers = max(1, int(args.concurrency))
        checkpoint_jsonl = OUTPUT_DIR / f"marketplace_sellers_tor_requests_{checkpoint_ts}.checkpoint.jsonl"
        partial_json = OUTPUT_DIR / f"marketplace_sellers_tor_requests_{checkpoint_ts}.partial.json"
        ck_every = _env_int("TASTE_CHECKPOINT_EVERY", _DEFAULT_CHECKPOINT_EVERY)
        write_lock = threading.Lock()
        finished: dict[int, Optional[dict[str, Any]]] = {}
        skipped: set[int] = set()
        n_checkpoints = 0

        def _tor_session_for_thread() -> Any:
            s = getattr(_thread_local, "session", None)
            if s is None:
                s = sibling_tor_session_from(verified_session)
                _thread_local.session = s
            return s

        def _fetch_one(iv: tuple[int, dict[str, Any]]) -> Optional[dict[str, Any]]:
            i, _old = iv
            url = (_old.get("detail_url") or "").strip()
            if not url:
                print(f"[{i + 1}] skip: no detail_url", flush=True)
                return None
            max_try = _env_int("TASTE_FETCH_RETRIES", _DEFAULT_FETCH_RETRIES)
            print(f"[{i + 1}/{len(sellers_in)}] {url}", flush=True)
            last_exc: Optional[BaseException] = None
            for attempt in range(max_try):
                sess = _tor_session_for_thread()
                try:
                    row, _lp = listing_context_for_detail(sess, url)
                    html, mode = fetch_detail_html_tor(sess, url, use_playwright=False)
                    seller = build_marketplace_seller(
                        html,
                        url,
                        listing_card_text=(row or {}).get("listing_card_text") or None,
                        listing_country=(row or {}).get("listing_country"),
                    )
                    nimg = len(seller.get("product_image_urls") or [])
                    logged = "?"
                    if "loggedIn: true" in html:
                        logged = "true"
                    elif "loggedIn: false" in html:
                        logged = "false"
                    print(
                        f"  → [{i + 1}] fetch_mode={mode} loggedIn≈{logged} product_image_urls={nimg}",
                        flush=True,
                    )
                    return seller
                except (requests.RequestException, OSError) as exc:
                    last_exc = exc
                    if getattr(_thread_local, "session", None) is not None:
                        try:
                            delattr(_thread_local, "session")
                        except Exception:
                            pass
                    if attempt + 1 < max_try:
                        wait = 2.0 * (attempt + 1)
                        print(
                            f"  ⚠ [{i + 1}] tentativo {attempt + 2}/{max_try} ({type(exc).__name__}): {exc!s}; pausa {wait:.1f}s",
                            flush=True,
                        )
                        time.sleep(wait)
                    continue

            err = str(last_exc) if last_exc else "unknown"
            print(f"  ✖ [{i + 1}] FALLITA dopo {max_try} tentativi: {err}", flush=True)
            slug, letter = slug_letter_from_detail_url(url)
            seg = archive_segment_from_detail_url(url) or _old.get("archive_segment")
            return {
                "source": "taste_pitti_archive",
                "archive_segment": seg,
                "slug": slug or _old.get("slug"),
                "letter": letter or _old.get("letter"),
                "detail_url": url,
                "_scrape_failed": True,
                "_scrape_error": err[:500],
            }

        def _on_task_done(i: int, seller: Optional[dict[str, Any]], is_skip: bool) -> None:
            nonlocal n_checkpoints
            with write_lock:
                if is_skip:
                    skipped.add(i)
                else:
                    assert seller is not None
                    finished[i] = seller
                    line = json.dumps({"i": i, "seller": seller}, ensure_ascii=False)
                    with checkpoint_jsonl.open("a", encoding="utf-8") as jf:
                        jf.write(line + "\n")
                n_checkpoints += 1
                if n_checkpoints % ck_every == 0 or n_checkpoints == len(sellers_in):
                    _write_tor_checkpoint_snapshot(
                        partial_path=partial_json,
                        raw_meta=dict(raw.get("metadata") or {}),
                        sellers_in=sellers_in,
                        finished=finished,
                        skipped=skipped,
                        purpose="marketplace_seller_tor_requests_reexport",
                        note=(
                            "Schede via GET+Tor senza Playwright. Le URL lookbook dipendono dall’HTML iniziale."
                        ),
                        n_workers=n_workers,
                        checkpoint_ts=checkpoint_ts,
                        source_export=str(args.taste_export_json.resolve()),
                    )
                    print(f"  … checkpoint → {partial_json.name} ({n_checkpoints}/{len(sellers_in)})", flush=True)

        with ThreadPoolExecutor(max_workers=n_workers) as ex:
            futures = {ex.submit(_fetch_one, iv): iv[0] for iv in enumerate(sellers_in)}
            for fut in as_completed(futures):
                idx = futures[fut]
                try:
                    seller = fut.result()
                except Exception as exc:
                    print(f"  ✖ [{idx + 1}] worker crash: {exc!s}", flush=True)
                    u = (sellers_in[idx].get("detail_url") or "").strip()
                    slug, letter = slug_letter_from_detail_url(u) if u else (None, None)
                    seller = {
                        "source": "taste_pitti_archive",
                        "archive_segment": archive_segment_from_detail_url(u)
                        if u
                        else sellers_in[idx].get("archive_segment"),
                        "slug": slug or sellers_in[idx].get("slug"),
                        "letter": letter or sellers_in[idx].get("letter"),
                        "detail_url": u or None,
                        "_scrape_failed": True,
                        "_scrape_error": str(exc)[:500],
                    }
                    _on_task_done(idx, seller, False)
                    continue
                if seller is None:
                    _on_task_done(idx, None, True)
                else:
                    _on_task_done(idx, seller, False)

        for i in range(len(sellers_in)):
            if i in skipped:
                continue
            if i not in finished:
                continue
            out_sellers.append(finished[i])
    else:
        ts_pw = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
        session = verified_session
        for i, _old in enumerate(sellers_in):
            url = (_old.get("detail_url") or "").strip()
            if not url:
                print(f"[{i + 1}] skip: no detail_url", flush=True)
                continue
            print(f"[{i + 1}/{len(sellers_in)}] {url}", flush=True)
            row, listing_page = listing_context_for_detail(session, url)
            html, mode = fetch_detail_html_tor(session, url, use_playwright=True)
            seller = build_marketplace_seller(
                html,
                url,
                listing_card_text=(row or {}).get("listing_card_text") or None,
                listing_country=(row or {}).get("listing_country"),
            )
            out_sellers.append(seller)
            nimg = len(seller.get("product_image_urls") or [])
            logged = "?"
            if "loggedIn: true" in html:
                logged = "true"
            elif "loggedIn: false" in html:
                logged = "false"
            print(f"  → fetch_mode={mode} loggedIn≈{logged} product_image_urls={nimg}", flush=True)
        checkpoint_ts = ts_pw

    ts = checkpoint_ts
    if not args.playwright:
        out_path = OUTPUT_DIR / f"marketplace_sellers_tor_requests_{ts}.json"
        purpose = "marketplace_seller_tor_requests_reexport"
        note = "Schede via GET+Tor (default). Lookbook solo se presenti nell’HTML; checkpoint durante il run."
    else:
        out_path = OUTPUT_DIR / f"marketplace_sellers_playwright_{ts}.json"
        purpose = "marketplace_seller_playwright_reexport"
        note = (
            "Schede via Playwright+Tor. Se product_image_urls resta basso, prova TASTE_NETSCAPE_COOKIES."
        )

    n_failed = sum(1 for s in out_sellers if s.get("_scrape_failed"))
    meta = {
        **(raw.get("metadata") or {}),
        "purpose": purpose,
        "fetch": "tor_requests" if not args.playwright else "playwright_tor",
        "source_export": str(args.taste_export_json.resolve()),
        "reexported_at_utc": datetime.now(timezone.utc).isoformat(),
        "output_sellers_count": len(out_sellers),
        "scrape_failed_count": n_failed,
        "carousel_steps_env": os.environ.get("TASTE_PLAYWRIGHT_CAROUSEL_STEPS", ""),
        "settle_ms_env": os.environ.get("TASTE_PLAYWRIGHT_SETTLE_MS", ""),
        "tor_http_timeout_env": os.environ.get("TASTE_TOR_HTTP_TIMEOUT", ""),
        "concurrency_workers": max(1, int(args.concurrency)) if not args.playwright else 1,
        "note": note,
    }
    if not args.playwright:
        meta["checkpoint_jsonl"] = str(
            (OUTPUT_DIR / f"marketplace_sellers_tor_requests_{ts}.checkpoint.jsonl").resolve()
        )
        meta["checkpoint_partial_json"] = str(
            (OUTPUT_DIR / f"marketplace_sellers_tor_requests_{ts}.partial.json").resolve()
        )
        meta["checkpoint"] = False
    out_path.write_text(
        json.dumps({"metadata": meta, "sellers": out_sellers}, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    print(f"Scritto: {out_path}", flush=True)


if __name__ == "__main__":
    main()
