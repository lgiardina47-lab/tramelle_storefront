"use client"
import { HttpTypes } from "@medusajs/types"
import LocalizedClientLink from "@/components/molecules/LocalizedLink/LocalizedLink"
import { cn } from "@/lib/utils"
import { useParams } from "next/navigation"
import { useMemo } from "react"
import { getActiveParentHandle } from "@/lib/helpers/category-utils"
import { categoryPublicHref } from "@/lib/helpers/category-public-url"

export const HeaderCategoryNavbar = ({
  parentCategories,
  categories,
  onClose,
}: {
  parentCategories: HttpTypes.StoreProductCategory[]
  categories: HttpTypes.StoreProductCategory[]
  onClose?: (state: boolean) => void
}) => {
  const { category } = useParams<{ category?: string }>()

  const activeParentHandle = useMemo(
    () => getActiveParentHandle(category, categories, parentCategories),
    [category, categories, parentCategories]
  )

  return (
    <nav
      className="flex items-stretch gap-1 overflow-x-auto scroll-smooth p-4 scrollbar-hide"
      aria-label="Parent categories"
    >
      {parentCategories?.map(({ id, handle, name }) => {
        const isActive = handle === activeParentHandle
        return (
          <LocalizedClientLink
            key={id}
            href={categoryPublicHref(handle)}
            title={name}
            onClick={() => (onClose ? onClose(false) : null)}
            className={cn(
              "shrink-0 rounded-md px-3 py-2 text-center text-[11px] font-semibold uppercase leading-snug text-primary transition-opacity hover:opacity-80",
              "max-w-[11rem] whitespace-normal break-words line-clamp-3",
              isActive && "bg-secondary/15 ring-1 ring-primary/30"
            )}
          >
            {name}
          </LocalizedClientLink>
        )
      })}
    </nav>
  )
}
