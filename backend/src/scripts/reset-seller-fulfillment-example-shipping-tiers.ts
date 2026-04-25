/**
 * Reset completo sedi/zone/spedizioni per un seller + un magazzino "esempio".
 *
 * Tariffe (carrello = somma articoli, regola Medusa `item_total`):
 * - Italia: 7 € se carrello < 65 € — gratis se carrello ≥ 65 €
 * - Europa (paesi sotto, senza IT): 12,50 € se carrello < 95 € — gratis se ≥ 95 €
 *
 * Inventario: tutte le varianti del seller sul magazzino nuovo a qty 100 (override con SELLER_INV_QTY).
 *
 * AROKO_RESET_CONFIRM=1 npx medusa exec ./src/scripts/reset-seller-fulfillment-example-shipping-tiers.ts
 * Opzionale: SELLER_EMAIL=...  SELLER_INV_QTY=100
 */

import type { ExecArgs } from "@medusajs/framework/types"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import {
  batchInventoryItemLevelsWorkflow,
  createShippingOptionsWorkflow,
  createStockLocationsWorkflow,
  createServiceZonesWorkflow,
  deleteFulfillmentSetsWorkflow,
  deleteServiceZonesWorkflow,
  deleteShippingOptionsWorkflow,
  deleteStockLocationsWorkflow,
} from "@medusajs/medusa/core-flows"
import { SELLER_MODULE } from "@mercurjs/b2c-core/modules/seller"
import { SELLER_SHIPPING_PROFILE_LINK } from "@mercurjs/framework"
import { createLocationFulfillmentSetAndAssociateWithSellerWorkflow } from "@mercurjs/b2c-core/workflows"

const SELLER_EMAIL =
  process.env.SELLER_EMAIL?.trim() || "aroko-chocolate@tramelle.com"

// Paesi "Europa" in linea con provision-new-seller-fulfillment (senza IT)
const EU_NON_IT = [
  "be",
  "de",
  "dk",
  "se",
  "fr",
  "es",
  "pl",
  "cz",
  "nl",
] as const

const IT = "it" as const

// Minori (cent) — amount e soglie come in Medusa pricing
const THRESHOLD_IT = 65_00 // gratis da 65 € di carrello in su
const THRESHOLD_EU = 95_00 // gratis da 95 € di carrello in su
const PAID_IT = 7_00 // 7 € sotto soglia
const PAID_EU = 12_50 // 12,50 € sotto soglia

const BATCH = 80

function parseInvQty(): number {
  const raw = process.env.SELLER_INV_QTY?.trim()
  const n = raw ? Number.parseInt(raw, 10) : 100
  if (!Number.isFinite(n) || n < 0) {
    throw new Error("SELLER_INV_QTY deve essere intero >= 0 (default 100).")
  }
  return n
}

function wantsConfirm(): boolean {
  return (
    process.env.AROKO_RESET_CONFIRM === "1" || process.argv.includes("--confirm")
  )
}

type ServiceZoneInfo = { id: string; shipping_option_ids: string[] }

type CollectData = {
  stockLocationIds: string[]
  fulfillmentSetIds: string[]
  serviceZones: ServiceZoneInfo[]
  shippingOptionIds: string[]
}

