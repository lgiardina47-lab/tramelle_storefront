import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { mergeSellerListingFiscalFromRequestBody } from "../../../../../lib/seller-listing-metadata"
import { resolveVendorSellerId } from "../../../../../lib/vendor-resolve-seller-id"

function getActorId(req: AuthenticatedMedusaRequest): string {
  const ctx = (
    req as AuthenticatedMedusaRequest & {
      auth_context?: { actor_id?: string }
    }
  ).auth_context
  const id = ctx?.actor_id
  if (!id) {
    throw new Error("Unauthorized")
  }
  return id
}

/** POST body: solo `partita_iva`, `rea`, `sdi` (opzionali). */
export async function POST(
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
): Promise<void> {
  const actorId = getActorId(req)
  const sellerId = await resolveVendorSellerId(req.scope, actorId)
  if (!sellerId) {
    res.status(404).json({ message: "Seller not found" })
    return
  }
  const body =
    req.body && typeof req.body === "object" && !Array.isArray(req.body)
      ? (req.body as Record<string, unknown>)
      : {}
  await mergeSellerListingFiscalFromRequestBody(req.scope, sellerId, body)
  res.json({ ok: true })
}
