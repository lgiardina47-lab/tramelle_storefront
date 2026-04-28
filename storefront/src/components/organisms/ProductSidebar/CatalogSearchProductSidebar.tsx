"use client"

import { Button, Chip, Input } from "@/components/atoms"
import { Accordion, FilterCheckboxOption, Modal } from "@/components/molecules"
import useFilters from "@/hooks/useFilters"
import useUpdateSearchParams from "@/hooks/useUpdateSearchParams"
import {
  INDEX_TO_LISTING_FACET_PARAM,
  LISTING_SEARCH_FACET_ATTRIBUTES,
  facetHeadingForListingAttribute,
} from "@/lib/helpers/search-listing-facets"
import { formatLocationFilterLabel } from "@/lib/helpers/format-location-filter-label"
import { cn } from "@/lib/utils"
import { useLocale, useTranslations } from "next-intl"
import { usePathname, useSearchParams } from "next/navigation"
import React, { useEffect, useMemo, useRef, useState } from "react"
import { ProductListingActiveFilters } from "../ProductListingActiveFilters/ProductListingActiveFilters"
import useGetAllSearchParams from "@/hooks/useGetAllSearchParams"
import { HIDE_LISTING_FILTERS } from "@/const"

/** Risposta facet Meilisearch: attributo → valore → conteggio */
export type ListingFacetBuckets = Record<string, number>

/** Allinea nomi ribbon / URL ai bucket Meilisearch (stesso nome, casing diverso). */
function facetBucketLookupMaps(buckets: Record<string, number>): {
  exact: Map<string, number>
  byLower: Map<string, number>
} {
  const exact = new Map<string, number>()
  const byLower = new Map<string, number>()
  for (const [k, v] of Object.entries(buckets)) {
    const key = String(k).trim()
    if (!key || typeof v !== "number") continue
    exact.set(key, v)
    byLower.set(key.toLowerCase(), v)
  }
  return { exact, byLower }
}

function facetCountForLabel(
  label: string,
  maps: { exact: Map<string, number>; byLower: Map<string, number> }
): number {
  const t = label.trim()
  if (!t) return 0
  return maps.exact.get(t) ?? maps.byLower.get(t.toLowerCase()) ?? 0
}

function splitListingFacetParam(raw: string | undefined): string[] {
  if (!raw?.trim()) return []
  return Array.from(
    new Set(
      raw
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
    )
  )
}

/** Include sempre le sottocategorie già in query, anche se non compaiono nei bucket (filtri stretti / fallback). */
function mergeCategoryNameFacetEntries(
  buckets: Record<string, number>,
  selectedFromUrl: string[]
): [string, number][] {
  const map = new Map<string, number>()
  const lowersPresent = new Set<string>()
  for (const [k, v] of Object.entries(buckets)) {
    const key = String(k).trim()
    if (!key || typeof v !== "number") continue
    map.set(key, v)
    lowersPresent.add(key.toLowerCase())
  }
  for (const s of selectedFromUrl) {
    const t = s.trim()
    if (!t || lowersPresent.has(t.toLowerCase())) continue
    map.set(t, 0)
    lowersPresent.add(t.toLowerCase())
  }
  return [...map.entries()].sort((a, b) =>
    a[0].localeCompare(b[0], undefined, { sensitivity: "base" })
  )
}

/**
 * Pagina macro: mostra **tutte** le sottocategorie del ribbon (ordine uguale), con conteggio dai facet o 0.
 * Aggiunge in coda selezioni URL e bucket Meilisearch non nel ribbon.
 */
function mergeCategoryNameFacetWithMacroSubs(
  buckets: Record<string, number>,
  selectedFromUrl: string[],
  orderedMacroSubcategoryNames: string[],
  persistedExtraLabels: string[] = []
): [string, number][] {
  const maps = facetBucketLookupMaps(buckets)
  const bucketMap = new Map<string, number>()
  for (const [k, v] of Object.entries(buckets)) {
    const key = String(k).trim()
    if (!key || typeof v !== "number") continue
    bucketMap.set(key, v)
  }
  const out: [string, number][] = []
  const seen = new Set<string>()
  const seenLower = new Set<string>()

  for (const raw of orderedMacroSubcategoryNames) {
    const name = raw.trim()
    if (!name || seen.has(name)) continue
    seen.add(name)
    seenLower.add(name.toLowerCase())
    out.push([name, facetCountForLabel(name, maps)])
  }

  for (const s of selectedFromUrl) {
    const t = s.trim()
    if (!t || seen.has(t)) continue
    seen.add(t)
    seenLower.add(t.toLowerCase())
    out.push([t, facetCountForLabel(t, maps)])
  }

  const extras = [...bucketMap.entries()]
    .filter(([k]) => {
      const kt = k.trim()
      if (seen.has(kt)) return false
      if (seenLower.has(kt.toLowerCase())) return false
      return true
    })
    .sort((a, b) =>
      a[0].localeCompare(b[0], undefined, { sensitivity: "base" })
    )
  for (const [k, v] of extras) {
    out.push([k, v])
  }
  for (const raw of persistedExtraLabels) {
    const name = raw.trim()
    if (!name || seenLower.has(name.toLowerCase())) continue
    seen.add(name)
    seenLower.add(name.toLowerCase())
    out.push([name, facetCountForLabel(name, maps)])
  }
  return out
}

