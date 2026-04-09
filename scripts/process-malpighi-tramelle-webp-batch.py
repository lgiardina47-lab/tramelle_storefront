#!/usr/bin/env python3
"""
Batch: Acetaia Malpighi → WebP per Tramelle (crop 2px, contrast 1.03, IPTC/XMP via exiftool).
"""
from __future__ import annotations

import subprocess
import sys
from pathlib import Path

from PIL import Image, ImageEnhance

CROP_PX = 2
CONTRAST_FACTOR = 1.03

BRAND_COPYRIGHT = "Acetaia Malpighi"
DESCRIPTION = (
    "Official imagery of Acetaia Malpighi. Optimized for Tramelle Marketplace."
)


def process_image(src: Path, dst: Path, webp_quality: int) -> None:
    with Image.open(src) as im:
        im = im.convert("RGB")
        w, h = im.size
        if w <= 2 * CROP_PX or h <= 2 * CROP_PX:
            raise ValueError(f"{src}: troppo piccola per crop {CROP_PX}px per lato")
        im = im.crop((CROP_PX, CROP_PX, w - CROP_PX, h - CROP_PX))
        im = ImageEnhance.Contrast(im).enhance(CONTRAST_FACTOR)
        dst.parent.mkdir(parents=True, exist_ok=True)
        im.save(dst, "WEBP", quality=webp_quality, method=6)


def write_metadata(path: Path) -> None:
    subprocess.run(
        [
            "exiftool",
            "-overwrite_original",
            "-q",
            "-charset",
            "filename=utf8",
            f"-IPTC:CopyrightNotice={BRAND_COPYRIGHT}",
            f"-IPTC:By-line={BRAND_COPYRIGHT}",
            f"-IPTC:Credit={BRAND_COPYRIGHT}",
            f"-IPTC:Caption-Abstract={DESCRIPTION}",
            f"-XMP-dc:Rights={BRAND_COPYRIGHT}",
            f"-XMP-dc:Creator={BRAND_COPYRIGHT}",
            f"-XMP-photoshop:Credit={BRAND_COPYRIGHT}",
            f"-XMP-dc:Description={DESCRIPTION}",
            f"-Artist={BRAND_COPYRIGHT}",
            f"-Copyright={BRAND_COPYRIGHT}",
            str(path),
        ],
        check=True,
    )


def main() -> int:
    repo = Path(__file__).resolve().parents[1]
    input_dir = (
        repo
        / "dati_venditori"
        / "partner_media_out"
        / "partner"
        / "acetaia-malpighi"
        / "original"
    )
    out_dir = Path("/output_tramelle_minimal/test")

    jobs: list[tuple[str, str, int]] = [
        (
            "logo_acetaia_malpighi.jpg",
            "logo-acetaia-malpighi-emilia-romagna-italy-tramelle.webp",
            90,
        ),
        (
            "cover_acetaia_malpighi.jpg",
            "cover-acetaia-malpighi-emilia-romagna-italy-tramelle.webp",
            85,
        ),
    ]
    for n in range(1, 7):
        jobs.append(
            (
                f"storytelling_acetaia_malpighi-{n}.jpg",
                f"acetaia-malpighi-storytelling-{n}-emilia-romagna-italy-tramelle.webp",
                85,
            )
        )

    for src_name, dst_name, q in jobs:
        src = input_dir / src_name
        if not src.is_file():
            print(f"SKIP mancante: {src}", file=sys.stderr)
            continue
        dst = out_dir / dst_name
        process_image(src, dst, q)
        write_metadata(dst)
        print(dst)

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
