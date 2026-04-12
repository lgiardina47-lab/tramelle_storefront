"use client"

import { useTranslations } from "next-intl"
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
import { productProducerDisplayName } from "@/lib/helpers/product-producer-name"
import { SellerProps } from "@/types/seller"

export const ProductCard = ({
  product,
  className,
}: {
  product: HttpTypes.StoreProduct | Product,
  className?: string
}) => {
  const t = useTranslations("Product")
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
  const producerLabel = productProducerDisplayName(
    product as HttpTypes.StoreProduct & { seller?: SellerProps }
  )

  return (
    <div
      className={cn(
        "relative group border rounded-sm flex flex-col justify-between p-1 w-full lg:w-[calc(25%-1rem)] min-w-[250px]",
        className
      )}
      data-testid="product-card"
      data-product-handle={product.handle}
    >
      <div
        className="relative w-full aspect-square overflow-hidden rounded-sm bg-ui-bg-subtle"
        data-testid="product-card-image-container"
      >
        <LocalizedClientLink
          href={`/products/${product.handle}`}
          aria-label={`View ${productName}`}
          title={`View ${productName}`}
          data-testid="product-card-link"
          className="absolute inset-0 block"
        >
          {thumbnailSrc ? (
            <Image
              fill
              priority
              fetchPriority="high"
              src={thumbnailSrc}
              alt={`${productName} image`}
              sizes="(min-width: 1280px) 320px, (min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw"
              className="object-contain object-center p-3 sm:p-4"
              data-testid="product-card-image"
            />
          ) : (
            <Image
              fill
              priority
              fetchPriority="high"
              src="/images/placeholder.svg"
              alt={`${productName} image placeholder`}
              sizes="(min-width: 1280px) 320px, (min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw"
              className="object-contain object-center p-6 opacity-60"
              data-testid="product-card-placeholder-image"
            />
          )}
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
            <h3 className="heading-sm truncate" data-testid="product-card-title">{productName}</h3>
            {producerLabel ? (
              <p
                className="label-md text-secondary truncate mt-0.5"
                data-testid="product-card-producer"
              >
                {producerLabel}
              </p>
            ) : null}
            <div className="flex items-center gap-2 mt-2" data-testid="product-card-price">
              <p className="font-medium" data-testid="product-card-current-price">{cheapestPrice?.calculated_price}</p>
              {cheapestPrice?.calculated_price !==
                cheapestPrice?.original_price && (
                <p className="text-sm text-gray-500 line-through" data-testid="product-card-original-price">
                  {cheapestPrice?.original_price}
                </p>
              )}
            </div>
            {cheapestVariant?.manage_inventory &&
              typeof (cheapestVariant as { inventory_quantity?: number })
                .inventory_quantity === "number" &&
              (cheapestVariant as { inventory_quantity: number })
                .inventory_quantity > 0 && (
                <p
                  className="text-sm text-secondary mt-1"
                  data-testid="product-card-stock"
                >
                  {t("inStockCount", {
                    count: (cheapestVariant as { inventory_quantity: number })
                      .inventory_quantity,
                  })}
                </p>
              )}
          </div>
        </div>
      </LocalizedClientLink>
    </div>
  )
}
