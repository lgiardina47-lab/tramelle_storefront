import { listRegions } from "../data/regions"
import { isStorefrontPermissiveLocalePath } from "../i18n/storefront-path-locale"

/**
 * Verifica se `locale` è un paese noto dalle regioni Medusa.
 * In caso di errore API (listRegions che lancia) o elenco vuoto, non bloccare
 * tutto il sito: accetta almeno la regione di default da env.
 */
export const checkRegion = async (locale: string) => {
  const fallback = process.env.NEXT_PUBLIC_DEFAULT_REGION || "it"
  const normalized = locale.toLowerCase()

  try {
    const regions = await listRegions()
    const list = Array.isArray(regions) ? regions : []

    const countries = list.flatMap((r) =>
      (r.countries ?? [])
        .map((c) => c.iso_2?.toLowerCase())
        .filter((code): code is string => Boolean(code))
    )

    if (!countries.length) {
      return (
        normalized === fallback || isStorefrontPermissiveLocalePath(normalized)
      )
    }

    if (countries.includes(normalized)) {
      return true
    }

    /** en/fr/de/es: UI i18n; catalogo risolto lato API (`en` → gb/us/ie, ecc.). */
    if (isStorefrontPermissiveLocalePath(normalized)) {
      return true
    }

    return false
  } catch {
    return (
      normalized === fallback || isStorefrontPermissiveLocalePath(normalized)
    )
  }
}
