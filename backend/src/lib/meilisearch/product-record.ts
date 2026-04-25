import {
  contentLocalesFromProductMetadata,
  titlesI18nFromProductMetadata,
} from "./content-locales-from-metadata"
import { buildPdpStoreProductJson } from "./pdp-json-for-index"
import type { ListingIndexExtras } from "./listing-index-extras"
import type { PdpSourceSnapshot } from "./pdp-source-snapshot"
import type { MercurSearchTransformProduct } from "./product-record-types"

function uniqStrings(values: Iterable<string>): string[] {
  return [...new Set(values)].filter(Boolean)
}

function provenanceCountryCode(
  product: MercurSearchTransformProduct
): string | null {
  const raw = product.tramelle_provenance_seller?.country_code?.trim()
  if (!raw) {
    return null
  }
  return raw.toLowerCase()
}

function certificationLabelsFromAttributes(
  attrs: MercurSearchTransformProduct["attribute_values"]
): string[] {
  if (!Array.isArray(attrs)) {
    return []
  }
  const out: string[] = []
  for (const a of attrs) {
    const name = a?.name?.trim()
    if (!name) {
      continue
    }
    const nl = name.toLowerCase()
    if (!/certific|dop|igp|bio|organic|docg|doc|sga|sts/i.test(nl)) {
      continue
    }
    const v = a.value
    let vs = ""
    if (typeof v === "string") {
      vs = v.trim()
    } else if (Array.isArray(v)) {
      vs = v.filter((x) => typeof x === "string").join(", ").trim()
    } else if (v != null && typeof v !== "object") {
      vs = String(v).trim()
    }
    out.push(vs ? `${name}: ${vs}` : name)
  }
  return [...new Set(out)]
}

function provenanceRegionLabel(product: MercurSearchTransformProduct): string | null {
  const fromSeller = product.tramelle_provenance_seller?.state?.trim()
  if (fromSeller) {
    return fromSeller
  }
  const meta = product.metadata as Record<string, unknown> | null | undefined
  if (!meta || typeof meta !== "object") {
    return null
  }
  const a = meta.listing_region
  const b = meta.listingRegion
  if (typeof a === "string" && a.trim()) {
    return a.trim()
  }
  if (typeof b === "string" && b.trim()) {
    return b.trim()
  }
  return null
}

/**
 * Record Meilisearch allineato ai filtri/facet dello storefront (stessa forma del transform Mercur).
 */
