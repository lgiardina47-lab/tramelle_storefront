import { TRAMELLE_PRODUCTION_MEDUSA_ORIGIN } from '@/lib/medusa-backend-url'
import { maybeExpandCfImgRef } from '@/lib/helpers/cloudflare-images'

function trimTrailingSlash(s: string) {
  return s.replace(/\/$/, '')
}

/** Origine API raggiungibile dal browser per `/static/*` (Medusa serializza spesso `http://localhost:9000/...`). */
const TRAMELLE_FALLBACK_PUBLIC_API_ORIGIN = TRAMELLE_PRODUCTION_MEDUSA_ORIGIN

function isLoopbackOrUnusableForBrowserMedusaOrigin(raw: string): boolean {
  try {
    const u = new URL(raw)
    const h = u.hostname.toLowerCase()
    if (h === "localhost" || h === "127.0.0.1" || h === "::1") return true
    // Servizio Docker tipico: il browser non risolve `backend`.
    if (h === "backend") return true
    return false
  } catch {
    return true
  }
}

/**
 * Base usata solo per riscrivere thumbnail/gallery: deve essere sempre un host che il **browser** può contattare.
 * Se `NEXT_PUBLIC_MEDUSA_BACKEND_URL` è `localhost` (es. docker-compose), non va usata così com’è.
 */
export function medusaImageRewriteBase(): string {
  if (process.env.NEXT_PUBLIC_MEDUSA_ALLOW_LOCALHOST_IMAGE_URLS === "true") {
    return trimTrailingSlash(
      process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL ||
        process.env.MEDUSA_BACKEND_URL ||
        (process.env.NODE_ENV === "production"
          ? TRAMELLE_FALLBACK_PUBLIC_API_ORIGIN
          : "http://127.0.0.1:9000")
    )
  }

  const explicit = process.env.NEXT_PUBLIC_MEDUSA_PRODUCT_IMAGE_BASE?.trim()
  if (explicit && !isLoopbackOrUnusableForBrowserMedusaOrigin(explicit)) {
    return trimTrailingSlash(explicit)
  }

  const pub = process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL?.trim() || ""
  if (pub && !isLoopbackOrUnusableForBrowserMedusaOrigin(pub)) {
    return trimTrailingSlash(pub)
  }

  const server = process.env.MEDUSA_BACKEND_URL?.trim() || ""
  if (server && !isLoopbackOrUnusableForBrowserMedusaOrigin(server)) {
    return trimTrailingSlash(server)
  }

  if (process.env.NODE_ENV === "production") {
    return TRAMELLE_FALLBACK_PUBLIC_API_ORIGIN
  }

  // Dev: stesso DB/API pubblica (thumbnail nel JSON restano localhost)
  return TRAMELLE_FALLBACK_PUBLIC_API_ORIGIN
}

/**
 * Normalizza URL immagini/medie prodotto da Medusa (thumbnail, gallery `images[].url`, ecc.):
 * path relativi `/static/...`, localhost vs 127.0.0.1.
 */
export function resolveProductThumbnailSrc(
  thumbnail: string | null | undefined
): string | null {
  if (!thumbnail) return null
  let url = thumbnail
  try {
    url = decodeURIComponent(url)
  } catch {
    // lascia stringa originale
  }
  const viaCf = maybeExpandCfImgRef(url)
  if (viaCf) {
    return viaCf
  }
  const base = medusaImageRewriteBase()
  if (url.startsWith("/") && base) {
    url = `${base}${url}`
  }
  if (base) {
    url = url.replace(/^http:\/\/localhost:9000(?=\/|$)/i, base)
    url = url.replace(/^http:\/\/127\.0\.0\.1:9000(?=\/|$)/i, base)
  }
  return url || null
}

/** Thumbnail riga ordine/carrello: prova la line item, poi il prodotto collegato (spesso solo lì è valorizzato). */
export type LineItemThumbnailSource = {
  thumbnail?: string | null
  variant?: {
    thumbnail?: string | null
    product?: {
      thumbnail?: string | null
      images?: Array<{ url?: string | null } | null> | null
    } | null
  } | null
  product?: {
    thumbnail?: string | null
    images?: Array<{ url?: string | null } | null> | null
  } | null
} | null | undefined

function firstGalleryImageUrl(
  product:
    | {
        images?: Array<{ url?: string | null } | null> | null
      }
    | null
    | undefined
): string | null {
  const imgs = product?.images
  if (!Array.isArray(imgs)) return null
  for (const im of imgs) {
    const u = im?.url?.trim()
    if (u) return u
  }
  return null
}

export function resolveLineItemThumbnailSrc(
  item: LineItemThumbnailSource
): string | null {
  if (!item) return null
  const fromLine = resolveProductThumbnailSrc(item.thumbnail)
  if (fromLine) return fromLine
  const fromVariant = resolveProductThumbnailSrc(item.variant?.thumbnail)
  if (fromVariant) return fromVariant
  const vProd = item.variant?.product
  const rootProd = item.product
  const productThumb =
    vProd?.thumbnail ?? rootProd?.thumbnail
  const fromProductThumb = resolveProductThumbnailSrc(productThumb)
  if (fromProductThumb) return fromProductThumb
  const fromGallery = resolveProductThumbnailSrc(
    firstGalleryImageUrl(vProd) ?? firstGalleryImageUrl(rootProd)
  )
  return fromGallery
}

export const getImageUrl = (image: string) => {
  const cf = maybeExpandCfImgRef(image)
  if (cf) {
    return cf
  }
  const base = medusaImageRewriteBase()
  if (!base) return image
  return image
    .replace(/^http:\/\/localhost:9000\//i, `${base}/`)
    .replace(/^http:\/\/127\.0\.0\.1:9000\//i, `${base}/`)
}
