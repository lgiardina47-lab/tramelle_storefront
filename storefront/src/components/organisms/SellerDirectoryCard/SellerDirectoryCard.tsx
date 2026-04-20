import { SellerDescriptionTabsPlain } from "@/components/molecules/SellerDescriptionTabs/SellerDescriptionTabs"
import LocalizedClientLink from "@/components/molecules/LocalizedLink/LocalizedLink"
import { sellerDescriptionsMapForUi } from "@/lib/helpers/tramelle-seller-description-i18n"
import { sellerListingRegionLabel } from "@/lib/helpers/seller-listing-region"
import {
  sellerDirectoryHeroImageCandidates,
  sellerDirectoryLogoImageCandidates,
} from "@/lib/helpers/seller-media-url"
import type { StoreSellerListItem } from "@/types/seller"
import { SellerDirectoryCardMedia } from "./SellerDirectoryCardMedia"
import { SellerDirectoryShopLink } from "./SellerDirectoryShopLink"

export function SellerDirectoryCard({
  seller,
  urlLocale,
  /** Riga nella griglia a 4 colonne (`floor(index/4)`): priorità immagini a blocchi per riga. */
  imageRowIndex = 0,
}: {
  seller: StoreSellerListItem
  urlLocale: string
  imageRowIndex?: number
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
    <div className="group flex flex-col overflow-hidden rounded-2xl border border-[#E8E4DE] bg-white hover:border-[#CCC8C0]">
      <LocalizedClientLink
        href={`/sellers/${seller.handle}`}
        className="block min-w-0 flex-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-primary"
      >
        <SellerDirectoryCardMedia
          heroCandidates={sellerDirectoryHeroImageCandidates(seller)}
          logoCandidates={sellerDirectoryLogoImageCandidates(seller)}
          name={seller.name}
          initials={initials}
          locationLine={locationLine}
          imageRowIndex={imageRowIndex}
        />
      </LocalizedClientLink>
      <div className="border-t border-neutral-100">
        {hasAnyDescription ? (
          <div className="px-4 pt-4 pb-2">
            <SellerDescriptionTabsPlain
              descriptions={descriptions}
              urlLocale={urlLocale}
            />
          </div>
        ) : null}
        <div
          className={
            hasAnyDescription
              ? "px-4 pb-4 pt-1"
              : "px-4 py-4"
          }
        >
          <SellerDirectoryShopLink
            handle={seller.handle}
            urlLocale={urlLocale}
          />
        </div>
      </div>
    </div>
  )
}
