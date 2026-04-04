"use client"
import { HttpTypes } from "@medusajs/types"
import Image from "next/image"
import LocalizedClientLink from "@/components/molecules/LocalizedLink/LocalizedLink"
import { cn } from "@/lib/utils"
import { useParams } from "next/navigation"
import { ArrowRightIcon } from "@/icons"
import { useMemo, useRef } from "react"
import {
  getActiveParentHandle,
  filterCategoriesByParent,
  getSubcategoryRibbonContext,
} from "@/lib/helpers/category-utils"
import { useCategoryDropdown } from "./hooks/useCategoryDropdown"
import { CategoryDropdownMenu } from "./components/CategoryDropdownMenu"
import { SubcategoryRibbon } from "./components/SubcategoryRibbon"

interface CategoryNavbarProps {
  categories: HttpTypes.StoreProductCategory[]
  parentCategories?: HttpTypes.StoreProductCategory[]
  /** Seller per ogni categoria padre (id → elenco produttori). */
  producersByParentId?: Record<string, { name: string; handle: string }[]>
  onClose?: (state: boolean) => void
}

export const CategoryNavbar = ({
  categories,
  parentCategories = [],
  producersByParentId = {},
  onClose,
}: CategoryNavbarProps) => {
  const { category } = useParams<{ category?: string }>()

  const navIconUrl = (meta: HttpTypes.StoreProductCategory["metadata"]) => {
    const m = meta as Record<string, unknown> | undefined
    if (!m) return null
    const icon = m.icon_url
    const img = m.image_url
    if (typeof icon === "string" && icon.length > 0) return icon
    if (typeof img === "string" && img.length > 0) return img
    return null
  }

  const navBadge = (meta: HttpTypes.StoreProductCategory["metadata"]) => {
    const m = meta as Record<string, unknown> | undefined
    if (!m) return null
    if (m.is_new === true) return "NEW"
    const b = m.badge
    return typeof b === "string" && b.length > 0 ? b : null
  }

  const {
    hoveredCategoryId,
    isDropdownVisible,
    shouldRenderDropdown,
    openDropdown,
    setHoveredCategoryId,
    closeDropdown,
  } = useCategoryDropdown()

  const activeParentHandle = useMemo(
    () => getActiveParentHandle(category, categories, parentCategories),
    [category, parentCategories, categories]
  )

  const filteredCategories = useMemo(
    () =>
      filterCategoriesByParent(
        activeParentHandle,
        categories,
        parentCategories
      ),
    [activeParentHandle, parentCategories, categories]
  )

  const ribbonContext = useMemo(
    () => getSubcategoryRibbonContext(category, filteredCategories),
    [category, filteredCategories]
  )

  const hoveredParent = useMemo(
    () => parentCategories.find((p) => p.id === hoveredCategoryId),
    [parentCategories, hoveredCategoryId]
  )

  const handleClose = () => {
    onClose?.(false)
    closeDropdown()
  }

  const handleParentMouseEnter = (parentId: string) => {
    const p = parentCategories.find((x) => x.id === parentId)
    if (p?.category_children && p.category_children.length > 0) {
      openDropdown(parentId)
    }
  }

  const handleCategoryMouseLeave = () => {
    setHoveredCategoryId(null)
  }

  const handleDropdownMouseEnter = () => {
    if (hoveredCategoryId) {
      setHoveredCategoryId(hoveredCategoryId)
    }
  }

  const handleDropdownMouseLeave = () => {
    setHoveredCategoryId(null)
  }

  const scrollRef = useRef<HTMLDivElement>(null)

  return (
    <div className="flex w-full min-w-0 flex-col gap-0">
      <div className="relative w-full min-w-0">
        <div className="relative flex items-end gap-1">
        <nav
          ref={scrollRef}
          className="flex flex-1 flex-nowrap items-end gap-1 overflow-x-auto scroll-smooth pb-1 scrollbar-hide sm:gap-2"
          aria-label="Category navigation"
          data-testid="category-navbar"
        >
          <LocalizedClientLink
            href="/categories"
            onClick={handleClose}
            className="flex shrink-0 flex-col items-center justify-end px-2 py-2 text-cortilia sm:px-3"
            data-testid="category-link-all-products"
          >
            <span className="text-center text-[11px] font-semibold uppercase leading-tight tracking-tight sm:text-xs">
              Tutti
            </span>
          </LocalizedClientLink>

          {parentCategories.map((parent) => {
            const isActive = activeParentHandle === parent.handle
            const hasChildren =
              parent.category_children && parent.category_children.length > 0
            const iconSrc = navIconUrl(parent.metadata)
            const badge = navBadge(parent.metadata)

            return (
              <div
                key={parent.id}
                className="relative shrink-0 snap-start"
                onMouseEnter={() =>
                  hasChildren ? handleParentMouseEnter(parent.id) : undefined
                }
                onMouseLeave={handleCategoryMouseLeave}
              >
                <LocalizedClientLink
                  href={`/categories/${parent.handle}`}
                  onClick={handleClose}
                  title={parent.name}
                  className={cn(
                    "relative flex max-w-[11rem] flex-col items-center justify-end gap-1.5 px-2 py-2 text-center sm:px-4",
                    isActive &&
                      "after:absolute after:bottom-0 after:left-1 after:right-1 after:h-0.5 after:rounded-full after:bg-cortilia"
                  )}
                  data-testid={`category-parent-link-${parent.handle}`}
                >
                  <span className="relative">
                    {iconSrc ? (
                      <span className="relative flex h-12 w-12 items-center justify-center overflow-hidden rounded-full border border-neutral-100 bg-cortilia-muted/40">
                        <Image
                          src={iconSrc}
                          alt={parent.name}
                          width={48}
                          height={48}
                          className="h-full w-full object-cover"
                        />
                      </span>
                    ) : (
                      <span className="flex h-12 w-12 items-center justify-center rounded-full border border-dashed border-neutral-200 bg-neutral-50 text-[10px] font-bold uppercase text-neutral-400">
                        {parent.name.slice(0, 2)}
                      </span>
                    )}
                    {badge ? (
                      <span className="absolute -right-1 -top-0.5 rounded bg-amber-500 px-1 text-[8px] font-bold leading-tight text-white">
                        {badge}
                      </span>
                    ) : null}
                  </span>
                  <span className="line-clamp-2 text-[11px] font-semibold leading-tight text-cortilia sm:text-xs">
                    {parent.name}
                  </span>
                </LocalizedClientLink>
              </div>
            )
          })}
        </nav>
        <button
          type="button"
          className="mb-2 hidden h-10 w-10 shrink-0 items-center justify-center rounded-full border border-neutral-200 bg-white text-cortilia shadow-sm transition-colors hover:border-cortilia hover:bg-cortilia-muted/50 sm:flex"
          aria-label="Scorri categorie"
          onClick={() =>
            scrollRef.current?.scrollBy({ left: 220, behavior: "smooth" })
          }
        >
          <ArrowRightIcon size={20} color="#000000" />
        </button>
        </div>

        {shouldRenderDropdown && hoveredParent && (
          <CategoryDropdownMenu
            parentCategory={hoveredParent}
            producers={producersByParentId[hoveredParent.id] ?? []}
            isVisible={isDropdownVisible}
            onMouseEnter={handleDropdownMouseEnter}
            onMouseLeave={handleDropdownMouseLeave}
            onLinkClick={handleClose}
          />
        )}
      </div>

      {ribbonContext && (
        <SubcategoryRibbon
          parentLabel={ribbonContext.parentLabel}
          parentHandle={ribbonContext.parentHandle}
          subcategories={ribbonContext.children}
          activeChildHandle={ribbonContext.activeChildHandle}
          onNavigate={handleClose}
        />
      )}
    </div>
  )
}
