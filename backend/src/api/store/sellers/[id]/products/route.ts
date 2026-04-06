import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import {
  ContainerRegistrationKeys,
  Modules,
} from "@medusajs/framework/utils"

const STORE_PRODUCT_FIELDS =
  "*variants.calculated_price,+variants.inventory_quantity,*seller,*variants,*attribute_values,*attribute_values.attribute"

/**
 * Listing prodotti per seller: il GET /store/products in lista non espande `seller`;
 * con `id` singolo sì. Qui paginiamo i `product_id` dalla tabella link Mercur e
 * ricostruiamo la risposta come il client storefront si aspetta.
 */
export async function GET(req: MedusaRequest, res: MedusaResponse): Promise<void> {
  const sellerId = req.params.id as string
  if (!sellerId?.trim()) {
    res.status(400).json({ message: "seller id mancante" })
    return
  }

  const limit = Math.min(Math.max(Number(req.query.limit) || 12, 1), 48)
  const offset = Math.max(Number(req.query.offset) || 0, 0)
  const countryCode = String(req.query.country_code || "it").trim() || "it"

  const clientPk =
    (req.headers["x-publishable-api-key"] as string | undefined)?.trim() || ""
  let publishableToken = clientPk
  if (!publishableToken) {
    const api = req.scope.resolve(Modules.API_KEY) as {
      listApiKeys: (
        f: { type: string },
        c: { take: number }
      ) => Promise<{ token?: string }[]>
    }
    const [row] = await api.listApiKeys({ type: "publishable" }, { take: 1 })
    publishableToken = row?.token || ""
  }
  if (!publishableToken) {
    res.status(400).json({ message: "Publishable API key richiesta" })
    return
  }

  const knex = req.scope.resolve(ContainerRegistrationKeys.PG_CONNECTION) as any

  const totalRow = await knex("seller_seller_product_product")
    .where({ seller_id: sellerId })
    .whereNull("deleted_at")
    .count("* as c")
    .first()
  const count = Number(totalRow?.c ?? 0)

  const idRows = await knex("seller_seller_product_product")
    .where({ seller_id: sellerId })
    .whereNull("deleted_at")
    .select("product_id")
    .orderBy("product_id", "asc")
    .limit(limit)
    .offset(offset)

  const productIds = idRows.map((r: { product_id: string }) => r.product_id)

  const port = process.env.PORT || "9000"
  const base = (
    process.env.MEDUSA_BACKEND_URL || `http://127.0.0.1:${port}`
  ).replace(/\/$/, "")
  const headers: Record<string, string> = {
    "x-publishable-api-key": publishableToken,
  }
  const auth = req.headers.authorization
  if (typeof auth === "string" && auth.trim()) {
    headers.authorization = auth.trim()
  }

  const products: unknown[] = []
  const chunkSize = 6
  for (let i = 0; i < productIds.length; i += chunkSize) {
    const chunk = productIds.slice(i, i + chunkSize)
    const batch = await Promise.all(
      chunk.map(async (id: string) => {
        const u = new URL(`${base}/store/products`)
        u.searchParams.set("id", id)
        u.searchParams.set("country_code", countryCode)
        u.searchParams.set("fields", STORE_PRODUCT_FIELDS)
        const r = await fetch(u.toString(), { headers, cache: "no-store" })
        if (!r.ok) {
          return null
        }
        const j = (await r.json()) as { products?: unknown[] }
        return j.products?.[0] ?? null
      })
    )
    for (const p of batch) {
      if (p) {
        products.push(p)
      }
    }
  }

  res.json({ products, count, limit, offset })
}
