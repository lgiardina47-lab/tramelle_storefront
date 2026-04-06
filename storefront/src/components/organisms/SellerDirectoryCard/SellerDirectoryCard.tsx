import LocalizedClientLink from "@/components/molecules/LocalizedLink/LocalizedLink"
import { plainTextFromHtml } from "@/lib/helpers/seller-card-hero"
import { sellerListingRegionLabel } from "@/lib/helpers/seller-listing-region"
import {
  sellerHeroImageCandidates,
  sellerLogoImageCandidates,
} from "@/lib/helpers/seller-media-url"
import type { StoreSellerListItem } from "@/types/seller"
import { SellerDirectoryCardMedia } from "./SellerDirectoryCardMedia"

export function SellerDirectoryCard({ seller }: { seller: StoreSellerListItem }) {
  const country = seller.country_code?.trim().toUpperCase() || ""
  const region = sellerListingRegionLabel(seller)
  const locationLine =
    country && region
      ? `${country} · ${region}`
      : country || region || ""
  const excerpt = plainTextFromHtml(
    typeof seller.description === "string" ? seller.description : ""
  )
  const initials = (seller.name || seller.handle).slice(0, 2).toUpperCase()

  return (
    <LocalizedClientLink
      href={`/sellers/${seller.handle}`}
      className="group flex flex-col overflow-hidden rounded-lg border border-neutral-200 bg-white shadow-sm transition-shadow hover:shadow-md"
    >
      <SellerDirectoryCardMedia
        heroCandidates={sellerHeroImageCandidates(seller)}
        logoCandidates={sellerLogoImageCandidates(seller)}
        name={seller.name}
        initials={initials}
        locationLine={locationLine}
      />
      {excerpt ? (
        <p className="line-clamp-2 px-4 py-3 text-sm leading-relaxed text-neutral-600">
          {excerpt}
        </p>
      ) : (
        <div className="h-px bg-neutral-100" aria-hidden />
      )}
    </LocalizedClientLink>
  )
}
