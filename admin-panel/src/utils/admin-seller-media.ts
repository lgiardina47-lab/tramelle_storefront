import type { VendorSeller } from "@custom-types/seller"

const DEFAULT_CDN_BASE = "https://cdn.tramelle.com"

function tramelleCdnBase(): string {
  const raw = (
    import.meta.env.VITE_TRAMELLE_CDN_PUBLIC_BASE as string | undefined
  )?.trim()
  return (raw?.replace(/\/$/, "") || DEFAULT_CDN_BASE).trim()
}

function tramelleCdnHostname(): string {
  try {
    return new URL(tramelleCdnBase()).hostname
  } catch {
    return "cdn.tramelle.com"
  }
}

function stripForAsciiToken(s: string): string {
  return s
    .normalize("NFKD")
    .replace(/\p{M}/gu, "")
    .replace(/[^\x00-\x7F]+/g, "")
}

function brandFileToken(name: string, folderSlug: string): string {
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

function partnerFolderSlug(seller: Pick<VendorSeller, "handle" | "email">): string {
  const h = (seller.handle || "").trim()
  if (h) return h
  const email = (seller.email || "").trim()
  if (!email.includes("@")) return ""
  return email.split("@")[0]!.trim()
}

function inferTramellePartnerCoverUrl(
  seller: Pick<VendorSeller, "name" | "handle" | "email">,
  ext: "jpg" | "webp" = "jpg"
): string | null {
  const folder = partnerFolderSlug(seller)
  if (!folder) return null
  const token = brandFileToken(seller.name || "", folder)
  return `${tramelleCdnBase()}/partner/${folder}/cover_${token}.${ext}`
}

function inferTramellePartnerLogoUrl(
  seller: Pick<VendorSeller, "name" | "handle" | "email">,
  ext: "jpg" | "png" | "webp" = "jpg"
): string | null {
  const folder = partnerFolderSlug(seller)
  if (!folder) return null
  const token = brandFileToken(seller.name || "", folder)
  return `${tramelleCdnBase()}/partner/${folder}/logo_${token}.${ext}`
}

function metadataRecordFromUnknown(raw: unknown): Record<string, unknown> | null {
  if (raw == null) {
    return null
  }
  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw) as unknown
      return metadataRecordFromUnknown(parsed)
    } catch {
      return null
    }
  }
  if (typeof raw === "object" && !Array.isArray(raw)) {
    return raw as Record<string, unknown>
  }
  if (Array.isArray(raw)) {
    const out: Record<string, unknown> = {}
    for (const item of raw) {
      if (item && typeof item === "object" && "key" in item) {
        const k = String((item as { key: unknown }).key)
        const v = (item as { value?: unknown }).value
        if (k) {
          out[k] = v
        }
      }
    }
    return Object.keys(out).length > 0 ? out : null
  }
  return null
}

