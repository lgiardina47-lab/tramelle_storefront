"use client"
import { HttpTypes } from "@medusajs/types"
import { cn } from "@/lib/utils"
import { useParams } from "next/navigation"
import { useMemo, useState } from "react"
import { getActiveParentHandle } from "@/lib/helpers/category-utils"
import { useTranslations } from "next-intl"
import { MobileCategoryDrawer } from "./MobileCategoryDrawer"

interface MobileCategoryNavbarProps {
  categories: HttpTypes.StoreProductCategory[]
  parentCategories?: HttpTypes.StoreProductCategory[]
  onClose?: (state: boolean) => void
}

export const MobileCategoryNavbar = ({
  categories,
  parentCategories = [],
  onClose,
}: MobileCategoryNavbarProps) => {
  const { category } = useParams<{ category?: string }>()
  const t = useTranslations("Header.gourmet")
  const [selectedCategory, setSelectedCategory] =
    useState<HttpTypes.StoreProductCategory | null>(null)

  const activeParentHandle = useMemo(
    () => getActiveParentHandle(category, categories, parentCategories),
    [category, parentCategories, categories]
  )

  const handleClose = () => {
    onClose?.(false)
  }

  const handleDrawerClose = () => {
    setSelectedCategory(null)
  }

  return (
    <>
      <nav
        className="flex flex-col gap-0"
        aria-label={t("browseCategoriesTitle")}
      >
        {parentCategories.map((cat) => {
          const { id, handle, name } = cat
          const isActive = handle === activeParentHandle

          return (
            <div
              key={id}
              className="border-b border-[#E8E4DE] last:border-b-0"
            >
              <button
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={cn(
                  "font-tramelle flex min-h-[48px] w-full items-center gap-2 px-3 py-3.5 text-left text-[14px] font-semibold leading-snug text-[#0F0E0B] transition-colors hover:bg-[#F7F6F3] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#0F0E0B]/15",
                  isActive && "bg-[#F5F3F0]"
                )}
                aria-label={t("openSubcategoriesAria", { name })}
                aria-expanded={selectedCategory?.id === id}
              >
                <span className="min-w-0 flex-1">{name}</span>
                <span
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[#E8E4DE] bg-white text-[22px] font-normal leading-none text-[#0F0E0B] shadow-[0_1px_0_rgba(15,14,11,0.06)]"
                  aria-hidden
                >
                  ›
                </span>
              </button>
            </div>
          )
        })}
      </nav>

      {selectedCategory && (
        <MobileCategoryDrawer
          category={selectedCategory}
          isOpen={!!selectedCategory}
          onClose={handleDrawerClose}
          onLinkClick={handleClose}
        />
      )}
    </>
  )
}
