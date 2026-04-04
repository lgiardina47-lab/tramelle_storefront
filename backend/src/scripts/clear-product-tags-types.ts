import type { ExecArgs } from "@medusajs/framework/types"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import {
  deleteProductTagsWorkflow,
  deleteProductTypesWorkflow,
} from "@medusajs/medusa/core-flows"

const BATCH = 200

function wantsConfirm(args: ExecArgs["args"]): boolean {
  if (process.env.CLEAR_FILTERS_CONFIRM === "1") {
    return true
  }
  if (process.env.CLEAR_CATALOG_CONFIRM === "1") {
    return true
  }
  const a = args as unknown
  if (Array.isArray(a) && a.includes("--confirm")) {
    return true
  }
  if (a && typeof a === "object" && "_" in a) {
    const rest = (a as { _: (string | number)[] })._
    if (Array.isArray(rest) && rest.map(String).includes("--confirm")) {
      return true
    }
  }
  return false
}

/**
 * Rimuove tutti i product tag e product type (spesso usati come facet / filtri in listing).
 * Non tocca categorie, collezioni, prodotti, seller.
 *
 *   CLEAR_FILTERS_CONFIRM=1 npx medusa exec ./src/scripts/clear-product-tags-types.ts
 */
export default async function clearProductTagsAndTypes({
  container,
  args,
}: ExecArgs) {
  if (!wantsConfirm(args)) {
    throw new Error(
      "Usa CLEAR_FILTERS_CONFIRM=1 (o CLEAR_CATALOG_CONFIRM=1) oppure --confirm"
    )
  }

  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const productModule = container.resolve(Modules.PRODUCT)

  logger.info("=== Svuotamento tag e tipi prodotto (filtri catalogo) ===")

  let tagsTotal = 0
  for (;;) {
    const [tags] = await productModule.listAndCountProductTags(
      {},
      { take: BATCH, skip: 0 }
    )
    if (!tags.length) {
      break
    }
    const ids = tags.map((t) => t.id)
    await deleteProductTagsWorkflow(container).run({ input: { ids } })
    tagsTotal += ids.length
    logger.info(`Tag: eliminati ${ids.length} (totale ${tagsTotal})`)
  }

  let typesTotal = 0
  for (;;) {
    const [types] = await productModule.listAndCountProductTypes(
      {},
      { take: BATCH, skip: 0 }
    )
    if (!types.length) {
      break
    }
    const ids = types.map((t) => t.id)
    await deleteProductTypesWorkflow(container).run({ input: { ids } })
    typesTotal += ids.length
    logger.info(`Tipi prodotto: eliminati ${ids.length} (totale ${typesTotal})`)
  }

  logger.info(`=== Fine: tag ${tagsTotal}, tipi ${typesTotal} ===`)
}
