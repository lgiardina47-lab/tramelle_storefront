import { SellerReviewList, SellerScore } from "@/components/molecules"
import { getSellerByHandle } from "@/lib/data/seller"
import type { SellerProps } from "@/types/seller"
import { getTranslations } from "next-intl/server"
import { countryCodeToStorefrontMessagesLocale } from "@/lib/i18n/storefront-messages-locale"

export const SellerReviewTab = async ({
  seller_handle,
  /** Se già disponibile (pagina seller), evita un secondo GET. */
  seller: sellerFromPage,
  urlLocale,
}: {
  seller_handle: string
  seller?: SellerProps | null
  urlLocale?: string
}) => {
  const seller =
    sellerFromPage ?? (await getSellerByHandle(seller_handle))
  if (!seller) {
    return null
  }

  const uiLocale = countryCodeToStorefrontMessagesLocale(urlLocale ?? "it")
  const t = await getTranslations({ locale: uiLocale, namespace: "ProductSheet" })

  const filteredReviews = seller.reviews?.filter((r) => r !== null)

  const reviewCount = filteredReviews ? filteredReviews?.length : 0

  const rating =
    filteredReviews && filteredReviews.length > 0
      ? filteredReviews.reduce((sum, r) => sum + r?.rating, 0) /
        filteredReviews.length
      : 0

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 mt-8">
      <div className="border rounded-sm p-4">
        <SellerScore rate={rating} reviewCount={reviewCount} />
      </div>
      <div className="col-span-3 border rounded-sm p-4">
        <h3 className="heading-sm uppercase border-b pb-4">
          {t("sellerReviewsHeading")}
        </h3>
        <SellerReviewList reviews={seller.reviews} />
      </div>
    </div>
  )
}
