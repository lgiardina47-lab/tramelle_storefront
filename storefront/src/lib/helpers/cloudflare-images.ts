/**
 * Cloudflare Images: riferimenti compatti nel DB (`cfimg:<image_id>`) → URL di delivery.
 * Hash e variant non sono segreti (compaiono in ogni URL pubblica); il token API resta solo nel backend.
 *
 * Nota formato: se l’`image_id` termina in `.jpg` è solo la chiave caricata su Cloudflare, non il tipo MIME
 * della risposta. Il default è la variante **`tramelle`**: tetto 12000×12000 con `scale-down` (risoluzione = sorgente
 * se più piccola; niente upscale). **Uscita moderna:** Cloudflare risponde **AVIF o WebP** in base all’header `Accept`
 * del browser (negoziazione automatica — Core Web Vitals / peso byte senza `.webp` nell’URL).
 * **Varianti flessibili** (dashboard Cloudflare Images → Delivery → “Flexible variants”): ultimo segmento path
 * tipo `w=640,fit=scale-down,quality=…` — limita la **dimensione in pixel** senza crop lato CF (`scale-down` ≠ `cover`);
 * ritaglio/composizione resta al CSS (`object-cover`). Così si evita un doppio crop + ricampionamento troppo morbido.
 * Senza flexible attivo quelle URL rispondono 403: usare solo varianti nominate (`tramelle`, `public`, …) o
 * impostare `NEXT_PUBLIC_CLOUDFLARE_IMAGES_FLEXIBLE_VARIANTS=0` e la fallback su variante nominata card.
 * Override variante nominata: env `…_VARIANT=public` (1366×768) o altro.
 */

import {
  DEFAULT_HOME_RAIL_SRC_WIDTHS,
  DEFAULT_PRODUCT_LISTING_CARD_SRC_WIDTHS,
  productListingCardImageSizesAttribute,
  productListingHomeRailImageSizesAttribute,
} from "@/lib/helpers/product-listing-image-sizes"

const DEFAULT_HOST = "imagedelivery.net"

/**
 * Flexible variant (richiede “Flexible variants” attivo in Cloudflare Images → Delivery).
 * Allineare eventuali override env tra storefront, backend e pannelli.
 */
const DEFAULT_CLOUDFLARE_IMAGES_VARIANT = "tramelle"

/**
 * Griglie directory / card produttore: variante più piccola della delivery (non l’hero `tramelle` fino a 12000px).
 * Override: `NEXT_PUBLIC_CLOUDFLARE_IMAGES_VARIANT_CARD`. Allineare al nome variante in Cloudflare Images.
 */
const DEFAULT_CLOUDFLARE_IMAGES_VARIANT_CARD = "public"

/** Larghezze (px) per srcset card directory: margine retina (2×) su colonne larghe. */
const DEFAULT_CLOUDFLARE_DIRECTORY_CARD_WIDTHS = [
  560, 840, 1120, 1600, 1920,
] as const

function truthyEnv(raw: string | undefined): boolean | null {
  const v = raw?.trim().toLowerCase() ?? ""
  if (v === "1" || v === "true" || v === "on" || v === "yes") return true
  if (v === "0" || v === "false" || v === "off" || v === "no") return false
  return null
}

/**
 * Richiede “Flexible variants” abilitato su Cloudflare Images.
 * Default **off** finché l’account non è pronto (403 sulle URL `w=…`).
 */
export function cloudflareFlexibleVariantsEnabled(): boolean {
  return (
    truthyEnv(
      process.env.NEXT_PUBLIC_CLOUDFLARE_IMAGES_FLEXIBLE_VARIANTS
    ) === true
  )
}

function cloudflareDirectoryCardWidthsPx(): number[] {
  const raw =
    process.env.NEXT_PUBLIC_CLOUDFLARE_IMAGES_CARD_WIDTHS?.trim() ?? ""
  if (!raw) {
    return [...DEFAULT_CLOUDFLARE_DIRECTORY_CARD_WIDTHS]
  }
  const parsed = raw
    .split(/[,;\s]+/)
    .map((s) => parseInt(s.trim(), 10))
    .filter((n) => n > 0 && n <= 4096)
  return parsed.length > 0 ? parsed : [...DEFAULT_CLOUDFLARE_DIRECTORY_CARD_WIDTHS]
}

