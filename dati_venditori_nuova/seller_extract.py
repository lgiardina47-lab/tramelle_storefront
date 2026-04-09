"""
Estrazione seller da HTML della **pagina dettaglio** (URL tipo …/exhibitors/L/slug),
aperta con GET: non usare solo il listing.

- **Company profile**: testo nel blocco brand (ciò che in pagina è sotto «Company Profile»),
  markup `.brandInfo-text-component-text`.
- **Tab scheda (tag)**: `#panel-tag-merceology`, `#panel-tag-certification`, `#panel-tag-otherMerceology`.
- **Merceology — menu listing**: opzionale `merceology_menu_context_by_id` (`section_menu_title` da
  `label.filter-accordion-label`, `parent_menu_title` da `button.subcategory`). Se assente, si usa il
  fallback in `data/merceology_menu_context_<Txx>.json` (chiave dedotta da link `/fairs/Txx/` nel HTML
  o da `…/archive/tasteXX/` nell’URL) così **resta sempre la categoria padre** del filtro laterale.

`listing_country` arriva dalla card listing (`p.box-card-body-country`), non dalla scheda dettaglio.

Logo, hero: come in scheda. **Gallery prodotti** (`product_image_urls`): solo URL Cloudinary
`…/EPITTI/TASTE/…/pre/…/lookbook…/` provenienti dalle slide (lookbook / lookbook2), non altre cartelle.

**Gallery / varianti HTML:** `window.pittiEco.loggedIn` nel sorgente **non** equivale necessariamente
a «account My Pitti»: è un flag che il **server** imposta insieme a un markup più corto o più lungo.
Le richieste «fredde» (Tor, `requests`, `curl`, Playwright senza cookie Pitti da sessione reale) su
questa scheda ricevono spesso `loggedIn: false` e meno URL lookbook nel HTML; il resto **non** è nel
sorgente, quindi scroll/carousel non lo fanno comparire. Un “Salva pagina” dal browser può contenere
molte più immagini se in quella sessione il server aveva risposto con variante estesa (`loggedIn: true`).
`build_marketplace_seller` produce un JSON **minimo** (solo contenuti utili all’import).
"""

from __future__ import annotations

import html as html_lib
import json
import re
from pathlib import Path
from typing import Any, Dict, Iterable, List, Optional, Set, Tuple
from urllib.parse import parse_qs, unquote, urljoin, urlparse

from bs4 import BeautifulSoup
from bs4.element import Tag

from taste_config import ARCHIVE_SEGMENT, TASTE_HOST

_MERCEOLOGY_BUILTIN_DIR = Path(__file__).resolve().parent / "data"
_FAIR_CODE_IN_HTML = re.compile(r"/fairs/([^/]+)/exhibitors", re.I)
_ARCHIVE_TASTE_N = re.compile(r"/archive/taste(\d+)/", re.I)


def _null_if_empty(value: Optional[str]) -> Optional[str]:
    """None in JSON per stringhe assenti o solo spazi."""
    if value is None:
        return None
    t = str(value).strip()
    return t if t else None


def _clean_pitti_quote_artifacts(value: Optional[str]) -> Optional[str]:
    """
    Toglie solo la virgoletta di **chiusura** del CMS (`."` prima di a capo o a fine testo).
    Le virgolette **iniziali** (`"Corte del…`) restano come sul sito.
    Se il sorgente porta sequenze letterali `\\"`, le normalizza in `"`.
    """
    t = _null_if_empty(value)
    if not t:
        return None
    for _ in range(8):
        if '\\"' not in t:
            break
        t = t.replace('\\"', '"')
    t = re.sub(r'\."\n(\n*)', r'.\n\1', t)
    t = re.sub(r'\."\s*$', ".", t)
    return _null_if_empty(t.strip())


# `div.hero-media` → background-image: url('//...')
_HERO_BACKGROUND_IMAGE_URL = re.compile(
    r"background-image\s*:\s*url\s*\(\s*['\"]?([^'\"\)]+)['\"]?\s*\)",
    re.I,
)

# Stesso file su Cloudinary: `w_auto` vs `w_600` ecc. — dedup mantenendo la variante «più piena».
_CLOUDINARY_EPITTI_ASSET_KEY = re.compile(r"/v\d+/(EPITTI/.+)$", re.I)


