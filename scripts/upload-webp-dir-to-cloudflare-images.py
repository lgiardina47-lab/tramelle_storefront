#!/usr/bin/env python3
"""
Carica immagini partner (WebP, JPEG o PNG) da una cartella locale su Cloudflare Images e scrive un JSON import con `cfimg:<id>`.

Flusso tipico: (1) elaborare e salvare su disco — es. [`partner_media_minimal_local.py`](partner_media_minimal_local.py) → `--out-dir`; (2) lanciare questo script puntando a quella cartella.

Sono accettati file `logo_*` / `cover_*` / `storytelling_*-N.*` **oppure** la stessa struttura **Malpighi / Tramelle** prodotta da [`process-malpighi-tramelle-webp-batch.py`](process-malpighi-tramelle-webp-batch.py), ad es.:
  - `logo-acetaia-malpighi-emilia-romagna-italy-tramelle.jpg`
  - `cover-acetaia-malpighi-emilia-romagna-italy-tramelle.jpg`
  - `acetaia-malpighi-storytelling-1-emilia-romagna-italy-tramelle.jpg`, … (stesse estensioni .webp/.jpg/.jpeg/.png).

Legge CLOUDFLARE_ACCOUNT_ID e CLOUDFLARE_API_TOKEN da backend/.env (o da env già esportate).

Esempio (cartella con JPEG “-tramelle” come Malpighi):
  python3 scripts/upload-webp-dir-to-cloudflare-images.py \\
    --backend-env /var/www/tramelle/backend/.env \\
    --webp-dir /var/www/tramelle/dati_venditori/test/output_tramelle_minimal/acetaia-malpighi \\
    --source-json /var/www/tramelle/dati_venditori_nuova/output/official/marketplace_sellers_official_import.json \\
    --slug acetaia-malpighi \\
    --out-json /var/www/tramelle/dati_venditori_nuova/output/import_one_acetaia_malpighi_cf.json
"""

from __future__ import annotations

import argparse
import json
import os
import re
import sys
from pathlib import Path

import requests

PARTNER_MEDIA_SUFFIXES = frozenset({".webp", ".jpg", ".jpeg", ".png"})
_STORY_UNDERSCORE = re.compile(
    r"^storytelling_.*-(\d+)\.(webp|jpg|jpeg|png)$", re.IGNORECASE
)


def load_dotenv(path: Path) -> None:
    for line in path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        k, _, v = line.partition("=")
        k, v = k.strip(), v.strip().strip('"').strip("'")
        if k and k not in os.environ:
            os.environ[k] = v


def _mime_type(path: Path) -> str:
    ext = path.suffix.lower()
    if ext == ".webp":
        return "image/webp"
    if ext in (".jpg", ".jpeg"):
        return "image/jpeg"
    if ext == ".png":
        return "image/png"
    raise ValueError(f"Estensione non supportata: {path}")


def _is_partner_media_file(p: Path) -> bool:
    if not p.is_file():
        return False
    ext = p.suffix.lower()
    if ext not in PARTNER_MEDIA_SUFFIXES:
        return False
    stem = p.stem.lower()
    if stem.startswith("logo_") or (
        stem.startswith("logo-") and stem.endswith("-tramelle")
    ):
        return True
    if stem.startswith("cover_") or (
        stem.startswith("cover-") and stem.endswith("-tramelle")
    ):
        return True
    if _STORY_UNDERSCORE.match(p.name.lower()):
        return True
    if "-storytelling-" in stem and stem.endswith("-tramelle"):
        return bool(re.search(r"-storytelling-\d+-", stem))
    return False


def sort_partner_media(paths: list[Path]) -> list[Path]:
    def story_tuple(p: Path) -> tuple:
        n = p.name
        lo = n.lower()
        m = _STORY_UNDERSCORE.match(lo)
        if m:
            return (2, int(m.group(1)), n)
        stem = p.stem.lower()
        m2 = re.search(r"-storytelling-(\d+)-", stem)
        if m2 and stem.endswith("-tramelle"):
            return (2, int(m2.group(1)), n)
        return (2, 9999, n)

    def key(p: Path):
        n = p.name
        stem = p.stem.lower()
        if stem.startswith("logo_") or (
            stem.startswith("logo-") and stem.endswith("-tramelle")
        ):
            return (0, n)
        if stem.startswith("cover_") or (
            stem.startswith("cover-") and stem.endswith("-tramelle")
        ):
            return (1, n)
        return story_tuple(p)

    return sorted(paths, key=key)


