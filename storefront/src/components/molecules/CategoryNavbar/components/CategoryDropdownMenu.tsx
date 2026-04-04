"use client"

import { HttpTypes } from "@medusajs/types"
import LocalizedClientLink from "@/components/molecules/LocalizedLink/LocalizedLink"
import { cn } from "@/lib/utils"
import {
  collectDepartmentCategories,
  collectSubcategoryLeavesForParent,
} from "@/lib/helpers/category-utils"
import { CategoryDropdownContainer } from "./CategoryDropdownContainer"
import { CategoryDropdownContent } from "./CategoryDropdownContent"
import { FeaturedCategory } from "./FeaturedCategory"

interface CategoryDropdownMenuProps {
  /** Categoria radice (padre) su cui si è in hover. */
  parentCategory: HttpTypes.StoreProductCategory
  /** Seller da mostrare come Produttori. */
  producers: { name: string; handle: string }[]
  isVisible: boolean
  onMouseEnter?: () => void
  onMouseLeave?: () => void
  onLinkClick?: () => void
}

function pickFeatured(
  parent: HttpTypes.StoreProductCategory
): HttpTypes.StoreProductCategory {
  const depts = parent.category_children || []
  const withImg = depts.find((d) => {
    const m = d.metadata as Record<string, unknown> | undefined
    return Boolean(m?.image_url)
  })
  return withImg || depts[0] || parent
}

export const CategoryDropdownMenu = ({
  parentCategory,
  producers,
  isVisible,
  onMouseEnter,
  onMouseLeave,
  onLinkClick,
}: CategoryDropdownMenuProps) => {
  const departments = collectDepartmentCategories(parentCategory)
  const subcatLeaves = collectSubcategoryLeavesForParent(parentCategory)

  if (departments.length === 0) {
    return null
  }

  const col1Items = subcatLeaves.length > 0 ? subcatLeaves : departments
  const showVetrine = subcatLeaves.length > 0 && departments.length > 0
  const vetrineItems = departments

  const linkClass =
    "block py-1.5 text-sm font-normal text-neutral-700 transition-colors hover:text-cortilia"

  const featured = pickFeatured(parentCategory)

  return (
    <CategoryDropdownContainer
      isVisible={isVisible}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      <CategoryDropdownContent maxHeight="28rem">
        <div
          className={cn(
            "grid gap-8 px-4 sm:px-6 lg:gap-6 lg:px-8",
            showVetrine ? "lg:grid-cols-12" : "lg:grid-cols-9"
          )}
        >
          <section className={showVetrine ? "lg:col-span-3" : "lg:col-span-4"}>
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h3 className="text-sm font-semibold text-neutral-800">
                Categorie
              </h3>
              <LocalizedClientLink
                href={`/categories/${parentCategory.handle}`}
                onClick={onLinkClick}
                className="text-sm font-medium text-cortilia underline underline-offset-2"
              >
                Vedi tutto
              </LocalizedClientLink>
            </div>
            <ul className="mt-4 max-h-64 space-y-1 overflow-y-auto pr-2">
              {col1Items.map((c) => (
                <li key={c.id}>
                  <LocalizedClientLink
                    href={`/categories/${c.handle}`}
                    onClick={onLinkClick}
                    className={linkClass}
                  >
                    {c.name}
                  </LocalizedClientLink>
                </li>
              ))}
            </ul>
          </section>

          {showVetrine ? (
            <section className="lg:col-span-3">
              <h3 className="text-sm font-semibold text-neutral-800">Vetrine</h3>
              <ul className="mt-4 space-y-1">
                {vetrineItems.slice(0, 8).map((c) => (
                  <li key={c.id}>
                    <LocalizedClientLink
                      href={`/categories/${c.handle}`}
                      onClick={onLinkClick}
                      className={linkClass}
                    >
                      {c.name}
                    </LocalizedClientLink>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          <section className="lg:col-span-3">
            <h3 className="text-sm font-semibold text-neutral-800">
              Produttori
            </h3>
            <ul className="mt-4 space-y-1">
              {producers.length > 0 ? (
                producers.slice(0, 12).map((s) => (
                  <li key={s.handle}>
                    <LocalizedClientLink
                      href={`/sellers/${s.handle}`}
                      onClick={onLinkClick}
                      className={linkClass}
                    >
                      {s.name}
                    </LocalizedClientLink>
                  </li>
                ))
              ) : (
                <li>
                  <LocalizedClientLink
                    href={`/categories/${parentCategory.handle}`}
                    onClick={onLinkClick}
                    className={linkClass}
                  >
                    Esplora i venditori in {parentCategory.name}
                  </LocalizedClientLink>
                </li>
              )}
            </ul>
          </section>

          <section className={showVetrine ? "lg:col-span-3" : "lg:col-span-2"}>
            <FeaturedCategory
              category={featured}
              onLinkClick={onLinkClick}
            />
          </section>
        </div>
      </CategoryDropdownContent>
    </CategoryDropdownContainer>
  )
}
