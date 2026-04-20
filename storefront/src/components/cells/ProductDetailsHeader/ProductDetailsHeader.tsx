"use client"

import { useTranslations } from "next-intl"

import { Button } from "@/components/atoms"
import { HttpTypes } from "@medusajs/types"
import { ProductVariants } from "@/components/molecules"
import { WholesalePricingPanel } from "@/components/molecules/WholesalePricingPanel/WholesalePricingPanel"
import useGetAllSearchParams from "@/hooks/useGetAllSearchParams"
import { getProductPrice } from "@/lib/helpers/get-product-price"
import { resolveSelectedStoreVariantId } from "@/lib/helpers/resolve-selected-variant-id"
import { Chat } from "@/components/organisms/Chat/Chat"
import { SellerProps } from "@/types/seller"
import { WishlistButton } from "../WishlistButton/WishlistButton"
import { Wishlist } from "@/types/wishlist"
import { toast } from "@/lib/helpers/toast"
import { useCartContext } from "@/components/providers"
import { parsePiecesPerCarton } from "@/lib/helpers/tramelle-variant-metadata"
import { productProducerDisplayName } from "@/lib/helpers/product-producer-name"
import LocalizedClientLink from "@/components/molecules/LocalizedLink/LocalizedLink"
import { ProductB2bLockPdp } from "@/components/molecules/ProductB2bLockPdp/ProductB2bLockPdp"

const optionsAsKeymap = (
  variantOptions: HttpTypes.StoreProductVariant["options"]
) => {
  return variantOptions?.reduce(
    (
      acc: Record<string, string>,
      varopt: HttpTypes.StoreProductOptionValue
    ) => {
      acc[varopt.option?.title.toLowerCase() || ""] = varopt.value

      return acc
    },
    {}
  )
}

