import { Checkbox } from "@medusajs/ui"
import type { ControllerRenderProps } from "react-hook-form"

import type { ProductAttributePossibleValue } from "../../../../types/products"

/** Valore salvato come etichette unite da virgola (come in admin / API). */
function parseStored(value: unknown): string[] {
  if (value == null || value === "") {
    return []
  }
  if (Array.isArray(value)) {
    return value.map(String).filter(Boolean)
  }
  return String(value)
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
}

export const AttributeMultivalue = ({
  values,
  field,
}: {
  values: ProductAttributePossibleValue[]
  field: ControllerRenderProps<any, string>
}) => {
  const selected = parseStored(field.value)

  const toggle = (label: string, checked: boolean) => {
    const set = new Set(selected)
    if (checked) {
      set.add(label)
    } else {
      set.delete(label)
    }
    const next = [...set].join(", ")
    field.onChange(next)
  }

  if (!values?.length) {
    return null
  }

  return (
    <div className="flex flex-col gap-y-2">
      {values.map(({ id, attribute_id, value }) => (
        <label
          key={`multivalue-${attribute_id}-${id}`}
          className="flex cursor-pointer items-center gap-x-2"
        >
          <Checkbox
            checked={selected.includes(value)}
            onCheckedChange={(state) => toggle(value, state === true)}
          />
          <span className="text-sm">{value}</span>
        </label>
      ))}
    </div>
  )
}
