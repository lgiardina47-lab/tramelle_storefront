import type { HttpTypes } from "@medusajs/types"

import type { SellerProps } from "@/types/seller"

type ProductWithProducer = HttpTypes.StoreProduct & {
  seller?: SellerProps
  brand?: { name?: string | null } | null
}

/**
 * Nome produttore / marca per UI: `brand.name` da Medusa se presente, altrimenti `seller.name`.
 */
export function productProducerDisplayName(
  product: ProductWithProducer
): string | null {
  const brandName =
    product.brand &&
    typeof product.brand === "object" &&
    "name" in product.brand
      ? String(
          (product.brand as { name?: string | null }).name ?? ""
        ).trim()
      : ""
  if (brandName) return brandName
  const sellerName = product.seller?.name?.trim()
  if (sellerName) return sellerName
  return null
}
