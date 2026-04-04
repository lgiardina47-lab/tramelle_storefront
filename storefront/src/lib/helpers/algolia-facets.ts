/**
 * Storefront listing facets: URL params ↔ Algolia attribute names.
 * Keep in sync with `algolia-config.json` attributesForFaceting.
 */
export const LISTING_FACET_PARAM_TO_ALGOLIA: Record<string, string> = {
  size: "variants.size",
  color: "variants.color",
  condition: "variants.condition",
  categories_name: "categories.name",
  seller_handle: "seller.handle",
  type_value: "type.value",
  tags_value: "tags.value",
}

/** Default facet request order for search + sidebar. */
export const ALGOLIA_LISTING_FACET_ATTRIBUTES: string[] = [
  "categories.name",
  "seller.handle",
  "type.value",
  "tags.value",
  "variants.color",
  "variants.size",
  "variants.condition",
]

export const ALGOLIA_TO_LISTING_FACET_PARAM: Record<string, string> =
  Object.fromEntries(
    Object.entries(LISTING_FACET_PARAM_TO_ALGOLIA).map(([param, attr]) => [
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

export function facetHeadingForAlgoliaAttribute(attr: string): string {
  return FACET_HEADING[attr] ?? attr.replace(/\./g, " ")
}

export function escapeAlgoliaFilterValue(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/"/g, '\\"')
}
