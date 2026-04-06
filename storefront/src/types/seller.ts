import { Product } from "./product"

type SellerAddress = {
  address_line?: string
  city?: string
  country_code?: string
  postal_code?: string
}

/** Voce da `GET /store/sellers` (directory produttori). */
export type StoreSellerListItem = {
  id: string
  name: string
  handle: string
  description?: string
  photo?: string
  city?: string
  state?: string
  country_code?: string
  store_status?: string
  metadata?: Record<string, unknown> | null
}

export type SellerProps = SellerAddress & {
  id: string
  name: string
  handle: string
  description: string
  photo: string
  tax_id: string
  created_at: string
  reviews?: any[]
  products?: Product[]
  email?: string
  metadata?: Record<string, unknown> | null
  store_status?: "ACTIVE" | "SUSPENDED" | "INACTIVE"
}
