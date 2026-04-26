'use server';

import { HttpTypes } from '@medusajs/types';

import {
  type StoreCardShippingMethod,
  type StoreCartShippingOptionsList
} from '@/components/sections/CartShippingMethodsSection/CartShippingMethodsSection';
import { sdk } from '@/lib/config';

import { getAuthHeaders, getCacheOptions } from './cookies';

export const listCartShippingMethods = async (cartId: string, is_return: boolean = false) => {
  const headers = {
    ...(await getAuthHeaders())
  };

  const next = {
    ...(await getCacheOptions('fulfillment'))
  };

  return sdk.client
    .fetch<{ shipping_options?: StoreCartShippingOptionsList | null }>(`/store/shipping-options`, {
      method: 'GET',
      query: {
        cart_id: cartId,
        fields:
          '+calculated_price,+service_zone.fulfillment_set.type,*service_zone.fulfillment_set.location.address'
      },
      headers,
      next: { ...next, revalidate: 0 },
      cache: 'no-store'
    })
    .then((body) => {
      if (Array.isArray(body?.shipping_options)) {
        return body.shipping_options;
      }
      return null;
    })
    .catch(() => {
      return null;
    });
};

export const calculatePriceForShippingOption = async (
  optionId: string,
  cartId: string,
  data?: Record<string, unknown>
) => {
  const headers = {
    ...(await getAuthHeaders())
  };

  const next = {
    ...(await getCacheOptions('fulfillment'))
  };

  const body: { cart_id: string; data?: Record<string, unknown> } = {
    cart_id: cartId
  };
  if (data && Object.keys(data).length > 0) {
    body.data = data;
  }

  return sdk.client
    .fetch<{ shipping_option: HttpTypes.StoreCartShippingOption }>(
      `/store/shipping-options/${optionId}/calculate`,
      {
        method: 'POST',
        body,
        headers,
        next
      }
    )
    .then(({ shipping_option }) => shipping_option)
    .catch(e => {
      return null;
    });
};
