import { searchProducts } from "@/lib/data/products"
import { buildCatalogSearchFilterString } from "@/lib/helpers/catalog-search-filters"
import type { HeroCatalogSlide } from "@/lib/helpers/hero-catalog-slide"

/** Scope listing categoria + valuta per facet `categories.name` (solo prodotti reali). */
export type HeroSubcategoryPillScope = {
  category_ids: string[]
  currency_code: string
}

function facetPillsFromSearchFacets(
  facets: Record<string, unknown> | undefined
): { label: string; count: number }[] {
  const dist = facets?.["categories.name"]
  if (!dist || typeof dist !== "object") return []
  const merged = new Map<string, { label: string; count: number }>()
  for (const [name, n] of Object.entries(dist as Record<string, number>)) {
    if (typeof n !== "number" || n <= 0) continue
    const t = name.trim()
    if (!t) continue
    const k = t.toLowerCase()
    const prev = merged.get(k)
    if (prev) {
      merged.set(k, { label: prev.label, count: prev.count + n })
    } else {
      merged.set(k, { label: t, count: n })
    }
  }
  return [...merged.values()].sort((a, b) =>
    a.label.localeCompare(b.label, "it", { sensitivity: "base" })
  )
}

/**
 * Sostituisce `subcategoryPills` con nomi e conteggi da Meilisearch (facet) per il venditore
 * nell’ambito `category_ids`; se non ci sono hit, rimuove le pillole metadata.
 */
export async function enrichHeroCatalogSlideSubcategories(
  slide: HeroCatalogSlide,
  urlLocale: string,
  scope: HeroSubcategoryPillScope
): Promise<HeroCatalogSlide> {
  if (!scope.category_ids.length) return slide

  const filters = buildCatalogSearchFilterString({
    locale: urlLocale,
    currency_code: scope.currency_code,
    category_ids: scope.category_ids,
    seller_handle: slide.handle,
  })

  const r = await searchProducts({
    countryCode: urlLocale,
    currency_code: scope.currency_code,
    page: 0,
    hitsPerPage: 1,
    filters,
    facets: ["categories.name"],
  })

  const pills = facetPillsFromSearchFacets(r.facets)

  if (pills.length > 0) {
    return { ...slide, subcategoryPills: pills }
  }

  if (r.nbHits === 0) {
    const { subcategoryPills: _omit, ...rest } = slide
    return rest
  }

  return slide
}
