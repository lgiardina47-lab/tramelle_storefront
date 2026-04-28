import { StarRating } from "@/components/atoms"
import { SellerAvatar } from "@/components/cells/SellerAvatar/SellerAvatar"
import { SellerDescriptionTabsHtml } from "@/components/molecules/SellerDescriptionTabs/SellerDescriptionTabs"
import { SellerPageCoverBanner } from "@/components/molecules/SellerPageCoverBanner/SellerPageCoverBanner"
import { Chat } from "@/components/organisms/Chat/Chat"
import { SellerFooter } from "@/components/organisms/SellerFooter/SellerFooter"
import { sellerDescriptionsMapForUi } from "@/lib/helpers/tramelle-seller-description-i18n"
import { sellerListingRegionLabel } from "@/lib/helpers/seller-listing-region"
import {
  sellerPagePhotoMosaicModel,
  sellerPrimaryLogoOrPhotoUrl,
} from "@/lib/helpers/seller-media-url"
import type { SellerProps, StoreSellerListItem } from "@/types/seller"
import { countryCodeToStorefrontMessagesLocale } from "@/lib/i18n/storefront-messages-locale"
import { HttpTypes } from "@medusajs/types"
import { getTranslations } from "next-intl/server"

export async function SellerPageHeader({
  header = false,
  seller,
  user,
  urlLocale,
}: {
  header?: boolean
  seller: SellerProps
  user: HttpTypes.StoreCustomer | null
  urlLocale: string
}) {
  const { coverCandidates } =
    header && seller ? sellerPagePhotoMosaicModel(seller) : { coverCandidates: [] }

  const logoUrl = seller ? sellerPrimaryLogoOrPhotoUrl(seller) : ""
  const country = seller ? (seller.country_code || "").trim().toUpperCase() : ""
  const region = seller
    ? sellerListingRegionLabel(seller as StoreSellerListItem)
    : null
  const regionLine =
    country && region ? `${country} · ${region}` : country || region || ""

  const descriptions = sellerDescriptionsMapForUi(
    seller.description,
    seller.metadata ?? undefined
  )
  const hasDescription = Object.values(descriptions).some(
    (s) => (s || "").trim().length > 0
  )

  const reviews = seller.reviews?.filter((r) => r !== null) ?? []
  const reviewCount = reviews.length
  const rating =
    reviewCount > 0
      ? reviews.reduce((sum, r) => sum + (r?.rating || 0), 0) / reviewCount
      : 0

  const t = await getTranslations({
    locale: countryCodeToStorefrontMessagesLocale(urlLocale),
    namespace: "ProductSheet",
  })

  return (
    <div className="w-full">
      <div className="container px-4 md:px-5 lg:px-8 pt-6 md:pt-10">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between sm:gap-6">
          <div className="min-w-0">
            <h1 className="heading-xl text-primary uppercase tracking-tight">
              {seller.name}
            </h1>
            {reviewCount > 0 ? (
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <StarRating starSize={14} rate={rating} />
                <span className="label-md text-secondary">
                  {t("reviewsCount", { count: reviewCount })}
                </span>
              </div>
            ) : null}
          </div>
          {regionLine ? (
            <p className="shrink-0 text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-secondary sm:text-xs">
              {regionLine}
            </p>
          ) : null}
        </div>

        <div className="mt-8 flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
          <div className="flex items-start gap-5 md:flex-1 md:min-w-0">
            <div className="flex h-[120px] w-[120px] shrink-0 items-center justify-center rounded-sm border border-neutral-100 bg-white shadow-sm">
              <SellerAvatar
                photo={logoUrl || seller.photo || ""}
                size={96}
                alt={seller.name}
              />
            </div>
            <div className="min-w-0 flex-1">
              {hasDescription ? (
                <SellerDescriptionTabsHtml
                  key={urlLocale}
                  descriptions={descriptions}
                  urlLocale={urlLocale}
                  className="text-md text-secondary leading-relaxed md:columns-2 md:[column-gap:2.5rem] [&_p]:mb-4 [&_p:last-child]:mb-0 [&_ul]:mb-4 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:break-inside-avoid [&_a]:underline [&_a]:underline-offset-2"
                />
              ) : null}
            </div>
          </div>
          {user ? (
            <div className="shrink-0 md:pt-0.5">
              <Chat
                user={user}
                seller={seller}
                buttonClassNames="uppercase h-10 whitespace-nowrap"
                variant="filled"
                buttonSize="small"
              />
            </div>
          ) : null}
        </div>
      </div>

      {coverCandidates.length > 0 ? (
        <div className="mt-10 w-full">
          <SellerPageCoverBanner
            coverCandidates={coverCandidates}
            name={seller.name}
          />
        </div>
      ) : null}

      <div className="border-t border-neutral-100">
        <SellerFooter seller={seller} />
      </div>
    </div>
  )
}