/**
 * Facet Meilisearch = solo valori presenti nei hit filtrati: spariscono le altre voci.
 * Uniamo selezione URL + etichette già viste in questa sessione (ref) così resta possibile
 * la multi-selezione OR (nazione, regione, sottocategorie senza lista macro, ecc.).
 */
/** Facet checkbox: stesso problema di provenance (hit filtrati → spariscono le altre voci). */
const LISTING_FACET_MERGE_PERSISTED: string[] = [
  "seller.handle",
  "type.value",
  "tags.value",
  "variants.color",
  "variants.size",
  "variants.condition",
]

function mergeFacetWithPersisted(
  buckets: Record<string, number>,
  selectedFromUrl: string[],
  persistedLabels: string[]
): [string, number][] {
  const maps = facetBucketLookupMaps(buckets)
  const seenLower = new Set<string>()
  const out: [string, number][] = []
  const add = (label: string) => {
    const t = label.trim()
    if (!t || seenLower.has(t.toLowerCase())) return
    seenLower.add(t.toLowerCase())
    out.push([t, facetCountForLabel(t, maps)])
  }
  for (const s of selectedFromUrl) add(s)
  for (const p of persistedLabels) add(p)
  for (const k of Object.keys(buckets)) add(k)
  return out.sort((a, b) =>
    a[0].localeCompare(b[0], undefined, { sensitivity: "base" })
  )
}

