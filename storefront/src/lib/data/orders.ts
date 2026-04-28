'use server';

import { HttpTypes } from '@medusajs/types';

import { SellerProps } from '@/types/seller';

import { sdk } from '../config';
import { MEDUSA_BACKEND_URL } from '../medusa-backend-url';
import medusaError from '../helpers/medusa-error';
import { getAuthHeaders, getCacheOptions } from './cookies';

export const retrieveOrder = async (id: string) => {
  const headers = {
    ...(await getAuthHeaders())
  };

  const next = {
    ...(await getCacheOptions('orders'))
  };

  return sdk.client
    .fetch<HttpTypes.StoreOrderResponse & { seller: SellerProps }>(`/store/orders/${id}`, {
      method: 'GET',
      query: {
        fields:
          '*payment_collections.payments,*items,*items.metadata,+items.thumbnail,+items.product.thumbnail,*items.variant,*items.product,*seller,*order_set'
      },
      headers,
      next,
      cache: 'force-cache'
    })
    .then(({ order }) => order)
    .catch(err => medusaError(err));
};

export const createReturnRequest = async (data: any) => {
  const headers = {
    ...(await getAuthHeaders()),
    'Content-Type': 'application/json',
    'x-publishable-api-key': process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY as string
  };

  const response = await fetch(`${MEDUSA_BACKEND_URL}/store/return-request`, {
    method: 'POST',
    headers,
    body: JSON.stringify(data)
  })
    .then(async res => await res.json())
    .catch(err => medusaError(err));

  return response;
};

export const getReturns = async () => {
  const headers = await getAuthHeaders();

  return sdk.client
    .fetch<{
      order_return_requests: Array<any>;
    }>(`/store/return-request`, {
      method: 'GET',
      headers,
      cache: 'force-cache',
      query: { fields: '*line_items.reason_id' }
    })
    .then(res => res)
    .catch(err => medusaError(err));
};

export const retriveReturnMethods = async (order_id: string) => {
  const headers = await getAuthHeaders();

  return sdk.client
    .fetch<{
      shipping_options: Array<any>;
    }>(`/store/shipping-options/return?order_id=${order_id}`, {
      method: 'GET',
      headers,
      cache: 'no-cache'
    })
    .then(({ shipping_options }) => shipping_options)
    .catch(() => []);
};

export const listOrders = async (
  limit: number = 10,
  offset: number = 0,
  filters?: Record<string, any>
) => {
  const headers = {
    ...(await getAuthHeaders())
  };

  const next = {
    ...(await getCacheOptions('orders'))
  };

  return sdk.client
    .fetch<{
      orders: Array<
        HttpTypes.StoreOrder & {
          seller: { id: string; name: string; reviews?: any[] };
          reviews: any[];
          order_set: { id: string };
        }
      >;
    }>(`/store/orders`, {
      method: 'GET',
      query: {
        limit,
        offset,
        order: '-created_at',
        fields:
          '*items,+items.thumbnail,+items.product.thumbnail,+items.metadata,*items.variant,*items.product,*seller,*reviews,*order_set,*shipping_address,shipping_total,total,created_at',
        ...filters
      },
      headers,
      next,
      cache: 'no-cache'
    })
    .then(({ orders }) => orders.filter(order => order.order_set))
    .catch(err => medusaError(err));
};

const ORDER_SET_DETAIL_FIELDS =
  '*orders,*orders.items,*orders.shipping_address,*orders.seller,*payment_collection'

const ORDER_SET_FALLBACK_LIST_FIELDS =
  '*items,+items.thumbnail,+items.product.thumbnail,+items.metadata,*items.variant,*items.product,*seller,*reviews,*order_set,*shipping_address,shipping_total,total,created_at,currency_code'

const FALLBACK_PAGE = 500
/** Evita loop infiniti su account enormi; oltre questo serve route API dedicata. */
const FALLBACK_MAX_PAGES = 30

function buildSyntheticOrderSetFromStoreOrders(
  orderSetId: string,
  subset: any[]
): any | null {
  if (!subset.length) return null
  const osMeta = subset[0].order_set as
    | Record<string, unknown>
    | undefined
    | null
  const first = subset[0] as Record<string, unknown>
  return {
    id: orderSetId,
    display_id: osMeta?.display_id ?? first.display_id,
    created_at: osMeta?.created_at ?? first.created_at,
    orders: subset,
    payment_collection: {
      currency_code:
        (subset[0] as { currency_code?: string }).currency_code ?? 'eur',
    },
    total: subset.reduce(
      (s, o: any) => s + (typeof o.total === 'number' ? o.total : 0),
      0
    ),
    shipping_total: subset.reduce(
      (s, o: any) =>
        s + (typeof o.shipping_total === 'number' ? o.shipping_total : 0),
      0
    ),
  }
}

/**
 * Tutti gli ordini store appartenenti a un order_set (liste paginate), per clienti B2C con molta cronologia.
 */
