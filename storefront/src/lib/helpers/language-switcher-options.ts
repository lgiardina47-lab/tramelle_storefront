import type { HttpTypes } from "@medusajs/types"

import { STOREFRONT_EN_URL_SEGMENT } from "@/lib/i18n/storefront-path-locale"

export type LanguageSwitcherOption = {
  /** Etichetta compatta (IT, EN, …) — fallback se manca `displayLabel` */
  label: string
  /** Nome per lista menu (es. "Italiano") */
  displayLabel: string
  /** Segmento URL (`it`, `en`, …) */
  country: string
}

/**
 * Lingue storefront: EN, FR, DE, IT, ES, JA. `/en` usa backend gb/us/ie come da `storefront-path-locale`.
 * Ordine e nomi allineati a menu tipo “lista verticale” (senza bandiere).
 */
export function buildLanguageSwitcherOptions(
  _regions: HttpTypes.StoreRegion[]
): LanguageSwitcherOption[] {
  const en = STOREFRONT_EN_URL_SEGMENT
  /** Ordine e etichette come selettore stile Faire (header). */
  return [
    { label: "IT", displayLabel: "Italiano", country: "it" },
    { label: "EN", displayLabel: "English", country: en },
    { label: "FR", displayLabel: "Français", country: "fr" },
    { label: "DE", displayLabel: "Deutsch", country: "de" },
    { label: "ES", displayLabel: "Español", country: "es" },
    { label: "JA", displayLabel: "日本語", country: "ja" },
  ]
}
