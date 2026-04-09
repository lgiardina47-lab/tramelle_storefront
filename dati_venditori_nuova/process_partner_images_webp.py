#!/usr/bin/env python3
"""
Elaborazione immagini partner (Tor): logo/cover/gallery → WebP, strip EXIF, −2 px, watermark solo gallery.

Cartella pulita: ``dati_venditori_nuova/``. Output sotto ``{out}/partner/<slug>/`` (naming come
``sync_partner_media_cdn.py``): ``logo_{token}.webp``, ``cover_{token}.webp``, ``storytelling_{token}-N.webp``.

Esempio test Acetaia Malpighi:

  python3 process_partner_images_webp.py --demo-acetaia-malpighi

Un seller da JSON export:

  python3 process_partner_images_webp.py --seller-json output/tuo_export.json --slug acetaia-malpighi

URL espliciti:

  python3 process_partner_images_webp.py --slug acetaia-malpighi --name \"ACETAIA MALPIGHI\" \\
    --logo-url 'https://...' --cover-url 'https://...' --gallery-url 'https://...'

Primo seller + JSON import prova:

  python3 process_partner_images_webp.py --seller-json output/tuo_export.json --first-seller-only \\
    --out venditori --write-import-json output/import_1seller.json
"""

from __future__ import annotations

import argparse
import json
import os
import sys
from io import BytesIO
from pathlib import Path
from typing import Any

from PIL import Image, ImageDraw, ImageFont, ImageOps

_DATI_ROOT = Path(__file__).resolve().parent
if str(_DATI_ROOT) not in sys.path:
    sys.path.insert(0, str(_DATI_ROOT))

from seller_extract import build_marketplace_seller  # noqa: E402
from sync_partner_media_cdn import (  # noqa: E402
    brand_file_token,
    download_binary,
    merge_cdn_urls_into_sellers,
)
from tor_session import (  # noqa: E402
    http_headers,
    request_timeout,
    require_anonymous_tor_session,
)

WATERMARK_TEXT = "Tramelle Source Gourmet"
WATERMARK_OPACITY = 0.05
RESIZE_SHRINK_PX = 2
WEBP_QUALITY = 88

_FONT_CANDIDATES = (
    "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
    "/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf",
    "/System/Library/Fonts/Supplemental/Arial.ttf",
)


def _load_font(size: int) -> ImageFont.FreeTypeFont | ImageFont.ImageFont:
    for path in _FONT_CANDIDATES:
        if Path(path).is_file():
            try:
                return ImageFont.truetype(path, size=size)
            except OSError:
                continue
    return ImageFont.load_default()


def _open_image_no_exif(data: bytes) -> Image.Image:
    """Carica, applica orientamento EXIF, restituisce RGB/RGBA senza exif residuo."""
    im = Image.open(BytesIO(data))
    im = ImageOps.exif_transpose(im)
    return im


def _resize_minus_2(im: Image.Image) -> Image.Image:
    w, h = im.size
    nw = max(1, w - RESIZE_SHRINK_PX)
    nh = max(1, h - RESIZE_SHRINK_PX)
    if (nw, nh) == (w, h):
        return im
    return im.resize((nw, nh), Image.Resampling.LANCZOS)


def _ensure_rgba(im: Image.Image) -> Image.Image:
    if im.mode == "RGBA":
        return im
    if im.mode == "P":
        im = im.convert("RGBA")
        return im
    if im.mode in ("RGB", "L", "1"):
        return im.convert("RGBA")
    return im.convert("RGBA")


