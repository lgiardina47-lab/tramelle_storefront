"use client"

import { useTranslations } from "next-intl"
import Image from "next/image"
import { TramelleProductImage } from "@/components/atoms"
import { HttpTypes } from "@medusajs/types"
import { cn } from "@/lib/utils"
import LocalizedClientLink from "@/components/molecules/LocalizedLink/LocalizedLink"
import {
  getCheapestB2bOnlyCatalogPrice,
  getProductPrice,
} from "@/lib/helpers/get-product-price"
import { Product } from "@/types/product"
import { useCartContext } from "@/components/providers"
import { useB2BPricingModal } from "@/components/providers/B2BPricingModal/B2BPricingModalProvider"
import { useParams } from "next/navigation"
import { getLocalizedProductContentForCountry } from "@/lib/helpers/tramelle-product-content"
import { resolveProductThumbnailSrc } from "@/lib/helpers/get-image-url"
import { productProducerDisplayName } from "@/lib/helpers/product-producer-name"
import { productSellerStripRegion } from "@/lib/helpers/product-seller-strip"
import { SellerProps } from "@/types/seller"
import { useProductListingImageCoordination } from "./ProductListingImageLoadContext"
import { useCallback, useEffect, useRef } from "react"

export const ProductCard = ({
  product,
  className,
  imagePriority = false,
  imageRowIndex = 0,
  /** Carosello home: card più stretta, meno chrome, area immagine più alta. */
  layoutVariant = "default",
  /** `false` per eccezioni (es. vetrine senza acquisto). Default: lock B2B sotto il retail. */
  showB2bLockRow = true,
  /**
   * Rail orizzontale (Embla): `loading="lazy"` spesso non interseca correttamente con l’overflow
   * nascosto — le immagini restano in attesa. Forza eager su tutte le slide del carosello.
   */
  imageForceEager = false,
}: {
  product: HttpTypes.StoreProduct | Product
  className?: string
  imagePriority?: boolean
  imageRowIndex?: number
  layoutVariant?: "default" | "homeRail"
  showB2bLockRow?: boolean
  imageForceEager?: boolean
}) => {
  const t = useTranslations("Product")
  const { wholesaleBuyer } = useCartContext()
  const { open: openB2bModal } = useB2BPricingModal()
  const params = useParams()
  const countryCode =
    typeof params?.locale === "string"
      ? params.locale
      : process.env.NEXT_PUBLIC_DEFAULT_REGION || "it"

  const productId = product?.id
  const thumbnailSrc = productId
    ? resolveProductThumbnailSrc(product.thumbnail)
    : null

  const coord = useProductListingImageCoordination()
  const canShowMedia =
    coord == null || imageRowIndex <= coord.allowedRow
  const slotReportedRef = useRef(false)

  const reportSlotOnce = useCallback(() => {
    if (!coord || slotReportedRef.current) return
    slotReportedRef.current = true
    coord.reportProductRowSlotComplete(imageRowIndex)
  }, [coord, imageRowIndex])

  useEffect(() => {
    slotReportedRef.current = false
  }, [thumbnailSrc, imageRowIndex])

  useEffect(() => {
    if (!canShowMedia || thumbnailSrc) return
    reportSlotOnce()
  }, [canShowMedia, thumbnailSrc, reportSlotOnce])

  /** Se `onLoad` / `onError` non arrivano (rete bloccata), sblocca comunque la riga listing. */
  useEffect(() => {
    if (!coord || !canShowMedia || !thumbnailSrc) return
    const id = window.setTimeout(() => {
      reportSlotOnce()
    }, 12000)
    return () => window.clearTimeout(id)
  }, [coord, canShowMedia, thumbnailSrc, reportSlotOnce])

  if (!productId) {
    return null
  }

  const storeProduct = product as HttpTypes.StoreProduct
  const retailPkg = getProductPrice({
    product: storeProduct,
    restrictToB2cVisible: true,
  })
  const allPkg = getProductPrice({
    product: storeProduct,
    restrictToB2cVisible: false,
  })
  const b2bOnlyPrice = getCheapestB2bOnlyCatalogPrice(storeProduct)
  const retailCheapest = retailPkg.cheapestPrice
  const displayCheapest =
    retailCheapest ?? (wholesaleBuyer ? allPkg.cheapestPrice : null)

  const localized = getLocalizedProductContentForCountry(
    product as HttpTypes.StoreProduct,
    countryCode
  )
  const productName = String(localized.title || product.title || "Product")
  const producerLabel = productProducerDisplayName(
    product as HttpTypes.StoreProduct & { seller?: SellerProps }
  )
  const seller = (
    product as HttpTypes.StoreProduct & { seller?: SellerProps }
  ).seller
  const sellerHandle = seller?.handle?.trim()
  const regionLine = productSellerStripRegion(seller)
  const showSellerStrip = Boolean(producerLabel)
  const showB2bTeaser =
    showB2bLockRow && !wholesaleBuyer && Boolean(retailCheapest)
  const showWholesalePriceRow =
    wholesaleBuyer && retailCheapest && b2bOnlyPrice
  const initials = (producerLabel || "·").slice(0, 2).toUpperCase()
  const rail = layoutVariant === "homeRail"

  const forceEagerListing =
    imageForceEager || (coord != null && canShowMedia)
  const productHref = `/products/${product.handle}`

  const stripInner = (
    <>
      <span
        className={cn(
          "flex shrink-0 items-center justify-center rounded-md bg-[#E8E4DE] font-semibold text-[#8A8580]",
          rail
            ? "h-[18px] w-[18px] text-[7px]"
            : "h-[22px] w-[22px] text-[7.5px]"
        )}
        aria-hidden
      >
        {initials}
      </span>
      <div className="min-w-0 flex-1">
        <p
          className={cn(
            "truncate font-medium text-[#0F0E0B]",
            rail ? "text-[10px]" : "text-[11px]"
          )}
        >
          {producerLabel}
        </p>
        {regionLine ? (
          <p
            className={cn(
              "truncate font-normal text-[#B5B0A8]",
              rail ? "text-[9px]" : "text-[10px]"
            )}
          >
            {regionLine}
          </p>
        ) : null}
      </div>
      <span
        className={cn("shrink-0 text-[#B5B0A8]", rail ? "text-[9px]" : "text-[10px]")}
        aria-hidden
      >
        →
      </span>
    </>
  )

  return (
    <div
      className={cn(
        "relative group flex max-w-full min-w-0 w-full flex-col overflow-hidden border border-[#E8E4DE] bg-white hover:border-[#CCC8C0]",
        rail ? "rounded-[14px]" : "rounded-[18px]",
        className
      )}
      data-testid="product-card"
      data-product-handle={product.handle}
    >
      {showSellerStrip ? (
        sellerHandle ? (
          <LocalizedClientLink
            href={`/sellers/${sellerHandle}`}
            locale={countryCode}
            className={cn(
              "flex items-center border-b border-[#E8E4DE] bg-[#FAFAF8]",
              rail ? "gap-1 px-2 py-1.5" : "gap-[7px] px-3 py-2"
            )}
            data-testid="product-card-seller-strip"
          >
            {stripInner}
          </LocalizedClientLink>
        ) : (
          <div
            className={cn(
              "flex items-center border-b border-[#E8E4DE] bg-[#FAFAF8]",
              rail ? "gap-1 px-2 py-1.5" : "gap-[7px] px-3 py-2"
            )}
            data-testid="product-card-seller-strip"
          >
            {stripInner}
          </div>
        )
      ) : null}

      <div
        className={cn(
          "relative w-full overflow-hidden bg-[#F7F6F3]",
          rail ? "aspect-[3/4]" : "aspect-[4/3]"
        )}
        data-testid="product-card-image-container"
      >
        <LocalizedClientLink
          href={productHref}
          locale={countryCode}
          aria-label={`View ${productName}`}
          title={`View ${productName}`}
          data-testid="product-card-link"
          className="absolute inset-0 block"
        >
          {!canShowMedia ? (
            <div
              className="absolute inset-0 z-[1] animate-pulse bg-[#E8E4DE]/40"
              aria-hidden
            />
          ) : thumbnailSrc ? (
            <TramelleProductImage
              key={thumbnailSrc}
              layout="fill"
              priority={imagePriority}
              forceEager={forceEagerListing}
              src={thumbnailSrc}
              alt={`${productName} image`}
              preset="listing-card"
              quality={imagePriority ? 85 : 80}
              className={cn(
                "object-contain object-center",
                rail ? "p-1 sm:p-1.5" : "p-3 sm:p-4"
              )}
              data-testid="product-card-image"
              onLoad={reportSlotOnce}
              onError={reportSlotOnce}
            />
          ) : (
            <Image
              fill
              priority={imagePriority}
              fetchPriority={imagePriority ? "high" : undefined}
              src="/images/placeholder.svg"
              alt={`${productName} image placeholder`}
              sizes={
                rail
                  ? "(min-width: 960px) 19vw, (min-width: 640px) 32vw, 88vw"
                  : "(min-width: 1280px) 280px, (min-width: 1024px) 24vw, (min-width: 640px) 45vw, 88vw"
              }
              quality={75}
              className="object-contain object-center p-6 opacity-50"
              data-testid="product-card-placeholder-image"
              onLoadingComplete={reportSlotOnce}
            />
          )}
        </LocalizedClientLink>
      </div>

      <div
        className={cn(
          "flex flex-1 flex-col",
          rail ? "px-2 pb-1.5 pt-1.5" : "px-[13px] pb-2 pt-[11px]"
        )}
        data-testid="product-card-info"
      >
        <LocalizedClientLink
          href={productHref}
          locale={countryCode}
          aria-label={`Go to ${productName} page`}
          className="block min-w-0"
        >
          <h3
            className={cn(
              "truncate font-bold leading-snug text-[#0F0E0B]",
              rail ? "text-[12px] leading-tight" : "text-[13px]"
            )}
            data-testid="product-card-title"
          >
            {productName}
          </h3>
        </LocalizedClientLink>

        <div
          className={cn(
            "flex flex-wrap items-baseline gap-2",
            rail ? "mt-1.5" : "mt-2"
          )}
          data-testid="product-card-price"
        >
          {displayCheapest ? (
            <>
              <p
                className={cn(
                  "font-tramelle-display font-normal leading-tight text-[#0F0E0B]",
                  rail ? "text-[17px]" : "text-[20px]"
                )}
                data-testid="product-card-current-price"
              >
                {displayCheapest.calculated_price}
              </p>
              {displayCheapest.calculated_price !==
              displayCheapest.original_price ? (
                <p
                  className="text-[11px] text-[#8A8580] line-through"
                  data-testid="product-card-original-price"
                >
                  {displayCheapest.original_price}
                </p>
              ) : null}
            </>
          ) : (
            <p className="text-[13px] text-[#8A8580]">{t("priceOnRequest")}</p>
          )}
        </div>

        {showWholesalePriceRow ? (
          <div
            className={cn(
              "mt-1 flex flex-wrap items-baseline gap-1",
              rail ? "mb-0.5" : "mb-0.5"
            )}
            data-testid="product-card-b2b-buyer-price"
          >
            <span className="text-[10px] font-normal uppercase tracking-[0.14em] text-[#8A8580]">
              B2B
            </span>
            <span
              className={cn(
                "font-tramelle-display font-normal text-[#0F0E0B]",
                rail ? "text-[16px]" : "text-[18px]"
              )}
            >
              {b2bOnlyPrice!.calculated_price}
            </span>
          </div>
        ) : null}

        {showB2bTeaser ? (
          <button
            type="button"
            className="mt-1 inline-flex max-w-full cursor-pointer items-center gap-[5px] rounded-full border-0 bg-[#F5F3F0] px-2.5 py-[3px] text-left text-[10px] text-[#B5B0A8] outline-none ring-offset-2 focus-visible:ring-2 focus-visible:ring-[#0F0E0B]/20"
            data-testid="product-card-b2b-teaser"
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              openB2bModal()
            }}
          >
            <span className="shrink-0 font-medium">B2B</span>
            <span
              className="inline-block shrink-0 select-none font-medium blur-[3px] text-[#8A8580] [letter-spacing:0.02em]"
              aria-hidden
            >
              {b2bOnlyPrice?.calculated_price ?? "€ ····"}
            </span>
            <span className="shrink-0 font-medium" aria-hidden>
              ·
            </span>
            <span className="min-w-0 truncate font-medium text-[#8A8580]">
              {t("cardB2bLogin")}
            </span>
          </button>
        ) : null}

        <LocalizedClientLink
          href={productHref}
          locale={countryCode}
          className={cn(
            "flex w-full min-w-0 items-center justify-center rounded-[999px] bg-[#0F0E0B] text-center font-medium text-white hover:opacity-[0.88] active:opacity-[0.72] whitespace-nowrap",
            rail
              ? "mt-2 px-2 py-2 text-[9px] tracking-[0.06em]"
              : "mt-3 px-3 py-3 text-[10px] tracking-[0.08em] sm:px-4 sm:text-[11px]"
          )}
          data-testid="product-card-cta"
        >
          {t("cardCtaTable")}
        </LocalizedClientLink>
      </div>
    </div>
  )
}
