/**
 * Imposta metadata.technical_sheet di esempio su un prodotto (verifica DB / JSON admin).
 *
 * PRODUCT_ID=prod_xxx npx medusa exec ./src/scripts/set-product-technical-sheet-sample.ts
 */

import type { ExecArgs } from "@medusajs/framework/types"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import { updateProductsWorkflow } from "@medusajs/medusa/core-flows"

export default async function setProductTechnicalSheetSample({
  container,
}: ExecArgs) {
  const id = process.env.PRODUCT_ID?.trim()
  if (!id) {
    throw new Error("Imposta PRODUCT_ID=prod_...")
  }

  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const pm = container.resolve(Modules.PRODUCT) as {
    retrieveProduct: (
      id: string,
      config?: { select?: string[] }
    ) => Promise<{ id: string; metadata?: Record<string, unknown> | null }>
  }

  const product = await pm.retrieveProduct(id)
  const prev =
    product.metadata &&
    typeof product.metadata === "object" &&
    !Array.isArray(product.metadata)
      ? { ...product.metadata }
      : {}

  const technical_sheet = {
    ingredients:
      "Carne di asino (75%), pomodoro, olio extravergine d'oliva, cipolla, carota, sedano, sale, aromi. ALLERGENS: SEDANO.",
    nutrition: {
      kj: 420,
      kcal: 100,
      fat_g: 5.2,
      saturated_fat_g: 1.8,
      carbs_g: 4.1,
      sugars_g: 2.0,
      protein_g: 11.5,
      salt_g: 0.85,
    },
    pairings: {
      description: "Ottimo su tagliatelle, polenta o bruschette.",
      icons: ["pasta", "vino", "pane"],
    },
    organoleptic: {
      aromatic_notes: "Note di spezie e cottura lenta.",
      color: "Rosso bruno intenso.",
      taste_notes: "Sapore pieno, equilibrato tra dolcezza del pomodoro e ricchezza della carne.",
    },
    logistics: {
      format: "190 g",
      shelf_life: "24 mesi",
    },
  }

  const metadata = { ...prev, technical_sheet }

  await updateProductsWorkflow(container).run({
    input: {
      selector: { id: [id] },
      update: { metadata },
    },
  })

  logger.info(`metadata.technical_sheet aggiornato per ${id}`)
}
