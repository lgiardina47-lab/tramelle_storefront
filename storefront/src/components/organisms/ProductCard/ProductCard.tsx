"use client"

import Image from "next/image"
import { Button } from "@/components/atoms"
import { HttpTypes } from "@medusajs/types"
import { cn } from "@/lib/utils"
import LocalizedClientLink from "@/components/molecules/LocalizedLink/LocalizedLink"
import { getProductPrice } from "@/lib/helpers/get-product-price"
import { Product } from "@/types/product"
import { useCartContext } from "@/components/providers"
import { useParams } from "next/navigation"
import { getLocalizedProductContentForCountry } from "@/lib/helpers/tramelle-product-content"
import { resolveProductThumbnailSrc } from "@/lib/helpers/get-image-url"

export const ProductCard = ({
  product,
  className,
}: {
  product: HttpTypes.StoreProduct | Product,
  className?: string
}) => {
  const { wholesaleBuyer } = useCartContext()
  const params = useParams()
  const countryCode =
    typeof params?.locale === "string"
      ? params.locale
      : (process.env.NEXT_PUBLIC_DEFAULT_REGION || "it")

  if (!product) {
    return null
  }

  const { cheapestPrice, cheapestVariant } = getProductPrice({
    product: product as HttpTypes.StoreProduct,
    restrictToB2cVisible: !wholesaleBuyer,
  })

  const localized = getLocalizedProductContentForCountry(
    product as HttpTypes.StoreProduct,
    countryCode
  )
  const productName = String(localized.title || product.title || "Product")
  const thumbnailSrc = resolveProductThumbnailSrc(product.thumbnail)

  return (
    <div
      className={cn(
        "relative group border rounded-sm flex flex-col justify-between p-1 w-full lg:w-[calc(25%-1rem)] min-w-[250px]",
        className
      )}
      data-testid="product-card"
      data-product-handle={product.handle}
    >
      <div className="relative w-full h-full bg-primary aspect-square" data-testid="product-card-image-container">
        <LocalizedClientLink
          href={`/products/${product.handle}`}
          aria-label={`View ${productName}`}
          title={`View ${productName}`}
          data-testid="product-card-link"
        >
          <div className="overflow-hidden rounded-sm w-full h-full flex justify-center align-center ">
            {thumbnailSrc ? (
              <Image
                priority
                fetchPriority="high"
                src={thumbnailSrc}
                alt={`${productName} image`}
                width={100}
                height={100}
                sizes="(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw"
                className="object-cover aspect-square w-full object-center h-full lg:group-hover:-mt-14 transition-all duration-300 rounded-xs"
                data-testid="product-card-image"
              />
            ) : (
              <Image
                priority
                fetchPriority="high"
                src="/images/placeholder.svg"
                alt={`${productName} image placeholder`}
                width={100}
                height={100}
                sizes="(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw"
                data-testid="product-card-placeholder-image"
              />
            )}
          </div>
        </LocalizedClientLink>
        <LocalizedClientLink
          href={`/products/${product.handle}`}
          aria-label={`See more about ${productName}`}
          title={`See more about ${productName}`}
        >
          <Button className="absolute rounded-sm bg-action text-action-on-primary h-auto lg:h-[48px] lg:group-hover:block hidden w-full uppercase bottom-1 z-10" data-testid="product-card-see-more-button">
            See More
          </Button>
        </LocalizedClientLink>
      </div>
      <LocalizedClientLink
        href={`/products/${product.handle}`}
        aria-label={`Go to ${productName} page`}
        title={`Go to ${productName} page`}
      >
        <div className="flex justify-between p-4" data-testid="product-card-info">
          <div className="w-full">
            <h3 className="heading-sm truncate" data-testid="product-card-title">{product.title}</h3>
            <div className="flex items-center gap-2 mt-2" data-testid="product-card-price">
              <p className="font-medium" data-testid="product-card-current-price">{cheapestPrice?.calculated_price}</p>
              {cheapestPrice?.calculated_price !==
                cheapestPrice?.original_price && (
                <p className="text-sm text-gray-500 line-through" data-testid="product-card-original-price">
                  {cheapestPrice?.original_price}
                </p>
              )}
            </div>
            {wholesaleBuyer &&
              cheapestVariant &&
              typeof (cheapestVariant as { inventory_quantity?: number }).inventory_quantity ===
                "number" && (
                <p
                  className="text-sm text-secondary mt-1"
                  data-testid="product-card-stock"
                >
                  Giacenza:{" "}
                  {(cheapestVariant as { inventory_quantity: number }).inventory_quantity}
                </p>
              )}
          </div>
        </div>
      </LocalizedClientLink>
    </div>
  )
}
