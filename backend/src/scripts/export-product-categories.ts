import { writeFileSync } from "node:fs"

import type { ExecArgs } from "@medusajs/framework/types"
import type { ProductCategoryDTO } from "@medusajs/types/dist/product/common"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"

type CategoryNode = {
  id: string
  name: string
  handle: string
  parent_category_id: string | null
  is_active: boolean
  rank: number
  description: string | null
  children?: CategoryNode[]
}

/** Riferimento livello per export cat1 / cat2 / cat3. */
export type CatalogLevelRef = {
  id: string
  name: string
  handle: string
}

/**
 * Una riga per ogni categoria: primi tre livelli come cat1–cat3, percorso completo in `path_*`.
 * Oltre tre livelli cat3 resta il terzo ancestor e `self` è la categoria corrente (più profonda).
 */
export type CatalogLevelRow = {
  cat1: CatalogLevelRef | null
  cat2: CatalogLevelRef | null
  cat3: CatalogLevelRef | null
  path: CatalogLevelRef[]
  self: CatalogLevelRef
  path_handles: string
}

function pickCategoryFields(c: ProductCategoryDTO): Omit<CategoryNode, "children"> {
  return {
    id: c.id,
    name: c.name,
    handle: c.handle,
    parent_category_id: c.parent_category_id ?? null,
    is_active: Boolean(c.is_active),
    rank: typeof c.rank === "number" ? c.rank : 0,
    description:
      c.description !== undefined && c.description !== null
        ? String(c.description)
        : null,
  }
}

function sortCategories(a: ProductCategoryDTO, b: ProductCategoryDTO): number {
  const ra = typeof a.rank === "number" ? a.rank : 0
  const rb = typeof b.rank === "number" ? b.rank : 0
  if (ra !== rb) {
    return ra - rb
  }
  return String(a.name ?? "").localeCompare(String(b.name ?? ""), "it")
}

function buildChildrenMap(
  categories: ProductCategoryDTO[]
): Map<string | null, ProductCategoryDTO[]> {
  const m = new Map<string | null, ProductCategoryDTO[]>()
  for (const c of categories) {
    const pid = c.parent_category_id ?? null
    if (!m.has(pid)) {
      m.set(pid, [])
    }
    m.get(pid)!.push(c)
  }
  return m
}

function buildTree(
  childrenByParent: Map<string | null, ProductCategoryDTO[]>,
  parentId: string | null
): CategoryNode[] {
  const kids = [...(childrenByParent.get(parentId) ?? [])].sort(sortCategories)
  return kids.map((c) => {
    const sub = buildTree(childrenByParent, c.id)
    const node: CategoryNode = pickCategoryFields(c)
    if (sub.length) {
      node.children = sub
    }
    return node
  })
}

function toLevelRef(c: Omit<CategoryNode, "children">): CatalogLevelRef {
  return { id: c.id, name: c.name, handle: c.handle }
}

function buildCatalogLevelRows(
  nodes: CategoryNode[],
  ancestors: CatalogLevelRef[]
): CatalogLevelRow[] {
  const rows: CatalogLevelRow[] = []
  for (const n of nodes) {
    const self = toLevelRef(n)
    const path = [...ancestors, self]
    rows.push({
      cat1: path[0] ?? null,
      cat2: path[1] ?? null,
      cat3: path[2] ?? null,
      path,
      self,
      path_handles: path.map((p) => p.handle).join("/"),
    })
    if (n.children?.length) {
      rows.push(...buildCatalogLevelRows(n.children, path))
    }
  }
  return rows
}

/**
 * Esporta categorie prodotto: `flat`, `tree` e `catalog_cat1_cat2_cat3` (una riga per categoria con cat1–cat3, path completo).
 *
 *   EXPORT_CATEGORIES_OUT=/path/categories.json yarn export:categories
 * oppure: npx medusa exec ./src/scripts/export-product-categories.ts
 */
export default async function exportProductCategories({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const productModule = container.resolve(Modules.PRODUCT)

  const [categories] = await productModule.listAndCountProductCategories(
    {},
    {
      take: 10000,
      select: [
        "id",
        "name",
        "handle",
        "parent_category_id",
        "is_active",
        "rank",
        "description",
      ],
    }
  )

  const flat = [...categories].sort(sortCategories).map((c) => pickCategoryFields(c))

  const childrenByParent = buildChildrenMap(categories)
  const tree = buildTree(childrenByParent, null)
  const catalog_cat1_cat2_cat3 = buildCatalogLevelRows(tree, [])

  const payload = {
    exported_at: new Date().toISOString(),
    count: categories.length,
    flat,
    tree,
    /** Una riga per categoria: cat1–cat3 (primi tre livelli), path completo in `path`. */
    catalog_cat1_cat2_cat3,
  }

  const out = process.env.EXPORT_CATEGORIES_OUT?.trim()
  const text = JSON.stringify(payload, null, 2)

  if (out) {
    writeFileSync(out, text, "utf8")
    logger.info(`Categorie esportate: ${categories.length} → ${out}`)
  } else {
    logger.info(text)
  }
}
