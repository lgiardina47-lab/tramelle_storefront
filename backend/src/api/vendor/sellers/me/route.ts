import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { updateSellerWorkflow } from "@mercurjs/b2c-core/workflows"

import {
  getSellerListingMetadata,
} from "../../../../lib/seller-listing-metadata"

const DEFAULT_VENDOR_ME_FIELDS = [
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

function resolveVendorMeGraphFields(
  req: AuthenticatedMedusaRequest
): string[] {
  const qc = (
    req as AuthenticatedMedusaRequest & {
      queryConfig?: { fields?: string[] }
    }
  ).queryConfig?.fields
  if (Array.isArray(qc) && qc.length > 0) {
    return qc
  }
  const q = req.query?.fields
  if (typeof q === "string" && q.trim().length > 0) {
    return q.split(",").map((s) => s.trim()).filter(Boolean)
  }
  return DEFAULT_VENDOR_ME_FIELDS
}

function getActorId(req: AuthenticatedMedusaRequest): string {
  const ctx = (
    req as AuthenticatedMedusaRequest & { auth_context?: { actor_id?: string } }
  ).auth_context
  const id = ctx?.actor_id
  if (!id) {
    throw new Error("Unauthorized")
  }
  return id
}

/** GET /vendor/sellers/me — come Mercur + metadata listing (P.IVA / REA / SDI). */
export async function GET(
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
): Promise<void> {
  const actorId = getActorId(req)
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
  const fields = resolveVendorMeGraphFields(req)
  const { data: [seller] } = await query.graph(
    {
      entity: "seller",
      filters: { members: { id: actorId } },
      fields,
    },
    { throwIfKeyNotFound: true }
  )
  const meta = await getSellerListingMetadata(req.scope, seller.id)
  res.json({
    seller:
      Object.keys(meta).length > 0 ? { ...seller, metadata: meta } : seller,
  })
}

/** POST /vendor/sellers/me — update seller + fiscal fields su seller_listing_profile. */
export const POST = async (
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
): Promise<void> => {
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
  const id = sellerRef.id
  const body = (
    req as AuthenticatedMedusaRequest & {
      validatedBody?: Record<string, unknown>
    }
  ).validatedBody
  const workflowPayload: Record<string, unknown> =
    body && typeof body === "object" ? { ...body } : {}
  await updateSellerWorkflow(req.scope).run({
    input: {
      id,
      ...workflowPayload,
    },
  })
  const fields = resolveVendorMeGraphFields(req)
  const { data: [seller] } = await query.graph(
    {
      entity: "seller",
      filters: { members: { id: actorId } },
      fields,
    },
    { throwIfKeyNotFound: true }
  )
  const meta = await getSellerListingMetadata(req.scope, id)
  res.json({
    seller:
      Object.keys(meta).length > 0 ? { ...seller, metadata: meta } : seller,
  })
}
