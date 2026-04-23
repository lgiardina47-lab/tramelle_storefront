import { sellerListingRegionLabel } from "@/lib/helpers/seller-listing-region"
import {
  sellerDirectoryLogoImageCandidates,
  sellerHeroImageCandidates,
} from "@/lib/helpers/seller-media-url"
import type { StoreSellerListItem } from "@/types/seller"

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

export function buildHeroCatalogSlideFromSeller(
  s: StoreSellerListItem,
  t: {
    altForName: (name: string) => string
    altFallback: () => string
  },
  intlLocales: readonly string[],
  catalogIndex1Based: number
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
  }
}
