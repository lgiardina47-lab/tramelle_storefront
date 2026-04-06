import type { StoreSellerListItem } from "@/types/seller"

import { sellerHeroImageCandidates } from "./seller-media-url"

/** Primo URL hero per directory (vedi `seller-media-url`). */
export function sellerCardHeroUrl(seller: {
  photo?: string | null
  metadata?: Record<string, unknown> | null
  name?: string
  handle?: string
}): string | null {
  return (
    sellerHeroImageCandidates(seller as StoreSellerListItem)[0] ?? null
  )
}

export function plainTextFromHtml(html: string, max = 140): string {
  const t = html
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim()
  if (!t) {
    return ""
  }
  if (t.length <= max) {
    return t
  }
  return `${t.slice(0, max).trimEnd()}…`
}
