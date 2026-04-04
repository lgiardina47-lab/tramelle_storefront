import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

import { mergeSellerListingFiscalFromRequestBody } from "../../../../../lib/seller-listing-metadata"

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
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
  const { data: [sellerRef] } = await query.graph({
    entity: "seller",
    filters: { members: { id: actorId } },
    fields: ["id"],
  })
  if (!sellerRef?.id) {
    res.status(404).json({ message: "Seller not found" })
    return
  }
  const body =
    req.body && typeof req.body === "object" && !Array.isArray(req.body)
      ? (req.body as Record<string, unknown>)
      : {}
  await mergeSellerListingFiscalFromRequestBody(req.scope, sellerRef.id, body)
  res.json({ ok: true })
}
