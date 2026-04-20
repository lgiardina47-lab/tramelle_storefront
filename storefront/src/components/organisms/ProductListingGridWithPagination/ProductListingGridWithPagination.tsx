"use client"

import type { ReactNode } from "react"

import { Pagination } from "@/components/cells"
import { usePagination } from "@/hooks/usePagination"

/**
 * Griglia + paginazione: `<Link prefetch>` sui controlli per caricare il payload RSC
 * in anticipo e navigazione più fluida rispetto a `router.replace` + button.
 */
export function ProductListingGridWithPagination({
  pages,
  children,
}: {
  pages: number
  children: ReactNode
}) {
  const { currentPage, hrefForPage } = usePagination()

  const safeCurrent =
    Number.isFinite(currentPage) && currentPage >= 1 ? currentPage : 1

  return (
    <>
      {children}
      <div className="mt-6 flex justify-center">
        <Pagination
          pages={pages}
          currentPage={safeCurrent}
          hrefForPage={hrefForPage}
        />
      </div>
    </>
  )
}