def _cloudinary_gallery_dedup_key(abs_url: str) -> str:
    m = _CLOUDINARY_EPITTI_ASSET_KEY.search(abs_url.replace("\\", "/"))
    return m.group(1).lower() if m else abs_url.lower()


def _prefer_richer_cloudinary_url(a: str, b: str) -> str:
    """Preferisci URL con `w_auto` rispetto a larghezze fisse."""
    a_auto, b_auto = "w_auto" in a, "w_auto" in b
    if a_auto and not b_auto:
        return a
    if b_auto and not a_auto:
        return b
    return a


def _urls_from_srcset(srcset: str) -> list[str]:
    """Estrae URL da `srcset` (prima colonna di ogni voce)."""
    out: list[str] = []
    for part in (srcset or "").split(","):
        p = part.strip().split()
        if not p:
            continue
        raw = p[0].strip()
        if raw:
            out.append(raw)
    return out


def _is_product_gallery_media_url(abs_u: str) -> bool:
    """
    Solo immagini **lookbook** delle slide gallery (…/lookbook/, lookbook2/, …),
    sotto `EPITTI/TASTE/…/pre/…`. Esclude loghi, hero, corporate/partner, news, immagini “flat” in …/pre/X/brand/file.jpg.
    """
    if not abs_u or "media.pittimmagine.com" not in abs_u:
        return False
    u = unquote(abs_u)
    ul = u.upper()
    if "/BRANDLOGOS/" in ul:
        return False
    if "HEROBANNER" in ul:
        return False
    if "/CORPORATE/" in ul:
        return False
    if "ICONE" in ul and "CALENDARIO" in ul:
        return False
    if "FOOTER_SITO" in ul or "_FOOTER_" in ul:
        return False
    if "/EPITTI/TASTE/" not in ul:
        return False
    if re.search(r"/news/", u, re.I):
        return False
    if "/LOOKBOOK" not in ul:
        return False
    return True


def _merge_product_gallery_url(
    raw: str,
    base: str,
    key_to_url: Dict[str, str],
    order: List[str],
) -> None:
    if not raw or raw.startswith("data:"):
        return
    if "R0lGODlhAQAB" in raw:
        return
    abs_u = _abs_url(raw.strip(), base)
    if not abs_u or not _is_product_gallery_media_url(abs_u):
        return
    key = _cloudinary_gallery_dedup_key(abs_u)
    if key not in key_to_url:
        order.append(key)
        key_to_url[key] = abs_u
    else:
        key_to_url[key] = _prefer_richer_cloudinary_url(key_to_url[key], abs_u)


# `lookbook`, `lookbook2`, eventuali `lookbookN` usati da Pitti; estensioni comuni su Cloudinary.
_LOOKBOOK_MEDIA_URL_SCAN = re.compile(
    r"(?:https?:)?//media\.pittimmagine\.com/image/upload/[^\s\"'<>?]+"
    r"/EPITTI/TASTE/\d+_\d+/pre/[A-Za-z0-9]/[^/\"'?\s]+/lookbook\d*/"
    r"[^\s\"'<>?]+\.(?:jpe?g|png|webp|gif)",
    re.I,
)


def _supplement_urls_from_raw_html(
    raw_html: str,
    base: str,
    key_to_url: Dict[str, str],
    order: List[str],
) -> None:
    """
    Passaggio sul **sorgente grezzo**: ogni URL Cloudinary `.../lookbook`, `lookbook2`, … (`lookbook\\d*`)
    sotto `EPITTI/TASTE/.../pre/<lettera>/…` (anche cartelle diverse sulla stessa pagina,
    script inline, ecc.). Senza limitarci a una sola cartella dedotta dal primo match.
    """
    if not raw_html:
        return
    for m in _LOOKBOOK_MEDIA_URL_SCAN.finditer(raw_html):
        raw = m.group(0)
        if raw.startswith("//"):
            raw = "https:" + raw
        if not raw.startswith("http"):
            continue
        _merge_product_gallery_url(raw, base, key_to_url, order)


# Host da escludere quando si cerca il «sito aziendale» (social / portale fiera / …)
_EXCLUDED_WEBSITE_HOSTS: Tuple[str, ...] = (
    "instagram.com",
    "facebook.com",
    "fb.com",
    "twitter.com",
    "x.com",
    "linkedin.com",
    "youtube.com",
    "youtu.be",
    "pittimmagine.com",
    "pittiimmagine.com",
    "taste.pittimmagine.com",
    "www.pittimmagine.com",
)


