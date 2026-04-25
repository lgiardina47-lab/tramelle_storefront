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

import { computeB2cMinPricesFromRawVariants } from "./b2c-min-prices-from-raw-variants"
import type { ListingIndexExtras } from "./listing-index-extras"
import { cloneJson, type PdpSourceSnapshot } from "./pdp-source-snapshot"

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

type SellerForMeili = {
  id: string
  handle: string
  store_status: string
  name?: string | null
  country_code?: string | null
  state?: string | null
  description?: string | null
  photo?: string | null
  created_at?: string | null
}

async function selectProductSeller(
  container: MedusaContainer,
  product_id: string
): Promise<SellerForMeili | null> {
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const {
    data: [product],
  } = await query.graph({
    entity: "product",
    fields: [
      "seller.id",
      "seller.handle",
      "seller.name",
      "seller.store_status",
      "seller.country_code",
      "seller.state",
      "seller.description",
      "seller.photo",
      "seller.created_at",
    ],
    filters: { id: product_id },
  })
  if (!product?.seller) return null
  const s = product.seller as {
    id: string
    handle: string
    store_status: string
    country_code?: string | null
    state?: string | null
  }
  const sx = s as {
    description?: string | null
    photo?: string | null
    created_at?: string | null
  }
  return {
    id: s.id,
    handle: s.handle,
    store_status: s.store_status,
    name: (s as { name?: string | null }).name ?? null,
    country_code: s.country_code,
    state: s.state,
    description: sx.description ?? null,
    photo: sx.photo ?? null,
    created_at: sx.created_at ?? null,
  }
}

function provenanceFromSeller(
  seller: SellerForMeili | null
): { country_code: string | null; state: string | null } | null {
  if (!seller) return null
  const country_code = seller.country_code?.trim() || null
  const state = seller.state?.trim() || null
  if (!country_code && !state) return null
  return { country_code, state }
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
): Promise<{
  products: z.infer<typeof AlgoliaProductValidator>[]
  listingIndexExtrasByProductId: Map<string, ListingIndexExtras>
  pdpSourcesByProductId: Map<string, PdpSourceSnapshot>
}> {
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
      "variants.inventory_items.*",
      "variants.inventory_items.inventory.*",
      "variants.inventory_items.inventory.location_levels.*",
      "options.*",
      "options.values.*",
      "images.*",
      "attribute_values.id",
      "attribute_values.value",
      "attribute_values.attribute.id",
      "attribute_values.attribute.name",
      "attribute_values.attribute.is_filterable",
      "attribute_values.attribute.ui_component",
    ],
    filters: ids.length ? { id: ids, status: "published" } : { status: "published" },
  })

  const provenanceByProductId = new Map<
    string,
    { country_code: string | null; state: string | null }
  >()
  const listingIndexExtrasByProductId = new Map<string, ListingIndexExtras>()
  const pdpSourcesByProductId = new Map<string, PdpSourceSnapshot>()

  for (const product of products as Record<string, unknown>[]) {
    product.average_rating = 0
    const pidEarly = product.id as string
    pdpSourcesByProductId.set(pidEarly, {
      optionsRaw: cloneJson(product.options ?? []),
      variantsRaw: cloneJson(product.variants ?? []),
      attributeValuesRaw: cloneJson(product.attribute_values ?? []),
      created_at:
        typeof product.created_at === "string" ? product.created_at : null,
    })

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
    const linkedSeller = await selectProductSeller(
      container,
      product.id as string
    )
    const prov = provenanceFromSeller(linkedSeller)
    if (prov) {
      provenanceByProductId.set(product.id as string, prov)
    }
    product.seller = linkedSeller
      ? {
          id: linkedSeller.id,
          handle: linkedSeller.handle,
          store_status: linkedSeller.store_status,
        }
      : null

    const b2cMin = computeB2cMinPricesFromRawVariants(product.variants)
    const pid = product.id as string
    listingIndexExtrasByProductId.set(pid, {
      b2c_min_prices: b2cMin,
      seller_display_name: linkedSeller?.name?.trim() || null,
      seller_country_code: linkedSeller?.country_code?.trim() || null,
      seller_state: linkedSeller?.state?.trim() || null,
      seller_id: linkedSeller?.id ?? "",
      seller_description: linkedSeller?.description?.trim() || null,
      seller_photo: linkedSeller?.photo?.trim() || null,
      seller_tax_id: null,
      seller_created_at: (() => {
        const c = linkedSeller?.created_at as unknown
        if (c == null) return null
        if (typeof c === "string") return c.trim() || null
        if (c instanceof Date) return c.toISOString()
        return null
      })(),
    })

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

  const parsed = z.array(AlgoliaProductValidator).parse(products) as Array<
    z.infer<typeof AlgoliaProductValidator> & {
      tramelle_provenance_seller?: {
        country_code: string | null
        state: string | null
      }
    }
  >

  for (const p of parsed) {
    const prov = provenanceByProductId.get(p.id)
    if (prov) {
      p.tramelle_provenance_seller = prov
    }
  }

  return { products: parsed, listingIndexExtrasByProductId, pdpSourcesByProductId }
}
