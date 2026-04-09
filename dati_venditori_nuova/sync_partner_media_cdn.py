"""
Scarica logo (`logo_url`), hero/cover (`brand_banner_url`) e opzionalmente le immagini
lookbook / lookbook2 (`product_image_urls` nel JSON export) dal seller JSON,
via **Tor** (`require_anonymous_tor_session`), e salva in:

  {out}/partner/<slug>/
    logo_<nome_brand_normalizzato>.<ext>
    cover_<nome_brand_normalizzato>.<ext>
    storytelling_<nome_brand_normalizzato>-1.<ext> … -N  (--storytelling)

`<slug>` è l'identificativo partner (es. `molini-fagioli`).
`<nome_brand_normalizzato>` deriva da `name`: minuscolo, accenti rimossi, solo [a-z0-9_].

Upload sul CDN: `TRAMELLE_CDN_RSYNC_DEST` e `python3 ... --rsync` (gli URL nel JSON usano TRAMELLE_CDN_PUBLIC_BASE).

Import Medusa (password/email vendor): `tramelle_import_defaults.py` e `backend/src/scripts/import-json-catalog.ts`
(`IMPORT_SELLER_PASSWORD`, default come in quel modulo).

Esempi:
  python3 sync_partner_media_cdn.py export.json --storytelling --storytelling-max 6 --limit 10 \
    --write-import-json output/test_import.json --slice-import 10
"""

from __future__ import annotations

import argparse
import json
import os
import re
import subprocess
import sys
import unicodedata
from pathlib import Path
from typing import Any
from urllib.parse import urlparse

from tor_session import (  # noqa: E402
    http_headers,
    request_timeout,
    require_anonymous_tor_session,
)
from tor_proxy import session_must_use_tor  # noqa: E402

_DATI_ROOT = Path(__file__).resolve().parent
_DEFAULT_JSON = _DATI_ROOT / "marketplace_sellers_all_10.json"
_DEFAULT_OUT = _DATI_ROOT / "partner_media_out"


def brand_file_token(name: str, slug: str) -> str:
    s = unicodedata.normalize("NFKD", (name or "").strip())
    s = s.encode("ascii", "ignore").decode("ascii")
    s = s.lower().strip()
    s = re.sub(r"[^a-z0-9]+", "_", s)
    s = re.sub(r"_+", "_", s).strip("_")
    if not s:
        s = re.sub(r"[^a-z0-9]+", "_", (slug or "").lower()).strip("_")
    return s or "partner"


def extension_from_url(url: str) -> str:
    path = urlparse(url).path
    ext = Path(path).suffix.lower()
    if ext in (".jpg", ".jpeg", ".png", ".gif", ".webp", ".svg"):
        return ext
    if ext:
        return ext[:8]
    return ".jpg"


def download_binary(session, url: str) -> bytes:
    session_must_use_tor(session)
    r = session.get(url, headers=http_headers(), timeout=request_timeout(), stream=True)
    r.raise_for_status()
    return r.content


