"use client"

import { HttpTypes } from "@medusajs/types"
import { ProductCard } from "@/components/organisms"
import { ProductListingImageLoadProvider } from "@/components/organisms/ProductCard/ProductListingImageLoadContext"
import {
  productListingImageRowIndex,
  productListingRowCardCounts,
} from "@/lib/helpers/product-listing-grid-layout"

interface Props {
  products: HttpTypes.StoreProduct[]
}

const ProductListingProductsView = ({ products }: Props) => {
  const rowCardCounts = productListingRowCardCounts(products.length)

  return (
    <ProductListingImageLoadProvider rowCardCounts={rowCardCounts}>
      <div className="w-full">
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
