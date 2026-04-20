import {
  STOREFRONT_EN_URL_SEGMENT,
  storefrontPathToSearchSupportedCountry,
} from "@/lib/i18n/storefront-path-locale"

/** Filtro stringa per POST `/store/products/search` (Mercur/Meilisearch). */
export function buildCatalogSearchFilterString(params: {
  locale: string
  currency_code: string
  category_ids: string[]
  collection_id?: string
  seller_handle?: string
  facetFilters?: string
}): string {
  const {
    locale,
    currency_code,
    category_ids,
    collection_id,
    seller_handle,
    facetFilters = "",
  } = params

  const searchCountry = storefrontPathToSearchSupportedCountry(locale ?? "")
  const enCatalogFilter =
    (locale ?? "").toLowerCase() === STOREFRONT_EN_URL_SEGMENT
      ? " AND content_locales:en"
      : ""

  const ids = [
    ...new Set(
      category_ids
        .map((id) => (typeof id === "string" ? id.trim() : ""))
        .filter(Boolean)
    ),
  ]

  const categoryFragment =
    ids.length === 0
      ? ""
      : ids.length === 1
        ? ` AND categories.id:${ids[0]}`
        : ` AND (${ids.map((id) => `categories.id:${id}`).join(" OR ")})`

  const collectionFragment =
    collection_id !== undefined ? ` AND collections.id:${collection_id}` : ""

  const sellerPrefix = seller_handle
    ? `NOT seller:null AND seller.handle:${seller_handle} AND `
    : "NOT seller:null AND "

  return `${sellerPrefix}NOT seller.store_status:SUSPENDED AND supported_countries:${searchCountry} AND variants.prices.currency_code:${currency_code} AND variants.prices.amount > 0${enCatalogFilter}${categoryFragment}${collectionFragment} ${facetFilters}`.trimEnd()
}
