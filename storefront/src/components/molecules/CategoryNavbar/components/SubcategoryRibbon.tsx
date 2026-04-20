"use client"

import { HttpTypes } from "@medusajs/types"
import LocalizedClientLink from "@/components/molecules/LocalizedLink/LocalizedLink"
import { cn } from "@/lib/utils"
import {
  categoryHandleMatchesUrlSegment,
  categoryPublicHref,
} from "@/lib/helpers/category-public-url"

type SubcategoryRibbonProps = {
  parentLabel: string
  parentHandle: string
  subcategories: HttpTypes.StoreProductCategory[]
  activeChildHandle: string | null
  onNavigate?: () => void
  /** Pagina macro: pill e label centrati. */
  align?: "start" | "center"
  /**
   * Sostituisce «In {parentLabel}» (meno ripetizione del nome in pagina, SEO/UX).
   * Se valorizzato insieme a `overviewLinkLabel`, niente nome macro nella riga introduttiva.
   */
  ribbonSubheading?: string
  /** Sostituisce «Tutta la categoria» (es. stringa i18n). */
  overviewLinkLabel?: string
}

/**
 * Always-visible second row: subcategories as wrapping pills (no hover required).
 */
export function SubcategoryRibbon({
  parentLabel,
  parentHandle,
  subcategories,
  activeChildHandle,
  onNavigate,
  align = "start",
  ribbonSubheading,
  overviewLinkLabel,
}: SubcategoryRibbonProps) {
  if (!subcategories.length) return null

  const centered = align === "center"
  const introLine = ribbonSubheading ?? `In ${parentLabel}`
  const overviewLabel = overviewLinkLabel ?? "Tutta la categoria"

  return (
    <div
      className="w-full border-t border-secondary/15 bg-secondary/5 px-1 py-2 md:px-2"
      data-testid="subcategory-ribbon"
    >
      <div
        className={cn(
          "mb-1.5 flex flex-wrap items-baseline gap-x-2 gap-y-0.5 px-1",
          centered && "justify-center text-center"
        )}
      >
        <span className="text-[10px] font-semibold uppercase tracking-wider text-secondary">
          {introLine}
        </span>
        <LocalizedClientLink
          href={categoryPublicHref(parentHandle)}
          onClick={onNavigate}
          className="text-[10px] font-medium uppercase tracking-wide text-primary underline-offset-2 hover:underline"
        >
          {overviewLabel}
        </LocalizedClientLink>
      </div>
      <div
        className={cn(
          "flex flex-wrap gap-1.5 gap-y-2 px-0.5 pb-0.5",
          centered && "justify-center"
        )}
      >
        {subcategories.map((child) => {
          const isActive =
            activeChildHandle != null &&
            categoryHandleMatchesUrlSegment(child.handle, activeChildHandle)
          return (
            <LocalizedClientLink
              key={child.id}
              href={categoryPublicHref(child.handle)}
              onClick={onNavigate}
              title={child.name}
              className={cn(
                "inline-flex max-w-full items-center rounded-full border px-2.5 py-1 text-[11px] font-medium leading-tight transition-colors sm:text-xs",
                "border-secondary/25 bg-primary text-primary hover:border-primary/50 hover:bg-secondary/10",
                "normal-case tracking-normal",
                isActive && "border-primary bg-secondary/15 ring-1 ring-primary/20"
              )}
            >
              <span className="line-clamp-2 break-words text-left">{child.name}</span>
            </LocalizedClientLink>
          )
        })}
      </div>
    </div>
  )
}
