/**
 * Risolve URL assoluti per foto seller (Medusa relative, //, CDN Tramelle).
 * Allineato alla logica vendor-panel `trammelle-partner-media.ts`.
 */

import { sellerStorytellingGalleryUrls } from "@/components/molecules/SellerStorytellingGallery/seller-storytelling-gallery-urls"
import type { StoreSellerListItem } from "@/types/seller"
import { medusaImageRewriteBase } from "@/lib/helpers/get-image-url"

export function medusaPublicBase(): string {
  return medusaImageRewriteBase()
}

export function tramelleCdnBase(): string {
  const raw = process.env.NEXT_PUBLIC_TRAMELLE_CDN_PUBLIC_BASE?.trim()
  return (raw?.replace(/\/$/, "") || "https://cdn.tramelle.com").trim()
}

function stripForAsciiToken(s: string): string {
  return s
    .normalize("NFKD")
    .replace(/\p{M}/gu, "")
    .replace(/[^\x00-\x7F]+/g, "")
}

export function brandFileToken(name: string, folderSlug: string): string {
  let s = stripForAsciiToken((name || "").trim()).toLowerCase().trim()
  s = s.replace(/[^a-z0-9]+/g, "_")
  s = s.replace(/_+/g, "_").replace(/^_|_$/g, "")
  if (!s) {
    s = (folderSlug || "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/_+/g, "_")
      .replace(/^_|_$/g, "")
  }
  return s || "partner"
}

function partnerFolderSlug(seller: Pick<StoreSellerListItem, "handle">): string {
  return (seller.handle || "").trim()
}

export function inferTramellePartnerCoverUrl(
  seller: Pick<StoreSellerListItem, "name" | "handle">
): string | null {
  const folder = partnerFolderSlug(seller)
  if (!folder) return null
  const token = brandFileToken(seller.name || "", folder)
  return `${tramelleCdnBase()}/partner/${folder}/cover_${token}.jpg`
}

export function inferTramellePartnerLogoUrl(
  seller: Pick<StoreSellerListItem, "name" | "handle">,
  ext: "jpg" | "png" = "jpg"
): string | null {
  const folder = partnerFolderSlug(seller)
  if (!folder) return null
  const token = brandFileToken(seller.name || "", folder)
  return `${tramelleCdnBase()}/partner/${folder}/logo_${token}.${ext}`
}

/** Trasforma URL API Medusa / CDN in assoluti (necessario per `<img>` e browser). */
export function normalizeSellerImageUrl(raw: string): string | null {
  const u = raw.trim()
  if (!u) return null
  if (u.startsWith("//")) {
    return `https:${u}`
  }
  if (u.startsWith("/")) {
    return `${medusaPublicBase()}${u}`
  }
  if (/^https?:\/\//i.test(u)) {
    return u
  }
  return null
}

function pushUnique(out: string[], url: string | null | undefined) {
  const n = url ? normalizeSellerImageUrl(url) : null
  if (n && !out.includes(n)) {
    out.push(n)
  }
}

/**
 * Candidati hero in ordine (primo che carica vince se usi fallback a catena).
 */
export function sellerHeroImageCandidates(seller: StoreSellerListItem): string[] {
  const out: string[] = []
  const meta = seller.metadata ?? undefined

  const hero =
    meta && typeof meta.hero_image_url === "string"
      ? meta.hero_image_url.trim()
      : ""
  pushUnique(out, hero)

  for (const g of sellerStorytellingGalleryUrls(meta ?? undefined)) {
    pushUnique(out, g)
  }

  pushUnique(out, inferTramellePartnerCoverUrl(seller))
  pushUnique(out, typeof seller.photo === "string" ? seller.photo : "")

  return out
}

/**
 * Candidati logo (badge sulla card): metadata logo, poi foto profilo, poi CDN.
 */
export function sellerLogoImageCandidates(seller: StoreSellerListItem): string[] {
  const out: string[] = []
  const meta = seller.metadata ?? undefined
  if (meta) {
    for (const k of ["logo_url", "logoUrl"] as const) {
      const v = meta[k]
      if (typeof v === "string" && v.trim()) {
        pushUnique(out, v.trim())
      }
    }
  }
  pushUnique(out, typeof seller.photo === "string" ? seller.photo : "")
  pushUnique(out, inferTramellePartnerLogoUrl(seller, "png"))
  pushUnique(out, inferTramellePartnerLogoUrl(seller, "jpg"))

  const heroFirst = sellerHeroImageCandidates(seller)[0]
  return out.filter((u) => !heroFirst || u !== heroFirst)
}