def _hostname_key(netloc: str) -> str:
    h = (netloc or "").lower()
    if h.startswith("www."):
        return h[4:]
    return h


def _is_company_website_host(netloc: str) -> bool:
    key = _hostname_key(netloc)
    if not key:
        return False
    for ex in _EXCLUDED_WEBSITE_HOSTS:
        if key == ex or key.endswith("." + ex):
            return False
    return True


def _normalize_website_url(href: str) -> Optional[str]:
    h = (href or "").strip()
    if not h or h.startswith("#"):
        return None
    if h.startswith("//"):
        h = "https:" + h
    if h.startswith("www."):
        h = "https://" + h
    parsed = urlparse(h)
    if not parsed.netloc:
        return None
    if parsed.scheme not in ("http", "https"):
        return None
    # preferisci https
    scheme = "https" if parsed.scheme == "http" else parsed.scheme
    return f"{scheme}://{parsed.netloc}{parsed.path or ''}" + (
        f"?{parsed.query}" if parsed.query else ""
    ) + (f"#{parsed.fragment}" if parsed.fragment else "")


def extract_company_profile_from_brand_block(soup: BeautifulSoup) -> Optional[str]:
    """
    Testo integrale del blocco Company Profile: `div.brandInfo-text-component-text.plain`
    (stesso HTML del sito, con `<br>` → a capo e entità tipo &amp; decodificate).
    """
    comp = soup.select_one(".brandInfo-text-component")
    if not comp:
        return None
    text_el = comp.select_one(".brandInfo-text-component-text.plain") or comp.select_one(
        ".brandInfo-text-component-text"
    )
    if not text_el:
        return None
    # Clona così non modifichiamo il soup usato dopo per logo/immagini.
    clone = BeautifulSoup(str(text_el), "html.parser")
    for br in clone.find_all("br"):
        br.replace_with("\n")
    raw = clone.get_text()
    raw = html_lib.unescape(raw)
    # Solo trim globale: niente strip per-pezzo che può accorciare il testo.
    raw = raw.strip()
    return _clean_pitti_quote_artifacts(raw)


def extract_website_url_and_domain(soup: BeautifulSoup, profile_text: Optional[str]) -> tuple[Optional[str], Optional[str]]:
    """
    Link sito dal box ufficiale sotto il profilo; fallback URL nel testo profilo.
    Ritorna (url_canonico_https, dominio senza scheme, es. alturis.it).
    """
    links_box = soup.select_one(".brandInfo-text-component-links")
    if links_box:
        for a in links_box.select("a[href]"):
            href = (a.get("href") or "").strip()
            cand = _normalize_website_url(href)
            if not cand:
                continue
            netloc = urlparse(cand).netloc
            if _is_company_website_host(netloc):
                dom = _hostname_key(netloc)
                return cand, dom or None

    if profile_text:
        for m in re.finditer(
            r"(https?://[^\s<>)\"']+|www\.[^\s<>)\"']+)",
            profile_text,
            flags=re.I,
        ):
            raw = m.group(1).rstrip(".,;:)")
            cand = _normalize_website_url(raw)
            if cand and _is_company_website_host(urlparse(cand).netloc):
                dom = _hostname_key(urlparse(cand).netloc)
                return cand, dom or None

    return None, None


def _abs_url(url: str, base: str = TASTE_HOST) -> Optional[str]:
    if not url or url.startswith("data:"):
        return None
    u = url.strip()
    if u.startswith("//"):
        return "https:" + u
    if u.startswith("/"):
        return urljoin(base, u)
    if u.startswith("http"):
        return u
    return urljoin(base, u)


def _img_raw_for_logo(img: Tag) -> str:
    """Preferisci `data-src` Cloudinary BRANDLOGOS (salvataggio pagina reindirizza `src` su file locale)."""
    attrs: Tuple[Tuple[str, ...], ...] = (
        ("data-src", "data-lazy-src", "src"),
        ("src", "data-src", "data-lazy-src"),
    )
    chunks = []
    for key in ("data-src", "data-lazy-src", "src"):
        v = (img.get(key) or "").strip()
        if v:
            chunks.append(v)
    for group in attrs:
        for key in group:
            v = (img.get(key) or "").strip()
            if not v or v.startswith("data:") or "thumb-hexagon" in v or "dropdown-icon" in v:
                continue
            if "BRANDLOGOS" in v.upper():
                return v
    for v in chunks:
        if v.startswith("//") or "media.pittimmagine.com" in v:
            return v
    return chunks[0] if chunks else ""


