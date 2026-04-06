"use client"

import { HttpTypes } from "@medusajs/types"

import { Chip } from "@/components/atoms"
import useUpdateSearchParams from "@/hooks/useUpdateSearchParams"
import { normalizeQueryOptionValue } from "@/lib/helpers/normalize-query-option-value"

export const ProductVariants = ({
  product,
  selectedVariant,
}: {
  product: HttpTypes.StoreProduct
  selectedVariant: Record<string, string>
}) => {
  const updateSearchParams = useUpdateSearchParams()

  // update the options when a variant is selected
  const setOptionValue = (optionId: string, value: string) => {
    if (value) updateSearchParams(optionId, value)
  }

  const options = (product.options || []).filter((opt) => {
    const vals = opt.values || []
    if (
      vals.length === 1 &&
      vals[0]?.value === "Default option value"
    ) {
      return false
    }
    return true
  })

  return (
    <div className="my-4 space-y-2" data-testid="product-variants">
      {options.map(
        ({ id, title, values }: HttpTypes.StoreProductOption) => (
          <div key={id} data-testid={`product-variant-${title.toLowerCase()}`}>
            <span className="label-md text-secondary">{title}: </span>
            <span className="label-md text-primary" data-testid={`product-variant-selected-${title.toLowerCase()}`}>
              {normalizeQueryOptionValue(
                selectedVariant[title.toLowerCase()]
              ) || "—"}
            </span>
            <div className="flex gap-2 mt-2" data-testid={`product-variant-options-${title.toLowerCase()}`}>
              {(values || []).map(
                ({
                  id,
                  value,
                }: Partial<HttpTypes.StoreProductOptionValue>) => (
                  <Chip
                    key={id}
                    selected={
                      normalizeQueryOptionValue(
                        selectedVariant[title.toLowerCase()]
                      ) === value
                    }
                    color={title === "Color"}
                    value={value}
                    onSelect={() =>
                      setOptionValue(title.toLowerCase(), value || "")
                    }
                    data-testid={`product-variant-chip-${title.toLowerCase()}-${value?.toLowerCase().replace(/\s+/g, '-')}`}
                  />
                )
              )}
            </div>
          </div>
        )
      )}
    </div>
  )
}
