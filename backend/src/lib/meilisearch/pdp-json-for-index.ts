import type { ListingIndexExtras } from "./listing-index-extras"
import type { MercurSearchTransformProduct } from "./product-record-types"
import type { PdpSourceSnapshot } from "./pdp-source-snapshot"
import { inventoryQuantityFromVariantRaw } from "./variant-inventory-from-raw"

function pickVariantPrice(
  prices: { amount?: number; currency_code?: string }[] | undefined,
  prefCc: string
): { amount: number; currency_code: string } | null {
  if (!Array.isArray(prices) || prices.length === 0) {
    return null
  }
  const cc = prefCc.toLowerCase()
  let row = prices.find((p) => p.currency_code?.toLowerCase() === cc)
  if (!row) {
    row = prices.find((p) => p.currency_code?.toLowerCase() === "eur")
  }
  if (!row) {
    row = prices[0]
  }
  if (
    !row ||
    typeof row.amount !== "number" ||
    row.amount <= 0 ||
    !row.currency_code
  ) {
    return null
  }
  return { amount: row.amount, currency_code: row.currency_code.toLowerCase() }
}

function rawVariantsById(variantsRaw: unknown): Map<string, Record<string, unknown>> {
  const m = new Map<string, Record<string, unknown>>()
  if (!Array.isArray(variantsRaw)) {
    return m
  }
  for (const v of variantsRaw) {
    if (v && typeof v === "object" && "id" in v) {
      m.set(String((v as { id: unknown }).id), v as Record<string, unknown>)
    }
  }
  return m
}

/**
 * JSON compatibile con `HttpTypes.StoreProduct` per la PDP, da servire senza GET `/store/products`.
 */
export function buildPdpStoreProductJson(
  parsed: MercurSearchTransformProduct & {
    tags?: { value?: string }[] | null
    subtitle?: string | null
  },
  sources: PdpSourceSnapshot,
  extras: ListingIndexExtras | null | undefined,
  defaultCurrency = "eur"
): Record<string, unknown> {
  const rawV = rawVariantsById(sources.variantsRaw)

  const optionsRaw = (sources.optionsRaw ?? []) as {
    id?: string
    title?: string
    values?: { id?: string; value?: string | null }[]
  }[]
  const storeOptions = optionsRaw
    .filter((o) => o?.title && Array.isArray(o.values) && o.values.length > 0)
    .map((o) => ({
      id: String(o.id ?? `opt_${String(o.title)}`),
      title: String(o.title),
      values: (o.values ?? []).map((vv, idx) => ({
        id: String(vv?.id ?? `ov_${String(o.title)}_${idx}`),
        value: vv?.value ?? "",
      })),
    }))

  const attrOut: Record<string, unknown>[] = []
  const avRaw = sources.attributeValuesRaw
  if (Array.isArray(avRaw)) {
    let i = 0
    for (const row of avRaw) {
      if (!row || typeof row !== "object") {
        continue
      }
      const r = row as {
        id?: string
        value?: unknown
        attribute?: { id?: string; name?: string }
      }
      const attr = r.attribute
      if (!attr?.name) {
        continue
      }
      const aid = String(attr.id ?? `attr_${attr.name}`)
      const rid = String(r.id ?? `av_${aid}_${i++}`)
      let val = ""
      if (typeof r.value === "string") {
        val = r.value
      } else if (r.value != null && typeof r.value !== "object") {
        val = String(r.value)
      }
      attrOut.push({
        id: rid,
        attribute_id: aid,
        value: val,
        attribute: { id: aid, name: String(attr.name) },
      })
    }
  }

  const parsedVariants = (parsed.variants ?? []) as Record<string, unknown>[]
  const outVariants: Record<string, unknown>[] = []

  for (const pv of parsedVariants) {
    const vid = String(pv.id ?? "")
    if (!vid) {
      continue
    }
    const raw = rawV.get(vid) ?? {}
    const prices = raw.prices as { amount?: number; currency_code?: string }[] | undefined
    const calc = pickVariantPrice(prices, defaultCurrency)
    const meta = raw.metadata as Record<string, unknown> | undefined

    const optRows: { option: { title: string }; value: string }[] = []
    for (const so of storeOptions) {
      const key = so.title.toLowerCase()
      const val = pv[key]
      if (typeof val === "string" && val) {
        optRows.push({ option: { title: so.title }, value: val })
      }
    }

    const inventory_quantity = inventoryQuantityFromVariantRaw(raw)

    const miRaw = raw.manage_inventory
    /** Se assente dal graph, assumiamo tracciamento giacenze (catalogo food). */
    const manage_inventory =
      typeof miRaw === "boolean" ? miRaw : true

    const vOut: Record<string, unknown> = {
      id: vid,
      title: typeof pv.title === "string" ? pv.title : null,
      sku: typeof pv.sku === "string" ? pv.sku : null,
      metadata: meta ?? null,
      inventory_quantity,
      manage_inventory,
      options: optRows,
    }

    if (calc) {
      vOut.calculated_price = {
        id: `${vid}_idx_calc`,
        calculated_amount: calc.amount,
        calculated_amount_with_tax: calc.amount,
        currency_code: calc.currency_code,
        original_amount: calc.amount,
        calculated_price: { price_list_type: "meili_index" },
      }
    }

    outVariants.push(vOut)
  }

  const tagsIn = parsed.tags ?? []
  const tagsOut = (Array.isArray(tagsIn) ? tagsIn : []).map((t, idx) => ({
    id: `tag_${idx}_${String((t as { value?: string })?.value ?? idx)}`,
    value: String((t as { value?: string })?.value ?? ""),
  }))

  const imgs = parsed.images ?? []
  const imagesOut = Array.isArray(imgs)
    ? imgs.map((im, idx) => {
        const row = im as { id?: string; url?: string }
        return {
          id: String(row.id ?? `img_${idx}`),
          url: String(row.url ?? ""),
          created_at: "",
          updated_at: "",
          deleted_at: null,
          metadata: null,
          rank: idx,
          product_id: String(parsed.id),
        }
      })
    : []

  const sh = parsed.seller?.handle ?? ""
  const sellerOut = {
    id: extras?.seller_id || String(parsed.seller?.id ?? ""),
    name: (extras?.seller_display_name ?? "").trim() || " ",
    handle: sh,
    description: (extras?.seller_description ?? "").trim() || "",
    photo: (extras?.seller_photo ?? "").trim() || "",
    tax_id: (extras?.seller_tax_id ?? "").trim() || "",
    created_at: (extras?.seller_created_at ?? "").trim() || "",
    country_code: extras?.seller_country_code ?? undefined,
    state: extras?.seller_state ?? undefined,
    store_status: (parsed.seller?.store_status ?? "ACTIVE") as string,
  }

  return {
    id: parsed.id,
    title: parsed.title,
    subtitle: parsed.subtitle ?? null,
    handle: parsed.handle,
    description: parsed.description ?? null,
    thumbnail: parsed.thumbnail ?? null,
    images: imagesOut,
    metadata: parsed.metadata ?? null,
    created_at: sources.created_at ?? "",
    options: storeOptions,
    variants: outVariants,
    tags: tagsOut,
    type: parsed.type ?? null,
    categories: parsed.categories ?? [],
    collection: parsed.collection ?? null,
    brand: parsed.brand ?? null,
    seller: sellerOut,
    attribute_values: attrOut,
  }
}
