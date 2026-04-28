"use client"

import type { StoreSellerCategoryFacet } from "@/lib/data/seller"
import { formatLocationFilterLabel } from "@/lib/helpers/format-location-filter-label"
import { countryCodeToStorefrontMessagesLocale } from "@/lib/i18n/storefront-messages-locale"
import { useTranslations } from "next-intl"
import { useRouter } from "next/navigation"
import { useEffect, useMemo, useState, useTransition } from "react"

export type SellersDirectoryLocationFiltersProps = {
  urlLocale: string
  countries: string[]
  regionsByCountry: Record<string, string[]>
  selectedCountry: string
  selectedRegion: string
  /** Macro categorie con almeno un produttore con prodotti in catalogo. */
  categories?: StoreSellerCategoryFacet[]
  selectedCategory?: string
  /** Conteggi seller per codice paese ISO (allineati ai facets API). */
  sellerCountByCountry?: Record<string, number>
  /** Conteggi per paese e regione (chiavi regione come in `regionsByCountry`). */
  sellerCountByRegion?: Record<string, Record<string, number>>
  /** Totale seller nei facets (etichetta «tutte le nazioni»). */
  totalSellerCount?: number
}

function labelWithSellerCount(label: string, count: number): string {
  return `${label} (${count})`
}

function sortedRegions(regions: string[] | undefined): string[] {
  if (!regions?.length) return []
  return [...regions].sort((a, b) =>
    formatLocationFilterLabel(a).localeCompare(
      formatLocationFilterLabel(b),
      undefined,
      { sensitivity: "base" }
    )
  )
}

const selectClass =
  "w-full cursor-pointer appearance-none rounded-xl border border-neutral-200/90 bg-white py-2.5 pl-3 pr-10 text-sm font-medium text-primary shadow-sm transition-[border-color,box-shadow] hover:border-neutral-300 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:bg-neutral-50 disabled:text-neutral-400"

