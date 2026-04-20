import type { StoreSellerListItem } from "@/types/seller"

import { sellerDirectoryHeroImageCandidates } from "./seller-media-url"

/** Primo URL hero per directory (variante CF card, non hero full). */
export function sellerCardHeroUrl(seller: {
  photo?: string | null
  metadata?: Record<string, unknown> | null
  name?: string
  handle?: string
}): string | null {
  return (
    sellerDirectoryHeroImageCandidates(seller as StoreSellerListItem)[0] ??
    null
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
