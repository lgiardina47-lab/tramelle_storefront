import type { ReadonlyURLSearchParams } from "next/navigation"

import { buildCatalogSearchFilterString } from "@/lib/helpers/catalog-search-filters"
import { getFacedFilters } from "@/lib/helpers/get-faced-filters"

/**
 * Stessa stringa `filters` del POST a `/api/catalog/search` (Meilisearch), da query string
 * (es. `window.location.search` senza `?` o `useSearchParams().toString()`).
 */
export function buildCatalogRequestFromQueryString(
  searchLineNoQuestionMark: string,
  ctx: {
    locale: string
    currency_code: string
    category_ids?: string[]
    collection_id?: string
    seller_handle?: string
  }
): { filters: string; query: string; page: number } {
  const p = new URLSearchParams(searchLineNoQuestionMark)
  const facetFilters = getFacedFilters(
    p as unknown as ReadonlyURLSearchParams
  )
  const filters = buildCatalogSearchFilterString({
    locale: ctx.locale,
    currency_code: ctx.currency_code,
    category_ids: ctx.category_ids ?? [],
    collection_id: ctx.collection_id,
    seller_handle: ctx.seller_handle,
    facetFilters,
  })
  const page = Math.max(1, parseInt(p.get("page") || "1", 10) || 1)
  return {
    filters,
    query: p.get("query") || "",
    page,
  }
}
