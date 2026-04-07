import type { HttpTypes } from "@medusajs/types"

const B2B_PRO_GROUP_NAME_DEFAULT = "B2B_Pro"

type StoreCustomerWithGroups = HttpTypes.StoreCustomer & {
  groups?: { id?: string; name?: string }[]
}

/**
 * Wholesale / modalità pro (listini B2B, stock in UI): metadata, gruppo `B2B_Pro` (nome o id), o
 * `NEXT_PUBLIC_TRAMELLE_WHOLESALE_GROUP_IDS` (id gruppi Medusa separati da virgola).
 */
export function isWholesaleCustomer(
  customer: HttpTypes.StoreCustomer | null | undefined
): boolean {
  if (!customer) return false

  const meta = customer.metadata as Record<string, unknown> | undefined
  if (meta?.tramelle_b2b_wholesale === true || meta?.tramelle_b2b_wholesale === "true") {
    return true
  }
  if (meta?.tramelle_registration_type === "b2b_pro") {
    return true
  }

  const groups = (customer as StoreCustomerWithGroups).groups
  if (Array.isArray(groups) && groups.length) {
    const b2bName =
      process.env.NEXT_PUBLIC_TRAMELLE_B2B_PRO_GROUP_NAME?.trim() ||
      B2B_PRO_GROUP_NAME_DEFAULT
    if (groups.some((g) => g?.name === b2bName)) {
      return true
    }
  }

  const raw = process.env.NEXT_PUBLIC_TRAMELLE_WHOLESALE_GROUP_IDS
  const allowed = raw
    ?.split(",")
    .map((s) => s.trim())
    .filter(Boolean)
  if (!allowed?.length) {
    return false
  }

  if (!Array.isArray(groups)) return false

  return groups.some((g) => g?.id && allowed.includes(g.id))
}
