import { HttpTypes } from "@medusajs/types"

export function findParentCategoryForGrandchild(
  categoryHandle: string,
  categories: HttpTypes.StoreProductCategory[],
  parentCategories: HttpTypes.StoreProductCategory[]
): HttpTypes.StoreProductCategory | null {
  for (const mainCategory of categories) {
    const isGrandchild = mainCategory.category_children?.some(
      (child) => child.handle === categoryHandle
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

  const isParentCategory = parentCategories.some((p) => p.handle === categoryHandle)
  if (isParentCategory) return categoryHandle

  const mainCategory = categories.find((c) => c.handle === categoryHandle)
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
    cat.category_children?.some((child) => child.handle === categoryHandle)
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
    if (cat.category_children?.some((child) => child.handle === categoryHandle)) {
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

  const direct = filteredCategories.find((c) => c.handle === handle)
  if (direct?.category_children?.length) {
    return {
      parentLabel: direct.name,
      parentHandle: direct.handle,
      children: direct.category_children,
      activeChildHandle: null,
    }
  }

  for (const main of filteredCategories) {
    const child = main.category_children?.find((ch) => ch.handle === handle)
    if (child && main.category_children?.length) {
      return {
        parentLabel: main.name,
        parentHandle: main.handle,
        children: main.category_children,
        activeChildHandle: handle,
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

/** Sottocategorie “foglia” per mega-menu: per ogni figlio diretto, espone i nipoti se presenti, altrimenti il figlio. */
export function collectSubcategoryLeavesForParent(
  parent: HttpTypes.StoreProductCategory
): HttpTypes.StoreProductCategory[] {
  const out: HttpTypes.StoreProductCategory[] = []
  for (const dept of parent.category_children || []) {
    const subs = dept.category_children
    if (subs && subs.length > 0) {
      out.push(...subs)
    } else {
      out.push(dept)
    }
  }
  return out
}

export function collectDepartmentCategories(
  parent: HttpTypes.StoreProductCategory
): HttpTypes.StoreProductCategory[] {
  return parent.category_children || []
}