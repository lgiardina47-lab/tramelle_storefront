"use client"

import { ProductCard } from "../ProductCard/ProductCard"
import { HttpTypes } from "@medusajs/types"
import { ProductListingImageLoadProvider } from "../ProductCard/ProductListingImageLoadContext"
import {
  productListingImageRowIndex,
  productListingRowCardCounts,
} from "@/lib/helpers/product-listing-grid-layout"

export const ProductsList = ({
  products,
}: {
  products: HttpTypes.StoreProduct[]
}) => {
  const rowCardCounts = productListingRowCardCounts(products.length)

  return (
    <ProductListingImageLoadProvider rowCardCounts={rowCardCounts}>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        {products.map((product, index) => (
          <div key={product.id} className="min-w-0">
            <ProductCard
              product={product}
              className="h-full w-full"
              imageRowIndex={productListingImageRowIndex(index)}
            />
          </div>
        ))}
      </div>
    </ProductListingImageLoadProvider>
  )
}
