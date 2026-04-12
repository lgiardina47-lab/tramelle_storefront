import { HttpTypes } from "@medusajs/types"

import { categoryHandleMatchesUrlSegment } from "@/lib/helpers/category-public-url"

function sortCategoriesByRank(
  items: HttpTypes.StoreProductCategory[]
): HttpTypes.StoreProductCategory[] {
  return [...items].sort((a, b) => (a.rank ?? 0) - (b.rank ?? 0))
}

export function findParentCategoryForGrandchild(
  categoryHandle: string,
  categories: HttpTypes.StoreProductCategory[],
  parentCategories: HttpTypes.StoreProductCategory[]
): HttpTypes.StoreProductCategory | null {
  for (const mainCategory of categories) {
    const isGrandchild = mainCategory.category_children?.some((child) =>
      categoryHandleMatchesUrlSegment(child.handle, categoryHandle)
    )

    if (isGrandchild && mainCategory.parent_category_id) {
      const parentCategory = parentCategories.find(
        (p) => p.id === mainCategory.parent_category_id
      )
      if (parentCategory) {
        return parentCategory
      }
    }
  }

  return null
}

export function getActiveParentHandle(
  category: string | string[] | undefined,
  categories: HttpTypes.StoreProductCategory[],
  parentCategories: HttpTypes.StoreProductCategory[]
): string | null {
  if (!category || !parentCategories) return null

  const categoryHandle = Array.isArray(category) ? category[0] : category

  const parentHit = parentCategories.find((p) =>
    categoryHandleMatchesUrlSegment(p.handle, categoryHandle)
  )
  if (parentHit) return parentHit.handle

  const mainCategory = categories.find((c) =>
    categoryHandleMatchesUrlSegment(c.handle, categoryHandle)
  )
  if (mainCategory?.parent_category_id) {
    const parentCategory = parentCategories.find(
      (p) => p.id === mainCategory.parent_category_id
    )
    return parentCategory?.handle ?? null
  }

  const parentOfMainCategory = findParentCategoryForGrandchild(
    categoryHandle,
    categories,
    parentCategories
  )

  return parentOfMainCategory?.handle ?? null
}

export function isGrandchildCategory(
  category: string | string[] | undefined,
  categories: HttpTypes.StoreProductCategory[]
): boolean {
  if (!category) return false
  
  const categoryHandle = Array.isArray(category) ? category[0] : category
  
  return categories.some((cat) =>
    cat.category_children?.some((child) =>
      categoryHandleMatchesUrlSegment(child.handle, categoryHandle)
    )
  )
}

export function findParentCategoryHandle(
  category: string | string[] | undefined,
  categories: HttpTypes.StoreProductCategory[]
): string | null {
  if (!category) return null
  
  const categoryHandle = Array.isArray(category) ? category[0] : category
  const isGrandchild = isGrandchildCategory(categoryHandle, categories)
  
  if (!isGrandchild) return null
  
  for (const cat of categories) {
    if (
      cat.category_children?.some((child) =>
        categoryHandleMatchesUrlSegment(child.handle, categoryHandle)
      )
    ) {
      return cat.handle
    }
  }
  
  return null
}

/** Resolves the main category + its children for the subcategory ribbon (desktop). */
export function getSubcategoryRibbonContext(
  categoryHandle: string | string[] | undefined,
  filteredCategories: HttpTypes.StoreProductCategory[]
): {
  parentLabel: string
  parentHandle: string
  children: HttpTypes.StoreProductCategory[]
  activeChildHandle: string | null
} | null {
  if (!categoryHandle) return null
  const handle = Array.isArray(categoryHandle) ? categoryHandle[0] : categoryHandle
  if (!handle) return null

  const direct = filteredCategories.find((c) =>
    categoryHandleMatchesUrlSegment(c.handle, handle)
  )
  if (direct?.category_children?.length) {
    return {
      parentLabel: direct.name,
      parentHandle: direct.handle,
      children: direct.category_children,
      activeChildHandle: null,
    }
  }

  for (const main of filteredCategories) {
    const child = main.category_children?.find((ch) =>
      categoryHandleMatchesUrlSegment(ch.handle, handle)
    )
    if (child && main.category_children?.length) {
      return {
        parentLabel: main.name,
        parentHandle: main.handle,
        children: main.category_children,
        activeChildHandle: child.handle,
      }
    }
  }

  return null
}

export function filterCategoriesByParent(
  activeParentHandle: string | null,
  categories: HttpTypes.StoreProductCategory[],
  parentCategories: HttpTypes.StoreProductCategory[]
): HttpTypes.StoreProductCategory[] {
  if (!activeParentHandle || !parentCategories) {
    return categories
  }

  const activeParent = parentCategories.find((p) => p.handle === activeParentHandle)
  if (!activeParent) {
    return categories
  }

  return categories.filter((cat) => cat.parent_category_id === activeParent.id)
}

/**
 * Sottocategorie per mega-menu (allineate a Medusa): per ogni figlio diretto del macro,
 * se ha nipoti si elencano i nipoti (ordinati per rank), altrimenti il figlio stesso.
 * Ordine dei “dipartimenti” = rank.
 */
export function collectSubcategoryLeavesForParent(
  parent: HttpTypes.StoreProductCategory
): HttpTypes.StoreProductCategory[] {
  const out: HttpTypes.StoreProductCategory[] = []
  for (const dept of sortCategoriesByRank(parent.category_children || [])) {
    const subs = dept.category_children
    if (subs && subs.length > 0) {
      out.push(...sortCategoriesByRank(subs))
    } else {
      out.push(dept)
    }
  }
  return out
}

export function collectDepartmentCategories(
  parent: HttpTypes.StoreProductCategory
): HttpTypes.StoreProductCategory[] {
  return sortCategoriesByRank(parent.category_children || [])
}