def extract_logo_url(soup: BeautifulSoup, base: str = TASTE_HOST) -> Optional[str]:
    """Logo espositore (Cloudinary BRANDLOGOS), esclude icone header sito."""
    for sel in ("div.brand-generalInfo-logo img", ".brand-generalInfo-logo img"):
        hint = soup.select_one(sel)
        if hint and hint.name == "img":
            raw = _img_raw_for_logo(hint)
            if "logo_PI_" in raw or "/taste.svg" in raw:
                pass
            elif raw:
                abs_u = _abs_url(raw, base)
                if abs_u and "BRANDLOGOS" in abs_u.upper():
                    return abs_u

    best = None
    for img in soup.select(
        'img[src*="BRANDLOGOS"], img[data-src*="BRANDLOGOS"], '
        'img[src*="brandlog"], img[data-src*="brandlog"], '
        '[class*="logo"] img'
    ):
        raw = _img_raw_for_logo(img)
        if not raw or "thumb-hexagon" in raw or "dropdown-icon" in raw:
            continue
        if "logo_PI_" in raw or "/taste.svg" in raw or "/uomo.svg" in raw or "/bimbo.svg" in raw:
            continue
        abs_u = _abs_url(raw, base)
        if abs_u and "BRANDLOGOS" in abs_u.upper():
            return abs_u
        if abs_u and best is None and "/EPITTI/" in abs_u:
            best = abs_u
    return best


_GALLERY_PARENT_HINTS = (
    "brandcatalog-wrapper",
    "br-gallery",
    "picture-card-image",
    "custom-carousel",
    "mediagallery-highlight",
)


def _is_gallery_image_element(el: Tag) -> bool:
    """Vero se l’`img`/`source` sta sotto stand o blocchi carousel (come dopo il CTA curtain)."""
    p: Optional[Tag] = el
    for _ in range(28):
        if p is None:
            return False
        if p.name == "section" and p.get("id") == "section-stand":
            return True
        cls = " ".join(p.get("class") or ()).lower()
        if any(h in cls for h in _GALLERY_PARENT_HINTS):
            return True
        p = p.parent
    return False


def _stand_curtain_login_button(soup: BeautifulSoup) -> Optional[Tag]:
    """
    Bottone «Vedi di più» / login che apre #login-form e precede `section#section-stand`
    (blocco espositore dopo il curtain).
    """
    first_stand = soup.select_one("section#section-stand")
    if not first_stand:
        return None
    btn = first_stand.find_previous("button", attrs={"data-option-element": "#login-form"})
    if btn and (btn.get("data-component") or "") == "ModalTriggerComponent":
        return btn
    return None


def _merge_images_after_curtain_button(
    curtain: Tag,
    base: str,
    key_to_url: Dict[str, str],
    order: List[str],
    *,
    max_following_tags: Optional[int] = None,
) -> None:
    """Immagini nel DOM **dopo** il CTA curtain, solo in contesti gallery/stand."""
    n = 0
    for el in curtain.find_all_next(["img", "source"]):
        n += 1
        if max_following_tags is not None and n > max_following_tags:
            break
        if not _is_gallery_image_element(el):
            continue
        if el.name == "img":
            for attr in ("data-src", "src"):
                raw = (el.get(attr) or "").strip()
                if raw:
                    _merge_product_gallery_url(raw, base, key_to_url, order)
            for raw in _urls_from_srcset(el.get("srcset") or ""):
                _merge_product_gallery_url(raw, base, key_to_url, order)
        else:
            for raw in _urls_from_srcset(el.get("srcset") or ""):
                _merge_product_gallery_url(raw, base, key_to_url, order)


def _gallery_wrappers_in_scope(root: Tag) -> list[Tag]:
    """Blocchi carousel catalogo dentro un contenitore (es. `section#section-stand`)."""
    ws = root.select("div.brandCatalog-wrapper.js-wrapper-carousel-gallery")
    if ws:
        return ws
    ws = root.select("div.brandCatalog-wrapper")
    if ws:
        return ws
    return [root]


