"use client"

import { HttpTypes } from "@medusajs/types"

import { Chip } from "@/components/atoms"
import useUpdateSearchParams from "@/hooks/useUpdateSearchParams"
import { normalizeQueryOptionValue } from "@/lib/helpers/normalize-query-option-value"
import { isVariantVisibleB2c } from "@/lib/helpers/tramelle-variant-metadata"

function optionValueVisibleB2c(
  product: HttpTypes.StoreProduct,
  optionTitle: string,
  value: string | null | undefined,
  restrict: boolean
): boolean {
  if (!restrict || value == null || value === "") return true
  const key = optionTitle.toLowerCase()
  const want = normalizeQueryOptionValue(value)
  for (const v of product.variants || []) {
    if (!isVariantVisibleB2c(v.metadata as Record<string, unknown> | undefined)) {
      continue
    }
    const opts = v.options as
      | Array<{ value?: string | null; option?: { title?: string | null } | null }>
      | undefined
    const row = opts?.find((o) => (o.option?.title || "").toLowerCase() === key)
    if (normalizeQueryOptionValue(row?.value) === want) {
      return true
    }
  }
  return false
}

export const ProductVariants = ({
  product,
  selectedVariant,
  restrictToB2cVisible = false,
}: {
  product: HttpTypes.StoreProduct
  selectedVariant: Record<string, string>
  restrictToB2cVisible?: boolean
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
              {(values || [])
                .filter((ov) =>
                  optionValueVisibleB2c(
                    product,
                    title,
                    ov.value,
                    restrictToB2cVisible
                  )
                )
                .map(
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
