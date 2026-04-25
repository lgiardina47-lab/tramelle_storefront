/**
 * Dati aggiuntivi per documento Meilisearch listing (non nel validator Mercur Algolia).
 */
export type ListingIndexExtras = {
  b2c_min_prices: Record<string, number>
  seller_display_name: string | null
  seller_country_code: string | null
  seller_state: string | null
  seller_id: string
}
