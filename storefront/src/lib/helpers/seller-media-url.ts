/**
 * Risolve URL assoluti per foto seller (Medusa relative, //, cfimg, CDN partner opzionale da env).
 * Allineato alla logica vendor-panel `tramelle-partner-media.ts`.
 */

import { sellerStorytellingGalleryUrls } from "@/components/molecules/SellerStorytellingGallery/seller-storytelling-gallery-urls"
import type { StoreSellerListItem } from "@/types/seller"
import { maybeExpandCfImgRef } from "@/lib/helpers/cloudflare-images"
import { medusaImageRewriteBase } from "@/lib/helpers/get-image-url"

export function medusaPublicBase(): string {
  return medusaImageRewriteBase()
}

/** Base CDN partner legacy: solo se impostata in env; niente default (CDN partner non più usato). */
export function tramelleCdnBase(): string {
  const raw = process.env.NEXT_PUBLIC_TRAMELLE_CDN_PUBLIC_BASE?.trim()
  return (raw?.replace(/\/$/, "") ?? "").trim()
}

function isDeprecatedTramellePartnerCdnHost(hostname: string): boolean {
  return hostname.toLowerCase() === "cdn.tramelle.com"
}

/**
 * Base per URL convenzione `partner/{handle}/cover_*`: ignora sempre `cdn.tramelle.com`
 * (non servito →404 in UI anche se resta in `.env` / Pages).
 */
function partnerConventionalMediaBase(): string {
  const raw = tramelleCdnBase()
  if (!raw) {
    return ""
  }
  try {
    const u = new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`)
    if (isDeprecatedTramellePartnerCdnHost(u.hostname)) {
      return ""
    }
  } catch {
    return ""
  }
  return raw
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
  const base = partnerConventionalMediaBase()
  if (!base) return null
  const folder = partnerFolderSlug(seller)
  if (!folder) return null
  const token = brandFileToken(seller.name || "", folder)
  return `${base}/partner/${folder}/cover_${token}.jpg`
}

export function inferTramellePartnerLogoUrl(
  seller: Pick<StoreSellerListItem, "name" | "handle">,
  ext: "jpg" | "png" = "jpg"
): string | null {
  const base = partnerConventionalMediaBase()
  if (!base) return null
  const folder = partnerFolderSlug(seller)
  if (!folder) return null
  const token = brandFileToken(seller.name || "", folder)
  return `${base}/partner/${folder}/logo_${token}.${ext}`
}

/** Trasforma URL API Medusa / CDN in assoluti (necessario per `<img>` e browser). */
export function normalizeSellerImageUrl(raw: string): string | null {
  const u = raw.trim()
  if (!u) return null
  const cf = maybeExpandCfImgRef(u)
  if (cf) {
    return cf
  }
  if (u.startsWith("//")) {
    return `https:${u}`
  }
  if (u.startsWith("/")) {
    return `${medusaPublicBase()}${u}`
  }
  if (/^https?:\/\//i.test(u)) {
    try {
      if (isDeprecatedTramellePartnerCdnHost(new URL(u).hostname)) {
        return null
      }
    } catch {
      return null
    }
    return u
  }
  return null
}

/** CDN archivio Taste/Pitti: non servire più in UI (partner su Cloudflare / cfimg). */
function isPittiArchiveCdnUrl(absoluteUrl: string): boolean {
  try {
    return new URL(absoluteUrl).hostname.toLowerCase() === "media.pittimmagine.com"
  } catch {
    return false
  }
}

function pushUnique(out: string[], url: string | null | undefined) {
  const n = url ? normalizeSellerImageUrl(url) : null
  if (!n || out.includes(n)) {
    return
  }
  if (isPittiArchiveCdnUrl(n)) {
    return
  }
  try {
    if (isDeprecatedTramellePartnerCdnHost(new URL(n).hostname)) {
      return
    }
  } catch {
    return
  }
  out.push(n)
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

/** Foto badge/avatar: stesso ordine della directory (logo metadata → photo → CDN legacy), senza Pitti. */
export function sellerPrimaryLogoOrPhotoUrl(
  seller: Pick<StoreSellerListItem, "metadata" | "photo" | "handle" | "name">
): string {
  const c = sellerLogoImageCandidates(seller)
  return c[0] ?? ""
}