def _merge_explicit_br_carousel_images(
    soup: BeautifulSoup,
    base: str,
    key_to_url: Dict[str, str],
    order: List[str],
) -> None:
    """
    Carousel ufficiale scheda: `div.custom-carousel.br-gallery-container`
    (`data-component="CarouselComponentSlick"`) con slide `.slick-elem.br-gallery-item`.

    Passaggio dedicato (oltre ai wrapper `.brandCatalog-*`) così non dipendiamo solo dal
    nesting generico e il markup coincide con DevTools.

    Alcune schede (es. Pasticceria Mearini) ripetono **più** `section#section-stand`: un
    solo `#section-stand` in CSS prenderebbe solo il primo blocco — qui iteriamo tutte le
    sezioni omonime, più il fallback globale sui wrapper carousel.
    """
    seen: Set[int] = set()

    def _take_el(el: Tag) -> None:
        sid = id(el)
        if sid in seen:
            return
        seen.add(sid)
        if el.name == "img":
            for attr in ("data-src", "src"):
                raw = (el.get(attr) or "").strip()
                if raw:
                    _merge_product_gallery_url(raw, base, key_to_url, order)
            for raw in _urls_from_srcset(el.get("srcset") or ""):
                _merge_product_gallery_url(raw, base, key_to_url, order)
        elif el.name == "source":
            for raw in _urls_from_srcset(el.get("srcset") or ""):
                _merge_product_gallery_url(raw, base, key_to_url, order)

    for stand in soup.select("section#section-stand"):
        for el in stand.select(".custom-carousel.br-gallery-container img, .slick-elem.br-gallery-item img"):
            _take_el(el)
        for el in stand.select(".custom-carousel.br-gallery-container picture source[srcset]"):
            _take_el(el)
    for sel in (
        "div.brandCatalog-wrapper.js-wrapper-carousel-gallery .custom-carousel.br-gallery-container img",
        "div.brandCatalog-wrapper.js-wrapper-carousel-gallery .slick-elem.br-gallery-item img",
    ):
        for el in soup.select(sel):
            _take_el(el)


def _merge_images_from_wrappers(
    wrappers: Iterable[Tag],
    base: str,
    key_to_url: Dict[str, str],
    order: List[str],
) -> None:
    for wrapper in wrappers:
        for el in wrapper.select("img, picture source[srcset], source[srcset]"):
            if el.name == "img":
                for attr in ("data-src", "src"):
                    raw = (el.get(attr) or "").strip()
                    if raw:
                        _merge_product_gallery_url(raw, base, key_to_url, order)
                for raw in _urls_from_srcset(el.get("srcset") or ""):
                    _merge_product_gallery_url(raw, base, key_to_url, order)
            else:
                for raw in _urls_from_srcset(el.get("srcset") or ""):
                    _merge_product_gallery_url(raw, base, key_to_url, order)


def extract_product_image_urls(
    soup: BeautifulSoup,
    base: str = TASTE_HOST,
    *,
    raw_html: Optional[str] = None,
) -> list[str]:
    """
    Gallery scheda **dopo** il CTA curtain (`button[data-option-element=\"#login-form\"]` che precede lo stand):
    tutti `img`/`source` in seguito nel DOM sotto `#section-stand` / carousel / mediagallery-slider.

    Se il bottone non c’è: fallback su tutte le `section#section-stand` (wrapper `.brandCatalog-*`).
    Il supplement su `raw_html` recupera URL lookbook citati nel sorgente. Quanto non è nel HTML resta
    fuori portata (lazy solo lato browser → servirebbe automazione).

    Nota: se in pagina compare «Sblocca i contenuti effettuando il login», il server può
    inviare meno slide di quelle visibili con sessione autenticata: si estraggono solo gli
    `img` presenti nell’HTML ricevuto.
    """
    key_to_url: Dict[str, str] = {}
    order: List[str] = []
    _merge_explicit_br_carousel_images(soup, base, key_to_url, order)
    curtain = _stand_curtain_login_button(soup)
    if curtain:
        _merge_images_after_curtain_button(curtain, base, key_to_url, order)
    stands = soup.select("section#section-stand")
    if stands:
        for stand in stands:
            _merge_images_from_wrappers(_gallery_wrappers_in_scope(stand), base, key_to_url, order)
    else:
        _merge_images_from_wrappers(_gallery_wrappers_in_scope(soup), base, key_to_url, order)
    blob = raw_html if raw_html is not None else str(soup)
    _supplement_urls_from_raw_html(blob, base, key_to_url, order)
    return [key_to_url[k] for k in order]


