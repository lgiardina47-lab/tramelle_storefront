/**
 * Pure helpers for seller storytelling gallery URLs (safe for Server Components).
 */

import {
  maybeExpandCfImgRef,
  rewriteCfImagesDeliveryUrlStripPartnerPrefix,
} from "@/lib/helpers/cloudflare-images"

function expandGalleryItem(raw: string, sellerHandle?: string): string {
  const t = raw.trim()
  if (!t) {
    return t
  }
  const h = (sellerHandle || "").trim()
  const viaCf = maybeExpandCfImgRef(t, h || undefined)
  if (viaCf) {
    return viaCf
  }
  if (/^https?:\/\//i.test(t) && h) {
    return rewriteCfImagesDeliveryUrlStripPartnerPrefix(t, h)
  }
  return t
}

function coerceStringArray(raw: unknown): string[] {
  if (Array.isArray(raw)) {
    return raw.filter((x): x is string => typeof x === "string" && x.trim().length > 0)
  }
  if (typeof raw === "string") {
    try {
      const p = JSON.parse(raw) as unknown
      if (Array.isArray(p)) {
        return p.filter((x): x is string => typeof x === "string" && x.trim().length > 0)
      }
    } catch {
      return []
    }
  }
  return []
}

function inferStorytellingFromPartnerHero(heroUrl: string): string[] {
  const t = heroUrl.trim()
  if (!t.includes("/partner/")) return []
  try {
    const u = new URL(t)
    const segs = u.pathname.split("/").filter(Boolean)
    const pi = segs.indexOf("partner")
    if (pi < 0 || pi + 1 >= segs.length) return []
    const folder = segs[pi + 1]!
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

function parseGalleryUrls(
  metadata: unknown,
  sellerHandle?: string
): string[] {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
    return []
  }
  const meta = metadata as Record<string, unknown>
  for (const k of [
    "storytelling_gallery_urls",
    "storytellingGalleryUrls",
    "product_image_urls",
  ] as const) {
    const arr = coerceStringArray(meta[k])
    if (arr.length) {
      return arr.map((u) => expandGalleryItem(u, sellerHandle))
    }
  }
  const heroRaw =
    typeof meta.hero_image_url === "string" ? meta.hero_image_url.trim() : ""
  if (heroRaw) {
    const hero = expandGalleryItem(heroRaw, sellerHandle)
    return inferStorytellingFromPartnerHero(hero).map((u) =>
      expandGalleryItem(u, sellerHandle)
    )
  }
  return []
}

export function sellerStorytellingGalleryUrls(
  metadata: Record<string, unknown> | null | undefined,
  sellerHandle?: string
): string[] {
  return parseGalleryUrls(metadata, sellerHandle)
}

/**
 * Unisce tutte le liste gallery note (storytelling + product_image_urls) senza fermarsi alla prima non vuota,
 * così il mosaic scheda venditore mostra tutte le immagini anche se sono sparse su più chiavi metadata.
 */
export function sellerMosaicGalleryUrls(
  metadata: Record<string, unknown> | null | undefined,
  sellerHandle?: string
): string[] {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
    return []
  }
  const meta = metadata as Record<string, unknown>
  const seen = new Set<string>()
  const out: string[] = []
  for (const k of [
    "storytelling_gallery_urls",
    "storytellingGalleryUrls",
    "product_image_urls",
  ] as const) {
    for (const raw of coerceStringArray(meta[k])) {
      const expanded = expandGalleryItem(raw, sellerHandle)
      if (!expanded || seen.has(expanded)) continue
      seen.add(expanded)
      out.push(expanded)
    }
  }
  if (out.length) {
    return out
  }
  const heroRaw =
    typeof meta.hero_image_url === "string" ? meta.hero_image_url.trim() : ""
  if (heroRaw) {
    const hero = expandGalleryItem(heroRaw, sellerHandle)
    return inferStorytellingFromPartnerHero(hero).map((u) =>
      expandGalleryItem(u, sellerHandle)
    )
  }
  return []
}
