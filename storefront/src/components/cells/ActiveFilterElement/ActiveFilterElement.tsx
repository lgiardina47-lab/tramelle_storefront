"use client"
import { Chip } from "@/components/atoms"
import useFilters from "@/hooks/useFilters"
import { formatLocationFilterLabel } from "@/lib/helpers/format-location-filter-label"
import { CloseIcon } from "@/icons"
import { useLocale, useTranslations } from "next-intl"
import { useMemo } from "react"

const filtersLabels: Record<string, string> = {
  category: "Category",
  brand: "Brand",
  min_price: "Min Price",
  max_price: "Max Price",
  color: "Color",
  size: "Size",
  query: "Search",
  condition: "Condition",
  rating: "Rating",
  categories_name: "Category",
  seller_handle: "Seller",
  type_value: "Product type",
  tags_value: "Tags",
}

export const ActiveFilterElement = ({ filter }: { filter: string[] }) => {
  const { updateFilters } = useFilters(filter[0])
  const locale = useLocale()
  const tListing = useTranslations("ListingFilters")
  const regionNames = useMemo(
    () => new Intl.DisplayNames([locale, "en"], { type: "region" }),
    [locale]
  )

  const activeFilters = filter[1].split(",")

  const removeFilterHandler = (filter: string) => {
    updateFilters(filter)
  }

  const heading =
    filter[0] === "provenance_country"
      ? tListing("provenanceCountry")
      : filter[0] === "provenance_region"
        ? tListing("provenanceRegion")
        : (filtersLabels[filter[0]] ?? filter[0])

  const chipLabel = (raw: string) => {
    if (filter[0] === "provenance_country") {
      const code = raw.trim().toUpperCase()
      return regionNames.of(code) ?? raw
    }
    if (filter[0] === "provenance_region") {
      return formatLocationFilterLabel(raw)
    }
    return raw
  }

  return (
    <div className="mb-4 flex flex-wrap items-center gap-2">
      <span className="tramelle-filter-muted hidden md:inline-block">
        {heading}:
      </span>
      {activeFilters.map((element) => {
        const Element = () => {
          return (
            <span className="flex cursor-default items-center gap-2 whitespace-nowrap font-tramelle text-[13px] leading-[1.7] text-primary">
              {chipLabel(element)}{" "}
              <span onClick={() => removeFilterHandler(element)}>
                <CloseIcon size={16} className="cursor-pointer text-secondary" />
              </span>
            </span>
          )
        }
        return <Chip key={element} value={<Element />} />
      })}
    </div>
  )
}
