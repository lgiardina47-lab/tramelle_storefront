import type { HttpTypes } from "@medusajs/types"

import { normalizeQueryOptionValue } from "./normalize-query-option-value"

/**
 * Risolve l'id variante store in base alle opzioni prodotto e ai valori scelti (URL / default).
 * Evita il bug di `options.every()` su array vuoto (in JS `[].every(...)` è sempre true),
 * che faceva vincere sempre la prima variante se `options` era assente o vuoto.
 */
export function resolveSelectedStoreVariantId(
  product: HttpTypes.StoreProduct,
  selectedOptionValues: Record<string, string>
): string {
  const defs = product.options || []
  const variants = product.variants || []
  if (!variants.length) return ""

  if (!defs.length) {
    return variants.length === 1 ? variants[0]!.id! : ""
  }

  for (const v of variants as Array<{
    id: string
    options?: Array<{
      value?: string | null
      option?: { title?: string | null } | null
    }>
  }>) {
    const vOpts = v.options
    if (!vOpts?.length) continue

    const matches = defs.every((def) => {
      const key = (def.title || "").toLowerCase()
      const picked = normalizeQueryOptionValue(selectedOptionValues[key])
      const row = vOpts.find(
        (o) => (o.option?.title || "").toLowerCase() === key
      )
      if (!row) return false
      const variantVal = normalizeQueryOptionValue(row.value)
      return picked === variantVal
    })

    if (matches) return v.id
  }

  return ""
}