def sync_one_seller(
    session,
    seller: dict[str, Any],
    out_partner_root: Path,
    public_base: str,
    *,
    logo_only: bool = False,
    storytelling: bool = False,
    storytelling_max: int = 0,
) -> dict[str, Any]:
    slug = str(seller.get("slug") or "").strip()
    name = str(seller.get("name") or "").strip()
    logo_url = (seller.get("logo_url") or "").strip()
    cover_url = (seller.get("brand_banner_url") or "").strip()
    gallery_src: list[str] = []
    if isinstance(seller.get("product_image_urls"), list):
        for u in seller["product_image_urls"]:
            t = str(u or "").strip()
            if t:
                gallery_src.append(t)

    row: dict[str, Any] = {
        "slug": slug,
        "name": name,
        "logo_url_source": logo_url,
        "cover_url_source": cover_url,
        "errors": [],
    }
    if not slug:
        row["errors"].append("missing_slug")
        return row

    token = brand_file_token(name, slug)
    dest_dir = out_partner_root / "partner" / slug
    dest_dir.mkdir(parents=True, exist_ok=True)

    base = public_base.rstrip("/")

    if logo_url:
        try:
            ext = extension_from_url(logo_url)
            fname = f"logo_{token}{ext}"
            fpath = dest_dir / fname
            fpath.write_bytes(download_binary(session, logo_url))
            os.chmod(fpath, 0o600)
            row["cdn_logo_path"] = f"partner/{slug}/{fname}"
            row["cdn_logo_url"] = f"{base}/partner/{slug}/{fname}"
        except Exception as e:
            row["errors"].append(f"logo:{e}")
    else:
        row["errors"].append("no_logo_url")

    if not logo_only:
        if cover_url:
            try:
                ext = extension_from_url(cover_url)
                fname = f"cover_{token}{ext}"
                fpath = dest_dir / fname
                fpath.write_bytes(download_binary(session, cover_url))
                os.chmod(fpath, 0o600)
                row["cdn_cover_path"] = f"partner/{slug}/{fname}"
                row["cdn_cover_url"] = f"{base}/partner/{slug}/{fname}"
            except Exception as e:
                row["errors"].append(f"cover:{e}")
        else:
            row["errors"].append("no_brand_banner_url")

    cdn_story: list[str] = []
    if storytelling and not logo_only and gallery_src:
        cap = storytelling_max if storytelling_max > 0 else len(gallery_src)
        for idx, pic_url in enumerate(gallery_src[:cap], start=1):
            try:
                ext = extension_from_url(pic_url)
                fname = f"storytelling_{token}-{idx}{ext}"
                fpath = dest_dir / fname
                fpath.write_bytes(download_binary(session, pic_url))
                os.chmod(fpath, 0o600)
                cdn_story.append(f"{base}/partner/{slug}/{fname}")
            except Exception as e:
                row["errors"].append(f"storytelling-{idx}:{e}")
        if cdn_story:
            row["cdn_storytelling_urls"] = cdn_story

    return row


def merge_cdn_urls_into_sellers(
    data: dict[str, Any],
    manifest: dict[str, Any],
    *,
    logos_only: bool = True,
) -> dict[str, Any]:
    """Copia profonda: logo_url, brand_banner_url, opz. product_image_urls → URL CDN da manifest."""
    by_slug = {
        str(p.get("slug") or ""): p
        for p in (manifest.get("partners") or [])
        if isinstance(p, dict)
    }
    out = json.loads(json.dumps(data))
    sellers = out.get("sellers")
    if not isinstance(sellers, list):
        return out
    for s in sellers:
        if not isinstance(s, dict):
            continue
        slug = str(s.get("slug") or "")
        p = by_slug.get(slug)
        if not p:
            continue
        if p.get("cdn_logo_url"):
            s["logo_url"] = p["cdn_logo_url"]
        if not logos_only and p.get("cdn_cover_url"):
            s["brand_banner_url"] = p["cdn_cover_url"]
        urls = p.get("cdn_storytelling_urls")
        if isinstance(urls, list) and urls:
            s["product_image_urls"] = urls
    return out


def run_rsync(local_partner: Path, remote_dest: str) -> None:
    local_partner = local_partner.resolve()
    if not local_partner.is_dir():
        raise RuntimeError(f"Directory locale mancante: {local_partner}")
    remote_dest = remote_dest.rstrip("/") + "/"
    cmd = [
        "rsync",
        "-avz",
        "--chmod=D755,F644",
        "-e",
        "ssh",
        str(local_partner) + "/",
        remote_dest,
    ]
    print(" ", " ".join(cmd), file=sys.stderr)
    subprocess.run(cmd, check=True)


