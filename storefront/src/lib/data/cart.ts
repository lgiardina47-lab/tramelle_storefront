'use server';

import { HttpTypes } from '@medusajs/types';
import { revalidatePath, revalidateTag } from 'next/cache';
import { redirect } from 'next/navigation';

import { derivedCityForMedusa } from '@/lib/helpers/checkout-delivery-address';
import { resolveItalianProvinceCode } from '@/lib/helpers/italian-provinces';
import medusaError from '@/lib/helpers/medusa-error';
import { parseVariantIdsFromError } from '@/lib/helpers/parse-variant-error';

import { fetchQuery, sdk } from '../config';
import { MEDUSA_BACKEND_URL } from '../medusa-backend-url';
import {
  getAuthHeaders,
  getCacheOptions,
  getCacheTag,
  getCartId,
  removeCartId,
  setCartId
} from './cookies';
import { getRegion, medusaCountryToStorefrontPathSegment } from './regions';

/**
 * Stessa `cart_id` in GET `/store/shipping-options`: la Data Cache di Next
 * etichetta con `fulfillment` e `shippingOptions`; senza revalidarle restano
 * le opzioni (o l'assenza) calcolate prima del cambio indirizzo o linee.
 */
async function revalidateCartAndShippingCaches() {
  const [cartTag, fulfillTag, shipOptTag] = await Promise.all([
    getCacheTag('carts'),
    getCacheTag('fulfillment'),
    getCacheTag('shippingOptions')
  ]);
  for (const t of [cartTag, fulfillTag, shipOptTag]) {
    if (t) {
      await revalidateTag(t);
    }
  }
}

/**
 * Retrieves a cart by its ID. If no ID is provided, it will use the cart ID from the cookies.
 * @param cartId - optional - The ID of the cart to retrieve.
 * @returns The cart object if found, or null if not found.
 */
export async function retrieveCart(cartId?: string) {
  const id = cartId || (await getCartId());

  if (!id) {
    return null;
  }

  const headers = {
    ...(await getAuthHeaders())
  };

  return await sdk.client
    .fetch<HttpTypes.StoreCartResponse>(`/store/carts/${id}`, {
      method: 'GET',
      query: {
        fields:
          '*items,*region, *items.product, *items.variant, *items.variant.options, items.variant.options.option.title,' +
          '*items.thumbnail, +items.product.thumbnail, *items.product.images, *items.metadata, +items.total, *promotions, *shipping_methods,' +
          '*payment_collection,*payment_collection.payment_sessions, *items.product.seller'
      },
      headers,
      cache: 'no-cache'
    })
    .then(({ cart }) => cart)
    .catch(() => null);
}

export async function getOrSetCart(countryCode: string) {
  const region = await getRegion(countryCode);

  if (!region) {
    throw new Error(`Region not found for country code: ${countryCode}`);
  }

  let cart = await retrieveCart();

  const headers = {
    ...(await getAuthHeaders())
  };

  if (!cart) {
    const cartResp = await sdk.store.cart.create({ region_id: region.id }, {}, headers);
    cart = cartResp.cart;

    await setCartId(cart.id);

    await revalidateCartAndShippingCaches();
  }

  if (cart && cart?.region_id !== region.id) {
    await sdk.store.cart.update(cart.id, { region_id: region.id }, {}, headers);
    await revalidateCartAndShippingCaches();
  }

  return cart;
}

export async function updateCart(data: HttpTypes.StoreUpdateCart) {
  const cartId = await getCartId();

  if (!cartId) {
    throw new Error('No existing cart found, please create one before updating');
  }

  const headers = {
    ...(await getAuthHeaders())
  };

  return await sdk.store.cart
    .update(cartId, data, {}, headers)
    .then(async ({ cart }) => {
      await revalidateCartAndShippingCaches();
      return cart;
    })
    .catch(medusaError);
}

/**
 * Con sessione loggata il carrello spesso resta senza `email` fino al submit del form indirizzo:
 * Stripe/complete richiedono l’email e il pulsante paga resta disattivato. Allinea al profilo.
 */