export const CatalogSearchProductSidebar = ({
  facets,
  /** Nomi sottocategorie della macro (ordine ribbon); se valorizzato, la sidebar non nasconde mai quelle voci. */
  sidebarMacroSubcategoryNames,
  /** Titolo sezione filtro `categories.name` (nome macro al posto di «Sottocategorie»). */
  sidebarMacroCategoryHeading,
}: {
  facets: Record<string, ListingFacetBuckets | undefined>
  sidebarMacroSubcategoryNames?: string[]
  sidebarMacroCategoryHeading?: string
}) => {
  const [isMobile, setIsMobile] = useState(false)
  const [isOpen, setIsOpen] = useState(false)
  const tListing = useTranslations("ListingFilters")

  const { allSearchParams } = useGetAllSearchParams()
  const searchParams = useSearchParams()
  const pathname = usePathname()
  const querySignature = searchParams.toString()
  const categoriesNameQs = allSearchParams.categories_name ?? ""
  const macroSubsKey =
    sidebarMacroSubcategoryNames && sidebarMacroSubcategoryNames.length > 0
      ? sidebarMacroSubcategoryNames.join("\x1e")
      : ""

  const countryKeysSeenRef = useRef<Set<string>>(new Set())
  const regionKeysSeenRef = useRef<Set<string>>(new Set())
  const categoryNamesSeenRef = useRef<Set<string>>(new Set())
  const facetPersistedByAttrRef = useRef<Record<string, Set<string>>>({})

  useEffect(() => {
    countryKeysSeenRef.current.clear()
    regionKeysSeenRef.current.clear()
    facetPersistedByAttrRef.current = {}
  }, [pathname])

  useEffect(() => {
    categoryNamesSeenRef.current.clear()
    for (const n of sidebarMacroSubcategoryNames ?? []) {
      const t = n.trim()
      if (t) categoryNamesSeenRef.current.add(t)
    }
  }, [pathname, macroSubsKey, sidebarMacroSubcategoryNames])

  const sections = useMemo(() => {
    const macroSubsOrdered =
      macroSubsKey.length > 0 ? macroSubsKey.split("\x1e") : []

    return LISTING_SEARCH_FACET_ATTRIBUTES.map((attr) => {
        const param = INDEX_TO_LISTING_FACET_PARAM[attr]
        if (!param) return null
        const isProvenance =
          attr === "provenance_country" || attr === "provenance_region"
        const isCategoryName = attr === "categories.name"
        const mergePersistedCheckbox =
          LISTING_FACET_MERGE_PERSISTED.includes(attr)
        const allowEmptyFacetBucket =
          isProvenance || isCategoryName || mergePersistedCheckbox
        const buckets = facets[attr]
        if (
          !allowEmptyFacetBucket &&
          (!buckets || typeof buckets !== "object" || Array.isArray(buckets))
        ) {
          return null
        }
        const rawBucket: Record<string, number> =
          buckets && typeof buckets === "object" && !Array.isArray(buckets)
            ? Object.fromEntries(
                Object.entries(buckets as Record<string, number>).filter(
                  ([label, count]) =>
                    String(label).trim().length > 0 && typeof count === "number"
                )
              )
            : {}

        let entries: [string, number][] = Object.entries(rawBucket)

        if (isCategoryName) {
          for (const k of Object.keys(rawBucket)) {
            const t = String(k).trim()
            if (t) categoryNamesSeenRef.current.add(t)
          }
          const selected = splitListingFacetParam(categoriesNameQs)
          const persistedCats = [...categoryNamesSeenRef.current]
          if (macroSubsOrdered.length > 0) {
            entries = mergeCategoryNameFacetWithMacroSubs(
              rawBucket,
              selected,
              macroSubsOrdered,
              persistedCats
            )
          } else {
            entries = mergeFacetWithPersisted(rawBucket, selected, persistedCats)
          }
          if (!entries.length) return null
        } else if (isProvenance) {
          for (const k of Object.keys(rawBucket)) {
            const t = String(k).trim()
            if (!t) continue
            if (attr === "provenance_country") {
              countryKeysSeenRef.current.add(t)
            } else {
              regionKeysSeenRef.current.add(t)
            }
          }
          const selected = splitListingFacetParam(allSearchParams[param])
          const persisted =
            attr === "provenance_country"
              ? [...countryKeysSeenRef.current]
              : [...regionKeysSeenRef.current]
          entries = mergeFacetWithPersisted(rawBucket, selected, persisted)
          if (!entries.length) return null
        } else if (mergePersistedCheckbox) {
          if (!facetPersistedByAttrRef.current[attr]) {
            facetPersistedByAttrRef.current[attr] = new Set()
          }
          const persistSet = facetPersistedByAttrRef.current[attr]!
          for (const k of Object.keys(rawBucket)) {
            const t = String(k).trim()
            if (t) persistSet.add(t)
          }
          const selected = splitListingFacetParam(allSearchParams[param])
          entries = mergeFacetWithPersisted(
            rawBucket,
            selected,
            [...persistSet]
          )
          if (!entries.length) return null
        } else if (!entries.length) {
          return null
        }

        return { attr, param, entries }
      }).filter(Boolean) as {
        attr: string
        param: string
        entries: [string, number][]
      }[]
    // `querySignature` copre i filtri in URL; `allSearchParams` è un oggetto nuovo a ogni render.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- evita ricalcolo inutile
  }, [facets, categoriesNameQs, macroSubsKey, querySignature])

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768)
    }
    handleResize()
    window.addEventListener("resize", handleResize)
    return () => window.removeEventListener("resize", handleResize)
  }, [])

  if (HIDE_LISTING_FILTERS) {
    return null
  }

  const facetBlocks = (
    <>
      {sections.map(({ attr, param, entries }) => {
        if (attr === "provenance_country") {
          return (
            <ProvenanceCountryFilter
              key={attr}
              param={param}
              entries={entries}
              heading={tListing("provenanceCountry")}
              emptyHint={tListing("noFacetValues")}
            />
          )
        }
        if (attr === "provenance_region") {
          return (
            <ProvenanceRegionFilter
              key={attr}
              param={param}
              entries={entries}
              heading={tListing("provenanceRegion")}
              emptyHint={tListing("noFacetValues")}
            />
          )
        }
        if (attr === "variants.size") {
          return (
            <SizeFilter
              key={attr}
              param={param}
              entries={entries}
            />
          )
        }
        if (attr === "variants.color") {
          return (
            <ColorFilter
              key={attr}
              param={param}
              entries={entries}
            />
          )
        }
        if (attr === "seller.handle") {
          return (
            <GenericCheckboxFacet
              key={attr}
              heading={tListing("facetBrand")}
              param={param}
              entries={entries}
            />
          )
        }
        if (attr === "categories.name") {
          return (
            <CategoryNameFacet
              key={attr}
              heading={
                sidebarMacroCategoryHeading?.trim() ||
                tListing("facetSubcategories")
              }
              param={param}
              entries={entries}
            />
          )
        }
        return (
          <GenericCheckboxFacet
            key={attr}
            heading={facetHeadingForListingAttribute(attr)}
            param={param}
            entries={entries}
          />
        )
      })}
    </>
  )

  return isMobile ? (
    <>
      <Button
        onClick={() => setIsOpen(true)}
        className="mb-4 w-full font-tramelle text-[11px] font-medium uppercase tracking-[0.12em]"
        variant="tonal"
      >
        {tListing("openFilters")}
      </Button>
      {isOpen && (
        <Modal
          heading={tListing("openFilters")}
          headingClassName="tramelle-filter-heading"
          onClose={() => setIsOpen(false)}
        >
          <div className="px-4">
            <ProductListingActiveFilters />
            <PriceFilter />
            {facetBlocks}
          </div>
        </Modal>
      )}
    </>
  ) : (
    <div>
      <PriceFilter />
      {facetBlocks}
    </div>
  )
}