export function cloudflareFlexibleSharpen(): number {
  const raw = process.env.NEXT_PUBLIC_CLOUDFLARE_IMAGES_SHARPEN?.trim()
  if (!raw) {
    return 1
  }
  const n = parseFloat(raw)
  if (!Number.isFinite(n)) {
    return 1
  }
  return Math.min(10, Math.max(0, n))
}

/**
 * Qualità URL flexible per **card produttori / directory** (1–100). Default **96**.
 * I **prodotti** usano `cloudflareProductFlexibleQuality()` (default 100).
 */
export function cloudflareFlexibleImageQuality(): number {
  const raw =
    process.env.NEXT_PUBLIC_CLOUDFLARE_IMAGES_FLEXIBLE_QUALITY?.trim()
  if (!raw) {
    return 96
  }
  const n = parseInt(raw, 10)
  if (!Number.isFinite(n)) {
    return 96
  }
  return Math.min(100, Math.max(1, n))
}

/**
 * Qualità massima per immagini **prodotto** su CF (default **100**).
 * `NEXT_PUBLIC_CLOUDFLARE_IMAGES_PRODUCT_QUALITY`
 */
export function cloudflareProductFlexibleQuality(): number {
  const raw =
    process.env.NEXT_PUBLIC_CLOUDFLARE_IMAGES_PRODUCT_QUALITY?.trim()
  if (!raw) {
    return 100
  }
  const n = parseInt(raw, 10)
  if (!Number.isFinite(n)) {
    return 100
  }
  return Math.min(100, Math.max(1, n))
}

/**
 * Qualità per il preset **galleria PDP** (LCP): default **88** (molto meno byte di 100, spesso stesso impatto visivo).
 * Override: `NEXT_PUBLIC_CLOUDFLARE_IMAGES_PDP_GALLERY_QUALITY`.
 */
export function cloudflarePdpGalleryFlexibleQuality(): number {
  const raw =
    process.env.NEXT_PUBLIC_CLOUDFLARE_IMAGES_PDP_GALLERY_QUALITY?.trim()
  if (!raw) {
    return 88
  }
  const n = parseInt(raw, 10)
  if (!Number.isFinite(n)) {
    return 88
  }
  return Math.min(100, Math.max(60, n))
}

/** Host delivery: da env (`media.tramelle.com` per SEO / first-party) oppure `imagedelivery.net` se omesso. */
function deliveryHostFromEnv(): string {
  return (
    process.env.NEXT_PUBLIC_CLOUDFLARE_IMAGES_DELIVERY_HOST?.trim() ||
    process.env.CLOUDFLARE_IMAGES_DELIVERY_HOST?.trim() ||
    DEFAULT_HOST
  ).replace(/\/$/, "")
}

function cloudflareAccountHash(): string {
  return (
    process.env.NEXT_PUBLIC_CLOUDFLARE_IMAGES_ACCOUNT_HASH?.trim() ||
    process.env.CLOUDFLARE_IMAGES_ACCOUNT_HASH?.trim() ||
    ""
  )
}

function cloudflareVariant(): string {
  return (
    process.env.NEXT_PUBLIC_CLOUDFLARE_IMAGES_VARIANT?.trim() ||
    process.env.CLOUDFLARE_IMAGES_VARIANT?.trim() ||
    DEFAULT_CLOUDFLARE_IMAGES_VARIANT
  )
}

/** Variante delivery per immagini in card directory / home featured (byte ridotti vs hero full). */
export function cloudflareDirectoryCardVariant(): string {
  const raw =
    process.env.NEXT_PUBLIC_CLOUDFLARE_IMAGES_VARIANT_CARD?.trim() ?? ""
  return raw || DEFAULT_CLOUDFLARE_IMAGES_VARIANT_CARD
}

