import type { HttpTypes } from "@medusajs/types"

import { isVariantVisibleB2c } from "@/lib/helpers/tramelle-variant-metadata"

/** True se esiste almeno una variante non visibile in vetrina B2C (offerta B2B). */
export function productHasNonB2cVariant(
  product: HttpTypes.StoreProduct | null | undefined
): boolean {
  const vs = product?.variants
  if (!vs?.length) return false
  return vs.some(
    (v) => v && !isVariantVisibleB2c(v.metadata as Record<string, unknown>)
  )
}