def extract_brand_banner_url(soup: BeautifulSoup, base: str = TASTE_HOST) -> Optional[str]:
    """
    Immagine hero della scheda: `div.hero-media` (stile background-image), come nel markup Taste.
    Se manca, fallback su `og:image`.
    """
    for el in soup.select("div.hero-media"):
        st = (el.get("style") or "").strip()
        if not st:
            continue
        m = _HERO_BACKGROUND_IMAGE_URL.search(st)
        if m:
            u = _abs_url(m.group(1).strip(), base)
            if u:
                return u
    tag = soup.find("meta", attrs={"property": "og:image"})
    if tag and tag.get("content"):
        return _abs_url(tag["content"].strip(), base)
    return None


def extract_tag_panel_items(
    soup: BeautifulSoup,
    panel_id: str,
    query_key: str,
    id_json_key: str,
    base: str = TASTE_HOST,
) -> list[dict[str, Any]]:
    """
    Link `a.tag-item` dentro un `#panel-tag-*` della scheda; id da `?query_key=`.
    """
    panel = soup.select_one(f"#{panel_id}")
    if not panel:
        return []
    items: list[dict[str, Any]] = []
    seen: Set[Tuple[str, str]] = set()
    for a in panel.select("a.tag-item[href]"):
        href = (a.get("href") or "").strip()
        label = html_lib.unescape(a.get_text(strip=True))
        if not label and a.get("data-galabel"):
            label = html_lib.unescape(str(a.get("data-galabel")).strip())
        full = urljoin(base, href) if href.startswith("/") else href
        fid: Optional[str] = None
        try:
            q = parse_qs(urlparse(full).query)
            raw = q.get(query_key, [None])[0]
            if raw is not None:
                fid = str(raw)
        except Exception:
            fid = None
        key = (fid or "", label)
        if not label or key in seen:
            continue
        seen.add(key)
        sh = _abs_url(href, base) if href.startswith("/") else full
        items.append(
            {
                id_json_key: fid,
                "label": label,
                "source_href": sh,
            }
        )
    return items


def infer_merceology_builtin_map_key(raw_html: str, detail_url: str) -> Optional[str]:
    """
    Codice fiera per file `data/merceology_menu_context_<KEY>.json` (es. T18).
    Preferisce link `…/fairs/T18/exhibitors` nei tag della scheda; altrimenti `…/archive/taste18/…`.
    """
    for m in _FAIR_CODE_IN_HTML.finditer(raw_html or ""):
        key = m.group(1).strip().upper()
        if key:
            return key
    m = _ARCHIVE_TASTE_N.search(detail_url or "")
    if m:
        return f"T{m.group(1)}"
    return None


def load_builtin_merceology_menu_context_by_id(map_key: str) -> dict[str, Any]:
    """Mappa id → `{section_menu_title, parent_menu_title}` da JSON in repository (senza rete)."""
    path = _MERCEOLOGY_BUILTIN_DIR / f"merceology_menu_context_{map_key}.json"
    if not path.is_file():
        return {}
    try:
        raw = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return {}
    if not isinstance(raw, dict):
        return {}
    return raw


def merge_merceology_menu_contexts(
    builtin: Optional[dict[str, Any]],
    override: Optional[dict[str, Any]],
) -> Optional[dict[str, Any]]:
    """Unione contesti: `override` (es. listing appena scaricato) prevale su `builtin` per stesso id."""
    if not builtin and not override:
        return None
    out: dict[str, Any] = {}
    if builtin:
        out.update(builtin)
    if override:
        out.update(override)
    return out