def collect_partner_media_files(media_dir: Path) -> list[Path]:
    return sort_partner_media([p for p in media_dir.iterdir() if _is_partner_media_file(p)])


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--backend-env", type=Path, default=Path("backend/.env"))
    ap.add_argument(
        "--webp-dir",
        type=Path,
        required=True,
        help="Cartella asset (logo_*/cover_*/storytelling_* oppure es. logo-acetaia-malpighi-…-tramelle.jpg; .webp/.jpg/.jpeg/.png)",
    )
    ap.add_argument("--source-json", type=Path, required=True, help="JSON con sellers[] (primo seller o --slug)")
    ap.add_argument("--slug", type=str, required=True)
    ap.add_argument("--out-json", type=Path, required=True)
    args = ap.parse_args()

    if args.backend_env.is_file():
        load_dotenv(args.backend_env)

    acc = os.environ.get("CLOUDFLARE_ACCOUNT_ID", "").strip()
    tok = os.environ.get("CLOUDFLARE_API_TOKEN", "").strip()
    if not acc or not tok:
        print("Impostare CLOUDFLARE_ACCOUNT_ID e CLOUDFLARE_API_TOKEN", file=sys.stderr)
        return 1

    d = json.loads(args.source_json.read_text(encoding="utf-8"))
    sellers = d.get("sellers")
    if not isinstance(sellers, list):
        print("JSON senza sellers[]", file=sys.stderr)
        return 1
    row = None
    for s in sellers:
        if isinstance(s, dict) and str(s.get("slug", "")).strip() == args.slug:
            row = dict(s)
            break
    if row is None:
        print(f"Slug {args.slug!r} non trovato in source-json", file=sys.stderr)
        return 1

    media_dir = args.webp_dir.expanduser().resolve()
    if not media_dir.is_dir():
        print("Cartella non trovata:", media_dir, file=sys.stderr)
        return 1
    files = collect_partner_media_files(media_dir)
    if not files:
        print(
            "Nessun file partner (logo_/cover_/storytelling_*; webp/jpg/png) in",
            media_dir,
            file=sys.stderr,
        )
        return 1

    url = f"https://api.cloudflare.com/client/v4/accounts/{acc}/images/v1"
    by_name: dict[str, str] = {}
    for p in files:
        mime = _mime_type(p)
        with open(p, "rb") as fh:
            r = requests.post(
                url,
                headers={"Authorization": f"Bearer {tok}"},
                files={"file": (p.name, fh, mime)},
                timeout=180,
            )
        j = r.json()
        if not j.get("success"):
            print("Upload fallito", p.name, j, file=sys.stderr)
            return 1
        by_name[p.name] = j["result"]["id"]
        print("ok", p.name)

    def cfimg(name: str) -> str:
        iid = by_name.get(name)
        if not iid:
            raise KeyError(name)
        return f"cfimg:{iid}"

    def is_logo_stem(stem: str) -> bool:
        s = stem.lower()
        return s.startswith("logo_") or (s.startswith("logo-") and s.endswith("-tramelle"))

    def is_cover_stem(stem: str) -> bool:
        s = stem.lower()
        return s.startswith("cover_") or (
            s.startswith("cover-") and s.endswith("-tramelle")
        )

    def is_story_path(p: Path) -> bool:
        lo = p.name.lower()
        if _STORY_UNDERSCORE.match(lo):
            return True
        s = p.stem.lower()
        return "-storytelling-" in s and s.endswith("-tramelle") and bool(
            re.search(r"-storytelling-\d+-", s)
        )

    logos = [p.name for p in files if is_logo_stem(p.stem)]
    covers = [p.name for p in files if is_cover_stem(p.stem)]
    if not logos or not covers:
        print(
            "Servono almeno un logo (logo_* o logo-…-tramelle) e un cover in",
            media_dir,
            file=sys.stderr,
        )
        return 1

    row["logo_url"] = cfimg(logos[0])
    row["brand_banner_url"] = cfimg(covers[0])
    row["product_image_urls"] = [cfimg(p.name) for p in files if is_story_path(p)]

    args.out_json.parent.mkdir(parents=True, exist_ok=True)
    args.out_json.write_text(
        json.dumps({"sellers": [row]}, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    print("Scritto", args.out_json)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
