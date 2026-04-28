import { sellerListingRegionLabel } from "@/lib/helpers/seller-listing-region"
import {
  sellerDirectoryLogoImageCandidates,
  sellerHeroImageCandidates,
} from "@/lib/helpers/seller-media-url"
import type { StoreSellerListItem } from "@/types/seller"
import { pickBrandCopyForHero } from "@/lib/helpers/tramelle-brand-copy-i18n"

/** Slide hero catalogo (offset allineato a `GET /store/sellers?offset=`). */
export type HeroCatalogSlide = {
  /** Posizione 1-based nell'elenco ordinato API (stesso universo del totale facets). */
  catalogIndex1Based: number
  src: string
  alt: string
  handle: string
  displayName: string
  /** Etichetta regione/provincia (listing). */
  regionLabel: string
  /** Nome paese localizzato (es. Italia). */
  countryLabel: string
  /** Legacy riga compatta; utile per fallback. */
  locationLine: string
  logoSrc?: string
  /** Sottocategorie hero: da metadata o da facet listing (`count` solo con arricchimento Meilisearch). */
  subcategoryPills?: { label: string; count?: number }[]
  /** Copy marchio da `metadata.tramelle_brand_copy_i18n` (solo pagina categoria / CategoryBrandHeroIntro). */
  brandHeadline?: string
  brandSubheadline?: string
  brandDescription?: string
}

function countryDisplayName(
  code: string | undefined,
  intlLocales: readonly string[]
): string {
  const cc = code?.trim().toUpperCase()
  if (!cc || cc.length !== 2) return ""
  const locs = intlLocales.length ? [...intlLocales] : ["it"]
  try {
    return new Intl.DisplayNames(locs, { type: "region" }).of(cc) ?? cc
  } catch {
    try {
      return new Intl.DisplayNames(["it"], { type: "region" }).of(cc) ?? cc
    } catch {
      return cc
    }
  }
}

function heroSellerDisplayName(s: StoreSellerListItem): string {
  const n = s.name?.trim()
  if (n) return n
  const h = s.handle?.trim()
  if (!h) return ""
  return h
    .split("-")
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ")
}

function buildHeroLocationLine(s: StoreSellerListItem): string {
  const country = s.country_code?.trim().toUpperCase() || ""
  const region = sellerListingRegionLabel(s)
  if (country && region) return `${country} · ${region}`
  return country || region || ""
}

function tasteCategoryHandlesFromMetadata(
  metadata: Record<string, unknown> | null | undefined
): string[] {
  if (!metadata || typeof metadata !== "object") return []
  const raw = metadata.taste_category_handles
  if (!Array.isArray(raw)) return []
  const out: string[] = []
  for (const x of raw) {
    if (typeof x !== "string") continue
    const h = x.trim().replace(/^["']|["']$/g, "")
    if (h) out.push(h)
  }
  return [...new Set(out)]
}

function labelFromHandleFallback(handle: string): string {
  let h = handle.trim()
  const low = h.toLowerCase()
  if (low.startsWith("tramelle-")) {
    h = h.slice("tramelle-".length)
  }
  return h
    .split("-")
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ")
}

function subcategoryPillsForSeller(
  s: StoreSellerListItem,
  labelByHandle: Map<string, string>
): { label: string }[] {
  const handles = tasteCategoryHandlesFromMetadata(
    (s.metadata ?? null) as Record<string, unknown> | null
  )
  if (!handles.length) return []
  const labels: string[] = []
  const seen = new Set<string>()
  for (const h of handles) {
    const name =
      labelByHandle.get(h.toLowerCase()) ?? labelFromHandleFallback(h)
    const key = name.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    labels.push(name)
  }
  return labels
    .sort((a, b) => a.localeCompare(b, "it", { sensitivity: "base" }))
    .map((label) => ({ label }))
}

export function buildHeroCatalogSlideFromSeller(
  s: StoreSellerListItem,
  t: {
    altForName: (name: string) => string
    altFallback: () => string
  },
  intlLocales: readonly string[],
  catalogIndex1Based: number,
  labelByHandle: Map<string, string>
): HeroCatalogSlide | null {
  const raw = sellerHeroImageCandidates(s)[0]
  if (!raw?.trim()) return null
  const url = raw.trim()
  const handle = s.handle?.trim()
  if (!handle) return null

  const displayName = heroSellerDisplayName(s)
  const alt = displayName ? t.altForName(displayName) : t.altFallback()

  const logoRaw = (sellerDirectoryLogoImageCandidates(s)[0] || "").trim()
  const regionLabel = (sellerListingRegionLabel(s) || "").trim()
  const countryLabel = countryDisplayName(s.country_code, intlLocales)
  const subPills = subcategoryPillsForSeller(s, labelByHandle)
  const brand = pickBrandCopyForHero(
    (s.metadata ?? null) as Record<string, unknown> | null,
    intlLocales
  )
  const brandHeadline = brand.headline.trim()
  const brandSubheadline = brand.subheadline.trim()
  const brandDescription = brand.description.trim()

  return {
    catalogIndex1Based,
    src: url,
    alt,
    handle,
    displayName: displayName || handle,
    regionLabel,
    countryLabel,
    locationLine: buildHeroLocationLine(s),
    ...(logoRaw ? { logoSrc: logoRaw } : {}),
    ...(subPills.length > 0 ? { subcategoryPills: subPills } : {}),
    ...(brandHeadline ? { brandHeadline } : {}),
    ...(brandSubheadline ? { brandSubheadline } : {}),
    ...(brandDescription ? { brandDescription } : {}),
  }
}
