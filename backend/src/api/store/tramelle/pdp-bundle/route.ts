import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

import { getProductsIndex, getSingletonMeilisearchClient } from "../../../../lib/meilisearch/client"
import { isMeilisearchConfigured } from "../../../../lib/meilisearch/env"
import { escapeMeiliFilterValue } from "../../../../lib/meilisearch/meili-filter-escape"
import { meiliHitsToListingProducts } from "../../../../lib/meilisearch/meili-hit-to-listing-product"

/**
 * Una sola risposta JSON per la PDP: `product` da `hit.pdp` (indice Meilisearch)
 * + `more_from_seller` da seconda query Meilisearch (stesso seller). Nessun GET `/store/products`.
 */
export async function GET(req: MedusaRequest, res: MedusaResponse): Promise<void> {
  if (!isMeilisearchConfigured()) {
    res.status(503).json({
      message:
        "PDP bundle non disponibile senza Meilisearch. Esegui yarn meilisearch:sync.",
    })
    return
  }

  const handle = String(req.query.handle ?? "").trim()
  if (!handle) {
    res.status(400).json({ message: "Query handle obbligatorio" })
    return
  }

  const currency_code = String(req.query.currency_code ?? "eur")
    .trim()
    .toLowerCase()

  const meili = getSingletonMeilisearchClient()
  const index = getProductsIndex(meili)

  const hEsc = escapeMeiliFilterValue(handle)
  const main = await index.search("", {
    filter: `handle = "${hEsc}"`,
    limit: 1,
  })

  const hit = main.hits[0] as Record<string, unknown> | undefined
  if (!hit) {
    res.status(404).json({ message: "Prodotto non trovato" })
    return
  }

  const pdp = hit.pdp as Record<string, unknown> | undefined
  if (!pdp || typeof pdp !== "object") {
    res.status(503).json({
      message:
        "Documento indice senza campo pdp: rieseguire yarn meilisearch:sync sul backend.",
    })
    return
  }

  const sellerDot = hit["seller.handle"]
  const sellerHandle =
    typeof sellerDot === "string"
      ? sellerDot.trim()
      : String((hit.seller as { handle?: string } | undefined)?.handle ?? "").trim()

  let more_from_seller: Record<string, unknown>[] = []

  if (sellerHandle) {
    const shEsc = escapeMeiliFilterValue(sellerHandle)
    const rel = await index.search("", {
      filter: `"seller.handle" = "${shEsc}" AND handle != "${hEsc}"`,
      limit: 15,
    })
    more_from_seller = meiliHitsToListingProducts(
      rel.hits as Record<string, unknown>[],
      currency_code
    )
  }

  res.status(200).json({
    product: pdp,
    more_from_seller,
  })
}
