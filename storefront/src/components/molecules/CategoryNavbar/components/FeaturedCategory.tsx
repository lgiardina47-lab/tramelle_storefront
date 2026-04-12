"use client"

import { HttpTypes } from "@medusajs/types"
import Image from "next/image"
import LocalizedClientLink from "@/components/molecules/LocalizedLink/LocalizedLink"
import { ArrowRightIcon } from "@/icons"
import { categoryPublicHref } from "@/lib/helpers/category-public-url"

interface Props {
  category: HttpTypes.StoreProductCategory
  onLinkClick?: () => void
}

export const FeaturedCategory = ({ category, onLinkClick }: Props) => {
  const imageUrl =
    category.metadata && (category.metadata as { image_url?: string }).image_url

  return (
    <LocalizedClientLink
      href={categoryPublicHref(category.handle)}
      onClick={onLinkClick}
      className="flex h-full max-w-sm flex-col overflow-hidden rounded-xl border border-neutral-100 bg-white shadow-sm transition-shadow hover:shadow-md"
    >
      <div className="relative aspect-[4/3] w-full bg-sky-50">
        {typeof imageUrl === "string" && imageUrl ? (
          <Image
            src={imageUrl}
            alt={category.name}
            fill
            className="object-contain p-4"
            sizes="(max-width: 1024px) 100vw, 320px"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-b from-sky-100/80 to-sky-50 p-6 text-center text-sm font-medium text-cortilia">
            {category.name}
          </div>
        )}
      </div>

      <div className="flex items-center justify-between gap-3 border-t border-neutral-100 px-4 py-3">
        <span className="line-clamp-2 text-left text-sm font-semibold text-cortilia">
          {category.name}
        </span>
        <ArrowRightIcon size={22} color="#000000" className="shrink-0" />
      </div>
    </LocalizedClientLink>
  )
}
