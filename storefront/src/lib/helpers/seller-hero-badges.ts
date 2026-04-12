/** Badge hero cover (DOP, IGP, …) da metadata listing. */
export function sellerHeroBadgesFromMetadata(
  meta: Record<string, unknown> | null | undefined
): string[] {
  if (!meta || typeof meta !== "object") {
    return []
  }
  for (const key of [
    "hero_badges",
    "listing_badges",
    "certification_badges",
    "producer_badges",
  ] as const) {
    const v = meta[key]
    if (Array.isArray(v)) {
      return v
        .filter((x): x is string => typeof x === "string" && x.trim().length > 0)
        .map((s) => s.trim())
    }
    if (typeof v === "string" && v.trim()) {
      return v
        .split(/[,|]/)
        .map((s) => s.trim())
        .filter(Boolean)
    }
  }
  return []
}