/**
 * Strip `partner-{handle}-` negli id. Default **off**: stessa chiave che hai su Cloudflare → immagini visibili.
 * Attiva solo se gli asset su CF usano l’id corto: `NEXT_PUBLIC_TRAMELLE_CFIMG_STRIP_PARTNER_PREFIX=1`.
 */
function cfimgPartnerPrefixStripEnabled(): boolean {
  const v =
    process.env.NEXT_PUBLIC_TRAMELLE_CFIMG_STRIP_PARTNER_PREFIX?.trim().toLowerCase() ??
    ""
  return v === "1" || v === "true"
}

/** Custom image id può contenere `/` (es. `partner/slug/logo.jpg`); codifica ogni segmento. */
export function encodeCfImageIdPath(imageId: string): string {
  return imageId
    .split("/")
    .map((s) => encodeURIComponent(s))
    .join("/")
}

/**
 * Id lunghi tipo `partner-a-giordano-a-giordano-storytelling-5-….jpg` → chiave reale su Cloudflare
 * `storytelling-5-….jpg`: toglie `partner-{handle}-` e un eventuale `{handle}-` duplicato subito dopo.
 */
export function stripPartnerScopePrefixFromCfImageId(
  imageId: string,
  handle: string
): string {
  const h = handle.trim().toLowerCase()
  if (!h) {
    return imageId.trim()
  }
  let s = imageId.trim()
  const p1 = `partner-${h}-`
  if (
    s.length >= p1.length &&
    s.slice(0, p1.length).toLowerCase() === p1
  ) {
    s = s.slice(p1.length)
  }
  const p2 = `${h}-`
  if (
    s.length >= p2.length &&
    s.slice(0, p2.length).toLowerCase() === p2
  ) {
    s = s.slice(p2.length)
  }
  return s
}

function parseCfImagesDeliveryUrl(
  u: URL
): { hash: string; imageId: string; variant: string } | null {
  const segments = u.pathname.replace(/^\/+|\/+$/g, "").split("/").filter(Boolean)
  const host = u.hostname.toLowerCase()

  if (host === "imagedelivery.net") {
    if (segments.length < 3) {
      return null
    }
    const hash = segments[0]!
    const variant = segments[segments.length - 1]!
    const idSegments = segments.slice(1, -1)
    const imageId = idSegments.map((seg) => decodeURIComponent(seg)).join("/")
    return { hash, imageId, variant }
  }

  const im = segments.indexOf("imagedelivery")
  if (im < 0 || segments.length < im + 4) {
    return null
  }
  const hash = segments[im + 1]!
  const variant = segments[segments.length - 1]!
  const idSegments = segments.slice(im + 2, -1)
  const imageId = idSegments.map((seg) => decodeURIComponent(seg)).join("/")
  return { hash, imageId, variant }
}

/** Riscrive solo il segmento id nel path delivery, lasciando host/hash/variant invariati. */
export function rewriteCfImagesDeliveryUrlStripPartnerPrefix(
  absoluteUrl: string,
  handle: string
): string {
  if (!cfimgPartnerPrefixStripEnabled()) {
    return absoluteUrl
  }
  const h = handle.trim()
  if (!h) {
    return absoluteUrl
  }
  let u: URL
  try {
    u = new URL(absoluteUrl.trim())
  } catch {
    return absoluteUrl
  }
  const parsed = parseCfImagesDeliveryUrl(u)
  if (!parsed) {
    return absoluteUrl
  }
  const nextId = stripPartnerScopePrefixFromCfImageId(parsed.imageId, h)
  if (nextId === parsed.imageId) {
    return absoluteUrl
  }
  const idPath = encodeCfImageIdPath(nextId)
  if (u.hostname.toLowerCase() === "imagedelivery.net") {
    u.pathname = `/${parsed.hash}/${idPath}/${parsed.variant}`
  } else {
    u.pathname = `/cdn-cgi/imagedelivery/${parsed.hash}/${idPath}/${parsed.variant}`
  }
  return u.toString()
}