export default async function resetSellerFulfillmentExample({
  container,
}: ExecArgs) {
  if (!wantsConfirm()) {
    throw new Error(
      "Imposta AROKO_RESET_CONFIRM=1 oppure aggiungi --confirm per eseguire il reset."
    )
  }

  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const knex = container.resolve(ContainerRegistrationKeys.PG_CONNECTION) as {
    (table: string): any
  }
  const link = container.resolve(ContainerRegistrationKeys.LINK)
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const fulfillmentService = container.resolve(Modules.FULFILLMENT)

  const sellerModule = container.resolve(SELLER_MODULE) as {
    listSellers: (
      filters: { email?: string },
      config: { take: number }
    ) => Promise<{ id: string }[]>
    retrieveSeller: (id: string) => Promise<{
      id: string
      name?: string
    }>
  }

  const [sRow] = await sellerModule.listSellers(
    { email: SELLER_EMAIL as never },
    { take: 1 }
  )
  if (!sRow) {
    throw new Error(`Seller non trovato per email: ${SELLER_EMAIL}`)
  }
  const seller = await sellerModule.retrieveSeller(sRow.id)
  const sellerId = seller.id
  const sellerName = (seller.name || "Store").slice(0, 200)
  const sellerSlug = sellerName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 32)

  const storeModule = container.resolve(Modules.STORE)
  const [store] = await storeModule.listStores({}, { take: 1 })
  if (!store?.default_sales_channel_id || !store?.default_region_id) {
    throw new Error(
      "Store senza default_sales_channel_id / default_region_id imposibile provisioning"
    )
  }
  const salesChannelId = store.default_sales_channel_id
  const regionId = store.default_region_id

  // --- Pacchetto dati da cancellare
  const locRows = await knex("seller_seller_stock_location_stock_location")
    .where({ seller_id: sellerId })
    .whereNull("deleted_at")
    .select("stock_location_id")

  const stockLocationIds = [
    ...new Set(
      (locRows as { stock_location_id: string }[]).map((r) =>
        String(r.stock_location_id)
      )
    ),
  ]

  const collected: CollectData = {
    stockLocationIds,
    fulfillmentSetIds: [],
    serviceZones: [],
    shippingOptionIds: [],
  }

  for (const slocId of stockLocationIds) {
    const { data: [row] } = await query.graph({
      entity: "stock_location",
      fields: [
        "id",
        "fulfillment_sets.id",
        "fulfillment_sets.service_zones.id",
      ],
      filters: { id: slocId },
    })
    if (!row) {
      continue
    }
    const fsets = (row as { fulfillment_sets?: { id: string; service_zones?: { id: string }[] }[] })
      .fulfillment_sets || []
    for (const fs of fsets) {
      if (fs.id) {
        collected.fulfillmentSetIds.push(fs.id)
      }
      const zones = fs.service_zones || []
      for (const z of zones) {
        if (!z?.id) {
          continue
        }
        const soRows = await fulfillmentService.listShippingOptions(
          { service_zone: { id: z.id } },
          { select: ["id"] }
        )
        const sids = soRows.map((o: { id: string }) => o.id)
        collected.shippingOptionIds.push(...sids)
        collected.serviceZones.push({ id: z.id, shipping_option_ids: sids })
      }
    }
  }

  // Dedup
  collected.fulfillmentSetIds = [...new Set(collected.fulfillmentSetIds)]
  collected.shippingOptionIds = [...new Set(collected.shippingOptionIds)]

  logger.info(
    `Reset seller ${sellerId} (${SELLER_EMAIL}): sloc=${collected.stockLocationIds.length} fs=${collected.fulfillmentSetIds.length} zones=${collected.serviceZones.length} so=${collected.shippingOptionIds.length}`
  )

  // 1) Opzioni spedizione
  if (collected.shippingOptionIds.length) {
    await deleteShippingOptionsWorkflow(container).run({
      input: { ids: collected.shippingOptionIds },
    })
  }

  // 2) Dismiss link seller <-> service_zone
  for (const z of collected.serviceZones) {
    const def = {
      [SELLER_MODULE]: { seller_id: sellerId },
      [Modules.FULFILLMENT]: { service_zone_id: z.id },
    }
    try {
      await link.dismiss([def])
    } catch (e) {
      logger.warn(
        `dismiss seller-service_zone ${z.id}: ${e instanceof Error ? e.message : String(e)}`
      )
    }
  }

  // 3) Service zones
  const zoneIds = collected.serviceZones.map((s) => s.id)
  if (zoneIds.length) {
    await deleteServiceZonesWorkflow(container).run({
      input: { ids: zoneIds },
    })
  }

  // 4) Fulfillment sets
  if (collected.fulfillmentSetIds.length) {
    await deleteFulfillmentSetsWorkflow(container).run({
      input: { ids: collected.fulfillmentSetIds },
    })
  }

  // 5) Stock locations
  if (collected.stockLocationIds.length) {
    await deleteStockLocationsWorkflow(container).run({
      input: { ids: collected.stockLocationIds },
    })
  }

  // --- Creazione: sede "esempio", due zone, due opzioni
  const {
    result: [stock],
  } = await createStockLocationsWorkflow(container).run({
    input: {
      locations: [
        {
          name: "esempio",
          address: {
            address_1: "Via esempio 1",
            city: "Roma",
            country_code: IT,
            postal_code: "00100",
          },
        },
      ],
    },
  })

  if (!stock?.id) {
    throw new Error("Creazione stock location fallita")
  }

  const stockId = stock.id

  await link.create([
    {
      [SELLER_MODULE]: { seller_id: sellerId },
      [Modules.STOCK_LOCATION]: { stock_location_id: stockId },
    },
    {
      [Modules.STOCK_LOCATION]: { stock_location_id: stockId },
      [Modules.FULFILLMENT]: { fulfillment_provider_id: "manual_manual" },
    },
    {
      [Modules.SALES_CHANNEL]: { sales_channel_id: salesChannelId },
      [Modules.STOCK_LOCATION]: { stock_location_id: stockId },
    },
  ] as any)

  await createLocationFulfillmentSetAndAssociateWithSellerWorkflow.run({
    container,
    input: {
      fulfillment_set_data: {
        name: `${sellerId} fulfillment set`,
        type: "shipping",
      },
      location_id: stockId,
      seller_id: sellerId,
    },
  })

  const { data: [stockWithFs] } = await query.graph({
    entity: "stock_location",
    fields: ["id", "fulfillment_sets.id"],
    filters: { id: stockId },
  })

  const fulfillmentSetId = (
    stockWithFs as { fulfillment_sets?: { id: string }[] } | undefined
  )?.fulfillment_sets?.[0]?.id
  if (!fulfillmentSetId) {
    throw new Error("Fulfillment set mancante dopo create")
  }

  const { result: createdZones } = await createServiceZonesWorkflow(
    container
  ).run({
    input: {
      data: [
        {
          fulfillment_set_id: fulfillmentSetId,
          name: "Italia",
          geo_zones: [
            { type: "country" as const, country_code: IT },
          ],
        },
        {
          fulfillment_set_id: fulfillmentSetId,
          name: "Europa (non-IT)",
          geo_zones: EU_NON_IT.map((country_code) => ({
            type: "country" as const,
            country_code,
          })),
        },
      ],
    },
  })

  const zones = Array.isArray(createdZones) ? createdZones : [createdZones]
  const itZone = zones.find((z) => (z as { name?: string }).name === "Italia")
  const euZone = zones.find(
    (z) => (z as { name?: string }).name === "Europa (non-IT)"
  )
  if (!itZone?.id || !euZone?.id) {
    throw new Error("Zone attese mancanti")
  }

  for (const z of [itZone, euZone]) {
    await link.create({
      [SELLER_MODULE]: { seller_id: sellerId },
      [Modules.FULFILLMENT]: { service_zone_id: (z as { id: string }).id },
    } as any)
  }

  const {
    data: [shippingProfile],
  } = await query.graph({
    entity: SELLER_SHIPPING_PROFILE_LINK,
    fields: ["shipping_profile_id"],
    filters: { seller_id: sellerId },
  })
  if (!(shippingProfile as { shipping_profile_id?: string })?.shipping_profile_id) {
    throw new Error("shipping_profile per seller mancante")
  }
  const shippingProfileId = (shippingProfile as { shipping_profile_id: string })
    .shipping_profile_id

  const itPrices = [
    {
      amount: 0,
      region_id: regionId,
      rules: [
        { attribute: "item_total" as const, operator: "gte" as const, value: THRESHOLD_IT },
      ],
    },
    {
      amount: PAID_IT,
      region_id: regionId,
      rules: [
        { attribute: "item_total" as const, operator: "lt" as const, value: THRESHOLD_IT },
      ],
    },
  ]

  const euPrices = [
    {
      amount: 0,
      region_id: regionId,
      rules: [
        { attribute: "item_total" as const, operator: "gte" as const, value: THRESHOLD_EU },
      ],
    },
    {
      amount: PAID_EU,
      region_id: regionId,
      rules: [
        { attribute: "item_total" as const, operator: "lt" as const, value: THRESHOLD_EU },
      ],
    },
  ]

  const { result: soIt } = await createShippingOptionsWorkflow.run({
    container,
    input: [
      {
        name: "Italia — 7 €, gratis se carrello ≥ 65 €",
        shipping_profile_id: shippingProfileId,
        service_zone_id: itZone.id,
        provider_id: "manual_manual",
        type: {
          label: "Italia",
          code: `${sellerSlug}-it`,
          description:
            "Costo fisso 7 €. Se il totale articoli del carrello è 65 € o più, spedizione 0 €.",
        },
        rules: [
          { value: "true", attribute: "enabled_in_store", operator: "eq" },
          { attribute: "is_return", value: "false", operator: "eq" },
        ],
        price_type: "flat",
        prices: itPrices,
        data: { id: "manual-fulfillment" },
      },
    ],
  })
  const { result: soEu } = await createShippingOptionsWorkflow.run({
    container,
    input: [
      {
        name: "Europa — 12,50 €, gratis se carrello ≥ 95 €",
        shipping_profile_id: shippingProfileId,
        service_zone_id: euZone.id,
        provider_id: "manual_manual",
        type: {
          label: "Europa (no Italia)",
          code: `${sellerSlug}-eu`,
          description:
            "Costo fisso 12,50 €. Se il totale articoli del carrello è 95 € o più, spedizione 0 €.",
        },
        rules: [
          { value: "true", attribute: "enabled_in_store", operator: "eq" },
          { attribute: "is_return", value: "false", operator: "eq" },
        ],
        price_type: "flat",
        prices: euPrices,
        data: { id: "manual-fulfillment" },
      },
    ],
  })

  const itOpt = soIt[0]
  const euOpt = soEu[0]
  if (itOpt?.id) {
    await link.create({
      [SELLER_MODULE]: { seller_id: sellerId },
      [Modules.FULFILLMENT]: { shipping_option_id: itOpt.id },
    } as any)
  }
  if (euOpt?.id) {
    await link.create({
      [SELLER_MODULE]: { seller_id: sellerId },
      [Modules.FULFILLMENT]: { shipping_option_id: euOpt.id },
    } as any)
  }

  // Re-indirizzamento inventario sul nuovo magazzino
  const productRows = await knex("seller_seller_product_product")
    .where({ seller_id: sellerId })
    .whereNull("deleted_at")
    .select("product_id")
  const productIds = [
    ...new Set(
      (productRows as { product_id: string }[]).map((r) => String(r.product_id))
    ),
  ]

  if (productIds.length) {
    const variantRows = await knex("product_variant")
      .whereIn("product_id", productIds)
      .whereNull("deleted_at")
      .select("id")
    const variantIds = variantRows.map((r: { id: string }) => String(r.id))

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

    if (inventoryItemIds.length) {
      const q = parseInvQty()
      const existingByItem = new Map<string, string>()
      for (let i = 0; i < inventoryItemIds.length; i += BATCH) {
        const chunk = inventoryItemIds.slice(i, i + BATCH)
        const levels = await knex("inventory_level")
          .whereIn("inventory_item_id", chunk)
          .where({ location_id: stockId })
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
            location_id: stockId,
            stocked_quantity: q,
          })
        } else {
          toCreate.push({
            inventory_item_id: itemId,
            location_id: stockId,
            stocked_quantity: q,
          })
        }
      }
      const wf = batchInventoryItemLevelsWorkflow(container)
      for (let i = 0; i < toCreate.length; i += BATCH) {
        await wf.run({
          input: {
            create: toCreate.slice(i, i + BATCH),
            update: [],
            delete: [],
          },
        })
      }
      for (let i = 0; i < toUpdate.length; i += BATCH) {
        await wf.run({
          input: {
            create: [],
            update: toUpdate.slice(i, i + BATCH),
            delete: [],
          },
        })
      }
      logger.info(
        `Inventario: qty=${q} su ${stockId} — create ${toCreate.length}, update ${toUpdate.length} (item ${inventoryItemIds.length})`
      )
    }
  }

  logger.info("=== Completato ===")
  const invQty = parseInvQty()
  console.log(
    JSON.stringify(
      {
        sellerId,
        email: SELLER_EMAIL,
        magazzino: { id: stockId, nome: "esempio" },
        italia: {
          ids: { service_zone: itZone.id, shipping_option: itOpt?.id },
          regola:
            "7 € se totale carrello sotto 65 € — spedizione gratis se carrello 65 € o più",
        },
        europa: {
          ids: { service_zone: euZone.id, shipping_option: euOpt?.id },
          regola:
            "12,50 € se totale carrello sotto 95 € — spedizione gratis se carrello 95 € o più",
        },
        ogniProdottoInMagazzino: invQty,
      },
      null,
      2
    )
  )
}
