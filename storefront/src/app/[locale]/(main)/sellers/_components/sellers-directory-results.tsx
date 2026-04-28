import { SellersDirectoryLocationFilters } from "@/components/molecules/SellersDirectoryLocationFilters/SellersDirectoryLocationFilters"
import { listStoreSellersFacets } from "@/lib/data/seller"
import { redirect } from "next/navigation"
import { SellersDirectorySellerGrid } from "./sellers-directory-seller-grid"
import {
  resolveSellersDirectory,
  type SellersDirectorySearchParams,
} from "./sellers-directory-shared"

/** Facets + filtri e griglia venditori (RSC). */
export async function SellersDirectoryResults({
  locale,
  searchParams: sp,
}: {
  locale: string
  searchParams: SellersDirectorySearchParams
}) {
  /** Nessun `content_locale`: directory mostra tutti i produttori idonei (come prima del filtro “copy locale”). */
  const facets = await listStoreSellersFacets()
  const r = resolveSellersDirectory(locale, sp, facets)
  if (r.outcome === "redirect") {
    redirect(r.href)
  }

  const {
    facetCountries,
    countriesSorted,
    regionsByCountry,
    sellerCountByCountry,
    sellerCountByRegion,
    totalSellerCount,
    countryCode,
    region,
    page,
    categoryHandle,
  } = r

  const categoryFacets = facets?.categories ?? []

  return (
    <>
      {facetCountries.length > 0 || categoryFacets.length > 0 ? (
        <SellersDirectoryLocationFilters
          urlLocale={locale}
          countries={countriesSorted}
          regionsByCountry={regionsByCountry}
          selectedCountry={countryCode ?? ""}
          selectedRegion={region ?? ""}
          categories={categoryFacets}
          selectedCategory={categoryHandle ?? ""}
          sellerCountByCountry={sellerCountByCountry}
          sellerCountByRegion={sellerCountByRegion}
          totalSellerCount={totalSellerCount}
        />
      ) : null}

      <SellersDirectorySellerGrid locale={locale} resolved={r} />
    </>
  )
}
