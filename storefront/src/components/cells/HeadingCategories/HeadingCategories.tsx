"use client"
import LocalizedClientLink from "@/components/molecules/LocalizedLink/LocalizedLink"
import { cn } from "@/lib/utils"
import { HttpTypes } from "@medusajs/types"
import { useParams } from "next/navigation"
import {
  categoryHandleMatchesUrlSegment,
  categoryPublicHref,
} from "@/lib/helpers/category-public-url"

export const HeadingCategories = ({
  categories,
}: {
  categories: HttpTypes.StoreProductCategory[]
}) => {
  const params = useParams()
  const categoryParam =
    typeof params?.category === "string" ? params.category : undefined

  return (
    <nav className="hidden lg:flex space-x-2 items-center flex-col md:flex-row">
      {categories?.map(({ id, handle, name }) => (
        <LocalizedClientLink
          key={id}
          href={categoryPublicHref(handle)}
          className={cn(
            "label-md uppercase px-2 mb-4 md:mb-0",
            categoryParam != null &&
              categoryHandleMatchesUrlSegment(handle, categoryParam) &&
              "border-b border-primary"
          )}
        >
          {name}
        </LocalizedClientLink>
      ))}
    </nav>
  )
}