export function SellersDirectoryLocationFilters({
  urlLocale,
  countries,
  regionsByCountry,
  selectedCountry,
  selectedRegion,
  categories = [],
  selectedCategory = "",
  sellerCountByCountry = {},
  sellerCountByRegion = {},
  totalSellerCount = 0,
}: SellersDirectoryLocationFiltersProps) {
  const t = useTranslations("Sellers")
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [uiCountry, setUiCountry] = useState(selectedCountry)
  const [uiRegion, setUiRegion] = useState(selectedRegion)
  const [uiCategory, setUiCategory] = useState(selectedCategory)

  useEffect(() => {
    setUiCountry(selectedCountry)
    setUiRegion(selectedRegion)
    setUiCategory(selectedCategory)
  }, [selectedCountry, selectedRegion, selectedCategory])

  const intlLocales = useMemo(() => {
    const primary = countryCodeToStorefrontMessagesLocale(urlLocale)
    return primary === "ja" ? (["ja", "en"] as const) : ([primary, "en"] as const)
  }, [urlLocale])

  const regionNames = useMemo(
    () => new Intl.DisplayNames(intlLocales, { type: "region" }),
    [intlLocales]
  )

  const countryLabel = (code: string) =>
    regionNames.of(code) ?? code

  const regionOptions = uiCountry
    ? sortedRegions(regionsByCountry[uiCountry])
    : []

  const navigate = (
    nextCountry: string,
    nextRegion: string,
    nextCategory: string
  ) => {
    setUiCountry(nextCountry)
    setUiRegion(nextRegion)
    setUiCategory(nextCategory)
    const p = new URLSearchParams()
    const cc = nextCountry.trim().toUpperCase()
    if (cc && /^[A-Z]{2}$/.test(cc)) {
      p.set("country", cc)
    }
    const reg = nextRegion.trim()
    if (reg) {
      p.set("region", reg)
    }
    const cat = nextCategory.trim()
    if (cat) {
      p.set("category", cat)
    }
    const qs = p.toString()
    const href = qs ? `/${urlLocale}/sellers?${qs}` : `/${urlLocale}/sellers`
    startTransition(() => {
      router.replace(href, { scroll: false })
    })
  }

  return (
    <div className="relative mb-10 rounded-2xl border border-neutral-200/80 bg-white/90 p-4 shadow-sm backdrop-blur-sm sm:p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-end">
        {categories.length > 0 ? (
          <div className="relative flex min-w-[12rem] flex-1 flex-col gap-2">
            <label
              htmlFor="sellers-filter-category"
              className="text-[11px] font-semibold uppercase tracking-[0.12em] text-neutral-500"
            >
              {t("filtersCategoryLabel")}
            </label>
            <div className="relative">
              <select
                id="sellers-filter-category"
                className={selectClass}
                value={uiCategory}
                onChange={(e) => {
                  const v = e.target.value
                  navigate(uiCountry, uiRegion, v)
                }}
              >
                <option value="">
                  {labelWithSellerCount(
                    t("filtersAllCategories"),
                    totalSellerCount
                  )}
                </option>
                {categories.map((c) => (
                  <option key={c.handle} value={c.handle}>
                    {labelWithSellerCount(c.name, c.sellerCount)}
                  </option>
                ))}
              </select>
              <span
                className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-neutral-400"
                aria-hidden
              >
                ▾
              </span>
            </div>
          </div>
        ) : null}
        <div className="relative flex min-w-[12rem] flex-1 flex-col gap-2">
          <label
            htmlFor="sellers-filter-country"
            className="text-[11px] font-semibold uppercase tracking-[0.12em] text-neutral-500"
          >
            {t("filtersCountryLabel")}
          </label>
          <div className="relative">
            <select
              id="sellers-filter-country"
              className={selectClass}
              value={uiCountry}
              onChange={(e) => {
                const v = e.target.value
                navigate(v, "", uiCategory)
              }}
            >
              <option value="">
                {labelWithSellerCount(t("filtersAllCountries"), totalSellerCount)}
              </option>
              {countries.map((c) => (
                <option key={c} value={c}>
                  {labelWithSellerCount(
                    countryLabel(c),
                    sellerCountByCountry[c] ?? 0
                  )}
                </option>
              ))}
            </select>
            <span
              className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-neutral-400"
              aria-hidden
            >
              ▾
            </span>
          </div>
        </div>
        <div className="relative flex min-w-[12rem] flex-1 flex-col gap-2">
          <label
            htmlFor="sellers-filter-region"
            className="text-[11px] font-semibold uppercase tracking-[0.12em] text-neutral-500"
          >
            {t("filtersRegionLabel")}
          </label>
          <div className="relative">
            <select
              id="sellers-filter-region"
              disabled={!uiCountry}
              className={selectClass}
              value={uiRegion}
              onChange={(e) =>
                navigate(uiCountry, e.target.value, uiCategory)
              }
            >
              <option value="">
                {uiCountry
                  ? labelWithSellerCount(
                      t("filtersAllRegions"),
                      sellerCountByCountry[uiCountry] ?? 0
                    )
                  : t("filtersAllRegions")}
              </option>
              {regionOptions.map((r) => (
                <option key={r} value={r}>
                  {labelWithSellerCount(
                    formatLocationFilterLabel(r),
                    uiCountry
                      ? sellerCountByRegion[uiCountry]?.[r.toUpperCase()] ?? 0
                      : 0
                  )}
                </option>
              ))}
            </select>
            <span
              className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-neutral-400"
              aria-hidden
            >
              ▾
            </span>
          </div>
        </div>
      </div>
      {isPending ? (
        <p
          className="mt-3 text-xs font-medium text-neutral-500"
          aria-live="polite"
        >
          {t("filtersLoadingHint")}
        </p>
      ) : null}
      {!uiCountry ? (
        <p className="mt-3 text-xs leading-relaxed text-neutral-500 sm:max-w-xl">
          {t("filtersApplyHint")}
        </p>
      ) : null}
    </div>
  )
}
