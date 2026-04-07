import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"

import {
  getSellerListingMetadata,
  setSellerListingMetadata,
} from "../../../../../lib/seller-listing-metadata"
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

/**
 * Merge su `seller_listing_profile.metadata` senza passare dal body validato di
 * `POST /vendor/sellers/me` (Mercur non ammette `metadata` lì).
 *
 * Body: `{ metadata: Record<string, unknown> }` — merge superficiale con il blob esistente.
 */
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
  const patch = body.metadata
  if (!patch || typeof patch !== "object" || Array.isArray(patch)) {
    res.status(400).json({
      message: "Body richiede un oggetto `metadata` per il merge sul listing.",
    })
    return
  }

  const prev = await getSellerListingMetadata(req.scope, sellerId)
  const next: Record<string, unknown> = {
    ...prev,
    ...(patch as Record<string, unknown>),
  }
  await setSellerListingMetadata(req.scope, sellerId, next)
  res.json({ ok: true })
}
