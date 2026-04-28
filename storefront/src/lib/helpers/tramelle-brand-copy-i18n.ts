import type { StorefrontI18nLocale } from "@/i18n/routing"

export const TRAMELLE_BRAND_COPY_I18N_KEY = "tramelle_brand_copy_i18n" as const

export type TramelleBrandCopyOneLocale = {
  headline: string
  subheadline: string
  description: string
}

const LOCALES: readonly StorefrontI18nLocale[] = [
  "it",
  "en",
  "fr",
  "de",
  "es",
  "ja",
]

const EMPTY_ONE: TramelleBrandCopyOneLocale = {
  headline: "",
  subheadline: "",
  description: "",
}

function metadataRecord(
  metadata: Record<string, unknown> | null | undefined
): Record<string, unknown> | null {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
    return null
  }
  return metadata
}

function parseOne(raw: unknown): TramelleBrandCopyOneLocale {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return { ...EMPTY_ONE }
  }
  const o = raw as Record<string, unknown>
  const str = (k: string) => (typeof o[k] === "string" ? o[k] : "") || ""
  return {
    headline: str("headline"),
    subheadline: str("subheadline"),
    description: str("description"),
  }
}

/** Mappa completa da metadata (supporta solo le lingue presenti nel JSON; `ja` se assente resta vuoto). */
export function parseTramelleBrandCopyI18nFromMetadata(
  metadata: Record<string, unknown> | null | undefined
): Record<StorefrontI18nLocale, TramelleBrandCopyOneLocale> {
  const meta = metadataRecord(metadata)
  const raw = meta?.[TRAMELLE_BRAND_COPY_I18N_KEY]
  const base: Record<string, TramelleBrandCopyOneLocale> = {}
  for (const loc of LOCALES) {
    base[loc] = { ...EMPTY_ONE }
  }
  if (raw && typeof raw === "object" && !Array.isArray(raw)) {
    const r = raw as Record<string, unknown>
    for (const loc of LOCALES) {
      base[loc] = parseOne(r[loc])
    }
  }
  return base as Record<StorefrontI18nLocale, TramelleBrandCopyOneLocale>
}

function firstNonEmptyField(
  map: Record<StorefrontI18nLocale, TramelleBrandCopyOneLocale>,
  order: string[],
  field: keyof TramelleBrandCopyOneLocale
): string {
  const seen = new Set<string>()
  for (const raw of order) {
    const loc = raw.trim().toLowerCase()
    if (!loc || seen.has(loc)) continue
    seen.add(loc)
    const one = map[loc as StorefrontI18nLocale]
    const v = (one?.[field] || "").trim()
    if (v) return v
  }
  return ""
}

/**
 * Headline / subheadline / description: per ogni campo, prima lingua in `preferredLocales`,
 * poi `it`, poi le altre lingue dello storefront.
 */
export function pickBrandCopyForHero(
  metadata: Record<string, unknown> | null | undefined,
  preferredLocales: readonly string[]
): TramelleBrandCopyOneLocale {
  const map = parseTramelleBrandCopyI18nFromMetadata(metadata)
  const order = [
    ...preferredLocales.map((l) => l.trim().toLowerCase()).filter(Boolean),
    "it",
    ...LOCALES,
  ]
  return {
    headline: firstNonEmptyField(map, order, "headline"),
    subheadline: firstNonEmptyField(map, order, "subheadline"),
    description: firstNonEmptyField(map, order, "description"),
  }
}

/** Soglia caratteri per mostrare "leggi di più" (testo oltre ~2 righe corte). */
export const BRAND_DESCRIPTION_READ_MORE_CHAR_THRESHOLD = 120
