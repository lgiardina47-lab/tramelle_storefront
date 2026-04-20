import type { StoreSellersFacetsResponse } from "@/lib/data/seller"

export const SELLERS_DIRECTORY_PAGE_SIZE = 24

export type SellersDirectorySearchParams = {
  page?: string
  country?: string
  region?: string
  /** Handle macro categoria (`taste_category_handles`). */
  category?: string
}

export function sellersDirectoryPageHref(
  locale: string,
  opts: {
    page?: number
    country?: string
    region?: string
    category?: string
  }
) {
  const p = new URLSearchParams()
  if (opts.country) {
    p.set("country", opts.country)
  }
  if (opts.region) {
    p.set("region", opts.region)
  }
  if (opts.category?.trim()) {
    p.set("category", opts.category.trim())
  }
  if (opts.page && opts.page > 1) {
    p.set("page", String(opts.page))
  }
  const qs = p.toString()
  return qs ? `/${locale}/sellers?${qs}` : `/${locale}/sellers`
}

export type SellersDirectoryResolved =
  | { outcome: "redirect"; href: string }
  | {
      outcome: "ok"
      page: number
      offset: number
      countryCode?: string
      region?: string
      facetCountries: string[]
      countriesSorted: string[]
      regionsByCountry: Record<string, string[]>
      sellerCountByCountry: Record<string, number>
      sellerCountByRegion: Record<string, Record<string, number>>
      totalSellerCount: number
      /** Handle categoria macro selezionato (validato sui facets). */
      categoryHandle?: string
      locale: string
    }

export type SellersDirectoryResolvedOk = Extract<
  SellersDirectoryResolved,
  { outcome: "ok" }
>

/** Risolve URL + facets come prima: redirect se query geo non valida. */
export function resolveSellersDirectory(
  locale: string,
  sp: SellersDirectorySearchParams,
  facets: StoreSellersFacetsResponse | null
): SellersDirectoryResolved {
  const pageRaw = parseInt(sp.page || "1", 10)
  const page = Number.isFinite(pageRaw) && pageRaw >= 1 ? pageRaw : 1
  const offset = (page - 1) * SELLERS_DIRECTORY_PAGE_SIZE

  const qCountry = (typeof sp.country === "string" ? sp.country : "").trim()
  const qRegion = (typeof sp.region === "string" ? sp.region : "").trim()
  const qCategory = (typeof sp.category === "string" ? sp.category : "").trim()

  const facetCountries = facets?.countries ?? []
  const facetCategoryList = facets?.categories ?? []
  const allowedCategoryHandles = new Set(
    facetCategoryList.map((c) => c.handle)
  )
  const categoryHandle =
    qCategory &&
    /^[a-z0-9][a-z0-9-]{0,118}$/i.test(qCategory) &&
    allowedCategoryHandles.has(qCategory)
      ? qCategory
      : undefined
  const regionsByCountry = facets?.regionsByCountry ?? {}
  const sellerCountByCountry = facets?.sellerCountByCountry ?? {}
  const sellerCountByRegion = facets?.sellerCountByRegion ?? {}
  const totalSellerCount = facets?.totalSellerCount ?? 0
  const hasFacets = facetCountries.length > 0
  const countriesSorted = [...facetCountries].sort((a, b) =>
    a.localeCompare(b, "en", { sensitivity: "base" })
  )

  const cc = qCountry.toUpperCase()
  const isoOk = Boolean(cc && /^[A-Z]{2}$/.test(cc))
  let countryCode: string | undefined = hasFacets
    ? isoOk && facetCountries.includes(cc)
      ? cc
      : undefined
    : isoOk
      ? cc
      : undefined

  let region: string | undefined
  if (countryCode && qRegion) {
    if (hasFacets) {
      const allowed = regionsByCountry[countryCode] ?? []
      const match = allowed.find((r) => r.toLowerCase() === qRegion.toLowerCase())
      region = match
    } else {
      region = qRegion
    }
  }

  const invalidCountry = Boolean(qCountry) && !countryCode
  const orphanRegion = Boolean(qRegion) && !countryCode
  const invalidRegion =
    Boolean(qRegion) && Boolean(countryCode) && !region && hasFacets
  const invalidCategory = Boolean(qCategory) && !categoryHandle

  if (invalidCountry || orphanRegion || invalidRegion || invalidCategory) {
    return {
      outcome: "redirect",
      href: sellersDirectoryPageHref(locale, {
        page: page > 1 ? page : undefined,
        country: countryCode,
        region,
        category: categoryHandle,
      }),
    }
  }

  return {
    outcome: "ok",
    page,
    offset,
    countryCode,
    region,
    facetCountries,
    countriesSorted,
    regionsByCountry,
    sellerCountByCountry,
    sellerCountByRegion,
    totalSellerCount,
    categoryHandle,
    locale,
  }
}
