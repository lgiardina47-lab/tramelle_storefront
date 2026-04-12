import {
  STOREFRONT_EN_URL_SEGMENT,
  storefrontPathToSearchSupportedCountry,
} from "@/lib/i18n/storefront-path-locale"

/** Filtri catalogo per `POST /store/products/search` (Meilisearch). */
export function storefrontProductSearchFilters(
  localePath: string,
  currency_code: string
): string {
  const country = storefrontPathToSearchSupportedCountry(localePath)
  const base = `NOT seller:null AND NOT seller.store_status:SUSPENDED AND supported_countries:${country} AND variants.prices.currency_code:${currency_code} AND variants.prices.amount > 0`
  if (localePath.toLowerCase() === STOREFRONT_EN_URL_SEGMENT) {
    return `${base} AND content_locales:en`
  }
  return base
}
