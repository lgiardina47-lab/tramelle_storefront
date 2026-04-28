"use client"

import { PRODUCT_LIMIT } from "@/const"
import { cn } from "@/lib/utils"

function ProductListingCardSkeleton() {
  return (
    <div
      className={cn(
        "flex h-full min-w-0 max-w-full flex-col overflow-hidden",
        "rounded-[18px] border border-[#E8E4DE] bg-white"
      )}
      aria-hidden
    >
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-[#F7F6F3]">
        <div className="absolute inset-3 animate-pulse rounded-sm bg-[#E8E4DE]/55" />
      </div>
      <div className="space-y-2.5 px-[13px] pb-2 pt-[11px]">
        <div className="h-3.5 w-[72%] animate-pulse rounded-sm bg-[#E8E4DE]/70" />
        <div className="h-4 w-2/5 animate-pulse rounded-sm bg-[#E8E4DE]/60" />
        <div className="h-3 w-1/3 animate-pulse rounded-sm bg-[#E8E4DE]/50" />
      </div>
    </div>
  )
}

type Props = {
  /** Default: stesso `PRODUCT_LIMIT` del catalogo. */
  count?: number
  className?: string
}

/**
 * Griglia allineata a `ProductListingProductsView` (2 col / 5 col md) con card segnaposto.
 */
export function ProductListingGridSkeleton({
  count = PRODUCT_LIMIT,
  className,
}: Props) {
  return (
    <ul
      className={cn("grid w-full grid-cols-2 gap-3 md:grid-cols-5", className)}
      aria-busy="true"
      aria-label="Caricamento prodotti"
    >
      {Array.from({ length: count }).map((_, i) => (
        <li key={i} className="min-w-0">
          <ProductListingCardSkeleton />
        </li>
      ))}
    </ul>
  )
}
