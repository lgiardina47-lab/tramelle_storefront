/** Allineato a `DESCRIPTION_LOCALES` nel backend `GET /store/sellers`. */
const BACKEND_DESCRIPTION_LOCALES = new Set(["it", "en", "fr", "de", "es"])

/**
 * Segmento URL storefront (`it`, `en`, `ja`, …) → `content_locale` valido per la directory produttori.
 * Valori non supportati (es. `ja`) → `undefined` così facets e lista usano gli stessi criteri del backend.
 */
export function normalizeListingContentLocale(
  segment: string | undefined
): string | undefined {
  if (!segment?.trim()) return undefined
  const s = segment.trim().toLowerCase()
  return BACKEND_DESCRIPTION_LOCALES.has(s) ? s : undefined
}
