/**
 * Rimuove dalla stringa filtri Mercur/storefront le clausole relative a un attributo facet,
 * così una ricerca ausiliaria può calcolare facetDistribution “disgiuntiva” (multi-select OR).
 *
 * Forma attesa (da `getFacedFilters` + `buildCatalogSearchFilterString`):
 * - ` AND attr:"val"`
 * - ` AND (attr:"a" OR attr:"b" OR ...)`
 *
 * I valori possono contenere escape `\"` e `\\` come in `escapeListingFilterValue`.
 */
export function stripMercurFacetAttribute(
  filterString: string,
  mercurAttribute: string
): string {
  if (!filterString?.trim() || !mercurAttribute?.trim()) {
    return filterString?.replace(/\s+/g, " ").trim() ?? ""
  }

  let s = filterString.replace(/\s+/g, " ").trim()
  const attr = mercurAttribute.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
  const quotedVal = '"(?:\\\\.|[^"\\\\])*"'
  const atom = `${attr}:${quotedVal}`

  const groupRe = new RegExp(
    `\\s+AND\\s+\\(\\s*(?:${atom}\\s+OR\\s*)+${atom}\\s*\\)`,
    "gi"
  )
  s = s.replace(groupRe, "")

  const singleRe = new RegExp(`\\s+AND\\s+${atom}`, "gi")
  s = s.replace(singleRe, "")

  s = s.replace(/\s+AND\s+AND/gi, " AND ")
  s = s.replace(/^\s*AND\s+|\s+AND\s*$/gi, "")
  s = s.replace(/\s{2,}/g, " ").trim()
  return s
}

export function normalizeMercurFilterWhitespace(filterString: string): string {
  return filterString.replace(/\s+/g, " ").trim()
}
