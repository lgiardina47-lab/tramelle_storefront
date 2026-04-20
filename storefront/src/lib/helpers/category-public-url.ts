/** Prefisso handle categorie Tramelle in Medusa (URL pubblico senza questo segmento). */
export const TRAMELLE_CATEGORY_HANDLE_PREFIX = "tramelle-"

/**
 * Allineamento a `tramelle_taxonomies/tramelle_categories.json` (slug macro = handle Medusa)
 * e slug vetrina usati da `CategoryCard` / mega menu (“Vedi tutto” → pagina macro).
 */
const TRAMELLE_MACRO_PUBLIC_SLUGS = [
  { taxonomySlug: "salumi-prosciutti-insaccati", storefrontSlug: "la-norcineria" },
  { taxonomySlug: "carni-selezionate", storefrontSlug: "le-carni" },
  { taxonomySlug: "formaggi-latticini-burro", storefrontSlug: "il-caseificio" },
  { taxonomySlug: "olio-extravergine-aceto-condimenti", storefrontSlug: "l-oleario" },
  { taxonomySlug: "pasta-pane-farine-cereali", storefrontSlug: "l-arte-bianca" },
  {
    taxonomySlug: "cioccolato-dolci-biscotti-confetture",
    storefrontSlug: "l-alta-pasticceria",
  },
  { taxonomySlug: "miele-artigianale-propoli", storefrontSlug: "l-alveare" },
  { taxonomySlug: "pesce-frutti-di-mare-conserve-ittiche", storefrontSlug: "il-mare" },
  { taxonomySlug: "conserve-sughi-salse-gastronomia", storefrontSlug: "la-dispensa" },
  { taxonomySlug: "tartufi-funghi-pregiati", storefrontSlug: "il-bosco" },
  { taxonomySlug: "verdura-frutta-erbe-aromatiche", storefrontSlug: "l-orto" },
  { taxonomySlug: "vino-bollicine-spumante", storefrontSlug: "la-cantina" },
  { taxonomySlug: "birra-artigianale-fermentati", storefrontSlug: "il-birrificio" },
  {
    taxonomySlug: "liquori-distillati-grappa-whisky",
    storefrontSlug: "la-distilleria",
  },
  { taxonomySlug: "caffe-specialty-te-infusi", storefrontSlug: "la-torrefazione" },
  { taxonomySlug: "acqua-succhi-bevande-premium", storefrontSlug: "la-sorgente" },
] as const

/**
 * Chiave = segmento dopo strip di `tramelle-` (slug tassonomia / handle macro DB),
 * valore = slug nell’URL `/categories/…` (vetrina).
 */
const STOREFRONT_MACRO_SLUG_ALIAS: Record<string, string> = Object.fromEntries(
  TRAMELLE_MACRO_PUBLIC_SLUGS.map(({ taxonomySlug, storefrontSlug }) => [
    taxonomySlug.toLowerCase(),
    storefrontSlug,
  ])
)

/**
 * Slug URL vetrina → handle Medusa da provare in ordine se il lookup diretto fallisce.
 */
export const CATEGORY_URL_SLUG_HANDLE_TRIES: Record<string, readonly string[]> =
  Object.fromEntries(
    TRAMELLE_MACRO_PUBLIC_SLUGS.map(({ taxonomySlug, storefrontSlug }) => {
      const key = storefrontSlug.toLowerCase()
      const tries: readonly string[] = [
        `tramelle-${storefrontSlug}`,
        storefrontSlug,
        `tramelle-${taxonomySlug}`,
        taxonomySlug,
      ]
      return [key, tries]
    })
  )

/**
 * Segmento URL storefront per una categoria: senza prefisso `tramelle-` quando presente.
 * I file statici sotto `/public/images/categories/` restano nominati con l'handle Medusa completo.
 */
export function categorySlugForStorefrontUrl(handle: string): string {
  const h = (handle || "").trim()
  if (!h) return h
  const lower = h.toLowerCase()
  let stripped = h
  if (lower.startsWith(TRAMELLE_CATEGORY_HANDLE_PREFIX)) {
    stripped = h.slice(TRAMELLE_CATEGORY_HANDLE_PREFIX.length)
  }
  const alias = STOREFRONT_MACRO_SLUG_ALIAS[stripped.toLowerCase()]
  return alias ?? stripped
}

/** Path relativo al locale: `/categories/<slug-pubblico>`. */
export function categoryPublicHref(handle: string): string {
  return `/categories/${categorySlugForStorefrontUrl(handle)}`
}

/** Confronto segmento URL (slug pubblico) con handle Medusa (`tramelle-…` o identico). */
export function categoryHandleMatchesUrlSegment(
  medusaHandle: string,
  urlSegment: string
): boolean {
  const m = (medusaHandle || "").trim()
  const u = (urlSegment || "").trim()
  if (!m || !u) return false
  if (m === u) return true
  return categorySlugForStorefrontUrl(m) === categorySlugForStorefrontUrl(u)
}