function ProvenanceCountryFilter({
  param,
  entries,
  heading,
  emptyHint,
}: {
  param: string
  entries: [string, number][]
  heading: string
  emptyHint: string
}) {
  const { updateFilters, isFilterActive } = useFilters(param)
  const locale = useLocale()
  const regionNames = useMemo(
    () => new Intl.DisplayNames([locale, "en"], { type: "region" }),
    [locale]
  )
  const selectHandler = (option: string) => {
    updateFilters(option)
  }
  return (
    <Accordion heading={heading} defaultOpen>
      {!entries.length ? (
        <p className="tramelle-filter-muted mb-4 px-3">{emptyHint}</p>
      ) : (
        <ul className="px-3">
          {entries.map(([iso, count]) => {
            const code = String(iso).trim().toUpperCase()
            const label = regionNames.of(code) ?? iso
            return (
              <li key={iso} className="mb-4">
                <FilterCheckboxOption
                  checked={isFilterActive(iso)}
                  disabled={false}
                  onCheck={selectHandler}
                  label={label}
                  filterValue={iso}
                  amount={count}
                />
              </li>
            )
          })}
        </ul>
      )}
    </Accordion>
  )
}

function ProvenanceRegionFilter({
  param,
  entries,
  heading,
  emptyHint,
}: {
  param: string
  entries: [string, number][]
  heading: string
  emptyHint: string
}) {
  const { updateFilters, isFilterActive } = useFilters(param)
  const selectHandler = (option: string) => {
    updateFilters(option)
  }
  return (
    <Accordion heading={heading} defaultOpen>
      {!entries.length ? (
        <p className="tramelle-filter-muted mb-4 px-3">{emptyHint}</p>
      ) : (
        <ul className="px-3">
          {entries.map(([raw, count]) => {
            const label = formatLocationFilterLabel(raw)
            return (
              <li key={raw} className="mb-4">
                <FilterCheckboxOption
                  checked={isFilterActive(raw)}
                  disabled={false}
                  onCheck={selectHandler}
                  label={label}
                  filterValue={raw}
                  amount={count}
                />
              </li>
            )
          })}
        </ul>
      )}
    </Accordion>
  )
}

function CategoryNameFacet({
  heading,
  param,
  entries,
}: {
  heading: string
  param: string
  entries: [string, number][]
}) {
  const { updateFilters, isFilterActive } = useFilters(param)
  const selectHandler = (option: string) => {
    updateFilters(option)
  }
  return (
    <Accordion heading={heading} defaultOpen>
      {/* Multi-selezione OR: ogni voce resta attiva anche con conteggio 0 nel facet filtrato. */}
      <ul className="px-3" aria-label={heading}>
        {entries.map(([label, count]) => (
          <li key={label} className="mb-4">
            <FilterCheckboxOption
              checked={isFilterActive(label)}
              disabled={false}
              onCheck={selectHandler}
              label={label}
              filterValue={label}
              amount={count}
            />
          </li>
        ))}
      </ul>
    </Accordion>
  )
}

