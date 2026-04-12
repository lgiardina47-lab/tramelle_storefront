import { ReadonlyURLSearchParams } from "next/navigation"

import {
  LISTING_FACET_PARAM_TO_INDEX,
  escapeListingFilterValue,
} from "./search-listing-facets"

const RESERVED_KEYS = new Set([
  "min_price",
  "max_price",
  "sale",
  "query",
  "page",
  "products[page]",
  "sortBy",
  "rating",
])

export const getFacedFilters = (filters: ReadonlyURLSearchParams): string => {
  let facet = ""

  let minPrice = null
  let maxPrice = null

  let rating = ""

  for (const [key, value] of filters.entries()) {
    if (key === "min_price") {
      minPrice = value
      continue
    }
    if (key === "max_price") {
      maxPrice = value
      continue
    }
    if (key === "rating") {
      const splited = value.split(",")
      let values = ""
      if (splited.length > 1) {
        splited.forEach((v, index) => {
          values += `average_rating >= ${v.trim()} ${
            index + 1 < splited.length ? "OR " : ""
          }`
        })
      } else {
        values += `average_rating >=${splited[0]?.trim() ?? ""}`
      }
      rating += ` AND ${values}`
      continue
    }
    if (RESERVED_KEYS.has(key)) continue

    const attr = LISTING_FACET_PARAM_TO_INDEX[key]
    if (!attr) continue

    const parts = value
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
    if (!parts.length) continue

    if (parts.length === 1) {
      facet += ` AND ${attr}:"${escapeListingFilterValue(parts[0])}"`
    } else {
      const ors = parts
        .map((p) => `${attr}:"${escapeListingFilterValue(p)}"`)
        .join(" OR ")
      facet += ` AND (${ors})`
    }
  }

  const priceFilter =
    minPrice && maxPrice
      ? ` AND variants.prices.amount:${minPrice} TO ${maxPrice}`
      : minPrice
        ? ` AND variants.prices.amount >= ${minPrice}`
        : maxPrice
          ? ` AND variants.prices.amount <= ${maxPrice}`
          : ""

  return facet + priceFilter + rating
}
