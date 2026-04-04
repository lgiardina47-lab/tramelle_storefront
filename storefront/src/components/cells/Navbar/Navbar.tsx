import { HttpTypes } from "@medusajs/types"
import { CategoryNavbar } from "@/components/molecules"

export const Navbar = ({
  categories,
  parentCategories,
  producersByParentId,
}: {
  categories: HttpTypes.StoreProductCategory[]
  parentCategories: HttpTypes.StoreProductCategory[]
  producersByParentId?: Record<string, { name: string; handle: string }[]>
}) => {
  return (
    <div
      className="border-t border-neutral-100 bg-white px-4 pb-2 pt-1 md:px-6 lg:px-8"
      data-testid="navbar"
    >
      <CategoryNavbar
        categories={categories}
        parentCategories={parentCategories}
        producersByParentId={producersByParentId}
      />
    </div>
  )
}
