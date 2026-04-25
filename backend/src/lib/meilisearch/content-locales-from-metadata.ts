/**
 * Lingue con traduzione esplicita in `metadata.tramelle_i18n[lang].title` (non vuota).
 * `it` è sempre incluso: catalogo base italiano (allineato allo storefront su metadata.tramelle_i18n).
 */
export function contentLocalesFromProductMetadata(
  metadata: unknown
): string[] {
  const set = new Set<string>(["it"])
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
    return [...set]
  }
  const raw = (metadata as Record<string, unknown>).tramelle_i18n
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return [...set]
  }
  for (const [key, bundle] of Object.entries(raw)) {
    const norm = normalizeI18nKey(key)
    const title = (bundle as { title?: unknown })?.title
    if (typeof title === "string" && title.trim().length > 0) {
      set.add(norm)
    }
  }
  return [...set]
}

export function normalizeI18nKey(key: string): string {
  const k = key.toLowerCase().replace(/_/g, "-").split("-")[0] || key
  return k
}

/** Titoli localizzati da `metadata.tramelle_i18n` (chiave lingua → titolo). */
export function titlesI18nFromProductMetadata(
  metadata: unknown
): Record<string, string> {
  const out: Record<string, string> = {}
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
    return out
  }
  const raw = (metadata as Record<string, unknown>).tramelle_i18n
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return out
  }
  for (const [key, bundle] of Object.entries(raw)) {
    const norm = normalizeI18nKey(key)
    const title = (bundle as { title?: unknown })?.title
    if (typeof title === "string" && title.trim().length > 0) {
      out[norm] = title.trim()
    }
  }
  return out
}
