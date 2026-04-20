import type { HttpTypes } from "@medusajs/types"

import { isWholesaleCustomer } from "@/lib/helpers/wholesale-customer"

export type TramelleHeaderAccountRole = "consumer" | "b2b" | "producer"

/**
 * Ruolo per badge header: B2B (Chef Pro), produttore (metadata), altrimenti consumer.
 */
export function tramelleHeaderAccountRole(
  customer: HttpTypes.StoreCustomer | null | undefined
): TramelleHeaderAccountRole {
  if (!customer) return "consumer"
  const m = customer.metadata as Record<string, unknown> | undefined
  if (
    m?.tramelle_account_role === "producer" ||
    m?.tramelle_is_producer === true ||
    m?.tramelle_is_producer === "true"
  ) {
    return "producer"
  }
  if (isWholesaleCustomer(customer)) return "b2b"
  return "consumer"
}