export function productToMeilisearchRecord(
  product: MercurSearchTransformProduct,
  collectionId?: string | null,
  listingExtras?: ListingIndexExtras | null,
  pdpSources?: PdpSourceSnapshot | null
): Record<string, unknown> | null {
  const seller = product.seller
  if (!seller?.handle) {
    return null
  }

  const categories = product.categories ?? []
  const categoryIds = categories.map((c) => c.id).filter(Boolean)
  const categoryNames = categories.map((c) => c.name).filter(Boolean)

  const variants = product.variants ?? []
  const minPrices: Record<string, number> = {}
  const colors = new Set<string>()
  const sizes = new Set<string>()
  const conditions = new Set<string>()
  const variantTitles: string[] = []

  for (const v of variants) {
    const title = v.title
    if (typeof title === "string" && title.trim()) {
      variantTitles.push(title.trim())
    }
    const prices = v.prices as
      | { currency_code?: string; amount?: number }[]
      | undefined
    if (Array.isArray(prices)) {
      for (const p of prices) {
        const amount = p.amount
        const rawCc = p.currency_code
        if (typeof amount === "number" && amount > 0 && rawCc) {
          const ccy = rawCc.toLowerCase()
          minPrices[ccy] = Math.min(minPrices[ccy] ?? Infinity, amount)
        }
      }
    }
    for (const key of ["color", "size", "condition"] as const) {
      const val = v[key]
      if (typeof val === "string" && val.trim()) {
        if (key === "color") colors.add(val.trim())
        if (key === "size") sizes.add(val.trim())
        if (key === "condition") conditions.add(val.trim())
      }
    }
  }

  for (const k of Object.keys(minPrices)) {
    if (minPrices[k] === Infinity) {
      delete minPrices[k]
    }
  }

  const collId = collectionId ?? product.collection?.id ?? null
  const collectionIds = collId ? [collId] : []

  const tags = uniqStrings((product.tags ?? []).map((t) => t.value))
  const typeValue = product.type?.value ?? null

  const content_locales = contentLocalesFromProductMetadata(product.metadata)
  const titles_i18n = titlesI18nFromProductMetadata(product.metadata)

  const pc = provenanceCountryCode(product)
  const pr = provenanceRegionLabel(product)

  const listingCertifications = certificationLabelsFromAttributes(
    product.attribute_values
  )

  const thumb =
    typeof product.thumbnail === "string" && product.thumbnail.trim()
      ? product.thumbnail.trim()
      : null
  const imgs = product.images as { url?: string }[] | null | undefined
  const firstImg =
    Array.isArray(imgs) && imgs[0] && typeof imgs[0].url === "string"
      ? imgs[0].url.trim()
      : null
  const listingThumbnail = thumb || firstImg

  const b2cForCard =
    listingExtras &&
    typeof listingExtras.b2c_min_prices === "object" &&
    Object.keys(listingExtras.b2c_min_prices).length > 0
      ? listingExtras.b2c_min_prices
      : minPrices

  const brandName =
    product.brand &&
    typeof product.brand === "object" &&
    "name" in product.brand &&
    typeof (product.brand as { name?: unknown }).name === "string"
      ? String((product.brand as { name: string }).name).trim() || null
      : null

  const listing_card = {
    thumbnail: listingThumbnail,
    titles_i18n,
    brand_name: brandName,
    certifications: listingCertifications,
    seller_name: listingExtras?.seller_display_name ?? null,
    seller_id: listingExtras?.seller_id ?? (seller.id as string) ?? "",
    seller_handle: seller.handle,
    seller_country_code:
      listingExtras?.seller_country_code?.trim() || pc || null,
    seller_state: listingExtras?.seller_state?.trim() || pr || null,
    b2c_min_prices: b2cForCard,
    category_names: categoryNames,
  }

  const doc: Record<string, unknown> = {
    id: product.id,
    title: product.title,
    subtitle: product.subtitle ?? null,
    description: product.description ?? null,
    handle: product.handle,
    average_rating: product.average_rating ?? 0,
    supported_countries: product.supported_countries ?? [],
    content_locales,
    ...(pc ? { provenance_country: pc } : {}),
    ...(pr ? { provenance_region: pr } : {}),
    "seller.handle": seller.handle,
    seller: {
      handle: seller.handle,
      store_status: seller.store_status ?? null,
    },
    category_ids: categoryIds,
    collection_ids: collectionIds,
    "categories.name": categoryNames,
    "tags.value": tags,
    "type.value": typeValue,
    "variants.color": [...colors],
    "variants.size": [...sizes],
    "variants.condition": [...conditions],
    min_prices: minPrices,
    collection: product.collection?.title
      ? { title: product.collection.title }
      : null,
    brand: product.brand ?? null,
    variant_titles: variantTitles,
    listing_certifications: listingCertifications,
    listing_card,
  }

  if (pdpSources) {
    doc.pdp = buildPdpStoreProductJson(
      product,
      pdpSources,
      listingExtras ?? null,
      "eur"
    )
  }

  return doc
}

export function collectMinPriceCurrencyKeys(
  docs: Record<string, unknown>[]
): string[] {
  const keys = new Set<string>()
  for (const d of docs) {
    const mp = d.min_prices as Record<string, number> | undefined
    if (mp && typeof mp === "object") {
      for (const k of Object.keys(mp)) {
        keys.add(`min_prices.${k}`)
      }
    }
  }
  return [...keys]
}