export async function ensureCartEmailFromCustomer(
  cart: HttpTypes.StoreCart | null,
  customer: HttpTypes.StoreCustomer | null
): Promise<HttpTypes.StoreCart | null> {
  if (!cart?.id || !customer?.email?.trim()) {
    return cart;
  }
  if (String(cart.email || '').trim().length > 0) {
    return cart;
  }
  try {
    return (await updateCart({ email: customer.email.trim() })) ?? cart;
  } catch {
    return cart;
  }
}

export async function addToCart({
  variantId,
  quantity,
  countryCode,
  lineMetadata
}: {
  variantId: string;
  quantity: number;
  countryCode: string;
  lineMetadata?: Record<string, string | number | boolean | null>;
}) {
  if (!variantId) {
    throw new Error('Missing variant ID when adding to cart');
  }

  const cart = await getOrSetCart(countryCode);

  if (!cart) {
    throw new Error('Error retrieving or creating cart');
  }

  const headers = {
    ...(await getAuthHeaders())
  };

  const currentItem = cart.items?.find(item => item.variant_id === variantId);

    if (currentItem) {
    await sdk.store.cart
      .updateLineItem(
        cart.id,
        currentItem.id,
        { quantity: currentItem.quantity + quantity },
        {},
        headers
      )
      .catch(medusaError)
      .finally(async () => {
        await revalidateCartAndShippingCaches();
      });
  } else {
    await sdk.store.cart
      .createLineItem(
        cart.id,
        {
          variant_id: variantId,
          quantity,
          ...(lineMetadata && Object.keys(lineMetadata).length
            ? { metadata: lineMetadata as Record<string, unknown> }
            : {})
        },
        {},
        headers
      )
      .then(async () => {
        await revalidateCartAndShippingCaches();
      })
      .catch(medusaError)
      .finally(async () => {
        await revalidateCartAndShippingCaches();
      });
  }
}

export async function updateLineItem({ lineId, quantity }: { lineId: string; quantity: number }) {
  if (!lineId) {
    throw new Error('Missing lineItem ID when updating line item');
  }

  const cartId = await getCartId();

  if (!cartId) {
    throw new Error('Missing cart ID when updating line item');
  }

  const headers = {
    ...(await getAuthHeaders())
  };

  const res = await fetchQuery(`/store/carts/${cartId}/line-items/${lineId}`, {
    body: { quantity },
    method: 'POST',
    headers
  });

  await revalidateCartAndShippingCaches();

  return res;
}

export async function deleteLineItem(lineId: string) {
  if (!lineId) {
    throw new Error('Missing lineItem ID when deleting line item');
  }

  const cartId = await getCartId();

  if (!cartId) {
    throw new Error('Missing cart ID when deleting line item');
  }

  const headers = {
    ...(await getAuthHeaders())
  };

  await sdk.store.cart
    .deleteLineItem(cartId, lineId, {}, headers)
    .then(async () => {
      await revalidateCartAndShippingCaches();
    })
    .catch(medusaError);
}

export async function setShippingMethod({
  cartId,
  shippingMethodId
}: {
  cartId: string;
  shippingMethodId: string;
}) {
  const headers = {
    ...(await getAuthHeaders())
  };

  const res = await fetchQuery(`/store/carts/${cartId}/shipping-methods`, {
    body: { option_id: shippingMethodId },
    method: 'POST',
    headers
  });

  await revalidateCartAndShippingCaches();

  return res;
}

export async function initiatePaymentSession(
  cart: HttpTypes.StoreCart,
  data: {
    provider_id: string;
    context?: Record<string, unknown>;
  }
) {
  const headers = {
    ...(await getAuthHeaders())
  };

  return sdk.store.payment
    .initiatePaymentSession(cart, data, {}, headers)
    .then(async resp => {
      await revalidateCartAndShippingCaches();
      return resp;
    })
    .catch(medusaError);
}

const isManualPaymentProvider = (providerId?: string) =>
  providerId?.startsWith('pp_system_default') ?? false;

/**
 * Crea al volo la payment collection + sessione (es. Stripe) quando il carrello ha già
 * spedizione ma ancora nessun provider reale, così PaymentWrapper (Stripe) e il riepilogo
 * ricevono `client_secret` al primo load senza dipendere solo dal client.
 */
