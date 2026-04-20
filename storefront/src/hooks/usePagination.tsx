"use client"

import { useCallback } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"

/**
 * Paginazione via `?page=`: costruisce href per `<Link prefetch>` (più fluido del solo
 * `router.replace`) e offre ancora `setPage` per casi legacy (senza Link).
 */
export const usePagination = () => {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const raw = parseInt(searchParams.get("page") || "1", 10)
  const currentPage = Number.isFinite(raw) && raw >= 1 ? raw : 1

  const hrefForPage = useCallback(
    (pageIndex: number) => {
      const next = new URLSearchParams(searchParams.toString())
      if (pageIndex <= 1) {
        next.delete("page")
      } else {
        next.set("page", String(pageIndex))
      }
      const qs = next.toString()
      return qs ? `${pathname}?${qs}` : pathname
    },
    [pathname, searchParams]
  )

  const setPage = useCallback(
    (page: string) => {
      const next = new URLSearchParams(searchParams.toString())
      if (!page || page === "1") {
        next.delete("page")
      } else {
        next.set("page", page)
      }
      const qs = next.toString()
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false })
    },
    [pathname, router, searchParams]
  )

  return { currentPage, setPage, hrefForPage }
}
