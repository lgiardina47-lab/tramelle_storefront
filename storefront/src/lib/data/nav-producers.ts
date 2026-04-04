"use server"

import { HttpTypes } from "@medusajs/types"

import { listProducts } from "./products"

/** ID delle categorie figlie del parent (max N), usati per estrarre seller dai prodotti. */
function directChildCategoryIds(
  parent: HttpTypes.StoreProductCategory,
  max = 6
): string[] {
  const children = parent.category_children || []
  return children.map((c) => c.id).filter(Boolean).slice(0, max)
}

/**
 * Produttori (seller) con almeno un prodotto nelle categorie figlie del parent.
 */
export async function getProducersByParentId(
  parentCategories: HttpTypes.StoreProductCategory[],
  countryCode: string
): Promise<Record<string, { name: string; handle: string }[]>> {
  const result: Record<string, { name: string; handle: string }[]> = {}

  await Promise.all(
    parentCategories.map(async (parent) => {
      const byHandle = new Map<string, string>()
      for (const catId of directChildCategoryIds(parent)) {
        if (byHandle.size >= 14) break
        try {
          const { response } = await listProducts({
            countryCode,
            category_id: catId,
            pageParam: 1,
            queryParams: { limit: 36 },
          })
          for (const p of response.products) {
            const s = p.seller
            if (s?.handle && s.name && s.store_status !== "SUSPENDED") {
              byHandle.set(s.handle, s.name)
            }
          }
        } catch {
          /* ignora categorie senza prodotti / errori rete */
        }
      }
      result[parent.id] = Array.from(byHandle.entries()).map(
        ([handle, name]) => ({ handle, name })
      )
    })
  )

  return result
}
