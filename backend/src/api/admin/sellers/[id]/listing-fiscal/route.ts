import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"

import { mergeSellerListingFiscalFromRequestBody } from "../../../../../lib/seller-listing-metadata"

/** POST body: solo `partita_iva`, `rea`, `sdi` (opzionali). Fuori dallo schema Mercur su POST /admin/sellers/:id. */
export async function POST(
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
): Promise<void> {
  const id = req.params.id as string
  const body =
    req.body && typeof req.body === "object" && !Array.isArray(req.body)
      ? (req.body as Record<string, unknown>)
      : {}
  await mergeSellerListingFiscalFromRequestBody(req.scope, id, body)
  res.json({ ok: true })
}
