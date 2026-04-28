import { HttpTypes } from "@medusajs/types"

import type { NavProducer } from "@/lib/data/nav-producers"
import {
  collectDepartmentCategories,
  collectSubcategoryLeavesForParent,
} from "@/lib/helpers/category-utils"

export type MegaNavCategory = {
  id: string
  handle: string
  name: string
  imageUrl: string | null
  /** Sottocategorie (foglie / dipartimenti) → `/categories/[handle]` */
  subs: { name: string; handle: string }[]
  /** Collection Medusa → `/collections/[handle]` */
  selezioni: { name: string; handle: string }[]
  producers: NavProducer[]
}

function sortByRank(
  items: HttpTypes.StoreProductCategory[]
): HttpTypes.StoreProductCategory[] {
  return [...items].sort((a, b) => (a.rank ?? 0) - (b.rank ?? 0))
}

/** Ricostruisce ricorsivamente i figli da lista piatta (come buildCategoryTreeFromFlat). */
function buildSubTreeFromFlat(
  parentId: string,
  allFlat: HttpTypes.StoreProductCategory[]
): HttpTypes.StoreProductCategory[] {
  const direct = sortByRank(
    allFlat.filter((c) => c.parent_category_id === parentId)
  )
  return direct.map((node) => ({
    ...node,
    category_children: buildSubTreeFromFlat(node.id, allFlat),
  }))
}

/**
 * Ricostruisce **sempre** i figli del macro dalla lista piatta Medusa quando possibile,
 * così ogni macrocategoria ha l’elenco completo delle sottocategorie (l’API può dare
 * `category_children` incompleti o assenti sul singolo parent).
 */
export function mergeChildrenFromFlat(
  parent: HttpTypes.StoreProductCategory,
  allFlat: HttpTypes.StoreProductCategory[] | undefined
): HttpTypes.StoreProductCategory {
  if (!allFlat?.length) {
    return parent
  }
  const rebuilt = buildSubTreeFromFlat(parent.id, allFlat)
  if (rebuilt.length > 0) {
    return {
      ...parent,
      category_children: rebuilt,
    }
  }
  return parent
}

/**
 * Risale `parent_category_id` sulla lista piatta fino al nodo senza genitore (macro vetrina / radice albero).
 */
export function resolveMacroRootCategory(
  category: HttpTypes.StoreProductCategory,
  allFlat: HttpTypes.StoreProductCategory[] | undefined
): HttpTypes.StoreProductCategory {
  if (!allFlat?.length) {
    return category
  }
  const byId = new Map<string, HttpTypes.StoreProductCategory>()
  for (const c of allFlat) {
    const id = c.id?.trim()
    if (id) byId.set(id, c)
  }
  let current: HttpTypes.StoreProductCategory | undefined = category
  for (let i = 0; i < 64 && current; i++) {
    const pid = current.parent_category_id
    if (pid == null || String(pid).trim() === "") {
      return current
    }
    const parent = byId.get(pid)
    if (!parent) {
      return current
    }
    current = parent
  }
  return current ?? category
}

/** Id della categoria corrente e di tutti i discendenti (per listing macro → prodotti nelle foglie). */
export function collectCategorySubtreeIds(
  root: HttpTypes.StoreProductCategory
): string[] {
  const out: string[] = []
  const walk = (c: HttpTypes.StoreProductCategory) => {
    const id = c.id?.trim()
    if (id) out.push(id)
    for (const ch of c.category_children ?? []) {
      walk(ch)
    }
  }
  walk(root)
  return [...new Set(out)]
}

/**
 * Stessa colonna «categorie» del mega menu: foglie se ci sono, altrimenti dipartimenti,
 * con handle deduplicati.
 */
export function primarySubcategoryNavItems(
  parent: HttpTypes.StoreProductCategory
): HttpTypes.StoreProductCategory[] {
  const departments = collectDepartmentCategories(parent)
  const subcatLeaves = collectSubcategoryLeavesForParent(parent)
  let col1Items =
    subcatLeaves.length > 0 ? subcatLeaves : departments
  const seenHandles = new Set<string>()
  return col1Items.filter((c) => {
    const h = (c.handle ?? "").trim().toLowerCase()
    if (!h || seenHandles.has(h)) return false
    seenHandles.add(h)
    return true
  })
}

