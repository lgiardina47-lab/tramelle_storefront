function trimTrailingSlash(s: string) {
  return s.replace(/\/$/, '')
}

/** Base API Medusa per URL assoluti (funziona in client e server se `NEXT_PUBLIC_*` è impostato). */
function medusaBaseUrl(): string {
  return trimTrailingSlash(
    process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL ||
      process.env.MEDUSA_BACKEND_URL ||
      (process.env.NODE_ENV === 'production'
        ? 'https://api.tramelle.com'
        : 'http://127.0.0.1:9000')
  )
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
  const base = medusaBaseUrl()
  if (url.startsWith('/') && base) {
    url = `${base}${url}`
  }
  if (base) {
    url = url.replace(/^http:\/\/localhost:9000(?=\/|$)/, base)
    url = url.replace(/^http:\/\/127\.0\.0\.1:9000(?=\/|$)/, base)
  }
  return url || null
}

export const getImageUrl = (image: string) => {
  const base = trimTrailingSlash(
    process.env.MEDUSA_BACKEND_URL ||
      process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL ||
      ''
  )
  if (!base) return image
  return image
    .replace(/^http:\/\/localhost:9000\//, `${base}/`)
    .replace(/^http:\/\/127\.0\.0\.1:9000\//, `${base}/`)
}