export const ProductDetailsHeader = ({
  product,
  locale,
  user,
  wishlist,
  displayTitle,
}: {
  product: HttpTypes.StoreProduct & { seller?: SellerProps }
  locale: string
  user: HttpTypes.StoreCustomer | null
  wishlist?: Wishlist
  /** Titolo già localizzato (tramelle_i18n + paese). */
  displayTitle?: string
}) => {
  const t = useTranslations("Product")
  const titleForUi = displayTitle?.trim() ? displayTitle : product.title
  const { addToCart, onAddToCart, cart, isAddingItem, wholesaleBuyer } =
    useCartContext()
  const { allSearchParams } = useGetAllSearchParams()
  const restrictB2cCatalog = !wholesaleBuyer

  const { cheapestVariant, cheapestPrice } = getProductPrice({
    product,
    restrictToB2cVisible: restrictB2cCatalog,
  })

  // Check if product has any valid prices in current region
  const hasAnyPrice = cheapestPrice !== null && cheapestVariant !== null

  // set default variant
  const selectedVariant = hasAnyPrice
    ? {
        ...optionsAsKeymap(cheapestVariant.options ?? null),
        ...allSearchParams,
      }
    : allSearchParams

  const variantId =
    resolveSelectedStoreVariantId(product, selectedVariant, {
      restrictToB2cVisible: restrictB2cCatalog,
    }) ||
    (hasAnyPrice ? cheapestVariant?.id : "") ||
    ""

  // get variant price
  const { variantPrice } = getProductPrice({
    product,
    variantId,
    restrictToB2cVisible: restrictB2cCatalog,
  })

  const variantStock =
    product.variants?.find(({ id }) => id === variantId)?.inventory_quantity ||
    0

  const variantHasPrice = !!product.variants?.find(({ id }) => id === variantId)
    ?.calculated_price

  const lineQtyInCart =
    cart?.items?.find((item) => item.variant_id === variantId)?.quantity ?? 0

  const isVariantStockMaxLimitReached = lineQtyInCart >= variantStock

  const selectedStoreVariant = product.variants?.find(
    ({ id }) => id === variantId
  )

  // add the selected variant to the cart
  const handleAddToCart = async () => {
    if (!variantId || !hasAnyPrice || isVariantStockMaxLimitReached) return

    const meta = selectedStoreVariant?.metadata as
      | Record<string, unknown>
      | undefined
    const pieces = parsePiecesPerCarton(meta)
    const nextQty = lineQtyInCart + 1

    if (wholesaleBuyer && pieces > 0 && nextQty % pieces !== 0) {
      toast.error({
        title: t("wholesaleInvalidQtyTitle"),
        description: t("wholesaleInvalidQtyDescription", { pieces }),
      })
      return
    }

    const subtotal = +(variantPrice?.calculated_price_without_tax_number || 0)
    const total = +(variantPrice?.calculated_price_number || 0)

    const storeCartLineItem = {
      thumbnail: product.thumbnail || "",
      product_title: titleForUi,
      quantity: 1,
      subtotal,
      total,
      tax_total: total - subtotal,
      variant_id: variantId,
      product_id: product.id,
      variant: selectedStoreVariant,
    }

    // Optimistic update
    onAddToCart(storeCartLineItem, variantPrice?.currency_code || "eur")

    try {
      await addToCart({
        variantId: variantId,
        quantity: 1,
        countryCode: locale,
        lineMetadata:
          pieces > 0
            ? { tramelle_pieces_per_carton: String(pieces) }
            : undefined,
      })
    } catch (error) {
      toast.error({
        title: t("addToCartErrorTitle"),
        description: t("addToCartErrorDescription"),
      })
    }
  }

  const isAddToCartDisabled = !variantStock || !variantHasPrice || !hasAnyPrice || isVariantStockMaxLimitReached

  const producerLabel = productProducerDisplayName(product)

  return (
    <div className="border rounded-sm p-5" data-testid="product-details-header">
      <div className="flex justify-between">
        <div>
          <h1
            className="heading-lg text-primary !font-bold"
            data-testid="product-title"
          >
            {titleForUi}
          </h1>
          {producerLabel ? (
            <div className="mt-1" data-testid="product-producer-name">
              {product.seller?.handle ? (
                <LocalizedClientLink
                  href={`/sellers/${product.seller.handle}`}
                  className="label-md text-secondary hover:text-primary inline-block"
                >
                  {producerLabel}
                </LocalizedClientLink>
              ) : (
                <p className="label-md text-secondary">{producerLabel}</p>
              )}
            </div>
          ) : null}
          <div className="mt-2 flex gap-2 items-center" data-testid="product-price-container">
            {hasAnyPrice && variantPrice ? (
              <>
                <span className="heading-md text-primary" data-testid="product-price-current">
                  {variantPrice.calculated_price}
                </span>
                {variantPrice.calculated_price_number !==
                  variantPrice.original_price_number && (
                  <span className="label-md text-secondary line-through" data-testid="product-price-original">
                    {variantPrice.original_price}
                  </span>
                )}
              </>
            ) : (
              <span className="label-md text-secondary pt-2 pb-4" data-testid="product-price-unavailable">
                {t("notAvailableInRegion")}
              </span>
            )}
            {hasAnyPrice &&
              selectedStoreVariant?.manage_inventory &&
              typeof variantStock === "number" &&
              variantStock > 0 && (
                <p
                  className="label-md text-secondary mt-2"
                  data-testid="product-stock-display"
                >
                  {t("inStockCount", { count: variantStock })}
                </p>
              )}
          </div>
          {hasAnyPrice && variantPrice && !wholesaleBuyer ? (
            <ProductB2bLockPdp product={product} />
          ) : null}
        </div>
        <div>
          {/* Add to Wishlist */}
          <WishlistButton
            productId={product.id}
            wishlist={wishlist}
            user={user}
          />
        </div>
      </div>
      {/* Product Variants */}
      {hasAnyPrice && (
        <ProductVariants
          product={product}
          selectedVariant={selectedVariant}
          restrictToB2cVisible={restrictB2cCatalog}
        />
      )}
      {hasAnyPrice && variantPrice && (
        <WholesalePricingPanel
          variant={selectedStoreVariant}
          retailEuros={variantPrice.calculated_price_number}
          currencyCode={variantPrice.currency_code || "eur"}
          locale={locale}
        />
      )}
      {/* Add to Cart */}
      <Button
        onClick={handleAddToCart}
        disabled={isAddToCartDisabled}
        loading={isAddingItem}
        className="w-full uppercase mb-4 py-3 flex justify-center"
        size="large"
        data-testid="product-add-to-cart-button"
      >
        {!hasAnyPrice
          ? t("notAvailableInRegionButton")
          : variantStock && variantHasPrice
          ? t("addToCart")
          : t("outOfStock")}
      </Button>
      {/* Seller message */}

      {user && product.seller && (
        <Chat
          user={user}
          seller={product.seller}
          buttonClassNames="w-full uppercase"
          product={product}
        />
      )}
    </div>
  )
}
