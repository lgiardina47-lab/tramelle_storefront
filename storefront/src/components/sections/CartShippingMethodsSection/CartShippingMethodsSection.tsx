'use client';

import { startTransition, useEffect, useMemo, useRef, useState, type FC } from 'react';

import { CheckCircleSolid } from '@medusajs/icons';
import type { HttpTypes } from '@medusajs/types';
import { Heading, Text } from '@medusajs/ui';
import { useRouter } from 'next/navigation';

import ErrorMessage from '@/components/molecules/ErrorMessage/ErrorMessage';
import { setShippingMethod } from '@/lib/data/cart';
import { listCartShippingMethods } from '@/lib/data/fulfillment';
import { isCheckoutDeliveryAddressComplete } from '@/lib/helpers/checkout-delivery-address';
import { isUsableStoreShippingOption } from '@/lib/helpers/cart-seller-shipping';
import {
  isCartShippingReadyForPay,
  lineItemsForShippingSellerKey,
  sumLineSubtotalsEurForItems,
  tramelleDisplayShippingEurForSellerBlock
} from '@/lib/helpers/tramelle-seller-shipping-display';
import { convertToLocale, minorUnitsToMajor } from '@/lib/helpers/money';

import { useTranslations } from 'next-intl';

type ExtendedStoreProduct = HttpTypes.StoreProduct & {
  seller?: {
    id: string;
    name: string;
  };
};

type CartItem = {
  product?: ExtendedStoreProduct;
};

export type StoreCardShippingMethod = HttpTypes.StoreCartShippingOption & {
  seller_id?: string;
  seller_name?: string;
  /** Presente su GET /store/shipping-options: prezzo per il carrello (soglie item_total, ecc.). */
  calculated_price?: {
    calculated_amount?: number;
  };
  service_zone?: {
    fulfillment_set: {
      type: string;
    };
  };
};

/** Risposta GET /store/shipping-options (Mercur: seller_id, rules, ecc.). */
export type StoreCartShippingOptionsList = (StoreCardShippingMethod & {
  rules?: { attribute?: string; value?: string }[];
  price_type?: string;
  amount?: number;
})[];

/** L'API salva le opzioni con `option_id`; sul carrello il metodo espone `shipping_option_id` (non `id` del metodo). */
function shippingOptionIdFromCartMethod(
  method: HttpTypes.StoreCartShippingMethod | undefined
): string | undefined {
  if (!method) return undefined;
  const m = method as unknown as Record<string, unknown>;
  const a = m.shipping_option_id;
  const b = m.option_id;
  if (typeof a === 'string' && a.length > 0) return a;
  if (typeof b === 'string' && b.length > 0) return b;
  return undefined;
}

function selectedOptionIdForGroup(
  cart: Omit<HttpTypes.StoreCart, 'items'> & { items?: CartItem[] },
  options: StoreCardShippingMethod[]
): string | null {
  const ids = new Set(options.map(o => o.id));
  for (const m of cart.shipping_methods ?? []) {
    const oid = shippingOptionIdFromCartMethod(m);
    if (oid && ids.has(oid)) return oid;
  }
  return null;
}

type ShippingProps = {
  cart: Omit<HttpTypes.StoreCart, 'items'> & {
    items?: CartItem[];
  };
  availableShippingMethods: StoreCartShippingOptionsList | null;
};

function shippingAddressKey(
  a: HttpTypes.StoreCart['shipping_address'] | null | undefined
): string {
  if (!a) return '';
  const x = a as unknown as Record<string, unknown>;
  return [
    x.country_code,
    x.province,
    x.postal_code,
    x.address_1,
    x.city
  ]
    .map(v => (typeof v === 'string' ? v.trim() : ''))
    .join('\u001f');
}

