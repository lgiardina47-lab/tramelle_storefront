import { listRegions } from "../data/regions"

/**
 * Verifica se `locale` è un paese noto dalle regioni Medusa.
 * In caso di errore API (listRegions che lancia) o elenco vuoto, non bloccare
 * tutto il sito: accetta almeno la regione di default da env.
 */
export const checkRegion = async (locale: string) => {
  const fallback = process.env.NEXT_PUBLIC_DEFAULT_REGION || "it"

  try {
    const regions = await listRegions()
    const list = Array.isArray(regions) ? regions : []

    const countries = list.flatMap((r) =>
      (r.countries ?? [])
        .map((c) => c.iso_2)
        .filter((code): code is string => Boolean(code))
    )

    if (!countries.length) {
      return locale === fallback
    }

    return countries.includes(locale)
  } catch {
    return locale === fallback
  }
}
