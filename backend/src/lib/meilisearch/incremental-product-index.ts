import type { MedusaContainer } from "@medusajs/framework/types"
import {
  ContainerRegistrationKeys,
  ProductVariantWorkflowEvents,
  ProductWorkflowEvents,
} from "@medusajs/framework/utils"

import { createMeilisearchClient, getProductsIndex } from "./client"
import { isMeilisearchConfigured } from "./env"
import { findAndTransformPublishedProductsForMeili } from "./mercur-published-products-for-index"
import { productToMeilisearchRecord } from "./product-record"

async function resolveVariantProductId(
  container: MedusaContainer,
  variantId: string
): Promise<string | null> {
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const { data } = await query.graph({
    entity: "product_variant",
    fields: ["product_id"],
    filters: { id: variantId },
  })
  const row = data[0] as { product_id?: string } | undefined
  return row?.product_id ?? null
}

export async function removeProductFromMeilisearchIndex(
  productId: string
): Promise<void> {
  if (!isMeilisearchConfigured()) {
    return
  }
  const client = createMeilisearchClient()
  const index = getProductsIndex(client)
  const task = await index.deleteDocument(productId)
  await client.waitForTask(task.taskUid)
}

/**
 * Aggiorna o rimuove un documento prodotto nell’indice Meilisearch (stesso schema di `sync-meilisearch.ts`).
 * Non ricalcola le impostazioni indice (filterableAttributes): va eseguito `yarn meilisearch:sync` dopo cambi di schema facet.
 */
export async function upsertProductInMeilisearchIndex(
  container: MedusaContainer,
  productId: string
): Promise<void> {
  if (!isMeilisearchConfigured()) {
    return
  }

  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const { products, listingIndexExtrasByProductId } =
    await findAndTransformPublishedProductsForMeili(container, [productId])

  if (!products.length) {
    await removeProductFromMeilisearchIndex(productId)
    return
  }

  const { data: metaRows } = await query.graph({
    entity: "product",
    filters: { id: productId },
    fields: ["id", "metadata"],
  })
  const meta =
    (metaRows[0] as { metadata?: unknown } | undefined)?.metadata ?? null
  const raw = products[0] as Record<string, unknown>
  raw.metadata = meta

  const { data: collRows } = await query.graph({
    entity: "product",
    filters: { id: productId },
    fields: ["id", "collection.id"],
  })
  const collectionId =
    (collRows[0] as { collection?: { id?: string } | undefined } | undefined)
      ?.collection?.id ?? null

  const rec = productToMeilisearchRecord(
    raw as Parameters<typeof productToMeilisearchRecord>[0],
    collectionId,
    listingIndexExtrasByProductId.get(productId) ?? null
  )
  if (!rec) {
    await removeProductFromMeilisearchIndex(productId)
    return
  }

  const client = createMeilisearchClient()
  const index = getProductsIndex(client)
  const task = await index.addDocuments([rec], { primaryKey: "id" })
  await client.waitForTask(task.taskUid)
}

export async function handleMeilisearchProductIndexEvent(
  container: MedusaContainer,
  eventName: string,
  data: { id?: string }
): Promise<void> {
  if (!isMeilisearchConfigured()) {
    return
  }
  const entityId = data?.id
  if (!entityId) {
    return
  }

  if (eventName === ProductWorkflowEvents.DELETED) {
    await removeProductFromMeilisearchIndex(entityId)
    return
  }

  let productId = entityId
  if (
    eventName === ProductVariantWorkflowEvents.CREATED ||
    eventName === ProductVariantWorkflowEvents.UPDATED ||
    eventName === ProductVariantWorkflowEvents.DELETED
  ) {
    const resolved = await resolveVariantProductId(container, entityId)
    if (!resolved) {
      return
    }
    productId = resolved
  }

  await upsertProductInMeilisearchIndex(container, productId)
}
