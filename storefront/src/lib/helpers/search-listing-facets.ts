/**
 * Facet listing: nomi attributi allineati all’indice Meilisearch (backend).
 */
export const LISTING_FACET_PARAM_TO_INDEX: Record<string, string> = {
  size: "variants.size",
  color: "variants.color",
  condition: "variants.condition",
  categories_name: "categories.name",
  seller_handle: "seller.handle",
  type_value: "type.value",
  tags_value: "tags.value",
}

const LISTING_FACET_CORE: string[] = [
  "seller.handle",
  "type.value",
  "tags.value",
]

const LISTING_FACET_CATEGORY: string[] = ["categories.name"]

const LISTING_FACET_VARIANTS: string[] = [
  "variants.color",
  "variants.size",
  "variants.condition",
]

function buildListingSearchFacetAttributes(): string[] {
  const out: string[] = []
  if (process.env.NEXT_PUBLIC_LISTING_CATEGORY_FACET === "true") {
    out.push(...LISTING_FACET_CATEGORY)
  }
  out.push(...LISTING_FACET_CORE)
  if (process.env.NEXT_PUBLIC_LISTING_VARIANT_FACETS === "true") {
    out.push(...LISTING_FACET_VARIANTS)
  }
  return out
}

export const LISTING_SEARCH_FACET_ATTRIBUTES: string[] =
  buildListingSearchFacetAttributes()

export const INDEX_TO_LISTING_FACET_PARAM: Record<string, string> =
  Object.fromEntries(
    Object.entries(LISTING_FACET_PARAM_TO_INDEX).map(([param, attr]) => [
      attr,
      param,
    ])
  )

const FACET_HEADING: Record<string, string> = {
  "categories.name": "Category",
  "seller.handle": "Seller",
  "type.value": "Product type",
  "tags.value": "Tags",
  "variants.color": "Color",
  "variants.size": "Size",
  "variants.condition": "Condition",
}

export function facetHeadingForListingAttribute(attr: string): string {
  return FACET_HEADING[attr] ?? attr.replace(/\./g, " ")
}

export function escapeListingFilterValue(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/"/g, '\\"')
}
