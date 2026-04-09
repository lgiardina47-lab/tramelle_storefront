import { defineRouting } from "next-intl/routing"

/**
 * Lingue UI dello storefront (messaggi in `messages/{locale}.json`).
 * Il segmento URL resta il codice paese Medusa (`it`, `fr`, …) o `en`; la mappa
 * paese → file messaggi è in `countryCodeToStorefrontMessagesLocale`.
 */
export const routing = defineRouting({
  locales: ["it", "en", "fr", "de", "es", "ja"],
  defaultLocale: "it",
})

export type StorefrontI18nLocale = (typeof routing.locales)[number]
