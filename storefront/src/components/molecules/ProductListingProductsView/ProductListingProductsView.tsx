"use client"

import { HttpTypes } from "@medusajs/types"
import { ProductCard } from "@/components/organisms"
import { ProductListingImageLoadProvider } from "@/components/organisms/ProductCard/ProductListingImageLoadContext"
import {
  productListingImageRowIndex,
  productListingRowCardCounts,
} from "@/lib/helpers/product-listing-grid-layout"
import { cn } from "@/lib/utils"

interface Props {
  products: HttpTypes.StoreProduct[]
  /** True durante un nuovo fetch con griglia già popolata (non mostrare skeleton). */
  isRefetching?: boolean
}

const ProductListingProductsView = ({
  products,
  isRefetching = false,
}: Props) => {
  const rowCardCounts = productListingRowCardCounts(products.length)

  return (
    <ProductListingImageLoadProvider rowCardCounts={rowCardCounts}>
      <div
        className={cn(
          "w-full transition-opacity duration-150",
          isRefetching && "pointer-events-none opacity-60"
        )}
        aria-busy={isRefetching || undefined}
      >
        <ul className="grid grid-cols-2 gap-3 md:grid-cols-5">
          {products.map((product, index) => (
            <li key={product.id} className="min-w-0">
              <ProductCard
                product={product}
                className="h-full w-full min-w-0"
                imageRowIndex={productListingImageRowIndex(index)}
              />
            </li>
          ))}
        </ul>
      </div>
    </ProductListingImageLoadProvider>
  )
}

export default ProductListingProductsView