def _apply_corner_watermark(
    im: Image.Image,
    text: str = WATERMARK_TEXT,
    opacity: float = WATERMARK_OPACITY,
) -> Image.Image:
    """Angolo in basso a destra, opacità su canale alpha (testo bianco)."""
    base = _ensure_rgba(im)
    overlay = Image.new("RGBA", base.size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(overlay)
    w, h = base.size
    margin = max(4, min(w, h) // 64)
    font_size = max(10, min(w, h) // 28)
    font = _load_font(font_size)
    bbox = draw.textbbox((0, 0), text, font=font)
    tw, th = bbox[2] - bbox[0], bbox[3] - bbox[1]
    x = w - tw - margin
    y = h - th - margin
    alpha = max(1, min(255, int(round(255 * opacity))))
    draw.text((x, y), text, font=font, fill=(255, 255, 255, alpha))
    return Image.alpha_composite(base, overlay)


def _save_webp(im: Image.Image, path: Path, *, quality: int = WEBP_QUALITY) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    # WEBP: RGB o RGBA; niente EXIF
    to_save = im
    if to_save.mode not in ("RGB", "RGBA"):
        to_save = to_save.convert("RGBA")
    to_save.save(
        path,
        format="WEBP",
        quality=quality,
        method=6,
    )
    os.chmod(path, 0o600)


def process_raster_bytes(
    data: bytes,
    *,
    watermark: bool,
) -> Image.Image:
    im = _open_image_no_exif(data)
    im = _resize_minus_2(im)
    if watermark:
        im = _apply_corner_watermark(im)
    return im


def _public_base() -> str:
    return os.environ.get("TRAMELLE_CDN_PUBLIC_BASE", "https://cdn.tramelle.com").strip().rstrip("/")


def process_one_seller(
    session,
    seller: dict[str, Any],
    out_root: Path,
    *,
    gallery_max: int = 0,
) -> dict[str, Any]:
    slug = str(seller.get("slug") or "").strip()
    name = str(seller.get("name") or "").strip()
    logo_url = (seller.get("logo_url") or "").strip()
    cover_url = (seller.get("brand_banner_url") or "").strip()
    gallery: list[str] = []
    raw = seller.get("product_image_urls")
    if isinstance(raw, list):
        for u in raw:
            t = str(u or "").strip()
            if t:
                gallery.append(t)

    base = _public_base()
    row: dict[str, Any] = {"slug": slug, "name": name, "errors": []}
    if gallery_max > 0:
        gallery = gallery[:gallery_max]

    if not slug:
        row["errors"].append("missing_slug")
        return row

    token = brand_file_token(name, slug)
    dest_dir = out_root / "partner" / slug
    dest_dir.mkdir(parents=True, exist_ok=True)

    if logo_url:
        try:
            data = download_binary(session, logo_url)
            im = process_raster_bytes(data, watermark=False)
            out = dest_dir / f"logo_{token}.webp"
            _save_webp(im, out)
            row["cdn_logo_path"] = f"partner/{slug}/{out.name}"
            row["cdn_logo_url"] = f"{base}/{row['cdn_logo_path']}"
        except Exception as e:  # noqa: BLE001
            row["errors"].append(f"logo:{e}")
    else:
        row["errors"].append("no_logo_url")

    if cover_url:
        try:
            data = download_binary(session, cover_url)
            im = process_raster_bytes(data, watermark=False)
            out = dest_dir / f"cover_{token}.webp"
            _save_webp(im, out)
            row["cdn_cover_path"] = f"partner/{slug}/{out.name}"
            row["cdn_cover_url"] = f"{base}/{row['cdn_cover_path']}"
        except Exception as e:  # noqa: BLE001
            row["errors"].append(f"cover:{e}")
    else:
        row["errors"].append("no_cover_url")

    story_out: list[str] = []
    for idx, pic_url in enumerate(gallery, start=1):
        try:
            data = download_binary(session, pic_url)
            im = process_raster_bytes(data, watermark=True)
            fname = f"storytelling_{token}-{idx}.webp"
            out = dest_dir / fname
            _save_webp(im, out)
            story_out.append(f"partner/{slug}/{fname}")
        except Exception as e:  # noqa: BLE001
            row["errors"].append(f"storytelling-{idx}:{e}")
    if story_out:
        row["cdn_storytelling_paths"] = story_out
        row["cdn_storytelling_urls"] = [f"{base}/{p}" for p in story_out]

    return row


def _seller_from_json_path(path: Path, slug: str) -> dict[str, Any] | None:
    data = json.loads(path.read_text(encoding="utf-8"))
    sellers = data.get("sellers")
    if not isinstance(sellers, list):
        return None
    for s in sellers:
        if isinstance(s, dict) and str(s.get("slug") or "").strip() == slug:
            return s
    return None


def main() -> None:
    ap = argparse.ArgumentParser(description="Partner immagini → WEBP, EXIF strip, −2px, WM solo gallery.")
    ap.add_argument(
        "--out",
        type=Path,
        default=_DATI_ROOT / "venditori",
        help="Radice output (default: ./venditori → …/partner/<slug>/)",
    )
    ap.add_argument("--slug", type=str, default="", help="Slug partner")
    ap.add_argument("--name", type=str, default="", help="Nome brand (per token file)")
    ap.add_argument("--logo-url", type=str, action="append", default=[], dest="logo_urls")
    ap.add_argument("--cover-url", type=str, action="append", default=[], dest="cover_urls")
    ap.add_argument("--gallery-url", type=str, action="append", default=[], dest="gallery_urls")
    ap.add_argument("--seller-json", type=Path, default=None, help="JSON export con sellers[]")
    ap.add_argument(
        "--first-seller-only",
        action="store_true",
        help="Con --seller-json: elabora solo sellers[0] e genera import a un solo seller (con --write-import-json).",
    )
    ap.add_argument(
        "--write-import-json",
        type=Path,
        default=None,
        metavar="PATH",
        help="Scrive JSON per Medusa con logo/cover/gallery → URL CDN (solo seller elaborati nel run).",
    )
    ap.add_argument("--gallery-max", type=int, default=0, help="Limite immagini gallery (0=tutte)")
    ap.add_argument(
        "--demo-acetaia-malpighi",
        action="store_true",
        help="Scarica scheda Taste19 via Tor e processa un test",
    )
    args = ap.parse_args()
    os.umask(0o077)

    session = require_anonymous_tor_session()

    if args.demo_acetaia_malpighi:
        detail = "https://taste.pittimmagine.com/it/pittimmagine/archive/taste19/exhibitors/A/acetaia-malpighi"
        r = session.get(detail, headers=http_headers(), timeout=request_timeout())
        r.raise_for_status()
        seller = build_marketplace_seller(r.text, detail)
        print(json.dumps({"fetched_keys": list(seller.keys())}, indent=2))
        res = process_one_seller(session, seller, args.out.resolve(), gallery_max=args.gallery_max)
        print(json.dumps(res, indent=2, ensure_ascii=False))
        return

    if args.seller_json and args.first_seller_only:
        data = json.loads(Path(args.seller_json).expanduser().resolve().read_text(encoding="utf-8"))
        sellers = data.get("sellers")
        if not isinstance(sellers, list) or not sellers:
            raise SystemExit("JSON senza sellers[] o lista vuota")
        seller = sellers[0]
        if not isinstance(seller, dict):
            raise SystemExit("sellers[0] non è un oggetto")
        out_root = args.out.expanduser().resolve()
        res = process_one_seller(session, seller, out_root, gallery_max=args.gallery_max)
        print(json.dumps(res, indent=2, ensure_ascii=False))
        manifest = {"partners": [res]}
        if args.write_import_json:
            slim = {
                "metadata": {
                    **(data.get("metadata") or {}),
                    "import_note": "Solo primo seller (test WebP); sorgente non modificata.",
                    "source_readonly_export": str(Path(args.seller_json).resolve()),
                },
                "sellers": [json.loads(json.dumps(seller))],
            }
            merged = merge_cdn_urls_into_sellers(slim, manifest, logos_only=False)
            import_path = Path(args.write_import_json).expanduser().resolve()
            import_path.parent.mkdir(parents=True, exist_ok=True)
            import_path.write_text(
                json.dumps(merged, ensure_ascii=False, indent=2),
                encoding="utf-8",
            )
            os.chmod(import_path, 0o600)
            print(f"Import JSON (1 seller): {import_path}", file=sys.stderr)
        return

    seller: dict[str, Any] | None = None
    if args.seller_json and args.slug:
        seller = _seller_from_json_path(args.seller_json.resolve(), args.slug.strip())
        if not seller:
            raise SystemExit(f"Slug non trovato in JSON: {args.slug}")
    elif args.slug and (args.logo_urls or args.cover_urls or args.gallery_urls):
        seller = {
            "slug": args.slug.strip(),
            "name": args.name.strip() or args.slug.strip().replace("-", " ").title(),
            "logo_url": (args.logo_urls[0] if args.logo_urls else "") or "",
            "brand_banner_url": (args.cover_urls[0] if args.cover_urls else "") or "",
            "product_image_urls": list(args.gallery_urls),
        }
    else:
        ap.print_help()
        raise SystemExit(
            "Usa --demo-acetaia-malpighi oppure (--seller-json --first-seller-only) oppure "
            "(--seller-json + --slug) oppure (--slug + --name + --logo-url/…)."
        )

    res = process_one_seller(session, seller, args.out.resolve(), gallery_max=args.gallery_max)
    print(json.dumps(res, indent=2, ensure_ascii=False))


if __name__ == "__main__":
    main()
