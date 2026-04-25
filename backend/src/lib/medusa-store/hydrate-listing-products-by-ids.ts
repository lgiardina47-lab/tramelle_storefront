/**
 * Idra i prodotti listing via GET `/store/products?id=` (chunk paralleli), stesso schema
 * del route seller: spesso più rapido di `query.graph` con espansione profonda su molti id.
 */
const LISTING_STORE_PRODUCT_FIELDS =
  "+thumbnail,*images," +
  "*variants.calculated_price,+variants.inventory_quantity,+metadata,*seller,*variants,*seller.products," +
  "*seller.reviews,*seller.reviews.customer,*seller.reviews.seller,*seller.products.variants,*attribute_values,*attribute_values.attribute"

export async function hydrateListingProductsByIds(args: {
  productIds: string[]
  country_code: string
  region_id?: string
  publishableApiKey: string
  authorization?: string
}): Promise<{ products: unknown[]; hydrateMs: number }> {
  const { productIds, country_code, region_id, publishableApiKey, authorization } =
    args
  if (productIds.length === 0) {
    return { products: [], hydrateMs: 0 }
  }

  const port = process.env.PORT || "9000"
  const base = (
    process.env.MEDUSA_BACKEND_URL || `http://127.0.0.1:${port}`
  ).replace(/\/$/, "")

  const headers: Record<string, string> = {
    "x-publishable-api-key": publishableApiKey,
  }
  if (authorization?.trim()) {
    headers.authorization = authorization.trim()
  }

  const t0 = Date.now()
  /** Listing storefront: fino a 12 hit/pagina → un solo round di GET paralleli. */
  const chunkSize = 12
  const productMap = new Map<string, unknown>()

  for (let i = 0; i < productIds.length; i += chunkSize) {
    const chunk = productIds.slice(i, i + chunkSize)
    const batch = await Promise.all(
      chunk.map(async (id) => {
        const u = new URL(`${base}/store/products`)
        u.searchParams.set("id", id)
        u.searchParams.set("country_code", country_code)
        if (region_id?.trim()) {
          u.searchParams.set("region_id", region_id.trim())
        }
        u.searchParams.set("fields", LISTING_STORE_PRODUCT_FIELDS)
        u.searchParams.set("limit", "1")
        const r = await fetch(u.toString(), { headers, cache: "no-store" })
        if (!r.ok) {
          return null
        }
        const j = (await r.json()) as { products?: unknown[] }
        return j.products?.[0] ?? null
      })
    )
    for (const p of batch) {
      if (p && typeof p === "object" && "id" in p) {
        productMap.set(String((p as { id: unknown }).id), p)
      }
    }
  }

  const ordered = productIds
    .map((id) => productMap.get(id))
    .filter(Boolean) as unknown[]

  return { products: ordered, hydrateMs: Date.now() - t0 }
}