export async function ensureDefaultPaymentSessionForCheckout(
  cart: HttpTypes.StoreCart | null
): Promise<HttpTypes.StoreCart | null> {
  if (!cart?.id) {
    return cart;
  }

  const hasShipping = (cart.shipping_methods?.length ?? 0) > 0;
  if (!hasShipping) {
    return cart;
  }

  const withGift = cart as HttpTypes.StoreCart & { gift_cards?: unknown[] };
  const giftPaid =
    withGift.gift_cards &&
    withGift.gift_cards.length > 0 &&
    (cart.total === 0 || cart.total == null);
  if (giftPaid) {
    return cart;
  }

  const hasNonManualPending = cart.payment_collection?.payment_sessions?.some(
    s => s.status === 'pending' && s.provider_id && !isManualPaymentProvider(s.provider_id)
  );
  if (hasNonManualPending) {
    return cart;
  }

  const regionId = cart.region_id ?? cart.region?.id;
  if (!regionId) {
    return cart;
  }

  const { listCartPaymentMethods } = await import('./payment');
  const methods = await listCartPaymentMethods(regionId);
  const first = (methods ?? []).find(
    p => p?.id && !isManualPaymentProvider(p.id)
  );
  if (!first?.id) {
    return cart;
  }

  try {
    await initiatePaymentSession(cart, { provider_id: first.id });
  } catch {
    return cart;
  }

  return (await retrieveCart(cart.id)) ?? cart;
}

export async function applyPromotions(codes: string[]) {
  const cartId = await getCartId();

  if (!cartId) {
    return { success: false, error: "No existing cart found" }
  }

  const headers = {
    ...(await getAuthHeaders())
  };

  try {
    const { cart } = await sdk.store.cart.update(
      cartId,
      { promo_codes: codes },
      {},
      headers
    )
    await revalidateCartAndShippingCaches()
    // @ts-ignore
    const applied = cart.promotions?.some((promotion: any) =>
      codes.includes(promotion.code)
    )
    return { success: true, applied }
  } catch (error: any) {
    const errorMessage =
      error?.response?.data?.message ||
      error?.message ||
      "Failed to apply promotion code"
    return { success: false, error: errorMessage }
  }
}

export async function removeShippingMethod(shippingMethodId: string) {
  const cartId = await getCartId();

  if (!cartId) {
    throw new Error('No existing cart found');
  }

  const headers = {
    ...(await getAuthHeaders()),
    'Content-Type': 'application/json',
    'x-publishable-api-key': process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY as string
  };

  return fetch(`${MEDUSA_BACKEND_URL}/store/carts/${cartId}/shipping-methods`, {
    method: 'DELETE',
    body: JSON.stringify({ shipping_method_ids: [shippingMethodId] }),
    headers
  })
    .then(async () => {
      await revalidateCartAndShippingCaches();
    })
    .catch(medusaError);
}

export async function deletePromotionCode(promoId: string) {
  const cartId = await getCartId();

  if (!cartId) {
    throw new Error('No existing cart found');
  }
  const headers = {
    ...(await getAuthHeaders()),
    'Content-Type': 'application/json',
    'x-publishable-api-key': process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY as string
  };

  return fetch(`${MEDUSA_BACKEND_URL}/store/carts/${cartId}/promotions`, {
    method: 'DELETE',
    body: JSON.stringify({ promo_codes: [promoId] }),
    headers
  })
    .then(async () => {
      await revalidateCartAndShippingCaches();
    })
    .catch(medusaError);
}

type CheckoutShippingInput = {
  first_name?: string | null;
  last_name?: string | null;
  address_1?: string | null;
  address_2?: string | null;
  company?: string | null;
  postal_code?: string | null;
  country_code?: string | null;
  province?: string | null;
  phone?: string | null;
};

function normalizeProvinceForCart(
  countryCode: string | null | undefined,
  province: string | null | undefined
): string {
  const c = String(countryCode ?? '').toLowerCase();
  const raw = String(province ?? '').trim();
  if (c === 'it') {
    return resolveItalianProvinceCode(raw) ?? raw;
  }
  return raw;
}

