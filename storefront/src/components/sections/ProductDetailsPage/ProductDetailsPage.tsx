import { ProductDetails, ProductGallery } from "@/components/organisms"
import { countryCodeToStorefrontMessagesLocale } from "@/lib/i18n/storefront-messages-locale"
import { getPdpMoreFromSellerProducts } from "@/lib/data/product-by-handle-cached"
import { productProducerDisplayName } from "@/lib/helpers/product-producer-name"
import { HomeProductSection } from "../HomeProductSection/HomeProductSection"
import { getTranslations } from "next-intl/server"
import { HttpTypes } from "@medusajs/types"
import { SellerProps } from "@/types/seller"

export const ProductDetailsPage = async ({
  product: prod,
  locale,
  moreFromSeller: moreFromSellerProp,
}: {
  product: HttpTypes.StoreProduct & { seller?: SellerProps }
  locale: string
  /** Da {@link getCachedPdpBundle}: evita GET catalogo per “altri dal produttore”. */
  moreFromSeller?: (HttpTypes.StoreProduct & { seller?: SellerProps })[]
}) => {
  const moreFromSeller =
    moreFromSellerProp !== undefined
      ? moreFromSellerProp
      : prod.seller?.id
        ? await getPdpMoreFromSellerProducts(
            locale,
            prod.seller.id,
            (prod.handle || "").trim()
          )
        : []

  const t = await getTranslations({
    locale: countryCodeToStorefrontMessagesLocale(locale),
    namespace: "ProductSheet",
  })
  const sellerNameForHeading =
    prod.seller?.name?.trim() ||
    productProducerDisplayName(prod) ||
    null
  const moreProductsHeading = sellerNameForHeading
    ? t("moreFromSellerGourmet", { sellerName: sellerNameForHeading })
    : t("moreFromSeller")

  return (
    <>
      <div
        className="flex flex-col md:flex-row lg:gap-12"
        data-testid="product-details-page"
      >
        <div
          className="md:w-1/2 md:px-2"
          data-testid="product-gallery-container"
        >
          <ProductGallery
            images={prod?.images || []}
            thumbnailUrl={prod?.thumbnail}
          />
        </div>
        <div
          className="md:w-1/2 md:px-2"
          data-testid="product-details-container"
        >
          <ProductDetails product={prod} locale={locale} />
        </div>
      </div>
      <div className="my-8">
        <HomeProductSection
          heading={moreProductsHeading}
          products={moreFromSeller}
          locale={locale}
        />
      </div>
    </>
  )
}
