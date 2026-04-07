import { SellerDescriptionTabsPlain } from "@/components/molecules/SellerDescriptionTabs/SellerDescriptionTabs"
import LocalizedClientLink from "@/components/molecules/LocalizedLink/LocalizedLink"
import { sellerDescriptionsMapForUi } from "@/lib/helpers/tramelle-seller-description-i18n"
import { sellerListingRegionLabel } from "@/lib/helpers/seller-listing-region"
import {
  sellerHeroImageCandidates,
  sellerLogoImageCandidates,
} from "@/lib/helpers/seller-media-url"
import type { StoreSellerListItem } from "@/types/seller"
import { SellerDirectoryCardMedia } from "./SellerDirectoryCardMedia"

export function SellerDirectoryCard({
  seller,
  urlLocale,
}: {
  seller: StoreSellerListItem
  urlLocale: string
}) {
  const country = seller.country_code?.trim().toUpperCase() || ""
  const region = sellerListingRegionLabel(seller)
  const locationLine =
    country && region
      ? `${country} · ${region}`
      : country || region || ""
  const descriptions = sellerDescriptionsMapForUi(
    seller.description,
    seller.metadata ?? undefined
  )
  const hasAnyDescription = Object.values(descriptions).some(
    (s) => (s || "").trim().length > 0
  )
  const initials = (seller.name || seller.handle).slice(0, 2).toUpperCase()

  return (
    <div className="group flex flex-col overflow-hidden rounded-lg border border-neutral-200 bg-white shadow-sm transition-shadow hover:shadow-md">
      <LocalizedClientLink
        href={`/sellers/${seller.handle}`}
        className="block min-w-0 flex-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-primary"
      >
        <SellerDirectoryCardMedia
          heroCandidates={sellerHeroImageCandidates(seller)}
          logoCandidates={sellerLogoImageCandidates(seller)}
          name={seller.name}
          initials={initials}
          locationLine={locationLine}
        />
      </LocalizedClientLink>
      {hasAnyDescription ? (
        <SellerDescriptionTabsPlain
          descriptions={descriptions}
          urlLocale={urlLocale}
        />
      ) : (
        <div className="h-px bg-neutral-100" aria-hidden />
      )}
    </div>
  )
}