def _enrich_merceologies_with_menu_context(
    items: Optional[list[dict[str, Any]]],
    context_by_id: Optional[dict[str, Any]],
) -> Optional[list[dict[str, Any]]]:
    """
    Aggiunge `section_menu_title` e `parent_menu_title` dalla mappa listing.
    Accetta anche formato legacy `dict[id, str]` (solo parent, sezione null).
    """
    if not items:
        return items
    out: list[dict[str, Any]] = []
    for it in items:
        d = dict(it)
        mid = d.get("merceology_id")
        key = str(mid) if mid is not None else ""
        ctx: Any = context_by_id.get(key) if context_by_id and key else None
        if isinstance(ctx, dict):
            d["section_menu_title"] = ctx.get("section_menu_title")
            d["parent_menu_title"] = ctx.get("parent_menu_title")
        elif isinstance(ctx, str):
            d["section_menu_title"] = None
            d["parent_menu_title"] = ctx if ctx else None
        else:
            d["section_menu_title"] = None
            d["parent_menu_title"] = None
        out.append(d)
    return out


def extract_detail_all_tag_filters(soup: BeautifulSoup, base: str = TASTE_HOST) -> dict[str, list[dict[str, Any]]]:
    """Tre tab possibili sulla scheda (solo quelle presenti in HTML)."""
    return {
        "merceologies": extract_tag_panel_items(
            soup, "panel-tag-merceology", "merceologies", "merceology_id", base
        ),
        "certifications": extract_tag_panel_items(
            soup, "panel-tag-certification", "certifications", "certification_id", base
        ),
        "other_company_products": extract_tag_panel_items(
            soup, "panel-tag-otherMerceology", "otherMerceologies", "other_merceology_id", base
        ),
    }


def extract_merceologia_filters(soup: BeautifulSoup, base: str = TASTE_HOST) -> list[dict[str, Any]]:
    """Solo pannello merceologia (retrocompatibilità)."""
    return extract_tag_panel_items(
        soup, "panel-tag-merceology", "merceologies", "merceology_id", base
    )


def extract_company_text(soup: BeautifulSoup) -> dict[str, Optional[str]]:
    og_title = None
    og_desc = None
    tag = soup.find("meta", attrs={"property": "og:title"})
    if tag and tag.get("content"):
        og_title = _null_if_empty(html_lib.unescape(tag["content"].strip()))
    tag = soup.find("meta", attrs={"property": "og:description"})
    if tag and tag.get("content"):
        og_desc = _clean_pitti_quote_artifacts(html_lib.unescape(tag["content"].strip()))

    brand = None
    for h2 in soup.find_all("h2"):
        t = h2.get_text(strip=True)
        if not t or "featured" in t.lower():
            continue
        brand = _null_if_empty(html_lib.unescape(t))
        break

    company_profile = extract_company_profile_from_brand_block(soup)

    website_url, website_domain = extract_website_url_and_domain(soup, company_profile)

    name = _null_if_empty(brand) or og_title
    return {
        "name": name,
        "short_description": og_desc,
        "company_profile": company_profile,
        "website_url": website_url,
        "website_domain": website_domain,
    }


def slug_letter_from_detail_url(detail_url: str) -> Tuple[Optional[str], Optional[str]]:
    path = urlparse(detail_url).path.rstrip("/").split("/")
    if len(path) >= 2:
        return _null_if_empty(path[-1]), _null_if_empty(path[-2])
    return None, None


_ARCHIVE_SEGMENT_FROM_URL = re.compile(r"/archive/([^/]+)/exhibitors", re.I)

_PITTI_LOGGED_IN = re.compile(r"loggedIn\s*:\s*(true|false)\b", re.I)


def extract_pitti_session_context(raw_html: str) -> dict[str, Any]:
    """
    Legge `window.pittiEco` nel sorgente HTML: `loggedIn` correlato alla variante di pagina che il
    server ha generato (markup corto vs esteso), non necessariamente al login utente.
    """
    m = _PITTI_LOGGED_IN.search(raw_html or "")
    logged_in: Optional[bool] = None
    if m:
        logged_in = m.group(1).lower() == "true"
    out: dict[str, Any] = {"logged_in": logged_in}
    if logged_in is False:
        out["anonymous_gallery_truncation_expected"] = True
        out["gallery_note_it"] = (
            "Questo HTML ha `loggedIn: false`: il server ha incluso nel sorgente solo un sottoinsieme "
            "delle immagini catalogo (tipico di fetch Tor/GET senza gli stessi cookie/client con cui apri "
            "il sito a mano). Le altre URL non compaiono nel DOM iniziale: non estraribili con scroll/JS. "
            "Se in Chrome vedi più foto, controlla nel sorgente salvato se c’è `loggedIn: true`: è "
            "un’altra variante di risposta, anche senza password se il browser aveva cookie Pitti."
        )
    elif logged_in is True:
        out["anonymous_gallery_truncation_expected"] = False
    return out