function pickFeaturedImage(
  parent: HttpTypes.StoreProductCategory
): string | null {
  const depts = parent.category_children || []
  const withImg = depts.find((d) => {
    const m = d.metadata as Record<string, unknown> | undefined
    return Boolean(m?.image_url)
  })
  const featured = withImg || depts[0] || parent
  const url = (featured.metadata as { image_url?: string } | undefined)
    ?.image_url
  return typeof url === "string" && url.length > 0 ? url : null
}

function pickCollectionImage(c: HttpTypes.StoreCollection): string | null {
  const thumb = (c as { thumbnail?: string | null }).thumbnail
  if (typeof thumb === "string" && thumb.length > 0) return thumb
  const m = c.metadata as Record<string, unknown> | undefined
  if (!m) return null
  for (const k of ["cover_image", "image_url", "thumbnail_url", "hero_image"]) {
    const v = m[k]
    if (typeof v === "string" && v.length > 0) return v
  }
  return null
}

/** Collection collegata a una macro-categoria (metadata opzionale in Admin). */
function collectionMatchesParent(
  c: HttpTypes.StoreCollection,
  parent: { id: string; handle: string }
): boolean {
  const m = c.metadata as Record<string, unknown> | undefined
  if (!m) return false
  const h = m.tramelle_parent_category_handle
  const id = m.tramelle_parent_category_id
  const ph = m.parent_category_handle
  if (typeof h === "string" && h === parent.handle) return true
  if (typeof id === "string" && id === parent.id) return true
  if (typeof ph === "string" && ph === parent.handle) return true
  return false
}

function sortCollectionsByTitle(
  cols: HttpTypes.StoreCollection[]
): HttpTypes.StoreCollection[] {
  return [...cols].sort((a, b) =>
    (a.title ?? a.handle).localeCompare(b.title ?? b.handle, "it", {
      sensitivity: "base",
    })
  )
}

/**
 * Se esistono collection con metadata verso il parent, usa quelle; altrimenti
 * le prime collection globali (stesso catalogo per tutte le macro finché non configuri i metadata).
 */
function collectionsForParent(
  parent: { id: string; handle: string },
  all: HttpTypes.StoreCollection[]
): HttpTypes.StoreCollection[] {
  if (!all.length) return []
  const matched = all.filter((c) => collectionMatchesParent(c, parent))
  const pool = matched.length > 0 ? matched : all
  return sortCollectionsByTitle(pool).slice(0, 12)
}

/**
 * Dati per mega-menu header: categorie da Medusa, selezioni = collection store,
 * produttori da `getProducersByParentId`.
 */
export function buildMegaNavCategories(
  parentCategories: HttpTypes.StoreProductCategory[],
  producersByParentId: Record<string, NavProducer[]>,
  allCategoriesFlat: HttpTypes.StoreProductCategory[] | undefined,
  storeCollections: HttpTypes.StoreCollection[]
): MegaNavCategory[] {
  return parentCategories.map((raw) => {
    const parent = mergeChildrenFromFlat(raw, allCategoriesFlat)
    const col1Items = primarySubcategoryNavItems(parent)

    const selezioniCols = collectionsForParent(parent, storeCollections)
    const selezioni = selezioniCols.map((c) => ({
      name: c.title ?? c.handle,
      handle: c.handle,
    }))

    let imageUrl = pickFeaturedImage(parent)
    if (!imageUrl) {
      for (const c of selezioniCols) {
        const img = pickCollectionImage(c)
        if (img) {
          imageUrl = img
          break
        }
      }
    }

    return {
      id: parent.id,
      handle: parent.handle,
      name: parent.name,
      imageUrl,
      subs: col1Items.map((c) => ({ name: c.name, handle: c.handle })),
      selezioni,
      producers: producersByParentId[parent.id] ?? [],
    }
  })
}
