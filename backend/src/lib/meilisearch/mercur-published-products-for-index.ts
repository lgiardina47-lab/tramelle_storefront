/**
 * Carica e normalizza i prodotti pubblicati come nel pipeline Mercur (validator Zod da @mercurjs/framework).
 * Usato solo per indicizzare Meilisearch — nessun servizio Algolia.
 */
import {
  ContainerRegistrationKeys,
  arrayDifference,
} from "@medusajs/framework/utils"
import type { MedusaContainer } from "@medusajs/framework/types"
import { AlgoliaProductValidator, AlgoliaVariantValidator } from "@mercurjs/framework"
import { z } from "zod"

async function selectProductVariantsSupportedCountries(
  container: MedusaContainer,
  product_id: string
): Promise<string[]> {
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const { data: variants } = await query.graph({
    entity: "product_variant",
    fields: ["inventory_items.inventory.location_levels.location_id"],
    filters: { product_id },
  })

  const variantRows = variants as {
    inventory_items?: { inventory?: { location_levels?: { location_id?: string }[] } }[]
  }[]

  let location_ids: string[] = []
  for (const variant of variantRows) {
    const inventory_items =
      variant.inventory_items?.map((item) => item.inventory) || []
    const locations = inventory_items
      .flatMap((inventory_item) => inventory_item?.location_levels || [])
      .map((level) => level?.location_id)
    location_ids = location_ids.concat(locations.filter(Boolean) as string[])
  }

  const { data: stock_locations } = await query.graph({
    entity: "stock_location",
    fields: ["fulfillment_sets.service_zones.geo_zones.country_code"],
    filters: { id: location_ids },
  })

  const locationsRows = stock_locations as {
    fulfillment_sets?: { service_zones?: { geo_zones?: { country_code?: string }[] }[] }[]
  }[]

  let country_codes: string[] = []
  for (const location of locationsRows) {
    const fulfillmentSets =
      location.fulfillment_sets?.flatMap((set) => set.service_zones || []) || []
    const codes = fulfillmentSets
      .flatMap((sz) => sz.geo_zones || [])
      .map((gz) => gz.country_code)
    country_codes = country_codes.concat(codes.filter(Boolean) as string[])
  }
  return [...new Set(country_codes)]
}

/** Paesi ISO (minuscolo) da tutte le regioni store — usato come fallback indicizzazione. */
let cachedAllStoreCountryCodes: string[] | null = null

async function getAllStoreCountryCodesLowercase(
  container: MedusaContainer
): Promise<string[]> {
  if (cachedAllStoreCountryCodes?.length) {
    return cachedAllStoreCountryCodes
  }
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const { data: regions } = await query.graph({
    entity: "region",
    fields: ["countries.iso_2"],
  })
  const set = new Set<string>()
  for (const r of regions as { countries?: { iso_2?: string }[] }[]) {
    for (const c of r.countries ?? []) {
      const iso = c.iso_2?.trim().toLowerCase()
      if (iso) set.add(iso)
    }
  }
  cachedAllStoreCountryCodes = [...set]
  return cachedAllStoreCountryCodes
}

async function selectProductSeller(
  container: MedusaContainer,
  product_id: string
): Promise<{
  id: string
  handle: string
  store_status: string
} | null> {
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const {
    data: [product],
  } = await query.graph({
    entity: "product",
    fields: ["seller.id", "seller.handle", "seller.store_status"],
    filters: { id: product_id },
  })
  return product && product.seller
    ? {
        id: product.seller.id,
        handle: product.seller.handle,
        store_status: product.seller.store_status,
      }
    : null
}

export async function filterProductsByStatus(
  container: MedusaContainer,
  ids: string[] = []
): Promise<{ published: string[]; other: string[] }> {
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const { data: products } = await query.graph({
    entity: "product",
    fields: ["id", "status"],
    filters: { id: ids },
  })
  const published = products.filter((p: { status?: string }) => p.status === "published")
  const notPublished = arrayDifference(products, published)
  const existingIds = new Set(products.map((p: { id: string }) => p.id))
  const deletedIds = ids.filter((id) => !existingIds.has(id))
  return {
    published: published.map((p: { id: string }) => p.id),
    other: [...notPublished.map((p: { id: string }) => p.id), ...deletedIds],
  }
}

export async function findAndTransformPublishedProductsForMeili(
  container: MedusaContainer,
  ids: string[] = []
): Promise<z.infer<typeof AlgoliaProductValidator>[]> {
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const { data: products } = await query.graph({
    entity: "product",
    fields: [
      "*",
      "categories.name",
      "categories.id",
      "collection.title ",
      "tags.value",
      "type.value",
      "variants.*",
      "variants.options.*",
      "variants.options.prices.*",
      "variants.prices.*",
      "options.*",
      "options.values.*",
      "images.*",
      "attribute_values.value",
      "attribute_values.attribute.name",
      "attribute_values.attribute.is_filterable",
      "attribute_values.attribute.ui_component",
    ],
    filters: ids.length ? { id: ids, status: "published" } : { status: "published" },
  })

  for (const product of products as Record<string, unknown>[]) {
    product.average_rating = 0
    let supported = await selectProductVariantsSupportedCountries(
      container,
      product.id as string
    )
    /**
     * Import/cataloghi senza inventory collegato a stock location + fulfillment geo_zone
     * finiscono con `supported_countries: []` e spariscono dal filtro storefront
     * `supported_countries:it`. Fallback: tutti i paesi delle regioni Medusa attive.
     */
    if (!supported.length) {
      supported = await getAllStoreCountryCodesLowercase(container)
    }
    product.supported_countries = supported
    product.seller = await selectProductSeller(container, product.id as string)

    const opts = (product.options ?? []) as {
      title?: string
      values?: { value?: string }[]
    }[]
    product.options = opts
      .filter((option) => option?.title && option?.values)
      .map((option) =>
        (option.values ?? []).map((value) => ({
          [option.title!.toLowerCase()]: value.value,
        }))
      )
      .flat()

    let variants = z.array(AlgoliaVariantValidator).parse(product.variants ?? [])
    variants = variants.map((variant) => {
      return (variant.options ?? []).reduce(
        (entry, item) => {
          if (item?.option?.title) {
            ;(entry as Record<string, unknown>)[item.option.title.toLowerCase()] = item.value
          }
          return entry
        },
        variant as Record<string, unknown>
      )
    }) as typeof variants
    product.variants = variants

    const attrVals = (product.attribute_values ?? []) as {
      attribute?: {
        name?: string
        is_filterable?: boolean
        ui_component?: string
      }
      value?: unknown
    }[]
    product.attribute_values = attrVals
      .filter((attrValue) => attrValue?.attribute?.name)
      .map((attrValue) => ({
        name: attrValue.attribute!.name!,
        value: attrValue.value,
        is_filterable: attrValue.attribute!.is_filterable,
        ui_component: attrValue.attribute!.ui_component,
      }))
  }

  return z.array(AlgoliaProductValidator).parse(products)
}
