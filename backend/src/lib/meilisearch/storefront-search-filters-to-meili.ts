/**
 * Traduce la stringa filtri generata dallo storefront (sintassi tipo Mercur) in filtri Meilisearch.
 * I documenti indicizzati usano `min_prices.<currency>` (minuscolo) al posto di variants.prices.*.
 */
export function storefrontSearchFiltersToMeilisearch(
  filterString: string | undefined
): string | undefined {
  if (!filterString?.trim()) {
    return undefined
  }

  let s = filterString.replace(/\s+/g, " ").trim()

  const ccMatch = s.match(/variants\.prices\.currency_code:([a-z]{3})/i)
  const cc = ccMatch ? ccMatch[1].toLowerCase() : null

  s = s.replace(
    /((?:[a-z0-9_]+\.)*[a-z0-9_]+):"((?:\\.|[^"\\])*)"/gi,
    (_m, attr: string, val: string) => {
      const unescaped = val.replace(/\\"/g, '"').replace(/\\\\/g, "\\")
      const escaped = unescaped.replace(/\\/g, "\\\\").replace(/"/g, '\\"')
      return `${attr} = "${escaped}"`
    }
  )

  if (cc) {
    s = s.replace(/variants\.prices\.currency_code:[a-z]{3}/gi, "")
    s = s.replace(/variants\.prices\.amount\s*>\s*0/gi, `min_prices.${cc} > 0`)
    s = s.replace(
      /variants\.prices\.amount\s*>=\s*(\d+(?:\.\d+)?)/gi,
      `min_prices.${cc} >= $1`
    )
    s = s.replace(
      /variants\.prices\.amount\s*<=\s*(\d+(?:\.\d+)?)/gi,
      `min_prices.${cc} <= $1`
    )
    s = s.replace(
      /variants\.prices\.amount\s*:\s*(\d+(?:\.\d+)?)\s+TO\s+(\d+(?:\.\d+)?)/gi,
      `(min_prices.${cc} >= $1 AND min_prices.${cc} <= $2)`
    )
  }

  s = s.replace(/NOT\s+seller:null/gi, "seller.handle EXISTS")
  s = s.replace(
    /NOT\s+seller\.store_status:SUSPENDED/gi,
    'seller.store_status != "SUSPENDED"'
  )

  s = s.replace(/supported_countries:([a-z]{2})/gi, `supported_countries = "$1"`)

  s = s.replace(/content_locales:([a-z]{2})/gi, `content_locales = "$1"`)

  s = s.replace(/categories\.id:([^\s)]+)/gi, `category_ids = "$1"`)

  s = s.replace(/collections\.id:([^\s)]+)/gi, `collection_ids = "$1"`)

  s = s.replace(/seller\.handle:([^\s=)]+)/gi, (_m, h: string) => {
    if (h.startsWith('"')) {
      return `seller.handle = ${h}`
    }
    return `seller.handle = "${h}"`
  })

  s = s.replace(/\(\s*\)/g, "")
  s = s.replace(/\s+AND\s+AND/gi, " AND ")
  s = s.replace(/^\s*AND\s+|\s+AND\s*$/gi, "")
  s = s.replace(/\s{2,}/g, " ").trim()

  if (!s) {
    return undefined
  }
  return s
}
