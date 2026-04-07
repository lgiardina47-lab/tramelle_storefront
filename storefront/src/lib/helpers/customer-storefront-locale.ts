import type { HttpTypes } from "@medusajs/types"

import { routing } from "@/i18n/routing"

/** Metadata cliente Medusa: segmento URL storefront preferito (`it`, `en`, …). */
export const TRAMELLE_CUSTOMER_STOREFRONT_COUNTRY_KEY =
  "tramelle_storefront_country"

const allowed = new Set<string>(routing.locales)

export function getCustomerPreferredStorefrontCountry(
  customer: HttpTypes.StoreCustomer | null | undefined
): string | null {
  if (!customer?.metadata || typeof customer.metadata !== "object") {
    return null
  }
  const raw = (customer.metadata as Record<string, unknown>)[
    TRAMELLE_CUSTOMER_STOREFRONT_COUNTRY_KEY
  ]
  if (typeof raw !== "string" || !raw.trim()) {
    return null
  }
  const c = raw.trim().toLowerCase()
  return allowed.has(c) ? c : null
}
