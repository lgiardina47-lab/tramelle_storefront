/**
 * Imposta la stessa giacenza per tutti gli inventory item collegati ai prodotti
 * di ogni seller, nella stock location predefinita del seller (come
 * set-seller-inventory-default-location.ts).
 *
 * SET_ALL_INVENTORY_CONFIRM=1 SET_ALL_INVENTORY_QTY=100 \
 *   npx medusa exec ./src/scripts/set-all-sellers-inventory-default-location.ts
 */

import type { ExecArgs } from "@medusajs/framework/types"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { batchInventoryItemLevelsWorkflow } from "@medusajs/medusa/core-flows"

const BATCH = 80

function wantsConfirm(): boolean {
  return (
    process.env.SET_ALL_INVENTORY_CONFIRM === "1" ||
    process.argv.includes("--confirm")
  )
}

function parseQty(): number {
  const raw = process.env.SET_ALL_INVENTORY_QTY?.trim()
  const n = raw ? Number.parseInt(raw, 10) : 100
  if (!Number.isFinite(n) || n < 0) {
    throw new Error(
      "SET_ALL_INVENTORY_QTY deve essere un intero >= 0 (default 100)."
    )
  }
  return n
}

export default async function setAllSellersInventoryDefaultLocation({
  container,
}: ExecArgs) {
  if (!wantsConfirm()) {
    throw new Error(
      "Imposta SET_ALL_INVENTORY_CONFIRM=1 oppure aggiungi --confirm."
    )
  }

  const qty = parseQty()
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const knex = container.resolve(ContainerRegistrationKeys.PG_CONNECTION) as unknown as {
    (table: string): any
  }

  const sellerRows = await knex("seller_seller_product_product")
    .whereNull("deleted_at")
    .distinct("seller_id")
    .select("seller_id")

  const sellerIds = (sellerRows as { seller_id: string }[])
    .map((r) => String(r.seller_id))
    .filter(Boolean)

  if (!sellerIds.length) {
    logger.info("Nessun seller con prodotti collegati.")
    return
  }

  const workflow = batchInventoryItemLevelsWorkflow(container)

  for (const sellerId of sellerIds) {
    const locRows = await knex("seller_seller_stock_location_stock_location")
      .where({ seller_id: sellerId })
      .whereNull("deleted_at")
      .orderBy("created_at", "asc")
      .select("stock_location_id")
    const first = locRows[0] as { stock_location_id?: string } | undefined
    if (!first?.stock_location_id) {
      logger.warn(
        `Seller ${sellerId}: nessuna stock location, salto.`
      )
      continue
    }
    const stockLocationId = String(first.stock_location_id)

    const productRows = await knex("seller_seller_product_product")
      .where({ seller_id: sellerId })
      .whereNull("deleted_at")
      .select("product_id")
    const productIds = [
      ...new Set(
        (productRows as { product_id: string }[]).map((r) =>
          String(r.product_id)
        )
      ),
    ]
    if (!productIds.length) {
      continue
    }

    const variantRows = await knex("product_variant")
      .whereIn("product_id", productIds)
      .whereNull("deleted_at")
      .select("id")
    const variantIds = variantRows.map((r: { id: string }) => String(r.id))
    if (!variantIds.length) {
      continue
    }

    const linkRows = await knex("product_variant_inventory_item")
      .whereIn("variant_id", variantIds)
      .whereNull("deleted_at")
      .select("inventory_item_id")
    const inventoryItemIds = [
      ...new Set(
        (linkRows as { inventory_item_id: string }[]).map((r) =>
          String(r.inventory_item_id)
        )
      ),
    ]
    if (!inventoryItemIds.length) {
      logger.info(
        `Seller ${sellerId}: nessun inventory item sulle varianti, salto.`
      )
      continue
    }

    const existingByItem = new Map<string, string>()
    for (let i = 0; i < inventoryItemIds.length; i += BATCH) {
      const chunk = inventoryItemIds.slice(i, i + BATCH)
      const levels = await knex("inventory_level")
        .whereIn("inventory_item_id", chunk)
        .where({ location_id: stockLocationId })
        .whereNull("deleted_at")
        .select("id", "inventory_item_id")
      for (const lv of levels as {
        id: string
        inventory_item_id: string
      }[]) {
        existingByItem.set(lv.inventory_item_id, lv.id)
      }
    }

    const toCreate: {
      inventory_item_id: string
      location_id: string
      stocked_quantity: number
    }[] = []
    const toUpdate: {
      id: string
      inventory_item_id: string
      location_id: string
      stocked_quantity: number
    }[] = []

    for (const itemId of inventoryItemIds) {
      const levelId = existingByItem.get(itemId)
      if (levelId) {
        toUpdate.push({
          id: levelId,
          inventory_item_id: itemId,
          location_id: stockLocationId,
          stocked_quantity: qty,
        })
      } else {
        toCreate.push({
          inventory_item_id: itemId,
          location_id: stockLocationId,
          stocked_quantity: qty,
        })
      }
    }

    logger.info(
      `Seller ${sellerId} @ ${stockLocationId}: items=${inventoryItemIds.length} create=${toCreate.length} update=${toUpdate.length} qty=${qty}`
    )

    for (let i = 0; i < toCreate.length; i += BATCH) {
      await workflow.run({
        input: {
          create: toCreate.slice(i, i + BATCH),
          update: [],
          delete: [],
        },
      })
    }
    for (let i = 0; i < toUpdate.length; i += BATCH) {
      await workflow.run({
        input: {
          create: [],
          update: toUpdate.slice(i, i + BATCH),
          delete: [],
        },
      })
    }
  }

  logger.info("=== Inventario aggiornato per tutti i seller ===")
}
