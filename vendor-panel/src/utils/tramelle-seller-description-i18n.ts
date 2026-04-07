/** Chiave in `seller_listing_profile.metadata` (e payload vendor). */
export const TRAMELLE_SELLER_DESCRIPTION_I18N_KEY =
  "tramelle_description_i18n" as const

export const TRAMELLE_DESCRIPTION_I18N_LOCALES = [
  "it",
  "en",
  "fr",
  "de",
  "es",
] as const

export type TramelleDescriptionI18nLocale =
  (typeof TRAMELLE_DESCRIPTION_I18N_LOCALES)[number]

export type TramelleDescriptionI18n = Record<
  TramelleDescriptionI18nLocale,
  string
>

const EMPTY: TramelleDescriptionI18n = {
  it: "",
  en: "",
  fr: "",
  de: "",
  es: "",
}

function normalizedMetadataRecord(
  metadata: unknown
): Record<string, unknown> | null {
  if (metadata == null) return null
  if (typeof metadata === "string") {
    try {
      const p = JSON.parse(metadata) as unknown
      if (p && typeof p === "object" && !Array.isArray(p)) {
        return p as Record<string, unknown>
      }
    } catch {
      return null
    }
    return null
  }
  if (typeof metadata === "object" && !Array.isArray(metadata)) {
    return metadata as Record<string, unknown>
  }
  return null
}

export function parseTramelleDescriptionI18nFromMetadata(
  metadata: unknown
): TramelleDescriptionI18n {
  const meta = normalizedMetadataRecord(metadata)
  const raw = meta?.[TRAMELLE_SELLER_DESCRIPTION_I18N_KEY]
  const out = { ...EMPTY }
  if (raw && typeof raw === "object" && !Array.isArray(raw)) {
    for (const loc of TRAMELLE_DESCRIPTION_I18N_LOCALES) {
      const v = (raw as Record<string, unknown>)[loc]
      if (typeof v === "string") {
        out[loc] = v
      }
    }
  }
  return out
}

/** Migrazione: testo unico → tab IT. */
export function defaultDescriptionI18nFormValues(
  metadata: unknown,
  legacyDescription: string | undefined
): TramelleDescriptionI18n {
  const fromMeta = parseTramelleDescriptionI18nFromMetadata(metadata)
  const hasAny = TRAMELLE_DESCRIPTION_I18N_LOCALES.some(
    (k) => (fromMeta[k] || "").trim().length > 0
  )
  if (hasAny) {
    return fromMeta
  }
  const legacy = (legacyDescription || "").trim()
  if (legacy) {
    return { ...EMPTY, it: legacy }
  }
  return { ...EMPTY }
}

/** Prima descrizione non vuota (ordine lingue), per il campo `description` Medusa. */
export function primarySellerDescriptionFromI18n(
  i18n: TramelleDescriptionI18n
): string {
  for (const loc of TRAMELLE_DESCRIPTION_I18N_LOCALES) {
    const t = (i18n[loc] || "").trim()
    if (t) return i18n[loc]!
  }
  return ""
}

export const DESCRIPTION_I18N_TAB_LABELS: Record<
  TramelleDescriptionI18nLocale,
  string
> = {
  it: "IT",
  en: "EN",
  fr: "FR",
  de: "DE",
  es: "ES",
}
