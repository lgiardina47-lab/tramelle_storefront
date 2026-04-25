import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { startTransition, useEffect, useReducer, useRef } from "react"
import useUpdateSearchParams from "./useUpdateSearchParams"

/**
 * Pending URL per chiave filtro, condiviso tra tutte le istanze `useFilters(key)` (es. sidebar
 * e chip “filtri attivi”). Due `useRef` separati non vedevano lo stesso stato ottimistico.
 * Pulizia su cambio `pathname` in useFilters.
 */
const globalPendingFilterByKey = new Map<string, string>()

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
  /** La Map pending non è reattiva: senza bump il checkbox aspetta `router.replace` / nuovo `useSearchParams`. */
  const [, bump] = useReducer((n: number) => n + 1, 0)

  useEffect(() => {
    if (pathnameRef.current !== pathname) {
      pathnameRef.current = pathname
      /** Nuova pagina: nessun pending deve sopravvivere (anche chiavi senza hook montato). */
      globalPendingFilterByKey.clear()
    }
  }, [pathname])

  /**
   * Finché `router.replace` non ha aggiornato l’URL, `useSearchParams` può restare indietro.
   * **Non** azzerare il pending a ogni render con `params === ""`: il parent si ri-renderizza spesso
   * (es. nuovi facet) prima che l’URL cambi → il secondo click partiva da lista vuota.
   * Azzera solo quando l’URL ha “raggiunto” lo stesso insieme di valori del pending.
   */
  const params = searchParams.get(key) ?? ""
  useEffect(() => {
    const pend = globalPendingFilterByKey.get(key)
    if (pend === undefined) return
    if (filterSignature(params) === filterSignature(pend)) {
      globalPendingFilterByKey.delete(key)
    }
  }, [key, params])

  const filters = parseFilterValues(params)

  const updateFilters = (value: string) => {
    const v = value.trim()
    if (!v) return

    const pend = globalPendingFilterByKey.get(key)
    const base =
      pend !== undefined && filterSignature(params) !== filterSignature(pend)
        ? pend
        : params
    const current = parseFilterValues(base)
    const has = current.some((el) => el === v)
    const next = has
      ? current.filter((el) => el !== v)
      : [...current, v]
    const nextStr = next.join(",")

    if (nextStr.length) globalPendingFilterByKey.set(key, nextStr)
    else globalPendingFilterByKey.delete(key)
    bump()
    startTransition(() => {
      updateSearchParams(key, nextStr.length ? nextStr : null)
    })
  }

  const isFilterActive = (value: string) => {
    const fromUrl = parseFilterValues(searchParams.get(key) ?? "")
    if (fromUrl.some((el) => el === value)) return true
    const pend = globalPendingFilterByKey.get(key)
    if (pend !== undefined) {
      return parseFilterValues(pend).some((el) => el === value)
    }
    return false
  }

  const clearAllFilters = () => {
    globalPendingFilterByKey.delete(key)
    bump()
    startTransition(() => {
      router.push(window.location.pathname, {
        scroll: false,
      })
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
