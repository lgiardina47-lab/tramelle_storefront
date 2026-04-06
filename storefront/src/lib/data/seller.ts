import { SellerProps, type StoreSellerListItem } from "@/types/seller"

import { sdk } from '../config';

const SELLER_FIELDS =
  '+created_at,+email,+metadata,+reviews.seller.name,+reviews.rating,+reviews.customer_note,+reviews.seller_note,+reviews.created_at,+reviews.updated_at,+reviews.customer.first_name,+reviews.customer.last_name';

function isSellerId(ref: string): boolean {
  return ref.trim().startsWith('sel_') && ref.trim().length > 4;
}

/**
 * Carica il seller per **handle** (`alpe-magna`) o per **id** (`sel_...`).
 * L'endpoint Mercur `/store/seller/:x` con id restituisce `{}`; usiamo `/store/sellers/by-ref/:ref`.
 */
export const getSellerByHandle = async (
  handleOrId: string
): Promise<SellerProps | null> => {
  const ref = encodeURIComponent(handleOrId.trim());
  const path = isSellerId(handleOrId)
    ? `/store/sellers/by-ref/${ref}`
    : `/store/seller/${ref}`;

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
}): Promise<StoreSellersListResponse | null> {
  const limit = params?.limit ?? 48
  const offset = params?.offset ?? 0
  try {
    return await sdk.client.fetch<StoreSellersListResponse>(`/store/sellers`, {
      query: { limit, offset },
      cache: "no-store",
    })
  } catch {
    return null
  }
}
