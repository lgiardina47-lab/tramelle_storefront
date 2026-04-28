import type { HttpTypes } from "@medusajs/types"

export function parseCategoriesNameSearchParam(
  sp: Record<string, string | string[] | undefined>
): string[] {
  const raw = sp.categories_name
  if (raw === undefined) return []
  const s = Array.isArray(raw) ? raw.join(",") : raw
  return [
    ...new Set(
      s
        .split(",")
        .map((x) => x.trim())
        .filter(Boolean)
    ),
  ]
}

/** Allinea nomi facet listing (`categories.name`) agli handle Medusa nel sottoalbero consentito. */
export function resolveCategoryHandlesFromDisplayNames(
  displayNames: string[],
  allFlat: HttpTypes.StoreProductCategory[],
  allowedCategoryIds: Set<string>
): string[] {
  const handles: string[] = []
  const seen = new Set<string>()
  for (const raw of displayNames) {
    const needle = raw.trim().toLowerCase()
    if (!needle) continue
    const match = allFlat.find(
      (c) =>
        typeof c.id === "string" &&
        allowedCategoryIds.has(c.id) &&
        (c.name?.trim() || "").toLowerCase() === needle
    )
    const h = match?.handle?.trim()
    if (h && !seen.has(h)) {
      handles.push(h)
      seen.add(h)
    }
  }
  return handles
}

/**
 * Scope hero catalogo: se ci sono filtri `categories_name` risolti → OR di quelle radici;
 * altrimenti sottoalbero della categoria della pagina (`pageCategoryHandle`).
 */
export function heroParentCategoryHandlesForPage(args: {
  pageCategoryHandle: string
  filterDisplayNames: string[]
  allFlat: HttpTypes.StoreProductCategory[]
  /** Tipicamente sottoalbero macro (ribbon): per risolvere nomi sottocategoria in handle. */
  nameResolutionSubtreeIds: Set<string>
}): string[] {
  const fromNames = resolveCategoryHandlesFromDisplayNames(
    args.filterDisplayNames,
    args.allFlat,
    args.nameResolutionSubtreeIds
  )
  if (fromNames.length > 0) return fromNames
  const h = args.pageCategoryHandle.trim()
  return h ? [h] : []
}
