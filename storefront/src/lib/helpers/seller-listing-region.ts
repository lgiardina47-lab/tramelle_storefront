import type { StoreSellerListItem } from "@/types/seller"

/** Regione / provenienza per card directory (allineato ad admin `listing_region` / `province`). */
export function sellerListingRegionLabel(
  seller: StoreSellerListItem
): string | null {
  const meta = seller.metadata
  if (meta) {
    for (const k of ["listing_region", "listingRegion", "province"] as const) {
      const v = meta[k]
      if (typeof v === "string" && v.trim()) {
        return v.trim()
      }
    }
  }
  const s = typeof seller.state === "string" ? seller.state.trim() : ""
  return s || null
}