/** Su `imagedelivery.net` il path è `/<hash>/<id>/<variant>`. Su dominio proprio: `/cdn-cgi/imagedelivery/<hash>/<id>/<variant>`. */
function isDefaultImagedeliveryHost(host: string): boolean {
  return host.toLowerCase() === "imagedelivery.net"
}

/**
 * URL assoluto verso la delivery Cloudflare Images (custom domain o `imagedelivery.net`).
 * Usato dal loader `next/image`: il browser carica direttamente da CF → `cf-cache-status` HIT sull’edge
 * e `cache-control: public, max-age=…` da Images; evita `/_next/image` che su queste sorgenti non ridimensiona
 * ma aggiunge un hop sull’origine (spesso `cf-cache-status: DYNAMIC` davanti al sito).
 */
export function isCloudflareImagesDeliveryAbsoluteUrl(raw: string): boolean {
  let s = raw.trim()
  if (!s) return false
  if (s.startsWith("//")) {
    s = `https:${s}`
  }
  try {
    const u = new URL(s)
    if (!/^https?:$/i.test(u.protocol)) {
      return false
    }
    const path = u.pathname.toLowerCase()
    if (path.includes("/cdn-cgi/imagedelivery/")) {
      return true
    }
    if (isDefaultImagedeliveryHost(u.hostname)) {
      const segments = u.pathname.replace(/^\/+|\/+$/g, "").split("/").filter(Boolean)
      return segments.length >= 3
    }
    return false
  } catch {
    return false
  }
}

/**
 * Sostituisce solo il segmento variante nell’URL delivery (stesso hash / id immagine).
 */
export function rewriteCfImagesDeliveryVariant(
  absoluteUrl: string,
  nextVariant: string
): string {
  const variant = nextVariant.trim()
  if (!variant) {
    return absoluteUrl
  }
  let u: URL
  try {
    u = new URL(absoluteUrl.trim())
  } catch {
    return absoluteUrl
  }
  const parsed = parseCfImagesDeliveryUrl(u)
  if (!parsed) {
    return absoluteUrl
  }
  if (parsed.variant === variant) {
    return absoluteUrl
  }
  const idPath = encodeCfImageIdPath(parsed.imageId)
  if (isDefaultImagedeliveryHost(u.hostname)) {
    u.pathname = `/${parsed.hash}/${idPath}/${variant}`
  } else {
    u.pathname = `/cdn-cgi/imagedelivery/${parsed.hash}/${idPath}/${variant}`
  }
  return u.toString()
}

/**
 * Solo URL Cloudflare Images: se la variante “card” differisce da quella principale, usa quella card (thumbnail).
 */
export function applyCloudflareDirectoryCardVariantIfCf(url: string): string {
  if (cloudflareFlexibleVariantsEnabled()) {
    return url
  }
  const cardV = cloudflareDirectoryCardVariant()
  const primaryV = cloudflareVariant()
  if (cardV === primaryV) {
    return url
  }
  if (!isCloudflareImagesDeliveryAbsoluteUrl(url)) {
    return url
  }
  return rewriteCfImagesDeliveryVariant(url, cardV)
}

const DIRECTORY_CARD_HERO_SIZES =
  "(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"

/**
 * Hero card griglia: `fit=scale-down` (tetto larghezza, niente crop CF), `quality` + `sharpen`.
 * `null` se non è URL delivery CF o flexible disattivato in env.
 */
export function cloudflareDirectoryCardHeroResponsive(
  deliveryAbsoluteUrl: string
): { src: string; srcSet: string; sizes: string } | null {
  const base = deliveryAbsoluteUrl.trim()
  if (!base || !cloudflareFlexibleVariantsEnabled()) {
    return null
  }
  if (!isCloudflareImagesDeliveryAbsoluteUrl(base)) {
    return null
  }
  const q = cloudflareFlexibleImageQuality()
  const sh = cloudflareFlexibleSharpen()
  const seg = (w: number) =>
    `w=${w},fit=scale-down,quality=${q},sharpen=${sh}`
  const widths = cloudflareDirectoryCardWidthsPx()
  const urls = widths.map((w) => rewriteCfImagesDeliveryVariant(base, seg(w)))
  const mid = widths[Math.floor(widths.length / 2)]!
  const src = rewriteCfImagesDeliveryVariant(base, seg(mid))
  const srcSet = widths.map((w, i) => `${urls[i]!} ${w}w`).join(", ")
  return { src, srcSet, sizes: DIRECTORY_CARD_HERO_SIZES }
}

