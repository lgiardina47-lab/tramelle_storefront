import { SellerProps, type StoreSellerListItem } from "@/types/seller"

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

/** Elenco produttori per directory storefront (`GET /store/sellers`). */
export async function listStoreSellers(params?: {
  limit?: number
  offset?: number
  /** Filtra seller con descrizione in questa lingua (`it`…`es`). */
  contentLocale?: string
}): Promise<StoreSellersListResponse | null> {
  const limit = params?.limit ?? 48
  const offset = params?.offset ?? 0
  const contentLocale = params?.contentLocale?.trim().toLowerCase()
  try {
    return await sdk.client.fetch<StoreSellersListResponse>(`/store/sellers`, {
      query: {
        limit,
        offset,
        ...(contentLocale
          ? { content_locale: contentLocale }
          : {}),
      },
      cache: "no-store",
    })
  } catch {
    return null
  }
}
