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

/**
 * Facet sidebar listing (richiesta ad Algolia).
 * Default: seller, tipo, tag — senza categoria in sidebar (si naviga già da `/categories` / ribbon).
 * Opzionali: `NEXT_PUBLIC_LISTING_CATEGORY_FACET`, `NEXT_PUBLIC_LISTING_VARIANT_FACETS`.
 * I parametri URL (`categories_name`, `color`, …) restano in {@link LISTING_FACET_PARAM_TO_ALGOLIA}.
 */
const ALGOLIA_LISTING_FACET_CORE: string[] = [
  "seller.handle",
  "type.value",
  "tags.value",
]

const ALGOLIA_LISTING_FACET_CATEGORY: string[] = ["categories.name"]

const ALGOLIA_LISTING_FACET_VARIANTS: string[] = [
  "variants.color",
  "variants.size",
  "variants.condition",
]

function buildAlgoliaListingFacetAttributes(): string[] {
  const out: string[] = []
  if (process.env.NEXT_PUBLIC_LISTING_CATEGORY_FACET === "true") {
    out.push(...ALGOLIA_LISTING_FACET_CATEGORY)
  }
  out.push(...ALGOLIA_LISTING_FACET_CORE)
  if (process.env.NEXT_PUBLIC_LISTING_VARIANT_FACETS === "true") {
    out.push(...ALGOLIA_LISTING_FACET_VARIANTS)
  }
  return out
}

export const ALGOLIA_LISTING_FACET_ATTRIBUTES: string[] =
  buildAlgoliaListingFacetAttributes()

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
