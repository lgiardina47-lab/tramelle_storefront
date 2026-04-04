import type { ExecArgs } from "@medusajs/framework/types"
import type { ProductCategoryDTO } from "@medusajs/types/dist/product/common"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import {
  deleteCollectionsWorkflow,
  deleteProductCategoriesWorkflow,
  deleteProductTagsWorkflow,
  deleteProductTypesWorkflow,
  deleteProductsWorkflow,
} from "@medusajs/medusa/core-flows"

const BATCH = 150

function computeDepths(categories: ProductCategoryDTO[]): Map<string, number> {
  const byId = new Map(categories.map((c) => [c.id, c]))
  const memo = new Map<string, number>()
  const depthOf = (id: string): number => {
    if (memo.has(id)) {
      return memo.get(id)!
    }
    const cat = byId.get(id)
    if (!cat?.parent_category_id) {
      memo.set(id, 0)
      return 0
    }
    const d = 1 + depthOf(cat.parent_category_id)
    memo.set(id, d)
    return d
  }
  for (const c of categories) {
    depthOf(c.id)
  }
  return memo
}

/**
 * Rimuove prodotti, collezioni, categorie, product tag e product type (filtri/facet tipici).
 * Ordine: prodotti → collezioni → categorie (foglie prima) → tag → tipi.
 *
 * Uso:
 *   npx medusa exec ./src/scripts/clear-catalog.ts -- --confirm
 */
function wantsConfirm(args: ExecArgs["args"]): boolean {
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

export default async function clearCatalog({ container, args }: ExecArgs) {
  if (!wantsConfirm(args)) {
    throw new Error(
      "Svuotamento non eseguito. Usa CLEAR_CATALOG_CONFIRM=1 oppure: npx medusa exec ./src/scripts/clear-catalog.ts -- --confirm"
    )
  }

  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const productModule = container.resolve(Modules.PRODUCT)

  logger.info(
    "=== Svuotamento catalogo: prodotti, collezioni, categorie, tag, tipi ==="
  )

  let productsTotal = 0
  for (;;) {
    const [products] = await productModule.listAndCountProducts(
      {},
      { take: BATCH, skip: 0 }
    )
    if (!products.length) {
      break
    }
    const ids = products.map((p) => p.id)
    await deleteProductsWorkflow(container).run({ input: { ids } })
    productsTotal += ids.length
    logger.info(`Prodotti: eliminati ${ids.length} (totale ${productsTotal})`)
  }

  let collectionsTotal = 0
  for (;;) {
    const [collections] = await productModule.listAndCountProductCollections(
      {},
      { take: BATCH, skip: 0 }
    )
    if (!collections.length) {
      break
    }
    const ids = collections.map((c) => c.id)
    await deleteCollectionsWorkflow(container).run({ input: { ids } })
    collectionsTotal += ids.length
    logger.info(`Collezioni: eliminate ${ids.length} (totale ${collectionsTotal})`)
  }

  let categoriesTotal = 0
  for (;;) {
    const [categories] = await productModule.listAndCountProductCategories(
      {},
      { take: 5000, skip: 0 }
    )
    if (!categories.length) {
      break
    }
    const depths = computeDepths(categories)
    const sorted = [...categories].sort(
      (a, b) => (depths.get(b.id) ?? 0) - (depths.get(a.id) ?? 0)
    )
    const chunk = sorted.slice(0, BATCH).map((c) => c.id)
    await deleteProductCategoriesWorkflow(container).run({ input: chunk })
    categoriesTotal += chunk.length
    logger.info(`Categorie: eliminate ${chunk.length} (totale ${categoriesTotal})`)
  }

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
    logger.info(`Tag (filtri): eliminati ${ids.length} (totale ${tagsTotal})`)
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

  logger.info(
    `=== Fine: prodotti ${productsTotal}, collezioni ${collectionsTotal}, categorie ${categoriesTotal}, tag ${tagsTotal}, tipi ${typesTotal} ===`
  )
}
