/** Prefisso handle categorie Tramelle in Medusa (URL pubblico senza questo segmento). */
export const TRAMELLE_CATEGORY_HANDLE_PREFIX = "tramelle-"

/**
 * Segmento URL storefront per una categoria: senza prefisso `tramelle-` quando presente.
 * I file statici sotto `/public/images/categories/` restano nominati con l'handle Medusa completo.
 */
export function categorySlugForStorefrontUrl(handle: string): string {
  const h = (handle || "").trim()
  if (!h) return h
  const lower = h.toLowerCase()
  if (lower.startsWith(TRAMELLE_CATEGORY_HANDLE_PREFIX)) {
    return h.slice(TRAMELLE_CATEGORY_HANDLE_PREFIX.length)
  }
  return h
}

/** Path relativo al locale: `/categories/<slug-pubblico>`. */
export function categoryPublicHref(handle: string): string {
  return `/categories/${categorySlugForStorefrontUrl(handle)}`
}

/** Confronto segmento URL (slug pubblico) con handle Medusa (`tramelle-…` o identico). */
export function categoryHandleMatchesUrlSegment(
  medusaHandle: string,
  urlSegment: string
): boolean {
  const m = (medusaHandle || "").trim()
  const u = (urlSegment || "").trim()
  if (!m || !u) return false
  if (m === u) return true
  return categorySlugForStorefrontUrl(m) === u
}
