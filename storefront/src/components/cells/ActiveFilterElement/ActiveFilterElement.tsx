"use client"
import { Chip } from "@/components/atoms"
import useFilters from "@/hooks/useFilters"
import { CloseIcon } from "@/icons"

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

  const activeFilters = filter[1].split(",")

  const removeFilterHandler = (filter: string) => {
    updateFilters(filter)
  }

  return (
    <div className="flex gap-2 items-center mb-4">
      <span className="label-md hidden md:inline-block">
        {filtersLabels[filter[0]] ?? filter[0]}:
      </span>
      {activeFilters.map((element) => {
        const Element = () => {
          return (
            <span className="flex gap-2 items-center cursor-default whitespace-nowrap">
              {element}{" "}
              <span onClick={() => removeFilterHandler(element)}>
                <CloseIcon size={16} className="cursor-pointer" />
              </span>
            </span>
          )
        }
        return <Chip key={element} value={<Element />} />
      })}
    </div>
  )
}