function buildCheckoutAddressUpdatePayload(input: {
  email: string | null | undefined;
  shipping: CheckoutShippingInput;
}): HttpTypes.StoreUpdateCart {
  const country = String(input.shipping.country_code ?? '').trim();
  const province = normalizeProvinceForCart(
    input.shipping.country_code,
    input.shipping.province
  );
  const postalCode = String(input.shipping.postal_code ?? '').trim();
  const address2 = String(input.shipping.address_2 ?? '').trim();
  const shipping_address = {
    first_name: input.shipping.first_name,
    last_name: input.shipping.last_name,
    address_1: input.shipping.address_1,
    address_2: address2 || '',
    company: input.shipping.company,
    postal_code: input.shipping.postal_code,
    city: derivedCityForMedusa(province, postalCode),
    country_code: input.shipping.country_code,
    province: province || input.shipping.province,
    phone: input.shipping.phone
  } as any;

  return {
    email: input.email,
    shipping_address,
    billing_address: shipping_address
  } as any;
}

function buildCheckoutUpdateFromFormData(
  formData: FormData
): HttpTypes.StoreUpdateCart {
  const provinceRaw = String(
    formData.get('shipping_address.province') ?? ''
  ).trim();
  return buildCheckoutAddressUpdatePayload({
    email: String(formData.get('email') ?? ''),
    shipping: {
      first_name: String(formData.get('shipping_address.first_name') ?? ''),
      last_name: String(formData.get('shipping_address.last_name') ?? ''),
      address_1: String(formData.get('shipping_address.address_1') ?? ''),
      address_2: '',
      company: String(formData.get('shipping_address.company') ?? ''),
      postal_code: String(formData.get('shipping_address.postal_code') ?? ''),
      country_code: String(formData.get('shipping_address.country_code') ?? ''),
      province: provinceRaw,
      phone: String(formData.get('shipping_address.phone') ?? '')
    }
  });
}

/**
 * Stesso aggiornamento del carrello del submit “Salva”, per indirizzi scelti dal rubinetto
 * (prima l’UI aggiornava solo lo stato locale; il carrello restava con indirizzo vecchio).
 */
export async function applySavedAddressToCart(
  address: HttpTypes.StoreCustomerAddress,
  email: string
): Promise<'success' | string> {
  try {
    const em = String(email ?? '').trim();
    if (!em) {
      return 'Email required to save address to cart';
    }
    const cartId = await getCartId();
    if (!cartId) {
      throw new Error('No existing cart found when setting addresses');
    }
    const data = buildCheckoutAddressUpdatePayload({
      email: em,
      shipping: {
        first_name: address.first_name,
        last_name: address.last_name,
        address_1: address.address_1,
        address_2: address.address_2,
        company: address.company,
        postal_code: address.postal_code,
        country_code: address.country_code,
        province: address.province,
        phone: address.phone
      }
    });
    await updateCart(data);
    revalidatePath('/[locale]/cart', 'page');
    revalidatePath('/[locale]/checkout', 'page');
    return 'success' as const;
  } catch (e: any) {
    return e.message;
  }
}

export async function setAddresses(currentState: unknown, formData: FormData) {
  try {
    if (!formData) {
      throw new Error('No form data found when setting addresses');
    }
    const cartId = await getCartId();
    if (!cartId) {
      throw new Error('No existing cart found when setting addresses');
    }
    const data = buildCheckoutUpdateFromFormData(formData);
    await updateCart(data);
    revalidatePath('/[locale]/cart', 'page');
    revalidatePath('/[locale]/checkout', 'page');
    return 'success' as const;
  } catch (e: any) {
    return e.message;
  }
}

/**
 * Places an order for a cart. If no cart ID is provided, it will use the cart ID from the cookies.
 * @param cartId - optional - The ID of the cart to place an order for.
 * @returns The cart object if the order was successful, or null if not.
 */
export async function placeOrder(cartId?: string) {
  const id = cartId || (await getCartId());

  if (!id) {
    throw new Error('No existing cart found when placing an order');
  }

  const headers = {
    ...(await getAuthHeaders())
  };

  const res = await fetchQuery(`/store/carts/${id}/complete`, {
    method: 'POST',
    headers
  });

  await revalidateCartAndShippingCaches();

  if (res?.data?.order_set) {
    revalidatePath('/user/reviews');
    revalidatePath('/user/orders');
    removeCartId();
    redirect(`/order/${res?.data?.order_set.orders[0].id}/confirmed`);
  }

  return res;
}

