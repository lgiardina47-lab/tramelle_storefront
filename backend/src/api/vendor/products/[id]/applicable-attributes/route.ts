import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import categoryAttributeLink from "@mercurjs/b2c-core/links/category-attribute"
import { retrieveAttributeQueryConfig } from "@mercurjs/b2c-core/api/vendor/attributes/query-config"

type ReqWithQueryConfig = MedusaRequest & {
  queryConfig?: { fields?: string[] }
}

function resolveAttributeFields(req: MedusaRequest): string[] {
  const fromMw = (req as ReqWithQueryConfig).queryConfig?.fields
  if (Array.isArray(fromMw) && fromMw.length > 0) {
    return fromMw
  }
  const defaults = [...retrieveAttributeQueryConfig.defaults]
  const raw = req.query?.fields
  if (typeof raw === "string" && raw.length > 0) {
    const parts = raw.split(",").map((s) => s.trim()).filter(Boolean)
    if (parts.includes("+is_required") || parts.includes("is_required")) {
      if (!defaults.includes("is_required")) {
        defaults.push("is_required")
      }
    }
  }
  return defaults
}

/**
 * Sostituisce la route Mercur che assume sempre `product.categories` valorizzato e
 * allinea i filtri a `getApplicableAttributes` dell'admin (`deleted_at`, categorie vuote).
 */
export async function GET(
  req: MedusaRequest,
  res: MedusaResponse
): Promise<void> {
  const productId = req.params.id as string
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
  const fields = resolveAttributeFields(req)

  const { data: products } = await query.graph({
    entity: "product",
    fields: ["categories.id"],
    filters: { id: productId },
  })
  const product = products[0] as
    | { categories?: { id: string }[] | null }
    | undefined
  if (!product) {
    res.status(404).json({ message: "Product not found" })
    return
  }

  const categoryIds = Array.isArray(product.categories)
    ? product.categories.map((c) => c.id)
    : []

  const { data: catAttrRows } = await query.graph({
    entity: categoryAttributeLink.entryPoint,
    fields: ["attribute_id"],
    filters: {
      deleted_at: { $eq: null },
    },
  })
  const attributeIds = [
    ...new Set(
      catAttrRows.map(
        (row: { attribute_id: string }) => row.attribute_id
      ) as string[]
    ),
  ]

  let globalAttributes: Record<string, unknown>[] = []
  if (attributeIds.length === 0) {
    const { data } = await query.graph({
      entity: "attribute",
      fields,
      filters: {
        deleted_at: { $eq: null },
      },
    })
    globalAttributes = data as Record<string, unknown>[]
  } else {
    const { data } = await query.graph({
      entity: "attribute",
      fields,
      filters: {
        id: { $nin: attributeIds },
        deleted_at: { $eq: null },
      },
    })
    globalAttributes = data as Record<string, unknown>[]
  }

  let categorySlice: Record<string, unknown>[] = []
  if (categoryIds.length > 0) {
    const { data: categoryAttributes } = await query.graph({
      entity: categoryAttributeLink.entryPoint,
      fields: fields.map((field) => `attribute.${field}`),
      filters: {
        product_category_id: categoryIds,
        deleted_at: { $eq: null },
      },
    })
    categorySlice = (categoryAttributes as { attribute: Record<string, unknown> }[])
      .map((rel) => rel.attribute)
      .filter(Boolean)
  }

  res.json({
    attributes: [...globalAttributes, ...categorySlice],
  })
}
