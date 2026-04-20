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
import { useSearchParams } from "next/navigation"
import React, { useEffect, useMemo, useState } from "react"
import { ProductListingActiveFilters } from "../ProductListingActiveFilters/ProductListingActiveFilters"
import useGetAllSearchParams from "@/hooks/useGetAllSearchParams"
import { HIDE_LISTING_FILTERS } from "@/const"

/** Risposta facet Meilisearch: attributo → valore → conteggio */
export type ListingFacetBuckets = Record<string, number>

export const CatalogSearchProductSidebar = ({
  facets,
}: {
  facets: Record<string, ListingFacetBuckets | undefined>
}) => {
  const [isMobile, setIsMobile] = useState(false)
  const [isOpen, setIsOpen] = useState(false)
  const tListing = useTranslations("ListingFilters")

  const { allSearchParams } = useGetAllSearchParams()

  const sections = useMemo(
    () =>
      LISTING_SEARCH_FACET_ATTRIBUTES.map((attr) => {
        const param = INDEX_TO_LISTING_FACET_PARAM[attr]
        if (!param) return null
        const isProvenance =
          attr === "provenance_country" || attr === "provenance_region"
        const buckets = facets[attr]
        if (
          !isProvenance &&
          (!buckets || typeof buckets !== "object" || Array.isArray(buckets))
        ) {
          return null
        }
        const entries =
          buckets && typeof buckets === "object" && !Array.isArray(buckets)
            ? Object.entries(buckets as Record<string, number>).filter(
                ([label, count]) =>
                  String(label).trim().length > 0 && typeof count === "number"
              )
            : []
        if (!isProvenance && !entries.length) return null
        return { attr, param, entries }
      }).filter(Boolean) as {
        attr: string
        param: string
        entries: [string, number][]
      }[],
    [facets]
  )

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
        const defaultOpen = Boolean(allSearchParams[param])
        if (attr === "provenance_country") {
          return (
            <ProvenanceCountryFilter
              key={attr}
              param={param}
              entries={entries}
              defaultOpen={defaultOpen}
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
              defaultOpen={defaultOpen}
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
              defaultOpen={defaultOpen}
            />
          )
        }
        if (attr === "variants.color") {
          return (
            <ColorFilter
              key={attr}
              param={param}
              entries={entries}
              defaultOpen={defaultOpen}
            />
          )
        }
        return (
          <GenericCheckboxFacet
            key={attr}
            heading={facetHeadingForListingAttribute(attr)}
            param={param}
            entries={entries}
            defaultOpen={defaultOpen}
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
            <PriceFilter
              defaultOpen={Boolean(
                allSearchParams.min_price || allSearchParams.max_price
              )}
            />
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
  defaultOpen = true,
  param,
  entries,
  heading,
  emptyHint,
}: {
  defaultOpen?: boolean
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
    <Accordion heading={heading} defaultOpen={defaultOpen}>
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
                  disabled={Boolean(!count)}
                  onCheck={selectHandler}
                  label={label}
                  filterValue={iso}
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
  defaultOpen = true,
  param,
  entries,
  heading,
  emptyHint,
}: {
  defaultOpen?: boolean
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
    <Accordion heading={heading} defaultOpen={defaultOpen}>
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
                  disabled={Boolean(!count)}
                  onCheck={selectHandler}
                  label={label}
                  filterValue={raw}
                />
              </li>
            )
          })}
        </ul>
      )}
    </Accordion>
  )
}

function GenericCheckboxFacet({
  heading,
  param,
  entries,
  defaultOpen = true,
}: {
  heading: string
  param: string
  entries: [string, number][]
  defaultOpen?: boolean
}) {
  const { updateFilters, isFilterActive } = useFilters(param)
  const selectHandler = (option: string) => {
    updateFilters(option)
  }
  return (
    <Accordion heading={heading} defaultOpen={defaultOpen}>
      <ul className="px-3">
        {entries.map(([label, count]) => (
          <li key={label} className="mb-4">
            <FilterCheckboxOption
              checked={isFilterActive(label)}
              disabled={Boolean(!count)}
              onCheck={selectHandler}
              label={label}
            />
          </li>
        ))}
      </ul>
    </Accordion>
  )
}

function ColorFilter({
  defaultOpen = true,
  param,
  entries,
}: {
  defaultOpen?: boolean
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
      defaultOpen={defaultOpen}
    >
      <ul className="px-3">
        {entries.map(([label, count]) => (
          <li key={label} className="mb-4 flex items-center justify-between">
            <FilterCheckboxOption
              checked={isFilterActive(label)}
              disabled={Boolean(!count)}
              onCheck={selectHandler}
              label={label}
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
  defaultOpen = true,
  param,
  entries,
}: {
  defaultOpen?: boolean
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
      defaultOpen={defaultOpen}
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

function PriceFilter({ defaultOpen = true }: { defaultOpen?: boolean }) {
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
    <Accordion heading={tListing("priceSection")} defaultOpen={defaultOpen}>
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
