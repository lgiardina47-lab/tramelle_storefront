import { listCategories } from "@/lib/data/categories"

/**
 * Handle categoria (Medusa) → nome per UI hero. Usa la lista categorie già cachata da `listCategories`.
 */
export async function getHeroCategoryLabelByHandleMap(): Promise<
  Map<string, string>
> {
  const { allCategoriesFlat } = await listCategories({ query: { limit: 2000 } })
  const map = new Map<string, string>()
  for (const c of allCategoriesFlat ?? []) {
    const h = c.handle?.trim()
    if (!h) continue
    const name = (c.name?.trim() || h).trim()
    map.set(h.toLowerCase(), name)
  }
  return map
}