/**
 * Logo badge card (~36px, 2x retina): una richiesta CF piccola.
 */
export function cloudflareDirectoryCardLogoDeliveryUrl(
  deliveryAbsoluteUrl: string
): string | null {
  const base = deliveryAbsoluteUrl.trim()
  if (!base || !cloudflareFlexibleVariantsEnabled()) {
    return null
  }
  if (!isCloudflareImagesDeliveryAbsoluteUrl(base)) {
    return null
  }
  const q = cloudflareFlexibleImageQuality()
  const sh = cloudflareFlexibleSharpen()
  return rewriteCfImagesDeliveryVariant(
    base,
    `w=96,fit=scale-down,quality=${q},sharpen=${sh}`
  )
}

function parseWidthsListFromEnv(
  envValue: string | undefined,
  fallback: readonly number[]
): number[] {
  const raw = envValue?.trim() ?? ""
  if (!raw) {
    return [...fallback]
  }
  const parsed = raw
    .split(/[,;\s]+/)
    .map((s) => parseInt(s.trim(), 10))
    .filter((n) => n > 0 && n <= 8192)
  return parsed.length > 0 ? parsed : [...fallback]
}

/** Qualità per fallback `next/image` e riferimenti legacy: stessa dei prodotti CF. */
export function cloudflareProductImageQuality(): number {
  return cloudflareProductFlexibleQuality()
}

export type CloudflareProductImagePreset =
  | "listing-card"
  | "listing-rail"
  | "pdp-gallery"
  | "pdp-indicator"
  | "header-search"
  | "cart-line"
  | "cart-dropdown"
  | "wishlist-card"
  | "order-list-thumb"

/** Tetto ~698px × 2 (retina) ≈ 1400; 1600 basta senza richiedere 2200px (byte inutili). */
const DEFAULT_PRODUCT_GALLERY_WIDTHS = [
  480, 720, 960, 1280, 1600,
] as const

export function cloudflareProductImagePresetConfig(
  preset: CloudflareProductImagePreset
): {
  widths: number[]
  sizes: string
  fit: "scale-down"
} {
  switch (preset) {
    case "listing-card":
      return {
        widths: parseWidthsListFromEnv(
          process.env.NEXT_PUBLIC_CLOUDFLARE_IMAGES_PRODUCT_CARD_WIDTHS,
          [...DEFAULT_PRODUCT_LISTING_CARD_SRC_WIDTHS]
        ),
        sizes: productListingCardImageSizesAttribute(),
        fit: "scale-down",
      }
    case "listing-rail":
      return {
        widths: parseWidthsListFromEnv(
          process.env.NEXT_PUBLIC_CLOUDFLARE_IMAGES_HOME_RAIL_WIDTHS,
          [...DEFAULT_HOME_RAIL_SRC_WIDTHS]
        ),
        sizes: productListingHomeRailImageSizesAttribute,
        fit: "scale-down",
      }
    case "pdp-gallery":
      return {
        widths: parseWidthsListFromEnv(
          process.env.NEXT_PUBLIC_CLOUDFLARE_IMAGES_PRODUCT_GALLERY_WIDTHS,
          DEFAULT_PRODUCT_GALLERY_WIDTHS
        ),
        /**
         * Larghezza reale ≈ colonna galleria (`md:w-1/2` + `max-w-[698px]` nel carousel).
         * `min(698px, 50vw)` evita sottostima rispetto al box (immagine troppo piccola / sfocata).
         */
        sizes:
          "(min-width: 1024px) min(698px, 50vw), calc(100vw - 2rem)",
        fit: "scale-down",
      }
    case "pdp-indicator":
      return {
        widths: [64, 128, 192],
        sizes: "64px",
        fit: "scale-down",
      }
    case "header-search":
      return {
        widths: [48, 96, 144],
        sizes: "48px",
        fit: "scale-down",
      }
    case "cart-line":
      return {
        widths: [100, 200, 300],
        sizes: "100px",
        fit: "scale-down",
      }
    case "cart-dropdown":
      return {
        widths: [80, 160, 240],
        sizes: "80px",
        fit: "scale-down",
      }
    case "wishlist-card":
      return {
        widths: [250, 375, 500, 720],
        sizes: "(max-width: 1024px) 250px, 360px",
        fit: "scale-down",
      }
    case "order-list-thumb":
      return {
        widths: [66, 132, 198],
        sizes: "66px",
        fit: "scale-down",
      }
    default: {
      const _x: never = preset
      return _x
    }
  }
}