/**
 * Updates the countrycode param and revalidates the regions cache
 * @param regionId
 * @param countryCode
 */
export async function updateRegion(countryCode: string, currentPath: string) {
  const cartId = await getCartId();
  const region = await getRegion(countryCode);

  if (!region) {
    throw new Error(`Region not found for country code: ${countryCode}`);
  }

  if (cartId) {
    await updateCart({ region_id: region.id });
  }

  const regionCacheTag = await getCacheTag('regions');
  revalidateTag(regionCacheTag);

  const productsCacheTag = await getCacheTag('products');
  revalidateTag(productsCacheTag);

  const pathSeg = await medusaCountryToStorefrontPathSegment(countryCode);
  redirect(`/${pathSeg}${currentPath}`);
}

/**
 * Updates the region and returns removed items for notification
 * This is a wrapper around updateRegion that doesn't redirect
 * Uses error-driven approach: tries to update, catches price errors, removes problem items, retries
 * @param countryCode - The country code to update to
 * @param currentPath - The current path for redirect
 * @returns Array of removed item names and new path
 */
export async function updateRegionWithValidation(
  countryCode: string,
  currentPath: string
): Promise<{ removedItems: string[]; newPath: string }> {
  const cartId = await getCartId();
  const region = await getRegion(countryCode);

  if (!region) {
    throw new Error(`Region not found for country code: ${countryCode}`);
  }

  let removedItems: string[] = [];

  if (cartId) {
    const headers = {
      ...(await getAuthHeaders())
    };

    try {
      await updateCart({ region_id: region.id });
    } catch (error: any) {
      // Check if error is about variants not having prices
      if (!error?.message?.includes('do not have a price')) {
        // Re-throw if it's a different error
        throw error;
      }

      // Parse variant IDs from error message
      const problematicVariantIds = parseVariantIdsFromError(error.message);

      // Early return if no variant IDs found
      if (!problematicVariantIds.length) {
        throw new Error('Failed to parse variant IDs from error');
      }

      // Fetch cart with minimal fields to get items
      try {
        const { cart } = await sdk.client.fetch<HttpTypes.StoreCartResponse>(
          `/store/carts/${cartId}`,
          {
            method: 'GET',
            query: {
              fields: '*items'
            },
            headers,
            cache: 'no-cache'
          }
        );

        // Iterate over problematic variants and remove corresponding items
        for (const variantId of problematicVariantIds) {
          const item = cart?.items?.find(item => item.variant_id === variantId);
          if (item) {
            try {
              await sdk.store.cart.deleteLineItem(cart.id, item.id, {}, headers);
              removedItems.push(item.product_title || 'Unknown product');
            } catch (deleteError) {
              // Silent failure - item removal failed but continue
            }
          }
        }

        // Retry region update after removing problematic items
        if (removedItems.length > 0) {
          await updateCart({ region_id: region.id });
        }
      } catch (fetchError) {
        throw new Error('Failed to handle incompatible cart items');
      }
    }

    // deleteLineItem qui usa l'SDK senza revalidate: aggiustiamo cache carrello e opzioni spedizione
    await revalidateCartAndShippingCaches();
  }

  const regionCacheTag = await getCacheTag('regions');
  revalidateTag(regionCacheTag);

  const productsCacheTag = await getCacheTag('products');
  revalidateTag(productsCacheTag);

  const pathSeg = await medusaCountryToStorefrontPathSegment(countryCode);
  return {
    removedItems,
    newPath: `/${pathSeg}${currentPath}`
  };
}

export async function listCartOptions() {
  const cartId = await getCartId();
  const headers = {
    ...(await getAuthHeaders())
  };
  const next = {
    ...(await getCacheOptions('shippingOptions'))
  };

  return await sdk.client.fetch<{
    shipping_options: HttpTypes.StoreCartShippingOption[];
  }>('/store/shipping-options', {
    query: { cart_id: cartId },
    next,
    headers,
    cache: 'force-cache'
  });
}
