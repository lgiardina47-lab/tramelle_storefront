import { sellerListingRegionLabel } from "@/lib/helpers/seller-listing-region"
import type { SellerProps, StoreSellerListItem } from "@/types/seller"

/** Regione / paese per seller strip in product card (allineato alla directory). */
export function productSellerStripRegion(
  seller: SellerProps | null | undefined
): string {
  if (!seller) return ""
  const region = sellerListingRegionLabel(seller as unknown as StoreSellerListItem)
  const cc =
    (seller as { country_code?: string | null }).country_code
      ?.trim()
      .toUpperCase() || ""
  if (cc && region) return `${cc} · ${region}`
  if (region) return region
  return cc
}
