/**
 * Dati aggiuntivi per documento Meilisearch listing (non nel validator Mercur Algolia).
 */
export type ListingIndexExtras = {
  b2c_min_prices: Record<string, number>
  seller_display_name: string | null
  seller_country_code: string | null
  seller_state: string | null
  seller_id: string
  seller_description?: string | null
  seller_photo?: string | null
  seller_tax_id?: string | null
  seller_created_at?: string | null
}