function normalizedMetadata(seller: VendorSeller): Record<string, unknown> | null {
  const fromField = metadataRecordFromUnknown(seller.metadata)
  if (fromField && Object.keys(fromField).length > 0) {
    return fromField
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

function galleryUrlsFromMetadataRecord(meta: Record<string, unknown> | null): string[] {
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

function looksLikeExternalWebsiteUrl(t: string): boolean {
  const s = t.trim()
  if (!/^https?:\/\//i.test(s)) {
    return false
  }
  if (/\.(jpe?g|png|gif|webp|svg)(\?|$)/i.test(s)) {
    return false
  }
  if (s.includes(tramelleCdnHostname())) {
    return false
  }
  try {
    const u = new URL(s)
    return u.protocol === "http:" || u.protocol === "https:"
  } catch {
    return false
  }
}

/** Se il sito è salvato sotto chiave non standard, prendi il primo URL http(s) “non media”. */
function websiteUrlFromMetadataScan(m: Record<string, unknown>): string | null {
  for (const v of Object.values(m)) {
    if (typeof v !== "string" || !v.trim()) {
      continue
    }
    const t = v.trim()
    if (looksLikeExternalWebsiteUrl(t)) {
      return t.split("?")[0]!
    }
  }
  return null
}

function pickWebsiteFromRecord(rec: Record<string, unknown>): string | null {
  for (const k of ["website_url", "websiteUrl", "site_url", "url", "homepage"] as const) {
    const v = rec[k]
    if (typeof v === "string" && v.trim().length > 0) {
      const t = v.trim()
      if (looksLikeExternalWebsiteUrl(t)) {
        return t.split("?")[0]!
      }
      if (!/^https?:\/\//i.test(t) && t.includes(".") && !t.includes(" ") && !/\.(jpe?g|png)$/i.test(t)) {
        const host = t.replace(/^\/\//, "").split("/")[0]?.trim()
        if (host) {
          return `https://${host}`
        }
      }
    }
  }
  for (const k of ["website_domain", "websiteDomain", "domain"] as const) {
    const v = rec[k]
    if (typeof v === "string" && v.trim().length > 0) {
      const host = v.trim().replace(/^https?:\/\//i, "").split("/")[0]?.trim()
      if (host) {
        return `https://${host}`
      }
    }
  }
  return websiteUrlFromMetadataScan(rec)
}

export function getAdminSellerWebsiteUrl(seller: VendorSeller): string | null {
  const m = normalizedMetadata(seller)
  if (m) {
    const fromMeta = pickWebsiteFromRecord(m)
    if (fromMeta) {
      return fromMeta
    }
  }
  const root = seller as unknown as Record<string, unknown>
  return pickWebsiteFromRecord(root)
}

export function hrefForWebsiteDisplay(raw: string): string {
  const t = raw.trim()
  if (!t) {
    return t
  }
  if (/^https?:\/\//i.test(t)) {
    return t
  }
  return `https://${t}`
}

/** Handle sottocategorie Taste dall’import (`metadata.taste_category_handles`). */
export function getAdminSellerTasteCategoryHandles(
  seller: VendorSeller
): string[] {
  const m = normalizedMetadata(seller)
  const raw = m
    ? (m.taste_category_handles ?? m.tasteCategoryHandles)
    : undefined
  let fromArr = stringArrayFromMetadataValue(raw)
  if (!fromArr.length) {
    const root = seller as unknown as Record<string, unknown>
    fromArr = stringArrayFromMetadataValue(
      root.taste_category_handles ?? root.tasteCategoryHandles
    )
  }
  if (fromArr.length) {
    return [...new Set(fromArr.map((s) => s.trim()).filter(Boolean))]
  }
  return []
}

const pushUnique = (list: string[], u: string | null | undefined) => {
  const t = (u || "").trim()
  if (t.length > 0 && !list.includes(t)) {
    list.push(t)
  }
}

/**
 * URL candidati per il logo (primo che carica in UI): photo, metadata.logo_url,
 * poi convenzione CDN — molti partner hanno `.png`, non solo `.jpg`.
 */
export function getAdminSellerLogoCandidates(seller: VendorSeller): string[] {
  const out: string[] = []
  pushUnique(out, seller.photo)
  const meta = normalizedMetadata(seller)
  if (meta) {
    for (const k of ["logo_url", "logoUrl"] as const) {
      const v = meta[k]
      pushUnique(out, typeof v === "string" ? v : null)
    }
  }
  pushUnique(out, inferTramellePartnerLogoUrl(seller, "png"))
  pushUnique(out, inferTramellePartnerLogoUrl(seller, "jpg"))
  pushUnique(out, inferTramellePartnerLogoUrl(seller, "webp"))
  return out
}

/** Logo: preferisci il primo candidato (per link semplici); in UI usare getAdminSellerLogoCandidates + fallback onError. */
export function getAdminSellerLogoUrl(seller: VendorSeller): string | null {
  const all = getAdminSellerLogoCandidates(seller)
  return all[0] ?? null
}

/**
 * Regione di provenienza: `seller.state` o metadata `listing_region` / legacy `province`.
 */
export function getAdminSellerRegion(seller: VendorSeller): string | null {
  const fromState = (seller.state || "").trim()
  if (fromState) {
    return fromState
  }
  const m = normalizedMetadata(seller)
  if (!m) {
    return null
  }
  for (const k of ["listing_region", "listingRegion", "province"] as const) {
    const v = m[k]
    if (typeof v === "string" && v.trim().length > 0) {
      return v.trim()
    }
  }
  return null
}

/** @deprecated Usare {@link getAdminSellerRegion}. */
export const getAdminSellerProvince = getAdminSellerRegion

function pickMetadataString(
  seller: VendorSeller,
  keys: readonly string[],
): string | null {
  const tryRec = (rec: Record<string, unknown> | null): string | null => {
    if (!rec) {
      return null
    }
    for (const k of keys) {
      const v = rec[k]
      if (typeof v === "string" && v.trim().length > 0) {
        return v.trim()
      }
    }
    return null
  }
  const fromMeta = tryRec(normalizedMetadata(seller))
  if (fromMeta) {
    return fromMeta
  }
  return tryRec(seller as unknown as Record<string, unknown>)
}

/** Partita IVA (metadata: partita_iva, p_iva, vat_number, …). */
export function getAdminSellerPartitaIva(seller: VendorSeller): string | null {
  return pickMetadataString(seller, [
    "partita_iva",
    "partitaIva",
    "p_iva",
    "piva",
    "vat_number",
    "vatNumber",
    "vat",
  ])
}

/** Numero REA o stringa completa es. `TN 155459` (metadata: rea, rea_number). */
export function getAdminSellerRea(seller: VendorSeller): string | null {
  return pickMetadataString(seller, ["rea", "rea_number", "reaNumber", "numero_rea"])
}

/** Codice SDI / destinatario (metadata: sdi, codice_sdi, sdi_code). */
export function getAdminSellerSdi(seller: VendorSeller): string | null {
  return pickMetadataString(seller, [
    "sdi",
    "codice_sdi",
    "codiceSdi",
    "sdi_code",
    "sdiCode",
  ])
}

/**
 * Candidati banner (come il logo): metadata, poi CDN cover `.jpg` e `.webp` (pipeline sync spesso in webp).
 */
export function getAdminSellerBannerCandidates(seller: VendorSeller): string[] {
  const out: string[] = []
  const metaHero = normalizedMetadata(seller)?.hero_image_url
  if (typeof metaHero === "string" && metaHero.trim().length > 0) {
    pushUnique(out, metaHero.trim())
  }
  pushUnique(out, inferTramellePartnerCoverUrl(seller, "jpg"))
  pushUnique(out, inferTramellePartnerCoverUrl(seller, "webp"))
  return out
}

export function getAdminSellerBannerUrl(seller: VendorSeller): string | null {
  return getAdminSellerBannerCandidates(seller)[0] ?? null
}

/** Gallery storytelling: metadata o convenzione file `storytelling_*` sul CDN. */
export function getAdminSellerGalleryUrls(seller: VendorSeller): string[] {
  const meta = normalizedMetadata(seller)
  const fromMeta = galleryUrlsFromMetadataRecord(meta)
  if (fromMeta.length) {
    return fromMeta
  }
  const hero =
    getAdminSellerBannerCandidates(seller).find((u) => u.includes("/partner/")) ??
    null
  if (hero) {
    return inferStorytellingUrlsFromPartnerHero(hero)
  }
  return []
}