/**
 * Srcset verso Cloudflare flexible (`w=`, `fit=`, `quality=`, `sharpen=1`). Solo URL delivery CF + flexible ON.
 */
export function cloudflareFlexibleImageResponsive(
  deliveryAbsoluteUrl: string,
  params: {
    widths: number[]
    sizes: string
    fit: "scale-down" | "cover"
    /** Override qualità (es. prodotti = `cloudflareProductFlexibleQuality()`). */
    quality?: number
  }
): { src: string; srcSet: string; sizes: string } | null {
  const base = deliveryAbsoluteUrl.trim()
  if (!base || !cloudflareFlexibleVariantsEnabled()) {
    return null
  }
  if (!isCloudflareImagesDeliveryAbsoluteUrl(base)) {
    return null
  }
  const q = params.quality ?? cloudflareFlexibleImageQuality()
  const sh = cloudflareFlexibleSharpen()
  const widths = [...new Set(params.widths)]
    .filter((n) => n > 0)
    .sort((a, b) => a - b)
  if (widths.length === 0) {
    return null
  }
  const seg = (w: number) =>
    `w=${w},fit=${params.fit},quality=${q},sharpen=${sh}`
  const urls = widths.map((w) =>
    rewriteCfImagesDeliveryVariant(base, seg(w))
  )
  const mid = widths[Math.floor(widths.length / 2)]!
  const src = rewriteCfImagesDeliveryVariant(base, seg(mid))
  const srcSet = widths.map((w, i) => `${urls[i]!} ${w}w`).join(", ")
  return { src, srcSet, sizes: params.sizes }
}

export function cloudflareProductImageResponsive(
  url: string,
  preset: CloudflareProductImagePreset
): { src: string; srcSet: string; sizes: string } | null {
  const quality =
    preset === "pdp-gallery"
      ? cloudflarePdpGalleryFlexibleQuality()
      : cloudflareProductFlexibleQuality()
  return cloudflareFlexibleImageResponsive(url, {
    ...cloudflareProductImagePresetConfig(preset),
    quality,
  })
}

export function cloudflareImagesDeliveryUrl(imageId: string): string | null {
  const id = imageId.trim()
  const hash = cloudflareAccountHash()
  const variant = cloudflareVariant()
  if (!hash || !id) {
    return null
  }
  const host = deliveryHostFromEnv()
  const idPath = encodeCfImageIdPath(id)
  if (isDefaultImagedeliveryHost(host)) {
    return `https://${host}/${hash}/${idPath}/${variant}`
  }
  return `https://${host}/cdn-cgi/imagedelivery/${hash}/${idPath}/${variant}`
}

/** Solo stringhe `cfimg:<id>`; altrimenti `null`. */
export function maybeExpandCfImgRef(
  value: string,
  sellerHandle?: string
): string | null {
  const v = value.trim()
  if (!v.toLowerCase().startsWith("cfimg:")) {
    return null
  }
  let id = v.slice("cfimg:".length).trim()
  if (!id) {
    return null
  }
  if (cfimgPartnerPrefixStripEnabled() && sellerHandle) {
    id = stripPartnerScopePrefixFromCfImageId(id, sellerHandle)
  }
  return cloudflareImagesDeliveryUrl(id)
}
