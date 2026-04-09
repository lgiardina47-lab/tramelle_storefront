/**
 * Contenuti prodotto multilingua in `product.metadata.tramelle_i18n`, allineati all’admin.
 */

export const TRAMELLE_PRODUCT_I18N_KEY = "tramelle_i18n"

export type ProductI18nBundle = {
  title?: string
  subtitle?: string
  description?: string
}

export type ProductI18nMap = Partial<Record<string, ProductI18nBundle>>

export const DEFAULT_PRODUCT_CONTENT_LOCALE = "it"

export function getProductI18nMap(metadata: unknown): ProductI18nMap {
  let obj = metadata
  if (typeof obj === "string") {
    try {
      obj = JSON.parse(obj) as unknown
    } catch {
      return {}
    }
  }
  if (!obj || typeof obj !== "object" || Array.isArray(obj)) {
    return {}
  }
  const raw = (obj as Record<string, unknown>)[TRAMELLE_PRODUCT_I18N_KEY]
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return {}
  }
  return raw as ProductI18nMap
}

export function normalizeContentLang(code: string): string {
  const lower = code.toLowerCase()
  if (lower.startsWith("pt")) {
    return "ptBR"
  }
  return code.replace("_", "-").split("-")[0] || "en"
}

/** Segmento URL storefront (paese Medusa) → chiave `tramelle_i18n` (lingua contenuto). */
export function countryCodeToContentLang(countryCode: string): string {
  const c = countryCode.toLowerCase()
  if (c === "en" || c === "gb" || c === "us" || c === "ie") {
    return "en"
  }
  if (
    c === "it" ||
    c === "fr" ||
    c === "de" ||
    c === "es" ||
    c === "ja" ||
    c === "nl"
  ) {
    return c
  }
  if (c.length === 2) {
    return c
  }
  return DEFAULT_PRODUCT_CONTENT_LOCALE
}

function asOptionalString(v: unknown): string | null {
  if (v === undefined || v === null) {
    return null
  }
  if (typeof v === "string") {
    return v
  }
  if (typeof v === "number" || typeof v === "boolean") {
    return String(v)
  }
  return null
}

export function getLocalizedTextFields(
  product: {
    title?: string | null
    subtitle?: string | null
    description?: string | null
    metadata?: unknown | null
  },
  lang: string
): {
  title: string
  subtitle: string | null
  description: string | null
} {
  const baseTitle = (product.title ?? "").trim() ? product.title! : "Product"
  const key = normalizeContentLang(lang)
  const map = getProductI18nMap(product.metadata)
  const bundle = map[key]

  const pickTitle = (): string => {
    const bt = asOptionalString(bundle?.title)
    if (bt?.trim()) {
      return bt
    }
    return baseTitle
  }

  if (key === DEFAULT_PRODUCT_CONTENT_LOCALE) {
    return {
      title: baseTitle,
      subtitle: product.subtitle ?? null,
      description: product.description ?? null,
    }
  }

  return {
    title: pickTitle(),
    subtitle:
      bundle?.subtitle !== undefined
        ? asOptionalString(bundle.subtitle)
        : product.subtitle ?? null,
    description:
      bundle?.description !== undefined
        ? asOptionalString(bundle.description)
        : product.description ?? null,
  }
}

/** Convenienza PDP / card: paese corrente → testi localizzati. */
export function getLocalizedProductContentForCountry(
  product: Parameters<typeof getLocalizedTextFields>[0],
  countryCode: string
) {
  return getLocalizedTextFields(
    product,
    countryCodeToContentLang(countryCode)
  )
}
