export type MercurSearchTransformProduct = {
  id: string
  title: string
  subtitle?: string | null
  description?: string | null
  handle: string
  thumbnail?: string | null
  images?: { url?: string }[] | null
  metadata?: unknown | null
  average_rating?: number | null
  supported_countries?: string[] | null
  tramelle_provenance_seller?: {
    country_code: string | null
    state: string | null
  }
  seller?: {
    id?: string
    handle?: string | null
    store_status?: string | null
  } | null
  categories?: { id: string; name: string }[] | null
  collection?: { id?: string; title?: string | null } | null
  tags?: { value: string }[] | null
  type?: { value: string } | null
  brand?: { name?: string } | null
  variants?: Record<string, unknown>[] | null
  attribute_values?: {
    name?: string
    value?: unknown
    is_filterable?: boolean
    ui_component?: string
  }[] | null
}
