import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

import { getSellerListingMetadata } from "../../../../../lib/seller-listing-metadata"

/**
 * Risolve un seller per storefront sia per **handle** (`alpe-magna`) sia per **id** (`sel_...`).
 * Mercur `GET /store/seller/:handle` non popola la risposta quando il parametro è l'id tecnico.
 */
/**
 * Campi graph sul modulo `seller`: `*reviews` non è una relazione valida su questa
 * entità (MikroORM: "does not have property '*reviews'") → 500 e storefront vuoto.
 * Le recensioni su scheda venditore restano caricabili da altri endpoint se serve.
 */
const DEFAULT_STORE_SELLER_FIELDS = [
  "id",
  "name",
  "handle",
  "description",
  "photo",
  "email",
  "phone",
  "store_status",
  "address_line",
  "city",
  "state",
  "postal_code",
  "country_code",
  "tax_id",
  "created_at",
  "updated_at",
]

function resolveFilters(ref: string): { id: string } | { handle: string } {
  const t = ref.trim()
  if (t.startsWith("sel_") && t.length > 4) {
    return { id: t }
  }
  return { handle: t }
}

export async function GET(req: MedusaRequest, res: MedusaResponse): Promise<void> {
  const ref = req.params.ref as string
  if (!ref?.trim()) {
    res.status(400).json({ message: "ref mancante" })
    return
  }

  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
  const { data: sellers } = await query.graph({
    entity: "seller",
    fields: DEFAULT_STORE_SELLER_FIELDS,
    filters: resolveFilters(ref),
  })

  const seller = sellers?.[0]
  if (!seller?.id) {
    res.status(404).json({ message: "Seller non trovato" })
    return
  }

  const meta = await getSellerListingMetadata(req.scope, seller.id)
  const merged =
    meta && Object.keys(meta).length > 0 ? { ...seller, metadata: meta } : seller

  res.json({ seller: merged })
}
