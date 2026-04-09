import type { HttpTypes } from "@medusajs/types"

import { STOREFRONT_EN_URL_SEGMENT } from "@/lib/i18n/storefront-path-locale"

export type LanguageSwitcherOption = {
  /** Etichetta compatta (IT, EN, …) */
  label: string
  /** Segmento URL (`it`, `en`, …) */
  country: string
}

/**
 * Lingue storefront: IT, EN, FR, DE, ES, JA. `/en` usa backend gb/us/ie come da `storefront-path-locale`.
 */
export function buildLanguageSwitcherOptions(
  _regions: HttpTypes.StoreRegion[]
): LanguageSwitcherOption[] {
  return [
    { label: "IT", country: "it" },
    { label: "EN", country: STOREFRONT_EN_URL_SEGMENT },
    { label: "FR", country: "fr" },
    { label: "DE", country: "de" },
    { label: "ES", country: "es" },
    { label: "JA", country: "ja" },
  ]
}
