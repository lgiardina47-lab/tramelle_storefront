import { ExecArgs } from "@medusajs/framework/types"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

import { buildMeilisearchSettings } from "../lib/meilisearch/index-settings"
import {
  collectMinPriceCurrencyKeys,
  productToMeilisearchRecord,
} from "../lib/meilisearch/product-record"
import { createMeilisearchClient, getProductsIndex } from "../lib/meilisearch/client"
import { findAndTransformPublishedProductsForMeili } from "../lib/meilisearch/mercur-published-products-for-index"

/**
 * Indicizza i prodotti pubblicati su Meilisearch (full rebuild + settings).
 * Aggiornamenti da admin/API: anche il subscriber `meilisearch-product-index.ts` (workflow product/variant).
 * Dopo import SQL/script senza eventi Medusa, rieseguire questo comando.
 * Uso: da /backend → `yarn meilisearch:sync` — in Docker: `bash scripts/meilisearch-full-sync-docker.sh` dalla root monorepo.
 */
export default async function runSyncMeilisearch({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const query = container.resolve(ContainerRegistrationKeys.QUERY)

  logger.info("Meilisearch: caricamento prodotti…")
  const { products, listingIndexExtrasByProductId, pdpSourcesByProductId } =
    await findAndTransformPublishedProductsForMeili(container, [])

  const ids = products.map((p) => String((p as { id: unknown }).id))
  const metaById = new Map<string, unknown>()
  const META_CHUNK = 150
  for (let i = 0; i < ids.length; i += META_CHUNK) {
    const slice = ids.slice(i, i + META_CHUNK)
    const { data: rows } = await query.graph({
      entity: "product",
      filters: { id: slice },
      fields: ["id", "metadata"],
    })
    for (const row of rows as { id: string; metadata?: unknown }[]) {
      metaById.set(row.id, row.metadata ?? null)
    }
  }
  for (const p of products) {
    const id = String((p as { id: string }).id)
    ;(p as { metadata?: unknown }).metadata = metaById.get(id) ?? null
  }

  const { data: collectionRows } = await query.graph({
    entity: "product",
    filters: { status: "published" },
    fields: ["id", "collection.id"],
  })
  const collectionByProduct = new Map<string, string>()
  for (const row of collectionRows as { id: string; collection?: { id?: string } | null }[]) {
    const cid = row.collection?.id
    if (row.id && cid) {
      collectionByProduct.set(row.id, cid)
    }
  }

  const docs: Record<string, unknown>[] = []
  for (const p of products) {
    const pid = String(p.id)
    const rec = productToMeilisearchRecord(
      p as Parameters<typeof productToMeilisearchRecord>[0],
      collectionByProduct.get(pid) ?? null,
      listingIndexExtrasByProductId.get(pid) ?? null,
      pdpSourcesByProductId.get(pid) ?? null
    )
    if (rec) {
      docs.push(rec)
    }
  }

  const minPriceKeys = collectMinPriceCurrencyKeys(docs)
  const settings = buildMeilisearchSettings(minPriceKeys)

  const client = createMeilisearchClient()
  const index = getProductsIndex(client)

  logger.info(
    `Meilisearch: aggiornamento impostazioni indice (${docs.length} documenti)…`
  )
  const settingsTask = await index.updateSettings(settings)
  await client.waitForTask(settingsTask.taskUid)

  logger.info("Meilisearch: svuotamento indice e caricamento batch…")
  const delTask = await index.deleteAllDocuments()
  await client.waitForTask(delTask.taskUid)

  const chunk = 500
  for (let i = 0; i < docs.length; i += chunk) {
    const slice = docs.slice(i, i + chunk)
    const task = await index.addDocuments(slice, { primaryKey: "id" })
    await client.waitForTask(task.taskUid)
    logger.info(`Meilisearch: indicizzati ${Math.min(i + chunk, docs.length)}/${docs.length}`)
  }

  logger.info("Meilisearch: sync completato.")
}
