import { Checkbox } from "@/components/atoms"
import { cn } from "@/lib/utils"

export const FilterCheckboxOption = ({
  label,
  /** Valore query string / Meilisearch (es. ISO2); se assente si usa `label`. */
  filterValue,
  amount,
  checked = false,
  onCheck = () => null,
  disabled = false,
  ...props
}: {
  label: string
  filterValue?: string
  amount?: number
  checked?: boolean
  onCheck?: (option: string) => void
  disabled?: boolean
  "data-testid"?: string
}) => {
  const value = filterValue ?? label
  return (
    <label
      className={cn(
        "flex cursor-pointer items-center gap-3",
        disabled && "!cursor-default"
      )}
      onClick={() => (disabled ? null : onCheck(value))}
      {...props}
    >
      <Checkbox checked={checked} disabled={disabled} />
      <p
        className={cn(
          "tramelle-filter-body",
          checked && "font-medium",
          disabled && "text-disabled"
        )}
      >
        {label}{" "}
        {amount != null && amount > 0 ? (
          <span className="tramelle-filter-muted">({amount})</span>
        ) : null}
      </p>
    </label>
  )
}
