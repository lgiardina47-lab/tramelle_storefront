"use client"

import { Button, Chip, Input } from "@/components/atoms"
import { Accordion, FilterCheckboxOption, Modal } from "@/components/molecules"
import useFilters from "@/hooks/useFilters"
import useUpdateSearchParams from "@/hooks/useUpdateSearchParams"
import {
  ALGOLIA_LISTING_FACET_ATTRIBUTES,
  ALGOLIA_TO_LISTING_FACET_PARAM,
  facetHeadingForAlgoliaAttribute,
} from "@/lib/helpers/algolia-facets"
import { cn } from "@/lib/utils"
import { useSearchParams } from "next/navigation"
import React, { useEffect, useMemo, useState } from "react"
import { ProductListingActiveFilters } from "../ProductListingActiveFilters/ProductListingActiveFilters"
import useGetAllSearchParams from "@/hooks/useGetAllSearchParams"
import { HIDE_LISTING_FILTERS } from "@/const"

/** Algolia facet response: attribute → facet value → hit count */
export type ListingFacetBuckets = Record<string, number>

export const AlgoliaProductSidebar = ({
  facets,
}: {
  facets: Record<string, ListingFacetBuckets | undefined>
}) => {
  const [isMobile, setIsMobile] = useState(false)
  const [isOpen, setIsOpen] = useState(false)

  const { allSearchParams } = useGetAllSearchParams()

  const sections = useMemo(
    () =>
      ALGOLIA_LISTING_FACET_ATTRIBUTES.map((attr) => {
        const param = ALGOLIA_TO_LISTING_FACET_PARAM[attr]
        if (!param) return null
        const buckets = facets[attr]
        if (!buckets || typeof buckets !== "object") return null
        const entries = Object.entries(buckets)
        if (!entries.length) return null
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
            heading={facetHeadingForAlgoliaAttribute(attr)}
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
      <Button onClick={() => setIsOpen(true)} className="w-full uppercase mb-4">
        Filters
      </Button>
      {isOpen && (
        <Modal heading="Filters" onClose={() => setIsOpen(false)}>
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
      <ul className="px-4">
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
      heading={facetHeadingForAlgoliaAttribute("variants.color")}
      defaultOpen={defaultOpen}
    >
      <ul className="px-4">
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
                "w-5 h-5 border border-primary rounded-xs",
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
      heading={facetHeadingForAlgoliaAttribute("variants.size")}
      defaultOpen={defaultOpen}
    >
      <ul className="grid grid-cols-4 mt-2 gap-2">
        {entries.map(([label]) => (
          <li key={label} className="mb-4">
            <Chip
              selected={isFilterActive(label)}
              onSelect={() => selectSizeHandler(label)}
              value={label}
              className="w-full !justify-center !py-2 !font-normal"
            />
          </li>
        ))}
      </ul>
    </Accordion>
  )
}

function PriceFilter({ defaultOpen = true }: { defaultOpen?: boolean }) {
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
    <Accordion heading="Price" defaultOpen={defaultOpen}>
      <div className="flex gap-2 mb-4">
        <form method="POST" onSubmit={updateMinPriceHandler}>
          <Input
            placeholder="Min"
            onChange={(e) => setMin(e.target.value)}
            value={min}
            onBlur={(e) => {
              setTimeout(() => {
                updateMinPriceHandler(e)
              }, 500)
            }}
            type="number"
            className="no-arrows-number-input"
          />
          <input type="submit" className="hidden" />
        </form>
        <form method="POST" onSubmit={updateMaxPriceHandler}>
          <Input
            placeholder="Max"
            onChange={(e) => setMax(e.target.value)}
            onBlur={(e) => {
              setTimeout(() => {
                updateMaxPriceHandler(e)
              }, 500)
            }}
            value={max}
            type="number"
            className="no-arrows-number-input"
          />
          <input type="submit" className="hidden" />
        </form>
      </div>
    </Accordion>
  )
}
