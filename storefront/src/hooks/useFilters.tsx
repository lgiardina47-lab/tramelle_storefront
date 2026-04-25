import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { useEffect, useReducer, useRef } from "react"
import {
  clearAllListingFacetPendingParams,
  getListingFacetPendingParam,
  removeListingFacetPendingParam,
  setListingFacetPendingParam,
} from "@/lib/helpers/listing-facet-pending-store"
import useUpdateSearchParams from "./useUpdateSearchParams"

function parseFilterValues(raw: string): string[] {
  return Array.from(
    new Set(
      raw
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
    )
  )
}

/** Stesso elenco, indice = valore in `current` (serve per togliere l’esatta stringa in URL, non il label cliccato). */
function findFilterValueIndex(current: string[], requested: string): number {
  const v = requested.trim()
  if (!v) return -1
  return current.findIndex((el) => {
    if (el === v) return true
    if (el.trim() === v) return true
    return el.localeCompare(v, undefined, { sensitivity: "accent" }) === 0
  })
}

/** Confronto stabile (ordine indipendente) tra URL e ref ottimistico. */
function filterSignature(raw: string): string {
  const parts = parseFilterValues(raw)
  parts.sort((a, b) =>
    a.localeCompare(b, undefined, { sensitivity: "base" })
  )
  return parts.join("\x1e")
}

const useFilters = (key: string) => {
  const updateSearchParams = useUpdateSearchParams()
  const searchParams = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()
  const pathnameRef = useRef(pathname)
  /** Re-render locale per checkbox (store globale notifica il listing, non questo hook). */
  const [, bump] = useReducer((n: number) => n + 1, 0)

  useEffect(() => {
    if (pathnameRef.current !== pathname) {
      pathnameRef.current = pathname
      clearAllListingFacetPendingParams()
    }
  }, [pathname])

  const params = searchParams.get(key) ?? ""
  useEffect(() => {
    const pend = getListingFacetPendingParam(key)
    if (pend === undefined) return
    if (filterSignature(params) === filterSignature(pend)) {
      removeListingFacetPendingParam(key)
    }
  }, [key, params])

  const filters = parseFilterValues(params)

  const updateFilters = (value: string) => {
    const v = value.trim()
    if (!v) return

    const pend = getListingFacetPendingParam(key)
    const base =
      pend !== undefined && filterSignature(params) !== filterSignature(pend)
        ? pend
        : params
    const current = parseFilterValues(base)
    const idx = findFilterValueIndex(current, v)
    const has = idx >= 0
    const next = has
      ? current.filter((_, i) => i !== idx)
      : [...current, v]
    const nextStr = next.join(",")

    setListingFacetPendingParam(key, nextStr.length ? nextStr : null)
    bump()
    updateSearchParams(key, nextStr.length ? nextStr : null)
  }

  const isFilterActive = (value: string) => {
    const v = value.trim()
    if (!v) return false
    const fromUrl = parseFilterValues(searchParams.get(key) ?? "")
    if (findFilterValueIndex(fromUrl, v) >= 0) return true
    const pend = getListingFacetPendingParam(key)
    if (pend !== undefined) {
      return findFilterValueIndex(parseFilterValues(pend), v) >= 0
    }
    return false
  }

  const clearAllFilters = () => {
    clearAllListingFacetPendingParams()
    bump()
    router.push(window.location.pathname, {
      scroll: false,
    })
  }

  return {
    updateFilters,
    filters,
    isFilterActive,
    clearAllFilters,
  }
}

export default useFilters
