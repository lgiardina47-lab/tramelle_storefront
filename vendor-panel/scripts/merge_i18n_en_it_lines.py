#!/usr/bin/env python3
"""
Accoppia struttura (--ref) con valori (--it). Con un solo file it.json nel repo
Tramelle, default: ref e it puntano entrambi a it.json (operazione idempotente).

Uso (da vendor-panel):
  python3 scripts/merge_i18n_en_it_lines.py
  python3 scripts/merge_i18n_en_it_lines.py --ref PATH --it PATH --out PATH
"""
from __future__ import annotations

import argparse
import json
from pathlib import Path


def blit(en_node: object, it_node: object) -> object:
    if isinstance(en_node, dict):
        it_d = it_node if isinstance(it_node, dict) else {}
        out: dict[str, object] = {}
        used_it: set[str] = set()
        for k in en_node:
            if k in it_d:
                out[k] = blit(en_node[k], it_d[k])
                used_it.add(k)
        rem_en = [k for k in en_node if k not in out]
        rem_it = [k for k in it_d if k not in used_it]
        for i, k in enumerate(rem_en):
            v = it_d[rem_it[i]] if i < len(rem_it) else None
            out[k] = blit(en_node[k], v)
        return out
    if isinstance(en_node, list):
        it_l = it_node if isinstance(it_node, list) else []
        return [
            blit(en_node[i], it_l[i] if i < len(it_l) else None)
            for i in range(len(en_node))
        ]
    if isinstance(en_node, str):
        return it_node if isinstance(it_node, str) else en_node
    if it_node is not None and type(it_node) is type(en_node):
        return it_node
    return en_node


def main() -> int:
    root = Path(__file__).resolve().parent.parent
    ap = argparse.ArgumentParser()
    ap.add_argument(
        "--ref",
        "--en",
        dest="ref",
        type=Path,
        default=root / "src/i18n/translations/it.json",
        help="file struttura di riferimento (default: it.json). --en è alias deprecato.",
    )
    ap.add_argument("--it", type=Path, default=root / "src/i18n/translations/it.json")
    ap.add_argument("--out", type=Path, default=None)
    args = ap.parse_args()
    out = args.out or args.it

    en = json.loads(args.ref.read_text(encoding="utf-8"))
    it = json.loads(args.it.read_text(encoding="utf-8"))
    merged = blit(en, it)
    out.write_text(
        json.dumps(merged, indent=2, ensure_ascii=False) + "\n",
        encoding="utf-8",
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
