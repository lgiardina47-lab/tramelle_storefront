import { cache } from "react"
import type { HttpTypes } from "@medusajs/types"

import { SellerProps } from "@/types/seller"
import { storefrontPdpProductFields } from "@/lib/helpers/product-list-fields"

import { sdk } from "../config"
import { getRegion } from "./regions"
import { fetchMedusaCatalogFallback, listProducts } from "./products"

export type PdpBundle = {
  product: HttpTypes.StoreProduct & { seller?: SellerProps }
  moreFromSeller: (HttpTypes.StoreProduct & { seller?: SellerProps })[]
}

/**
 * PDP “headless”: un solo GET verso il backend (`hit.pdp` + correlati Meilisearch).
 * Fallback: `null` se Meili non pronto o errore — usare {@link getCachedProductByHandle}.
 */
export const getCachedPdpBundle = cache(
  async (handle: string, locale: string): Promise<PdpBundle | null> => {
    const h = handle.trim()
    if (!h) return null

    const region = await getRegion(locale)
    const currency_code = (region?.currency_code || "eur").toLowerCase()

    try {
      const data = await sdk.client.fetch<{
        product: HttpTypes.StoreProduct & { seller?: SellerProps }
        more_from_seller: (HttpTypes.StoreProduct & { seller?: SellerProps })[]
      }>(`/store/tramelle/pdp-bundle`, {
        method: "GET",
        query: {
          handle: h,
          currency_code,
        },
        cache: "no-store",
      })

      return {
        product: data.product,
        moreFromSeller: (data.more_from_seller ??
          []) as (HttpTypes.StoreProduct & { seller?: SellerProps })[],
      }
    } catch {
      return null
    }
  }
)

/**
 * Deduplica in una sola RSC: `generateMetadata` + `page` nello stesso request.
 */
export const getCachedProductByHandle = cache(
  async (handle: string, locale: string) => {
    const { response } = await listProducts({
      countryCode: locale,
      queryParams: { handle: [handle], limit: 1 },
      productFields: storefrontPdpProductFields(),
    })
    return response.products[0] as
      | (HttpTypes.StoreProduct & { seller?: SellerProps })
      | undefined
  }
)

/**
 * Carosello “altri dal produttore” senza gonfiare il GET iniziale del prodotto.
 */
export const getPdpMoreFromSellerProducts = cache(
  async (countryCode: string, sellerId: string, excludeHandle: string) => {
    if (!sellerId?.trim()) return [] as (HttpTypes.StoreProduct & { seller?: SellerProps })[]
    try {
      const { products } = await fetchMedusaCatalogFallback({
        countryCode,
        seller_id: sellerId.trim(),
        limit: 24,
        offset: 0,
      })
      return (products ?? [])
        .filter(
          (p) => p?.handle && p.handle !== excludeHandle
        )
        .slice(0, 15) as (HttpTypes.StoreProduct & { seller?: SellerProps })[]
    } catch {
      return []
    }
  }
)
