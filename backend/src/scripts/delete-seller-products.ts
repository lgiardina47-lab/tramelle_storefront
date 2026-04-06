/**
 * Elimina tutti i prodotti collegati a un seller (tabella link Mercur `seller_seller_product_product`).
 *
 * DELETE_SELLER_PRODUCTS_CONFIRM=1 \
 * DELETE_SELLER_PRODUCTS_SELLER_ID=sel_... \
 * npx medusa exec ./src/scripts/delete-seller-products.ts
 */

import type { ExecArgs } from "@medusajs/framework/types"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { deleteProductsWorkflow } from "@medusajs/medusa/core-flows"

const BATCH = 80

function wantsConfirm(): boolean {
  return (
    process.env.DELETE_SELLER_PRODUCTS_CONFIRM === "1" ||
    process.argv.includes("--confirm")
  )
}

export default async function deleteSellerProducts({ container }: ExecArgs) {
  if (!wantsConfirm()) {
    throw new Error(
      "Imposta DELETE_SELLER_PRODUCTS_CONFIRM=1 oppure aggiungi --confirm."
    )
  }

  const sellerId = process.env.DELETE_SELLER_PRODUCTS_SELLER_ID?.trim()
  if (!sellerId) {
    throw new Error(
      "Imposta DELETE_SELLER_PRODUCTS_SELLER_ID (es. sel_01KN7BFK0SBWV25MEB8S6S43VP)."
    )
  }

  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const knex = container.resolve(ContainerRegistrationKeys.PG_CONNECTION) as unknown as {
    (table: string): any
  }

  const rows = await knex("seller_seller_product_product")
    .where({ seller_id: sellerId })
    .whereNull("deleted_at")
    .select("product_id")

  const idSet = new Set<string>()
  for (const r of rows as { product_id: string }[]) {
    idSet.add(String(r.product_id))
  }
  const ids = [...idSet]
  if (!ids.length) {
    logger.info(`Nessun prodotto collegato al seller ${sellerId}.`)
    return
  }

  logger.info(
    `=== Eliminazione ${ids.length} prodotti per seller ${sellerId} ===`
  )

  let done = 0
  for (let i = 0; i < ids.length; i += BATCH) {
    const chunk = ids.slice(i, i + BATCH)
    await deleteProductsWorkflow(container).run({ input: { ids: chunk } })
    done += chunk.length
    logger.info(`Eliminati ${done} / ${ids.length}`)
  }

  logger.info(`=== Completato: ${done} prodotti eliminati ===`)
}
