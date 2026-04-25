import { LISTING_FACET_PARAM_TO_INDEX } from "@/lib/helpers/search-listing-facets"

/**
 * Valori facet “pending” prima che `router.replace` aggiorni l’URL.
 * Il listing (POST catalog) si iscrive con `useSyncExternalStore` e merge nella query
 * così il fetch non aspetta il tick successivo di `useSearchParams`.
 */
const pendingByKey = new Map<string, string>()
let version = 0
const listeners = new Set<() => void>()

export function subscribeListingFacetPending(cb: () => void) {
  listeners.add(cb)
  return () => listeners.delete(cb)
}

export function getListingFacetPendingVersion() {
  return version
}

function notify() {
  version++
  listeners.forEach((l) => l())
}

export function setListingFacetPendingParam(
  key: string,
  valueCommaJoined: string | null
) {
  if (valueCommaJoined != null && valueCommaJoined.trim().length > 0) {
    pendingByKey.set(key, valueCommaJoined)
  } else {
    pendingByKey.delete(key)
  }
  notify()
}

export function removeListingFacetPendingParam(key: string) {
  if (!pendingByKey.has(key)) return
  pendingByKey.delete(key)
  notify()
}

export function clearAllListingFacetPendingParams() {
  if (pendingByKey.size === 0) return
  pendingByKey.clear()
  notify()
}

export function getListingFacetPendingParam(key: string): string | undefined {
  return pendingByKey.get(key)
}

/** Applica i pending solo per chiavi facet listing note (URL param → Meilisearch). */
export function mergePendingListingFacetsIntoSearchString(
  searchLineNoQuestionMark: string
): string {
  const p = new URLSearchParams(searchLineNoQuestionMark)
  for (const param of Object.keys(LISTING_FACET_PARAM_TO_INDEX)) {
    if (!pendingByKey.has(param)) continue
    const v = pendingByKey.get(param)
    if (v != null && String(v).trim().length > 0) {
      p.set(param, v)
    } else {
      p.delete(param)
    }
  }
  return p.toString()
}
