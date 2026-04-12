import { SellerFooter, SellerHeading } from "@/components/organisms"
import { SellerPagePhotoMosaic } from "@/components/molecules/SellerPagePhotoMosaic/SellerPagePhotoMosaic"
import { sellerHeroBadgesFromMetadata } from "@/lib/helpers/seller-hero-badges"
import { sellerListingRegionLabel } from "@/lib/helpers/seller-listing-region"
import {
  sellerPagePhotoMosaicModel,
  sellerPrimaryLogoOrPhotoUrl,
} from "@/lib/helpers/seller-media-url"
import type { StoreSellerListItem } from "@/types/seller"
import { HttpTypes } from "@medusajs/types"

export const SellerPageHeader = ({
  header = false,
  seller,
  user,
  urlLocale,
}: {
  header?: boolean
  seller: any
  user: HttpTypes.StoreCustomer | null
  urlLocale: string
}) => {
  const { coverCandidates } =
    header && seller ? sellerPagePhotoMosaicModel(seller) : { coverCandidates: [] }

  const logoUrl = seller ? sellerPrimaryLogoOrPhotoUrl(seller) : ""
  const country = seller ? (seller.country_code || "").trim().toUpperCase() : ""
  const region = seller
    ? sellerListingRegionLabel(seller as StoreSellerListItem)
    : null
  const regionLine =
    country && region ? `${country} · ${region}` : country || region || ""
  const badges = seller
    ? sellerHeroBadgesFromMetadata(seller.metadata ?? undefined)
    : []

  return (
    <div className="w-full">
      {coverCandidates.length > 0 ? (
        <SellerPagePhotoMosaic
          coverCandidates={coverCandidates}
          name={seller.name}
          logoUrl={logoUrl || undefined}
          regionLine={regionLine || undefined}
          badges={badges}
          className="w-full border-b border-neutral-200"
        />
      ) : null}
      <div id="seller-heading-anchor" className="scroll-mt-4">
        <SellerHeading
          header={header}
          seller={seller}
          user={user}
          urlLocale={urlLocale}
        />
      </div>
      <SellerFooter seller={seller} />
    </div>
  )
}
