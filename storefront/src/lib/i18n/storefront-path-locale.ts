/**
 * Lingua EN in URL (`/en/...`); Medusa usa ancora ISO paese (es. `gb`) nelle query API.
 */
export const STOREFRONT_EN_URL_SEGMENT = "en" as const

/** Ordine di preferenza per scegliere quale paese Medusa usa il mercato “inglese”. */
export const MEDUSA_EN_COUNTRY_FALLBACK_ORDER = ["gb", "us", "ie"] as const

/** Segmenti URL con UI dedicata (fr/de/es) oltre a paesi ISO pieni (es. `it`). */
export const STOREFRONT_EXTRA_LANGUAGE_PATHS = ["fr", "de", "es"] as const

/** Path accettati dal layout anche senza ISO corrispondente in regione Medusa (UI i18n). */
export function isStorefrontPermissiveLocalePath(segment: string): boolean {
  const s = segment.toLowerCase()
  if (s === STOREFRONT_EN_URL_SEGMENT) return true
  return (STOREFRONT_EXTRA_LANGUAGE_PATHS as readonly string[]).includes(s)
}