def main() -> int:
    p = argparse.ArgumentParser(description="Download logo/cover seller JSON via Tor → partner_media_out")
    p.add_argument(
        "json_path",
        nargs="?",
        default=str(_DEFAULT_JSON),
        help=f"JSON export (default: {_DEFAULT_JSON.name})",
    )
    p.add_argument(
        "--out-dir",
        default=str(_DEFAULT_OUT),
        help="Directory output (default: dati_venditori/partner_media_out)",
    )
    p.add_argument("--limit", type=int, default=0, help="Solo primi N seller (0 = tutti)")
    p.add_argument("--dry-run", action="store_true", help="Solo log, nessun download")
    p.add_argument(
        "--rsync",
        action="store_true",
        help="Dopo il download, rsync verso TRAMELLE_CDN_RSYNC_DEST",
    )
    p.add_argument(
        "--logo-only",
        action="store_true",
        help="Scarica solo i logo (niente hero/cover).",
    )
    p.add_argument(
        "--storytelling",
        action="store_true",
        help="Scarica anche product_image_urls (lookbook) come storytelling_<brand>-N.<ext>.",
    )
    p.add_argument(
        "--storytelling-max",
        type=int,
        default=0,
        metavar="N",
        help="Max immagini lookbook per seller (0 = tutte).",
    )
    p.add_argument(
        "--slice-import",
        type=int,
        default=0,
        metavar="N",
        help="Nel JSON di import mantieni solo i primi N seller (dopo il merge CDN).",
    )
    p.add_argument(
        "--write-import-json",
        type=str,
        default=str(_DATI_ROOT / "marketplace_sellers_all_10_import.json"),
        metavar="PATH",
        help="JSON per Medusa import: logo_url puntano al CDN (default: .../marketplace_sellers_all_10_import.json)",
    )
    p.add_argument(
        "--no-import-json",
        action="store_true",
        help="Non scrivere il file JSON per l'import Medusa.",
    )
    args = p.parse_args()

    os.umask(0o077)

    raw_path = Path(args.json_path).expanduser()
    if not raw_path.is_file():
        print(f"File non trovato: {raw_path}", file=sys.stderr)
        return 1

    out_root = Path(args.out_dir).expanduser().resolve()
    public_base = os.environ.get("TRAMELLE_CDN_PUBLIC_BASE", "https://cdn.tramelle.com").strip()

    with open(raw_path, encoding="utf-8") as f:
        data = json.load(f)

    sellers = data.get("sellers") or []
    if args.limit and args.limit > 0:
        sellers = sellers[: args.limit]

    if args.dry_run:
        print(f"[dry-run] {len(sellers)} seller → {out_root / 'partner'}", file=sys.stderr)
        for s in sellers:
            print(
                " ",
                s.get("slug"),
                brand_file_token(str(s.get("name") or ""), str(s.get("slug") or "")),
                file=sys.stderr,
            )
        return 0

    session = require_anonymous_tor_session()

    manifest = {
        "source_json": str(raw_path.resolve()),
        "public_base": public_base,
        "out_dir": str(out_root),
        "partners": [],
    }

    for s in sellers:
        if not isinstance(s, dict):
            continue
        manifest["partners"].append(
            sync_one_seller(
                session,
                s,
                out_root,
                public_base,
                logo_only=bool(args.logo_only),
                storytelling=bool(args.storytelling),
                storytelling_max=int(args.storytelling_max or 0),
            )
        )

    manifest_path = out_root / "partner_media_manifest.json"
    manifest_path.parent.mkdir(parents=True, exist_ok=True)
    manifest_path.write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding="utf-8")
    os.chmod(manifest_path, 0o600)
    print(f"Manifest: {manifest_path}", file=sys.stderr)

    if not args.no_import_json:
        import_path = Path(args.write_import_json).expanduser().resolve()
        merged = merge_cdn_urls_into_sellers(
            data, manifest, logos_only=bool(args.logo_only)
        )
        if int(args.slice_import or 0) > 0:
            sl = merged.get("sellers")
            if isinstance(sl, list):
                merged = {**merged, "sellers": sl[: int(args.slice_import)]}
        import_path.write_text(
            json.dumps(merged, ensure_ascii=False, indent=2), encoding="utf-8"
        )
        os.chmod(import_path, 0o600)
        print(f"Import Medusa: {import_path}", file=sys.stderr)

    rsync_dest = os.environ.get("TRAMELLE_CDN_RSYNC_DEST", "").strip()
    if args.rsync:
        if not rsync_dest:
            print(
                "Imposta TRAMELLE_CDN_RSYNC_DEST (es. user@cdn.tramelle.com:/var/www/cdn/partner/)",
                file=sys.stderr,
            )
            return 2
        run_rsync(out_root / "partner", rsync_dest)

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
