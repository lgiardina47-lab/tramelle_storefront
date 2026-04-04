/**
 * Pure helpers for seller storytelling gallery URLs (safe for Server Components).
 */

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

function parseGalleryUrls(metadata: unknown): string[] {
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
    if (arr.length) return arr
  }
  const hero =
    typeof meta.hero_image_url === "string" ? meta.hero_image_url.trim() : ""
  if (hero) {
    return inferStorytellingFromPartnerHero(hero)
  }
  return []
}

export function sellerStorytellingGalleryUrls(
  metadata: Record<string, unknown> | null | undefined
): string[] {
  return parseGalleryUrls(metadata)
}
