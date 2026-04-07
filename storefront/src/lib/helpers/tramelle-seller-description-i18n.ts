import type { StorefrontI18nLocale } from "@/i18n/routing"

export const TRAMELLE_SELLER_DESCRIPTION_I18N_KEY =
  "tramelle_description_i18n" as const

export const TRAMELLE_DESCRIPTION_I18N_LOCALES: readonly StorefrontI18nLocale[] =
  ["it", "en", "fr", "de", "es"]

export type TramelleDescriptionI18n = Record<StorefrontI18nLocale, string>

const EMPTY: TramelleDescriptionI18n = {
  it: "",
  en: "",
  fr: "",
  de: "",
  es: "",
}

function metadataRecord(
  metadata: Record<string, unknown> | null | undefined
): Record<string, unknown> | null {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
    return null
  }
  return metadata
}

export function parseTramelleDescriptionI18nFromMetadata(
  metadata: Record<string, unknown> | null | undefined
): TramelleDescriptionI18n {
  const meta = metadataRecord(metadata)
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

export function sellerDescriptionsMapForUi(
  description: string | undefined,
  metadata: Record<string, unknown> | null | undefined
): TramelleDescriptionI18n {
  const fromMeta = parseTramelleDescriptionI18nFromMetadata(metadata)
  const hasAny = TRAMELLE_DESCRIPTION_I18N_LOCALES.some(
    (k) => (fromMeta[k] || "").trim().length > 0
  )
  if (hasAny) {
    return fromMeta
  }
  const legacy = typeof description === "string" ? description : ""
  if (legacy.trim()) {
    return { ...EMPTY, it: legacy }
  }
  return { ...EMPTY }
}
