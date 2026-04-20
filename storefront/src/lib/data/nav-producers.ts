"use server"

import { unstable_cache } from "next/cache"
import { HttpTypes } from "@medusajs/types"

import { SellerProps, type StoreSellerListItem } from "@/types/seller"

import { sellerDirectoryHeroImageCandidates } from "@/lib/helpers/seller-media-url"

import { listProducts } from "./products"
import { listStoreSellersForParentCategory } from "./seller"

export type NavProducer = {
  name: string
  handle: string
  photo?: string
  region?: string
}

/** ID figli diretti del parent (max N). */
function directChildCategoryIds(
  parent: HttpTypes.StoreProductCategory,
  max = 12
): string[] {
  const children = parent.category_children || []
  return children.map((c) => c.id).filter(Boolean).slice(0, max)
}

/** Tutte le categorie discendenti (albero da lista piatta). */
function descendantCategoryIdsFromFlat(
  rootId: string,
  flat: HttpTypes.StoreProductCategory[]
): string[] {
  const ids: string[] = []
  for (const c of flat) {
    if (c.parent_category_id === rootId) {
      ids.push(c.id)
      ids.push(...descendantCategoryIdsFromFlat(c.id, flat))
    }
  }
  return ids
}

/** Città · provincia · codice paese (2 lettere maiuscole, es. IT). */
function sellerRegionLine(
  s: SellerProps | StoreSellerListItem
): string | undefined {
  const city =
    typeof s.city === "string" && s.city.trim() ? s.city.trim() : ""
  const province =
    typeof s.state === "string" && s.state.trim() ? s.state.trim() : ""
  const ccRaw =
    typeof s.country_code === "string" && s.country_code.trim()
      ? s.country_code.trim()
      : ""
  const cc = ccRaw.length === 2 ? ccRaw.toUpperCase() : ccRaw

  const parts = [city, province, cc].filter(Boolean)
  return parts.length ? parts.join(" · ") : undefined
}

/** Immagine mega-menu: cover/hero (come directory), non logo. */
function sellerNavCoverPhoto(
  s: SellerProps | StoreSellerListItem
): string | undefined {
  const candidates = sellerDirectoryHeroImageCandidates({
    metadata: s.metadata ?? null,
    photo: typeof s.photo === "string" ? s.photo : "",
    handle: s.handle,
    name: s.name,
  })
  const first = candidates[0]
  return typeof first === "string" && first.length > 0 ? first : undefined
}

function navProducerFromDedicated(s: StoreSellerListItem): NavProducer | null {
  if (!s.handle?.trim() || !s.name?.trim()) return null
  if (s.store_status === "SUSPENDED") return null
  return {
    handle: s.handle,
    name: s.name,
    photo: sellerNavCoverPhoto(s),
    region: sellerRegionLine(s),
  }
}

const MAX_NAV_PRODUCERS = 6

function categoryIdsForProducerLookup(
  parent: HttpTypes.StoreProductCategory,
  allFlat: HttpTypes.StoreProductCategory[] | undefined
): string[] {
  if (allFlat?.length) {
    const fromFlat = descendantCategoryIdsFromFlat(parent.id, allFlat)
    if (fromFlat.length > 0) {
      return fromFlat.slice(0, 28)
    }
  }
  return directChildCategoryIds(parent, 16)
}

/**
 * Produttori per mega-menu: prima seller **dedicati** alla macro (`taste_category_handles`
 * contiene l’handle del parent `tramelle-*`), poi integrazione da catalogo (prodotti
 * nelle sottocategorie).
 */
async function getProducersByParentIdUncached(
  parentCategories: HttpTypes.StoreProductCategory[],
  countryCode: string,
  allCategoriesFlat?: HttpTypes.StoreProductCategory[]
): Promise<Record<string, NavProducer[]>> {
  const result: Record<string, NavProducer[]> = {}

  await Promise.all(
    parentCategories.map(async (parent) => {
      const byHandle = new Map<string, NavProducer>()

      const dedicated = await listStoreSellersForParentCategory({
        parentCategoryHandle: parent.handle,
        limit: MAX_NAV_PRODUCERS,
      })
      for (const row of dedicated?.sellers ?? []) {
        if (byHandle.size >= MAX_NAV_PRODUCERS) break
        const np = navProducerFromDedicated(row)
        if (np && !byHandle.has(np.handle)) {
          byHandle.set(np.handle, np)
        }
      }

      const catIds = categoryIdsForProducerLookup(parent, allCategoriesFlat)

      for (const catId of catIds) {
        if (byHandle.size >= MAX_NAV_PRODUCERS) break
        try {
          const { response } = await listProducts({
            countryCode,
            category_id: catId,
            pageParam: 1,
            queryParams: { limit: 36 },
          })
          for (const p of response.products) {
            const s = p.seller as SellerProps | undefined
            if (s?.handle && s.name && s.store_status !== "SUSPENDED") {
              if (!byHandle.has(s.handle)) {
                byHandle.set(s.handle, {
                  handle: s.handle,
                  name: s.name,
                  photo: sellerNavCoverPhoto(s),
                  region: sellerRegionLine(s),
                })
              }
            }
          }
        } catch {
          /* ignora categorie senza prodotti / errori rete */
        }
      }
      result[parent.id] = Array.from(byHandle.values())
    })
  )

  return result
}

/** Cache server 15 min: molte chiamate `listProducts` per macro-categoria; TTFB molto più basso dopo il primo hit / warm. */
export async function getProducersByParentId(
  parentCategories: HttpTypes.StoreProductCategory[],
  countryCode: string,
  allCategoriesFlat?: HttpTypes.StoreProductCategory[]
): Promise<Record<string, NavProducer[]>> {
  if (!parentCategories.length) return {}
  const idKey = parentCategories
    .map((p) => p.id)
    .sort()
    .join(",")
  return unstable_cache(
    () =>
      getProducersByParentIdUncached(
        parentCategories,
        countryCode,
        allCategoriesFlat
      ),
    ["tramelle-header-producers", countryCode.toLowerCase(), idKey],
    { revalidate: 900 }
  )()
}
