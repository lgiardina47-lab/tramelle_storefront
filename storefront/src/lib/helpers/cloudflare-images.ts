/**
 * Cloudflare Images: riferimenti compatti nel DB (`cfimg:<image_id>`) → URL di delivery.
 * Hash e variant non sono segreti (compaiono in ogni URL pubblica); il token API resta solo nel backend.
 *
 * Nota formato: se l’`image_id` termina in `.jpg` è solo la chiave caricata su Cloudflare, non il tipo MIME
 * della risposta. Il default è la variante **`tramelle`**: tetto 12000×12000 con `scale-down` (risoluzione = sorgente
 * se più piccola; niente upscale). **Uscita moderna:** Cloudflare risponde **AVIF o WebP** in base all’header `Accept`
 * del browser (negoziazione automatica — Core Web Vitals / peso byte senza `.webp` nell’URL).
 * Flexible variants restano disattivate: niente path parametrici, solo varianti nominate.
 * Override: env `…_VARIANT=public` (1366×768) o altro. Per `.webp` nel path dell’id: upload `--cf-id-extension .webp`.
 */

const DEFAULT_HOST = "imagedelivery.net"

/**
 * Flexible variant (richiede “Flexible variants” attivo in Cloudflare Images → Delivery).
 * Allineare eventuali override env tra storefront, backend e pannelli.
 */
const DEFAULT_CLOUDFLARE_IMAGES_VARIANT = "tramelle"

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