const CartShippingMethodsSection: FC<ShippingProps> = ({ cart, availableShippingMethods }) => {
  const t = useTranslations('Checkout');
  const [isSavingShipping, setIsSavingShipping] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const hasCompleteAddress = isCheckoutDeliveryAddressComplete(
    cart?.shipping_address
  );

  /** Dopo l’indirizzo, re-fetch in client: il GET server poteva essere calcolato senza CAP/paese e restare []. */
  const [refreshedOptions, setRefreshedOptions] = useState<
    StoreCardShippingMethod[] | null | undefined
  >(undefined);

  const addressKey = useMemo(
    () => shippingAddressKey(cart?.shipping_address),
    [cart?.shipping_address]
  );

  const lineItemsSig = useMemo(
    () =>
      (cart.items ?? [])
        .map(
          i => `${(i as { id?: string }).id ?? ''}:${(i as { quantity?: number }).quantity ?? 0}`
        )
        .join('\u0001'),
    [cart.items]
  );

  const effectiveApiOptions = useMemo(() => {
    if (!hasCompleteAddress) {
      return availableShippingMethods;
    }
    if (refreshedOptions !== undefined) {
      return refreshedOptions;
    }
    return availableShippingMethods;
  }, [hasCompleteAddress, refreshedOptions, availableShippingMethods]);

  useEffect(() => {
    if (!hasCompleteAddress) {
      setRefreshedOptions(undefined);
    }
  }, [hasCompleteAddress]);

  /** Indirizzo cambiato: torna al dato di pagina (stesso giro request del carrello) fino a nuovo refetch. */
  useEffect(() => {
    setRefreshedOptions(undefined);
  }, [addressKey]);

  useEffect(() => {
    if (!hasCompleteAddress || !cart.id) {
      return;
    }
    let cancel = false;
    const hasLineItems = (cart.items?.length ?? 0) > 0;
    void (async () => {
      const opts = await listCartShippingMethods(cart.id, false);
      if (cancel) {
        return;
      }
      const serverOpts = availableShippingMethods;
      const serverOk =
        Array.isArray(serverOpts) && serverOpts.length > 0;
      const clientEmpty =
        opts === null || (Array.isArray(opts) && opts.length === 0);
      if (hasLineItems && serverOk && clientEmpty) {
        setRefreshedOptions(serverOpts);
        return;
      }
      setRefreshedOptions(opts);
    })();
    return () => {
      cancel = true;
    };
  }, [
    hasCompleteAddress,
    cart.id,
    addressKey,
    lineItemsSig,
    cart.updated_at,
    availableShippingMethods,
    cart.items?.length
  ]);

  const shippingMethods = useMemo(
    () =>
      effectiveApiOptions?.filter(sm => {
        const rules = (sm as { rules?: { attribute?: string; value?: string }[] }).rules;
        return rules?.find(rule => rule.attribute === 'is_return')?.value !== 'true';
      }) ?? null,
    [effectiveApiOptions]
  );

  const groupedBySellerId = useMemo(
    () =>
      shippingMethods?.reduce((acc, method) => {
        const sellerId = method.seller_id ?? '__default__';

        if (!acc[sellerId]) {
          acc[sellerId] = [];
        }

        if (isUsableStoreShippingOption(method as StoreCardShippingMethod)) {
          acc[sellerId].push(method as unknown as StoreCardShippingMethod);
        }

        return acc;
      }, {} as Record<string, StoreCardShippingMethod[]>) ?? {},
    [shippingMethods]
  );

  const filteredGroupedBySellerId = useMemo(
    () =>
      Object.keys(groupedBySellerId).filter(
        key => (groupedBySellerId[key]?.length ?? 0) > 0
      ),
    [groupedBySellerId]
  );

  const shipCountry = (cart.shipping_address as { country_code?: string } | null | undefined)
    ?.country_code;
  const isEur = (cart?.currency_code || 'eur').toLowerCase() === 'eur';

  const tramelleBlockLabel = (sellerKey: string) => {
    if (!isEur) {
      return null;
    }
    const c = cart as HttpTypes.StoreCart;
    const items = lineItemsForShippingSellerKey(c, sellerKey);
    const sub = sumLineSubtotalsEurForItems(items);
    const { amountMajor, isFree } = tramelleDisplayShippingEurForSellerBlock(
      sub,
      shipCountry
    );
    if (isFree) {
      return t('shippingTramelleFree');
    }
    return convertToLocale({
      amount: amountMajor,
      currency_code: cart?.currency_code ?? 'eur',
    });
  };

  const autoApplyInFlight = useRef(false);
  const shippingMethodsSig = useMemo(
    () =>
      (cart.shipping_methods ?? [])
        .map(
          m =>
            shippingOptionIdFromCartMethod(
              m as HttpTypes.StoreCartShippingMethod
            ) ?? (m as { id?: string }).id
        )
        .join(','),
    [cart.shipping_methods]
  );

  const loadFailed = effectiveApiOptions === null && hasCompleteAddress;

  /** Opzioni da applicare in sequenza (un POST per venditore; Mercur unisce in `shipping_methods[]`). */
  const missingOptionIdsToAutoApply = useMemo(() => {
    const out: string[] = [];
    for (const key of filteredGroupedBySellerId) {
      const options = groupedBySellerId[key] as StoreCardShippingMethod[];
      if (!options?.[0]) {
        continue;
      }
      if (selectedOptionIdForGroup(cart, options)) {
        continue;
      }
      out.push(options[0].id);
    }
    return out;
  }, [cart, filteredGroupedBySellerId, groupedBySellerId]);

  const missingOptionsKey = missingOptionIdsToAutoApply.join('\0');

  const deliveryStepComplete = useMemo(
    () => isCartShippingReadyForPay(cart as HttpTypes.StoreCart),
    [cart]
  );

  useEffect(() => {
    setError(null);
  }, [hasCompleteAddress]);

  useEffect(() => {
    if (!hasCompleteAddress || !cart?.id || loadFailed) {
      return;
    }
    if (missingOptionsKey.length === 0) {
      return;
    }
    if (autoApplyInFlight.current) {
      return;
    }
    const ids = missingOptionIdsToAutoApply;
    autoApplyInFlight.current = true;
    void (async () => {
      setError(null);
      setIsSavingShipping(true);
      try {
        for (const id of ids) {
          const res = await setShippingMethod({
            cartId: cart.id,
            shippingMethodId: id
          });
          if (!res.ok) {
            setError(res.error?.message ?? t('genericError'));
            return;
          }
        }
        startTransition(() => {
          router.refresh();
        });
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        setError(msg.replace('Error setting up the request: ', '') || t('genericError'));
      } finally {
        setIsSavingShipping(false);
        autoApplyInFlight.current = false;
      }
    })();
  }, [
    hasCompleteAddress,
    loadFailed,
    missingOptionsKey,
    missingOptionIdsToAutoApply,
    shippingMethodsSig,
    cart.id,
    cart.updated_at,
    router,
    t
  ]);

  /**
   * Il provider manuale non supporta `POST /shipping-options/:id/calculate` (500).
   * Per il carrello attuale usiamo `calculated_price` già calcolato su GET /store/shipping-options.
   */
  const formatOptionPrice = (option: StoreCardShippingMethod) => {
    const code = cart?.currency_code;
    const fromList = option.calculated_price?.calculated_amount;
    if (typeof fromList === 'number' && Number.isFinite(fromList)) {
      return convertToLocale({
        amount: minorUnitsToMajor(fromList, code),
        currency_code: code ?? 'eur',
      });
    }
    if (option.amount != null && Number.isFinite(Number(option.amount))) {
      return convertToLocale({
        amount: minorUnitsToMajor(Number(option.amount), code),
        currency_code: code ?? 'eur',
      });
    }
    return '—';
  };

  return (
    <div
      className="border-b border-[#e8e8e8] bg-white pb-10 pt-2"
      data-testid="checkout-step-delivery"
    >
      <div className="mb-5 flex flex-row items-center justify-between">
        <Heading
          level="h2"
          className="flex flex-row items-baseline gap-x-2 text-lg font-semibold text-[#202223]"
        >
          {deliveryStepComplete ? (
            <CheckCircleSolid className="text-[#1773b0]" />
          ) : null}
          {t('delivery')}
        </Heading>
      </div>
      <div className="grid">
        <div data-testid="delivery-options-container">
          <div className="pb-2 pt-0 md:pt-0">
            {!hasCompleteAddress ? (
              <div className="mb-4 rounded-md bg-[#f5f5f5] px-4 py-3 text-sm text-[#6d7175]">
                {t('shippingNeedsAddress')}
              </div>
            ) : null}
            {loadFailed ? (
              <Text className="text-sm text-[#6d7175]">{t('shippingOptionsLoadFailed')}</Text>
            ) : null}
            {isEur && hasCompleteAddress && !loadFailed && filteredGroupedBySellerId.length > 0 ? (
              <p className="mb-4 rounded-md bg-[#f5f2eb] px-3 py-2 text-xs leading-snug text-[#3d3a36]">
                {t('shippingTramelleCheckoutNote')}
              </p>
            ) : null}
            {!loadFailed && filteredGroupedBySellerId.length === 0
              ? hasCompleteAddress
                ? isCartShippingReadyForPay(cart as HttpTypes.StoreCart) ? (
                    <Text className="text-sm text-[#3d3a36]">
                      {t('shippingConsegnaProntaNoLista')}
                    </Text>
                  ) : (
                    <Text className="text-sm text-[#6d7175]">{t('noShippingOptions')}</Text>
                  )
                : null
              : !loadFailed
                ? filteredGroupedBySellerId.map(key => {
                  const options = groupedBySellerId[key] as StoreCardShippingMethod[];
                  const selectedId = selectedOptionIdForGroup(cart, options);
                  const blockLabel = tramelleBlockLabel(key);

                  const chosen =
                    (selectedId
                      ? options.find(o => o.id === selectedId)
                      : null) ?? options[0];
                  return (
                    <div key={key} className="mb-6 last:mb-0">
                      <h3 className="mb-3 flex flex-wrap items-baseline justify-between gap-2 text-sm font-medium text-[#202223]">
                        <span>
                        {options[0]?.seller_name ||
                          options[0]?.name ||
                          t('sellerShippingGroup')}
                        </span>
                        {isEur && blockLabel != null ? (
                          <span className="shrink-0 text-sm font-semibold text-[#1773b0]">
                            {blockLabel}
                          </span>
                        ) : null}
                      </h3>
                      <div
                        className="rounded-lg border border-[#d9d9d9] bg-[#fafafa] px-4 py-3"
                        data-testid={`delivery-readonly-block-${key}`}
                      >
                        {chosen ? (
                          <div className="flex min-w-0 flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between sm:gap-3">
                            <p className="text-sm font-medium text-[#202223]">
                              {chosen.name}
                            </p>
                            {!isEur ? (
                              <p className="shrink-0 text-sm text-[#6d7175]">
                                {formatOptionPrice(chosen)}
                              </p>
                            ) : null}
                          </div>
                        ) : (
                          <p className="text-sm text-[#6d7175]">—</p>
                        )}
                        <p className="mt-2 text-xs text-[#6d7175]">
                          {t('shippingReadOnlyNote')}
                        </p>
                        {isSavingShipping ? (
                          <p className="mt-1 text-xs text-[#1773b0]">
                            {t('shippingApplyingDefault')}
                          </p>
                        ) : null}
                      </div>
                    </div>
                  );
                })
                : null}
          </div>
        </div>
        <ErrorMessage error={error} data-testid="delivery-option-error-message" />
      </div>
    </div>
  );
};

export default CartShippingMethodsSection;