function GenericCheckboxFacet({
  heading,
  param,
  entries,
}: {
  heading: string
  param: string
  entries: [string, number][]
}) {
  const { updateFilters, isFilterActive } = useFilters(param)
  const selectHandler = (option: string) => {
    updateFilters(option)
  }
  return (
    <Accordion heading={heading} defaultOpen>
      <ul className="px-3">
        {entries.map(([label, count]) => (
          <li key={label} className="mb-4">
            <FilterCheckboxOption
              checked={isFilterActive(label)}
              disabled={false}
              onCheck={selectHandler}
              label={label}
              filterValue={label}
              amount={count}
            />
          </li>
        ))}
      </ul>
    </Accordion>
  )
}

function ColorFilter({
  param,
  entries,
}: {
  param: string
  entries: [string, number][]
}) {
  const { updateFilters, isFilterActive } = useFilters(param)

  const selectHandler = (option: string) => {
    updateFilters(option)
  }
  return (
    <Accordion
      heading={facetHeadingForListingAttribute("variants.color")}
      defaultOpen
    >
      <ul className="px-3">
        {entries.map(([label, count]) => (
          <li key={label} className="mb-4 flex items-center justify-between">
            <FilterCheckboxOption
              checked={isFilterActive(label)}
              disabled={false}
              onCheck={selectHandler}
              label={label}
              amount={count}
            />
            <div
              style={{ backgroundColor: label.toLowerCase() }}
              className={cn(
                "h-5 w-5 rounded-xs border border-[#E8E4DE]",
                Boolean(!label) && "opacity-30"
              )}
            />
          </li>
        ))}
      </ul>
    </Accordion>
  )
}

function SizeFilter({
  param,
  entries,
}: {
  param: string
  entries: [string, number][]
}) {
  const { updateFilters, isFilterActive } = useFilters(param)

  const selectSizeHandler = (size: string) => {
    updateFilters(size)
  }

  return (
    <Accordion
      heading={facetHeadingForListingAttribute("variants.size")}
      defaultOpen
    >
      <ul className="mt-2 grid grid-cols-4 gap-2 px-1">
        {entries.map(([label]) => (
          <li key={label} className="mb-4">
            <Chip
              selected={isFilterActive(label)}
              onSelect={() => selectSizeHandler(label)}
              value={label}
              className="w-full !justify-center !rounded-full !border-[#E8E4DE] !py-2 font-tramelle !text-[11px] !font-medium !uppercase !tracking-[0.1em]"
            />
          </li>
        ))}
      </ul>
    </Accordion>
  )
}

function PriceFilter() {
  const tListing = useTranslations("ListingFilters")
  const [min, setMin] = useState("")
  const [max, setMax] = useState("")

  const updateSearchParams = useUpdateSearchParams()
  const searchParams = useSearchParams()

  useEffect(() => {
    setMin(searchParams.get("min_price") || "")
    setMax(searchParams.get("max_price") || "")
  }, [searchParams])

  const updateMinPriceHandler = (
    e: React.FormEvent<HTMLFormElement> | React.FocusEvent<HTMLInputElement>
  ) => {
    e.preventDefault()
    updateSearchParams("min_price", min)
  }

  const updateMaxPriceHandler = (
    e: React.FormEvent<HTMLFormElement> | React.FocusEvent<HTMLInputElement>
  ) => {
    e.preventDefault()
    updateSearchParams("max_price", max)
  }
  return (
    <Accordion heading={tListing("priceSection")} defaultOpen>
      <div className="mb-4 flex gap-2 px-1">
        <form method="POST" onSubmit={updateMinPriceHandler}>
          <Input
            placeholder={tListing("priceMinPlaceholder")}
            onChange={(e) => setMin(e.target.value)}
            value={min}
            onBlur={(e) => {
              setTimeout(() => {
                updateMinPriceHandler(e)
              }, 500)
            }}
            type="number"
            className="no-arrows-number-input font-tramelle text-[13px] tabular-nums text-primary placeholder:text-[#B5B0A8]"
          />
          <input type="submit" className="hidden" />
        </form>
        <form method="POST" onSubmit={updateMaxPriceHandler}>
          <Input
            placeholder={tListing("priceMaxPlaceholder")}
            onChange={(e) => setMax(e.target.value)}
            onBlur={(e) => {
              setTimeout(() => {
                updateMaxPriceHandler(e)
              }, 500)
            }}
            value={max}
            type="number"
            className="no-arrows-number-input font-tramelle text-[13px] tabular-nums text-primary placeholder:text-[#B5B0A8]"
          />
          <input type="submit" className="hidden" />
        </form>
      </div>
    </Accordion>
  )
}
