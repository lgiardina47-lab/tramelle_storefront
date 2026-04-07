/** Contenuti prodotto multilingua in `product.metadata.tramelle_i18n`. */
export const TRAMELLE_PRODUCT_I18N_KEY = "tramelle_i18n"

export type ProductI18nBundle = {
  title?: string
  subtitle?: string
  description?: string
}

export type ProductI18nMap = Partial<Record<string, ProductI18nBundle>>

/** Lingua “canonica” nei campi Medusa nativi (title, subtitle, description). */
export const DEFAULT_PRODUCT_CONTENT_LOCALE = "it"

export function getProductI18nMap(metadata: unknown): ProductI18nMap {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
    return {}
  }
  const raw = (metadata as Record<string, unknown>)[TRAMELLE_PRODUCT_I18N_KEY]
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return {}
  }
  return raw as ProductI18nMap
}

/** Allinea codice i18n (es. en-US, ptBR) a chiave usata nei metadata. */
export function normalizeContentLang(code: string): string {
  const lower = code.toLowerCase()
  if (lower.startsWith("pt")) {
    return "ptBR"
  }
  return code.replace("_", "-").split("-")[0] || "en"
}

export function getLocalizedTextFields(
  product: {
    title: string
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
  const key = normalizeContentLang(lang)
  const map = getProductI18nMap(product.metadata)
  const bundle = map[key]

  if (key === DEFAULT_PRODUCT_CONTENT_LOCALE) {
    return {
      title: product.title,
      subtitle: product.subtitle ?? null,
      description: product.description ?? null,
    }
  }

  return {
    title: (bundle?.title?.trim() ? bundle.title : product.title) || product.title,
    subtitle:
      bundle?.subtitle !== undefined
        ? bundle.subtitle || null
        : product.subtitle ?? null,
    description:
      bundle?.description !== undefined
        ? bundle.description || null
        : product.description ?? null,
  }
}

/** Valori form per la lingua attiva (senza fallback sulla lingua di default per i campi tradotti). */
export function getEditFormTextValuesForLang(
  product: {
    title: string
    subtitle?: string | null
    description?: string | null
    metadata?: unknown | null
  },
  lang: string
): { title: string; subtitle: string; description: string } {
  const key = normalizeContentLang(lang)
  if (key === DEFAULT_PRODUCT_CONTENT_LOCALE) {
    return {
      title: product.title,
      subtitle: product.subtitle || "",
      description: product.description || "",
    }
  }
  const bundle = getProductI18nMap(product.metadata)[key]
  return {
    title: bundle?.title || "",
    subtitle: bundle?.subtitle || "",
    description: bundle?.description || "",
  }
}
