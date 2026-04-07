import type { HttpTypes } from "@medusajs/types"

/** Ignora l'opzione segnaposto singola di Medusa. */
export function productHasRealOptions(
  product: HttpTypes.StoreProduct
): boolean {
  const opts = product.options || []
  for (const o of opts) {
    const vals = o.values || []
    if (
      vals.length === 1 &&
      vals[0]?.value === "Default option value"
    ) {
      continue
    }
    if (vals.length > 0) return true
  }
  return false
}

/**
 * Variante senza righe di opzione mentre il prodotto espone opzioni a catalogo
 * (resto di sync / vecchio formato); va esclusa da prezzo minimo e listini.
 */
export function isOrphanStoreVariant(
  product: HttpTypes.StoreProduct,
  variant: { options?: unknown }
): boolean {
  if (!productHasRealOptions(product)) return false
  const vo = variant.options
  if (vo === undefined) return false
  return Array.isArray(vo) && vo.length === 0
}