async function collectStoreOrdersForOrderSet(
  headers: Record<string, string | undefined>,
  orderSetId: string
): Promise<any[]> {
  const found = new Map<string, any>()
  let offset = 0
  for (let page = 0; page < FALLBACK_MAX_PAGES; page++) {
    let orders: any[] = []
    try {
      const res = await sdk.client.fetch<{ orders: any[] }>(`/store/orders`, {
        method: 'GET',
        query: {
          limit: FALLBACK_PAGE,
          offset,
          order: '-created_at',
          fields: ORDER_SET_FALLBACK_LIST_FIELDS,
        },
        headers,
        cache: 'no-cache',
      })
      orders = res.orders ?? []
    } catch {
      break
    }
    if (!orders.length) break
    for (const o of orders) {
      if (o.order_set?.id === orderSetId && o.id) {
        found.set(o.id, o)
      }
    }
    if (orders.length < FALLBACK_PAGE) break
    offset += FALLBACK_PAGE
  }
  return [...found.values()]
}

/**
 * Dettaglio order set (checkout marketplace Mercur).
 * Se la route dedicata `/store/order-set/:id` non risponde o espone un payload diverso,
 * ricostruiamo da `/store/orders` filtrando per `order_set.id` (stesso dato della lista ordini).
 *
 * Supporto URL con **`order_*`** (singola parcel): risolviamo via GET `/store/orders/:id` → `order_set.id`,
 * tipico di link/email che puntano al singolo ordine B2C invece che all’`ordset_*`.
 */
export async function retrieveOrderSet(
  id: string,
  fromOrderLine = false
): Promise<any | null> {
  const headers = {
    ...(await getAuthHeaders()),
  }

  const rawId = typeof id === 'string' ? id.trim() : ''
  if (!rawId) return null

  const unwrapOrderSet = (body: Record<string, unknown> | null | undefined) => {
    if (!body || typeof body !== 'object') return null
    const o = body as Record<string, unknown>
    const direct =
      (o.order_set as Record<string, unknown> | undefined) ??
      (o.orderSet as Record<string, unknown> | undefined)
    if (direct && typeof direct.id === 'string') {
      return direct
    }
    return null
  }

  if (!fromOrderLine && rawId.startsWith('order_')) {
    try {
      const res = await sdk.client.fetch<{ order: any }>(
        `/store/orders/${rawId}`,
        {
          method: 'GET',
          query: {
            fields: ORDER_SET_FALLBACK_LIST_FIELDS,
          },
          headers,
          cache: 'no-cache',
        }
      )
      const order = res.order
      const osId =
        order?.order_set &&
        typeof order.order_set === 'object' &&
        typeof (order.order_set as { id?: string }).id === 'string'
          ? (order.order_set as { id: string }).id
          : null
      if (osId) {
        return retrieveOrderSet(osId, true)
      }
      if (order?.id) {
        return buildSyntheticOrderSetFromStoreOrders(rawId, [order])
      }
    } catch {
      /* continua con lookup ordset_* */
    }
  }

  for (const path of [
    `/store/order-set/${encodeURIComponent(rawId)}`,
    `/store/order-sets/${encodeURIComponent(rawId)}`,
  ]) {
    try {
      const body = (await sdk.client.fetch<Record<string, unknown>>(path, {
        method: 'GET',
        query: { fields: ORDER_SET_DETAIL_FIELDS },
        headers,
        cache: 'no-cache',
      })) as Record<string, unknown>
      const os = unwrapOrderSet(body)
      if (os?.id) {
        return os
      }
    } catch {
      /* prova fallback */
    }
  }

  try {
    const subset = await collectStoreOrdersForOrderSet(headers, rawId)
    if (!subset.length) {
      return null
    }
    return buildSyntheticOrderSetFromStoreOrders(rawId, subset)
  } catch {
    return null
  }
}

export const createTransferRequest = async (
  state: {
    success: boolean;
    error: string | null;
    order: HttpTypes.StoreOrder | null;
  },
  formData: FormData
): Promise<{
  success: boolean;
  error: string | null;
  order: HttpTypes.StoreOrder | null;
}> => {
  const id = formData.get('order_id') as string;

  if (!id) {
    return { success: false, error: 'Order ID is required', order: null };
  }

  const headers = await getAuthHeaders();

  return await sdk.store.order
    .requestTransfer(
      id,
      {},
      {
        fields: 'id, email'
      },
      headers
    )
    .then(({ order }) => ({ success: true, error: null, order }))
    .catch(err => ({ success: false, error: err.message, order: null }));
};

export const acceptTransferRequest = async (id: string, token: string) => {
  const headers = await getAuthHeaders();

  return await sdk.store.order
    .acceptTransfer(id, { token }, {}, headers)
    .then(({ order }) => ({ success: true, error: null, order }))
    .catch(err => ({ success: false, error: err.message, order: null }));
};

export const declineTransferRequest = async (id: string, token: string) => {
  const headers = await getAuthHeaders();

  return await sdk.store.order
    .declineTransfer(id, { token }, {}, headers)
    .then(({ order }) => ({ success: true, error: null, order }))
    .catch(err => ({ success: false, error: err.message, order: null }));
};

export const retrieveReturnReasons = async () => {
  const headers = await getAuthHeaders();

  return sdk.client
    .fetch<{
      return_reasons: Array<HttpTypes.StoreReturnReason>;
    }>(`/store/return-reasons`, {
      method: 'GET',
      headers,
      cache: 'force-cache'
    })
    .then(({ return_reasons }) => return_reasons)
    .catch(err => medusaError(err));
};