def archive_segment_from_detail_url(detail_url: str) -> Optional[str]:
    """Es. `.../archive/taste17/exhibitors/...` → `taste17`."""
    m = _ARCHIVE_SEGMENT_FROM_URL.search(detail_url or "")
    return _null_if_empty(m.group(1)) if m else None


def _slim_filter_rows(
    rows: Optional[list[dict[str, Any]]],
    id_key: str,
) -> Optional[list[dict[str, Any]]]:
    if not rows:
        return None
    out: list[dict[str, Any]] = []
    for r in rows:
        item: dict[str, Any] = {}
        rid = r.get(id_key)
        if rid is not None and rid != "":
            item[id_key] = rid
        lab = r.get("label")
        if lab:
            item["label"] = lab
        parent = r.get("parent_menu_title")
        if parent:
            item["parent_menu_title"] = parent
        if item:
            out.append(item)
    return out or None


def _marketplace_doc_omit_empty(doc: dict[str, Any]) -> dict[str, Any]:
    """Rimuove chiavi None, liste vuote e dict vuoti (JSON più compatto)."""
    cleaned: dict[str, Any] = {}
    for k, v in doc.items():
        if v is None:
            continue
        if v == []:
            continue
        if v == {}:
            continue
        cleaned[k] = v
    return cleaned


def build_marketplace_seller(
    html: str,
    detail_url: str,
    *,
    listing_card_text: Optional[str] = None,
    listing_country: Optional[str] = None,
    merceology_menu_context_by_id: Optional[dict[str, Any]] = None,
) -> dict[str, Any]:
    """
    `html` deve essere il body della **scheda dettaglio** (`detail_url`), non la pagina elenco.
    """
    soup = BeautifulSoup(html, "html.parser")
    slug, letter = slug_letter_from_detail_url(detail_url)
    texts = extract_company_text(soup)
    tab_filters = extract_detail_all_tag_filters(soup)
    pics = extract_product_image_urls(soup, raw_html=html)

    merce = tab_filters["merceologies"]
    map_key = infer_merceology_builtin_map_key(html, detail_url)
    builtin_ctx = load_builtin_merceology_menu_context_by_id(map_key) if map_key else {}
    merged_merce_ctx = merge_merceology_menu_contexts(builtin_ctx, merceology_menu_context_by_id)
    merce = _enrich_merceologies_with_menu_context(merce, merged_merce_ctx)

    if listing_card_text is None:
        listing_out: Optional[str] = None
    else:
        listing_out = _null_if_empty(html_lib.unescape(str(listing_card_text)))

    seg = archive_segment_from_detail_url(detail_url) or ARCHIVE_SEGMENT

    filters: dict[str, Any] = {}
    sm = _slim_filter_rows(merce if merce else None, "merceology_id")
    sc = _slim_filter_rows(
        tab_filters["certifications"] if tab_filters["certifications"] else None,
        "certification_id",
    )
    so = _slim_filter_rows(
        tab_filters["other_company_products"] if tab_filters["other_company_products"] else None,
        "other_merceology_id",
    )
    if sm:
        filters["merceologies"] = sm
    if sc:
        filters["certifications"] = sc
    if so:
        filters["other_company_products"] = so

    doc: dict[str, Any] = {
        "source": "taste_pitti_archive",
        "archive_segment": seg,
        "slug": slug,
        "letter": letter,
        "detail_url": detail_url,
        "name": texts["name"],
        "company_profile": texts["company_profile"],
        "website_url": texts["website_url"],
        "logo_url": extract_logo_url(soup),
        "brand_banner_url": extract_brand_banner_url(soup),
        "product_image_urls": pics if pics else None,
        "filters": filters,
        "listing_country": (
            _null_if_empty(html_lib.unescape(str(listing_country))) if listing_country is not None else None
        ),
        "listing_card_text": listing_out,
    }
    return _marketplace_doc_omit_empty(doc)
