import { normalizeListingContentLocale } from "@/lib/i18n/listing-content-locale"
import { SellerProps, type StoreSellerListItem } from "@/types/seller"
import { cache } from "react"

import { sdk } from '../config';

const SELLER_FIELDS =
  '+created_at,+email,+metadata,+reviews.seller.name,+reviews.rating,+reviews.customer_note,+reviews.seller_note,+reviews.created_at,+reviews.updated_at,+reviews.customer.first_name,+reviews.customer.last_name';

/**
 * Carica il seller per **handle** (`alpe-magna`) o per **id** (`sel_...`).
 * Usa sempre `/store/sellers/by-ref/:ref`: unisce `seller_listing_profile.metadata`
 * (hero, `tramelle_description_i18n`, …). L'endpoint Mercur `/store/seller/:handle` non li espone.
 */
export const getSellerByHandle = async (
  handleOrId: string
): Promise<SellerProps | null> => {
  const ref = encodeURIComponent(handleOrId.trim())
  const path = `/store/sellers/by-ref/${ref}`

  try {
    const { seller } = await sdk.client.fetch<{ seller: SellerProps }>(path, {
      query: {
        fields: SELLER_FIELDS,
      },
      cache: "no-cache",
    });
    if (!seller?.id) {
      return null;
    }
    return {
      ...seller,
      reviews:
        seller.reviews
          ?.filter((item) => item !== null)
          .sort((a, b) => b.created_at.localeCompare(a.created_at)) ?? [],
    } as SellerProps;
  } catch {
    return null;
  }
};

export type StoreSellersListResponse = {
  sellers: StoreSellerListItem[]
  count: number
  limit: number
  offset: number
}

export type StoreSellerCategoryFacet = {
  handle: string
  name: string
  sellerCount: number
}

export type StoreSellersFacetsResponse = {
  countries: string[]
  regionsByCountry: Record<string, string[]>
  /** Seller visibili per codice paese ISO (stessi criteri facets). */
  sellerCountByCountry: Record<string, number>
  /** Seller con regione valorizzata, per paese e codice regione (uppercase). */
  sellerCountByRegion: Record<string, Record<string, number>>
  /** Totale seller nei facets (lingua / criteri elenco). */
  totalSellerCount: number
  /** Macro categorie (`taste_category_handles`) con almeno un produttore con prodotti. */
  categories?: StoreSellerCategoryFacet[]
}

const SELLERS_FACETS_REVALIDATE_SEC =
  process.env.NODE_ENV === "development" ? 30 : 180

const SELLERS_LIST_REVALIDATE_SEC =
  process.env.NODE_ENV === "development" ? 30 : 60

/** Implementazione facets (dedup tra RSC paralleli via `cache()`). */
async function listStoreSellersFacetsUncached(params?: {
  contentLocale?: string
}): Promise<StoreSellersFacetsResponse | null> {
  const contentLocale = normalizeListingContentLocale(params?.contentLocale)
  try {
    return await sdk.client.fetch<StoreSellersFacetsResponse>(`/store/sellers`, {
      query: {
        facets: "1",
        ...(contentLocale ? { content_locale: contentLocale } : {}),
      },
      cache: "force-cache",
      next: { revalidate: SELLERS_FACETS_REVALIDATE_SEC },
    })
  } catch {
    return null
  }
}

/** Paesi, regioni e categorie per filtri directory (`content_locale` solo se passato in `params`). */
export const listStoreSellersFacets = cache(listStoreSellersFacetsUncached)

/** Elenco produttori per directory storefront (`GET /store/sellers`). */
export async function listStoreSellers(params?: {
  limit?: number
  offset?: number
  /** Filtra seller con descrizione in questa lingua (`it`…`es`). */
  contentLocale?: string
  /** ISO 3166-1 alpha-2 (es. IT). */
  countryCode?: string
  /** Confronto case-insensitive con `state` o metadata listing region/province. */
  region?: string
  /** Handle categoria macro (`taste_category_handles` nel listing). */
  parentCategoryHandle?: string
}): Promise<StoreSellersListResponse | null> {
  const limit = params?.limit ?? 48
  const offset = params?.offset ?? 0
  const contentLocale = normalizeListingContentLocale(params?.contentLocale)
  const cc = params?.countryCode?.trim().toUpperCase()
  const country_code =
    cc && /^[A-Z]{2}$/.test(cc) ? cc : undefined
  const reg = params?.region?.trim()
  const region = reg && reg.length > 0 ? reg : undefined
  const pch = params?.parentCategoryHandle?.trim()
  const parent_category_handle =
    pch && /^[a-z0-9][a-z0-9-]{0,118}$/i.test(pch) ? pch : undefined
  try {
    return await sdk.client.fetch<StoreSellersListResponse>(`/store/sellers`, {
      query: {
        limit,
        offset,
        ...(contentLocale ? { content_locale: contentLocale } : {}),
        ...(country_code ? { country_code } : {}),
        ...(region ? { region } : {}),
        ...(parent_category_handle
          ? { parent_category_handle }
          : {}),
      },
      cache: "force-cache",
      next: { revalidate: SELLERS_LIST_REVALIDATE_SEC },
    })
  } catch {
    return null
  }
}

/**
 * Seller con macro Tramelle dichiarata in `taste_category_handles` (listing).
 * Usato per mega-menu header (prima dei produttori da catalogo).
 */
export async function listStoreSellersForParentCategory(params: {
  parentCategoryHandle: string
  limit?: number
  offset?: number
}): Promise<StoreSellersListResponse | null> {
  const handle = params.parentCategoryHandle.trim()
  if (!handle) return null
  const limit = params.limit ?? 48
  const offset = params.offset ?? 0
  try {
    return await sdk.client.fetch<StoreSellersListResponse>(`/store/sellers`, {
      query: {
        limit,
        offset,
        parent_category_handle: handle,
      },
      cache: "no-store",
    })
  } catch {
    return null
  }
}
