import type { StoreVendor } from "../types/user"

const DEFAULT_CDN_BASE = "https://cdn.tramelle.com"

function tramelleCdnBase(): string {
  const raw = (
    import.meta.env.VITE_TRAMELLE_CDN_PUBLIC_BASE as string | undefined
  )?.trim()
  return (raw?.replace(/\/$/, "") || DEFAULT_CDN_BASE).trim()
}

function stripForAsciiToken(s: string): string {
  return s
    .normalize("NFKD")
    .replace(/\p{M}/gu, "")
    .replace(/[^\x00-\x7F]+/g, "")
}

/**
 * Allinea a `dati_venditori/sync_partner_media_cdn.py` → `brand_file_token`.
 */
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

function partnerFolderSlug(seller: Pick<StoreVendor, "handle" | "email">): string {
  const h = (seller.handle || "").trim()
  if (h) return h
  const email = (seller.email || "").trim()
  if (!email.includes("@")) return ""
  return email.split("@")[0]!.trim()
}

/**
 * URL pubblico del cover hero su CDN (file `cover_<token>.jpg` nella cartella partner).
 */
export function inferTramellePartnerCoverUrl(
  seller: Pick<StoreVendor, "name" | "handle" | "email">
): string | null {
  const folder = partnerFolderSlug(seller)
  if (!folder) return null
  const token = brandFileToken(seller.name || "", folder)
  return `${tramelleCdnBase()}/partner/${folder}/cover_${token}.jpg`
}

export function inferTramellePartnerLogoUrl(
  seller: Pick<StoreVendor, "name" | "handle" | "email">,
  ext: "jpg" | "png" = "jpg"
): string | null {
  const folder = partnerFolderSlug(seller)
  if (!folder) return null
  const token = brandFileToken(seller.name || "", folder)
  return `${tramelleCdnBase()}/partner/${folder}/logo_${token}.${ext}`
}

/** `seller.photo` (Medusa), poi metadata.logo_url, poi CDN (`logo_*.png` spesso, poi `.jpg`). */
export function getSellerLogoDisplayUrl(seller: StoreVendor): string | null {
  const p = (seller.photo || "").trim()
  if (p.length > 0) {
    return p
  }
  const meta = normalizedMetadata(seller)
  for (const k of ["logo_url", "logoUrl"] as const) {
    const v = meta?.[k]
    if (typeof v === "string" && v.trim().length > 0) {
      return v.trim()
    }
  }
  return (
    inferTramellePartnerLogoUrl(seller, "png") ||
    inferTramellePartnerLogoUrl(seller, "jpg")
  )
}

export function getSellerHeroDisplayUrl(
  seller: StoreVendor
): string | null {
  const meta = normalizedMetadata(seller)?.hero_image_url
  if (typeof meta === "string" && meta.trim().length > 0) {
    return meta.trim()
  }
  return inferTramellePartnerCoverUrl(seller)
}

/** Allinea a import/admin: `state`/`region` sul seller o `province` / `listing_region` in metadata. */
export function getVendorSellerProvince(seller: StoreVendor): string | null {
  for (const v of [
    seller.state,
    seller.region,
  ]) {
    const t = typeof v === "string" ? v.trim() : ""
    if (t) return t
  }
  const m = normalizedMetadata(seller)
  if (!m) return null
  for (const k of ["province", "listing_region", "listingRegion"] as const) {
    const v = m[k]
    if (typeof v === "string" && v.trim().length > 0) {
      return v.trim()
    }
  }
  return null
}

function normalizedMetadata(
  seller: StoreVendor
): Record<string, unknown> | null {
  const m = seller.metadata
  if (m == null) {
    return null
  }
  if (typeof m === "string") {
    try {
      const parsed = JSON.parse(m) as unknown
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        return parsed as Record<string, unknown>
      }
    } catch {
      return null
    }
    return null
  }
  if (typeof m === "object" && !Array.isArray(m)) {
    return m as Record<string, unknown>
  }
  return null
}

function stringArrayFromMetadataValue(raw: unknown): string[] {
  if (Array.isArray(raw)) {
    return raw.filter(
      (u): u is string => typeof u === "string" && u.trim().length > 0
    )
  }
  if (typeof raw === "string") {
    try {
      const v = JSON.parse(raw) as unknown
      if (Array.isArray(v)) {
        return v.filter(
          (u): u is string => typeof u === "string" && u.trim().length > 0
        )
      }
    } catch {
      return []
    }
  }
  return []
}

function galleryUrlsFromMetadataRecord(
  meta: Record<string, unknown> | null
): string[] {
  if (!meta) {
    return []
  }
  const keys = [
    "storytelling_gallery_urls",
    "storytellingGalleryUrls",
    "product_image_urls",
  ] as const
  for (const k of keys) {
    const arr = stringArrayFromMetadataValue(meta[k])
    if (arr.length) {
      return arr
    }
  }
  return []
}

/** Da URL hero/banner CDN `.../partner/{slug}/cover_*.jpg` → candidati storytelling_*-N.jpg (sync import). */
function inferStorytellingUrlsFromPartnerHero(heroUrl: string): string[] {
  const trimmed = heroUrl.trim()
  if (!trimmed.includes("/partner/")) {
    return []
  }
  try {
    const u = new URL(trimmed)
    const segs = u.pathname.split("/").filter(Boolean)
    const iPartner = segs.indexOf("partner")
    if (iPartner < 0 || iPartner + 1 >= segs.length) {
      return []
    }
    const folder = segs[iPartner + 1]!
    const token = folder.replace(/-/g, "_")
    const out: string[] = []
    for (let n = 1; n <= 12; n++) {
      out.push(`${u.origin}/partner/${folder}/storytelling_${token}-${n}.jpg`)
    }
    return out
  } catch {
    return []
  }
}

/** Gallery lookbook: metadata import oppure convenzione CDN come da `product_image_urls` / hero. */
export function getSellerStorytellingGalleryUrls(
  seller: StoreVendor
): string[] {
  const meta = normalizedMetadata(seller)
  const fromMeta = galleryUrlsFromMetadataRecord(meta)
  if (fromMeta.length) {
    return fromMeta
  }
  const hero = getSellerHeroDisplayUrl(seller)
  if (hero?.includes("/partner/")) {
    return inferStorytellingUrlsFromPartnerHero(hero)
  }
  return []
}
