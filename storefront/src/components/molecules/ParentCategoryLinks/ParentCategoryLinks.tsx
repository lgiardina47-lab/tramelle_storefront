"use client"
import { HttpTypes } from "@medusajs/types"
import LocalizedClientLink from "@/components/molecules/LocalizedLink/LocalizedLink"
import { cn } from "@/lib/utils"
import { useParams } from "next/navigation"
import { useMemo } from "react"
import { getActiveParentHandle } from "@/lib/helpers/category-utils"

interface ParentCategoryLinksProps {
  parentCategories: HttpTypes.StoreProductCategory[]
  categories: HttpTypes.StoreProductCategory[]
}

export const ParentCategoryLinks = ({
  parentCategories,
  categories,
}: ParentCategoryLinksProps) => {
  const { category } = useParams<{ category?: string }>()

  const activeParentHandle = useMemo(
    () => getActiveParentHandle(category, categories, parentCategories),
    [category, categories, parentCategories]
  )

  return (
    <nav
      className="flex w-full max-w-full flex-nowrap items-center gap-1 overflow-x-auto scroll-smooth py-2 scrollbar-hide md:gap-1.5"
      aria-label="Parent categories"
    >
      {parentCategories.map(({ id, handle, name }) => {
        const isActive = handle === activeParentHandle

        return (
          <LocalizedClientLink
            key={id}
            href={`/categories/${handle}`}
            title={name}
            className={cn(
              "shrink-0 rounded-md px-2.5 py-1.5 text-center text-[10px] font-semibold uppercase leading-tight tracking-tight text-primary transition-opacity hover:opacity-80 sm:text-[11px]",
              "max-w-[min(14rem,42vw)] truncate sm:max-w-[16rem]",
              isActive && "bg-secondary/10 ring-1 ring-primary/25"
            )}
          >
            {name}
          </LocalizedClientLink>
        )
      })}
    </nav>
  )
}
