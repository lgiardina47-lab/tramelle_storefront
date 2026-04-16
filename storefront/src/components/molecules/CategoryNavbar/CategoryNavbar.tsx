"use client"
import { HttpTypes } from "@medusajs/types"
import LocalizedClientLink from "@/components/molecules/LocalizedLink/LocalizedLink"
import { cn } from "@/lib/utils"
import { useParams } from "next/navigation"
import { useEffect, useMemo, useRef } from "react"
import {
  getActiveParentHandle,
  filterCategoriesByParent,
  getSubcategoryRibbonContext,
} from "@/lib/helpers/category-utils"
import { categoryPublicHref } from "@/lib/helpers/category-public-url"
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
    toggleDropdown,
    closeDropdown,
  } = useCategoryDropdown()

  const navRootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!shouldRenderDropdown) return
    const onDocDown = (e: MouseEvent) => {
      const el = navRootRef.current
      if (el && !el.contains(e.target as Node)) {
        closeDropdown()
      }
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeDropdown()
    }
    document.addEventListener("mousedown", onDocDown)
    window.addEventListener("keydown", onKey)
    return () => {
      document.removeEventListener("mousedown", onDocDown)
      window.removeEventListener("keydown", onKey)
    }
  }, [shouldRenderDropdown, closeDropdown])

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

  const scrollRef = useRef<HTMLDivElement>(null)

  return (
    <div className="flex w-full min-w-0 flex-col gap-0">
      <div ref={navRootRef} className="relative w-full min-w-0">
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
            const badge = navBadge(parent.metadata)

            return (
              <div key={parent.id} className="relative shrink-0 snap-start">
                {hasChildren ? (
                  <button
                    type="button"
                    title={parent.name}
                    aria-expanded={hoveredCategoryId === parent.id}
                    aria-haspopup="true"
                    onClick={() => toggleDropdown(parent.id)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault()
                        toggleDropdown(parent.id)
                      }
                    }}
                    className={cn(
                      "relative flex max-w-[11rem] flex-col items-center justify-center px-2 py-2.5 text-center sm:px-4",
                      isActive &&
                        "after:absolute after:bottom-0 after:left-1 after:right-1 after:h-0.5 after:rounded-full after:bg-cortilia"
                    )}
                    data-testid={`category-parent-link-${parent.handle}`}
                  >
                    <span className="line-clamp-2 text-[11px] font-semibold leading-tight text-cortilia sm:text-xs">
                      {parent.name}
                      {badge ? (
                        <span className="ml-1 align-top text-[8px] font-bold uppercase text-amber-600">
                          {badge}
                        </span>
                      ) : null}
                    </span>
                  </button>
                ) : (
                  <LocalizedClientLink
                    href={categoryPublicHref(parent.handle)}
                    onClick={handleClose}
                    title={parent.name}
                    className={cn(
                      "relative flex max-w-[11rem] flex-col items-center justify-center px-2 py-2.5 text-center sm:px-4",
                      isActive &&
                        "after:absolute after:bottom-0 after:left-1 after:right-1 after:h-0.5 after:rounded-full after:bg-cortilia"
                    )}
                    data-testid={`category-parent-link-${parent.handle}`}
                  >
                    <span className="line-clamp-2 text-[11px] font-semibold leading-tight text-cortilia sm:text-xs">
                      {parent.name}
                      {badge ? (
                        <span className="ml-1 align-top text-[8px] font-bold uppercase text-amber-600">
                          {badge}
                        </span>
                      ) : null}
                    </span>
                  </LocalizedClientLink>
                )}
              </div>
            )
          })}
        </nav>
        <button
          type="button"
          className="mb-2 hidden h-10 min-w-[2.5rem] shrink-0 items-center justify-center rounded-full border border-neutral-200 bg-white text-base font-light text-cortilia shadow-sm transition-colors hover:border-cortilia hover:bg-cortilia-muted/50 sm:flex"
          aria-label="Scorri categorie"
          onClick={() =>
            scrollRef.current?.scrollBy({ left: 220, behavior: "smooth" })
          }
        >
          ›
        </button>
        </div>

        {shouldRenderDropdown && hoveredParent && (
          <CategoryDropdownMenu
            parentCategory={hoveredParent}
            producers={producersByParentId[hoveredParent.id] ?? []}
            isVisible={isDropdownVisible}
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
