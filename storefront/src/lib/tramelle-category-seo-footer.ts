/**
 * Blocco SEO a fondo pagina macro — dati in `product_category.metadata.tramelle_seo_footer`.
 * Versionato per evoluzioni future; data entry da Admin → drawer "Storefront SEO".
 */

export const CATEGORY_SEO_FOOTER_METADATA_KEY = "tramelle_seo_footer" as const

export const CATEGORY_SEO_FOOTER_SCHEMA_VERSION = 1 as const

/** Path interno senza segmento lingua (es. `/categories/...`, `/sellers?...`). */
export type CategorySeoFooterLink = {
  type: "link"
  path: string
  label: string
}

export type CategorySeoFooterText = { type: "text"; text: string }

export type CategorySeoFooterStrong = { type: "strong"; text: string }

export type CategorySeoFooterPart =
  | CategorySeoFooterText
  | CategorySeoFooterStrong
  | CategorySeoFooterLink

export type CategorySeoFooterSection = {
  heading: string
  parts: CategorySeoFooterPart[]
}

export type CategorySeoFooterV1 = {
  v: typeof CATEGORY_SEO_FOOTER_SCHEMA_VERSION
  title: string
  lead: CategorySeoFooterPart[]
  sections: CategorySeoFooterSection[]
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return v !== null && typeof v === "object" && !Array.isArray(v)
}

function isPart(v: unknown): v is CategorySeoFooterPart {
  if (!isRecord(v) || typeof v.type !== "string") return false
  if (v.type === "text" || v.type === "strong") {
    return typeof v.text === "string"
  }
  if (v.type === "link") {
    return typeof v.path === "string" && typeof v.label === "string"
  }
  return false
}

function isSection(v: unknown): v is CategorySeoFooterSection {
  if (!isRecord(v)) return false
  if (typeof v.heading !== "string") return false
  if (!Array.isArray(v.parts)) return false
  return v.parts.every(isPart)
}

/** Valida e restituisce il payload oppure null. */
export function parseCategorySeoFooter(
  metadata: unknown
): CategorySeoFooterV1 | null {
  if (!isRecord(metadata)) return null
  const raw = metadata[CATEGORY_SEO_FOOTER_METADATA_KEY]
  if (!isRecord(raw)) return null
  if (raw.v !== CATEGORY_SEO_FOOTER_SCHEMA_VERSION) return null
  if (typeof raw.title !== "string" || !raw.title.trim()) return null
  if (!Array.isArray(raw.lead) || !raw.lead.every(isPart)) return null
  if (!Array.isArray(raw.sections) || !raw.sections.every(isSection)) {
    return null
  }
  return {
    v: CATEGORY_SEO_FOOTER_SCHEMA_VERSION,
    title: raw.title.trim(),
    lead: raw.lead,
    sections: raw.sections,
  }
}
