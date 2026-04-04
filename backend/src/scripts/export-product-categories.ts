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

/**
 * Esporta categorie prodotto (flat + albero con sottocategorie), sempre con `handle`.
 *
 *   EXPORT_CATEGORIES_OUT=/path/categories.json npx medusa exec ./src/scripts/export-product-categories.ts
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

  const payload = {
    exported_at: new Date().toISOString(),
    count: categories.length,
    flat,
    tree,
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
