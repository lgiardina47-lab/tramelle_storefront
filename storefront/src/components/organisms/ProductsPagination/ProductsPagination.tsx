"use client"

import { Pagination } from "@/components/cells"
import { usePagination } from "@/hooks/usePagination"

export const ProductsPagination = ({ pages }: { pages: number }) => {
  const { currentPage, hrefForPage } = usePagination()

  const safeCurrent =
    Number.isFinite(currentPage) && currentPage >= 1 ? currentPage : 1

  return (
    <div className="mt-6 flex justify-center">
      <Pagination
        pages={pages}
        currentPage={safeCurrent}
        hrefForPage={hrefForPage}
      />
    </div>
  )
}
