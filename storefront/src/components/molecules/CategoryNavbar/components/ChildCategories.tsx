'use client'

import { HttpTypes } from '@medusajs/types'
import LocalizedClientLink from '@/components/molecules/LocalizedLink/LocalizedLink'
import { categoryPublicHref } from '@/lib/helpers/category-public-url'

interface Props {
  categories: HttpTypes.StoreProductCategory[]
  onLinkClick?: () => void
  title?: string
}

export const ChildCategories = ({ categories, onLinkClick, title }: Props) => {
  if (!categories || categories.length === 0) {
    return null
  }

  return (
    <div className="flex flex-col gap-y-2">
      {title && (<h3 className="heading-sm uppercase text-primary">{title}</h3>)}
      {categories.map((category) => (
        <LocalizedClientLink
          key={category.id}
          href={categoryPublicHref(category.handle)}
          onClick={onLinkClick}
          className="label-md text-primary hover:text-action transition-colors py-1"
        >
          {category.name}
        </LocalizedClientLink>
      ))}
    </div>
  )
}

