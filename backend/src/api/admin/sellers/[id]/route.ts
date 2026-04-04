import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { updateSellerWorkflow } from "@mercurjs/b2c-core/workflows"

import {
  getSellerListingMetadata,
} from "../../../../lib/seller-listing-metadata"

const DEFAULT_SELLER_GRAPH_FIELDS = [
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
  "*members",
]

function resolveSellerGraphFields(
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
  if (Array.isArray(q) && q.length > 0) {
    return q.flatMap((part) =>
      typeof part === "string"
        ? part.split(",").map((s) => s.trim()).filter(Boolean)
        : []
    )
  }
  return DEFAULT_SELLER_GRAPH_FIELDS
}

/**
 * Sostituisce il GET Mercur: unisce `seller_listing_profile.metadata` perché il modello Seller non ha metadata.
 */
export async function GET(
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
): Promise<void> {
  const id = req.params.id as string
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
  const fields = resolveSellerGraphFields(req)
  const { data: [seller] } = await query.graph(
    {
      entity: "seller",
      fields,
      filters: { id },
    },
    { throwIfKeyNotFound: true }
  )
  const meta = await getSellerListingMetadata(req.scope, id)
  res.json({
    seller:
      Object.keys(meta).length > 0 ? { ...seller, metadata: meta } : seller,
  })
}

/**
 * Allineato a Mercur POST /admin/sellers/:id; nella risposta include metadata listing come GET.
 */
export const POST = async (
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
): Promise<void> => {
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
  const { id } = req.params
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
  const fields = resolveSellerGraphFields(req)
  const { data: [seller] } = await query.graph({
    entity: "seller",
    fields,
    filters: { id },
  })
  const meta = await getSellerListingMetadata(req.scope, id!)
  res.json({
    seller:
      Object.keys(meta).length > 0 ? { ...seller, metadata: meta } : seller,
  })
}
