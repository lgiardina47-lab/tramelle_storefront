'use client';

import { useEffect, useMemo, useState, type FC } from 'react';

import { RadioGroup } from '@headlessui/react';
import { CheckCircleSolid } from '@medusajs/icons';
import type { HttpTypes } from '@medusajs/types';
import { Heading, Text } from '@medusajs/ui';
import clsx from 'clsx';
import { useRouter } from 'next/navigation';

import ErrorMessage from '@/components/molecules/ErrorMessage/ErrorMessage';
import { setShippingMethod } from '@/lib/data/cart';
import { isCheckoutDeliveryAddressComplete } from '@/lib/helpers/checkout-delivery-address';
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
  availableShippingMethods:
    | (StoreCardShippingMethod &
        {
          rules: any;
          seller_id: string;
          price_type: string;
          id: string;
          amount?: number;
        }[])
    | null;
};

const CartShippingMethodsSection: FC<ShippingProps> = ({ cart, availableShippingMethods }) => {
  const t = useTranslations('Checkout');
  const [isSavingShipping, setIsSavingShipping] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const hasCompleteAddress = isCheckoutDeliveryAddressComplete(
    cart?.shipping_address
  );

  const shippingMethods = useMemo(
    () =>
      availableShippingMethods?.filter(
        sm => sm.rules?.find((rule: { attribute?: string; value?: string }) => rule.attribute === 'is_return')?.value !== 'true'
      ) ?? null,
    [availableShippingMethods]
  );

  const handleSetShippingMethod = async (id: string) => {
    if (!id || !hasCompleteAddress) return;

    let shouldRefresh = false;
    try {
      setError(null);
      setIsSavingShipping(true);
      const res = await setShippingMethod({
        cartId: cart.id,
        shippingMethodId: id
      });
      if (!res.ok) {
        setError(res.error?.message ?? t('genericError'));
        return;
      }
      shouldRefresh = true;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg.replace('Error setting up the request: ', '') || t('genericError'));
    } finally {
      setIsSavingShipping(false);
    }
    if (shouldRefresh) {
      router.refresh();
    }
  };

  useEffect(() => {
    setError(null);
  }, [hasCompleteAddress]);

  const groupedBySellerId: Record<string, StoreCardShippingMethod[]> =
    shippingMethods?.reduce((acc, method) => {
      const sellerId = method.seller_id ?? '__default__';

      if (!acc[sellerId]) {
        acc[sellerId] = [];
      }

      const isFlat = method.price_type === 'flat';
      const isCalculated = method.price_type === 'calculated';
      // Flat + regole: `calculated_price` su GET; provider manuale: no POST /calculate.
      const include = isFlat || isCalculated;

      if (include) {
        acc[sellerId].push(method as unknown as StoreCardShippingMethod);
      }

      return acc;
    }, {} as Record<string, StoreCardShippingMethod[]>) ?? {};

  const filteredGroupedBySellerId = Object.keys(groupedBySellerId).filter(
    key => (groupedBySellerId[key]?.length ?? 0) > 0
  );

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
    if (option.price_type === 'flat' && option.amount != null) {
      return convertToLocale({
        amount: minorUnitsToMajor(Number(option.amount), code),
        currency_code: code ?? 'eur',
      });
    }
    return '—';
  };

  const loadFailed = availableShippingMethods === null && hasCompleteAddress;

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
          {(cart.shipping_methods?.length ?? 0) > 0 && (
            <CheckCircleSolid className="text-[#1773b0]" />
          )}
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
            {!loadFailed && filteredGroupedBySellerId.length === 0
              ? hasCompleteAddress
                ? (
                    <Text className="text-sm text-[#6d7175]">{t('noShippingOptions')}</Text>
                  )
                : null
              : !loadFailed
                ? filteredGroupedBySellerId.map(key => {
                  const options = groupedBySellerId[key] as StoreCardShippingMethod[];
                  const selectedId = selectedOptionIdForGroup(cart, options);

                  return (
                    <div key={key} className="mb-6 last:mb-0">
                      <h3 className="mb-3 text-sm font-medium text-[#202223]">
                        {options[0]?.seller_name ||
                          options[0]?.name ||
                          t('sellerShippingGroup')}
                      </h3>
                      <RadioGroup
                        value={selectedId ?? undefined}
                        onChange={handleSetShippingMethod}
                        disabled={!hasCompleteAddress || isSavingShipping}
                        className="space-y-2"
                      >
                        {options.map((option: StoreCardShippingMethod) => (
                          <RadioGroup.Option
                            key={option.id}
                            value={option.id}
                            className={({ checked, disabled }) =>
                              clsx(
                                'relative flex cursor-pointer rounded-lg border px-4 py-3 text-left transition-colors',
                                disabled && 'cursor-not-allowed opacity-60',
                                checked
                                  ? 'border-[#1773b0] bg-white shadow-[inset_0_0_0_1px_rgba(23,115,176,0.35)]'
                                  : 'border-[#d9d9d9] bg-white hover:border-[#8c9196]'
                              )
                            }
                          >
                            {({ checked }) => (
                              <div className="flex w-full items-start gap-3">
                                <span
                                  className={clsx(
                                    'mt-0.5 flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full border-2',
                                    checked ? 'border-[#1773b0]' : 'border-[#8c9196]'
                                  )}
                                  aria-hidden
                                >
                                  {checked ? (
                                    <span className="h-2 w-2 rounded-full bg-[#1773b0]" />
                                  ) : null}
                                </span>
                                <div className="flex min-w-0 flex-1 items-start justify-between gap-3">
                                  <span className="text-sm font-medium text-[#202223]">
                                    {option.name}
                                  </span>
                                  <span className="shrink-0 text-sm font-medium text-[#202223]">
                                    {formatOptionPrice(option)}
                                  </span>
                                </div>
                              </div>
                            )}
                          </RadioGroup.Option>
                        ))}
                      </RadioGroup>
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
