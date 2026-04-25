export function buildMeilisearchSettings(
  minPriceFilterableKeys: string[]
): Record<string, unknown> {
  const filterable: string[] = [
    "handle",
    "provenance_country",
    "provenance_region",
    "seller.handle",
    "seller.store_status",
    "supported_countries",
    "category_ids",
    "collection_ids",
    "categories.name",
    "tags.value",
    "type.value",
    "variants.color",
    "variants.size",
    "variants.condition",
    "average_rating",
    "content_locales",
    ...minPriceFilterableKeys,
  ]

  return {
    searchableAttributes: [
      "title",
      "subtitle",
      "description",
      "handle",
      "brand.name",
      "tags.value",
      "type.value",
      "categories.name",
      "collection.title",
      "variant_titles",
      "listing_certifications",
    ],
    filterableAttributes: filterable,
    sortableAttributes: ["average_rating"],
  }
}
