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
  const activate = () => {
    if (!disabled) onCheck(value)
  }
  return (
    <div
      role="button"
      tabIndex={disabled ? -1 : 0}
      className={cn(
        "flex cursor-pointer items-center gap-3",
        disabled && "!cursor-default"
      )}
      onClick={activate}
      onKeyDown={(e) => {
        if (disabled) return
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault()
          activate()
        }
      }}
      {...props}
    >
      {/* Checkbox è già un <label>: non annidare in un altro label (doppio click = toggle annullato). */}
      <span className="pointer-events-none shrink-0">
        <Checkbox checked={checked} disabled={disabled} readOnly />
      </span>
      <p
        className={cn(
          "tramelle-filter-body",
          checked && "font-medium",
          disabled && "text-disabled"
        )}
      >
        {label}{" "}
        {typeof amount === "number" ? (
          <span className="tramelle-filter-muted">({amount})</span>
        ) : null}
      </p>
    </div>
  )
}
