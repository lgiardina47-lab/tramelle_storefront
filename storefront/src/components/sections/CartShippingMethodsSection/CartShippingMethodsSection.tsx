'use client';

import { Fragment, useEffect, useState, useTransition, type FC } from 'react';

import { Listbox, Transition } from '@headlessui/react';
import { CheckCircleSolid, ChevronUpDown, Loader } from '@medusajs/icons';
import type { HttpTypes } from '@medusajs/types';
import { clx, Heading, Text } from '@medusajs/ui';
import clsx from 'clsx';
import { useRouter } from 'next/navigation';

import ErrorMessage from '@/components/molecules/ErrorMessage/ErrorMessage';
import { removeShippingMethod, setShippingMethod } from '@/lib/data/cart';
import { calculatePriceForShippingOption } from '@/lib/data/fulfillment';
import { convertToLocale } from '@/lib/helpers/money';

import { CartShippingMethodRow } from './CartShippingMethodRow';
import { useTranslations } from 'next-intl';

// Extended cart item product type to include seller
type ExtendedStoreProduct = HttpTypes.StoreProduct & {
  seller?: {
    id: string;
    name: string;
  };
};

// Cart item type definition
type CartItem = {
  product?: ExtendedStoreProduct;
  // Include other cart item properties as needed
};

export type StoreCardShippingMethod = HttpTypes.StoreCartShippingOption & {
  seller_id?: string;
  service_zone?: {
    fulfillment_set: {
      type: string;
    };
  };
};

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
  const [isLoadingPrices, setIsLoadingPrices] = useState(false);
  const [calculatedPricesMap, setCalculatedPricesMap] = useState<Record<string, number>>({});
  const [error, setError] = useState<string | null>(null);
  const [, startTransitionDeleteRow] = useTransition();

  const router = useRouter();

  const hasCompleteAddress = Boolean(
    cart?.shipping_address?.first_name &&
      cart?.shipping_address?.last_name &&
      cart?.shipping_address?.address_1 &&
      cart?.shipping_address?.city &&
      cart?.shipping_address?.postal_code &&
      cart?.shipping_address?.country_code
  );

  const _shippingMethods = availableShippingMethods?.filter(
    sm => sm.rules?.find((rule: any) => rule.attribute === 'is_return')?.value !== 'true'
  );

  useEffect(() => {
    const set = new Set<string>();
    cart.items?.forEach(item => {
      if (item?.product?.seller?.id) {
        set.add(item.product.seller.id);
      }
    });
  }, [cart]);

  useEffect(() => {
    if (_shippingMethods?.length) {
      const promises = _shippingMethods
        .filter(sm => sm.price_type === 'calculated')
        .map(sm => calculatePriceForShippingOption(sm.id, cart.id));

      if (promises.length) {
        setIsLoadingPrices(true);
        Promise.allSettled(promises).then(res => {
          const pricesMap: Record<string, number> = {};
          res
            .filter(r => r.status === 'fulfilled')
            .forEach(p => (pricesMap[p.value?.id || ''] = p.value?.amount!));

          setCalculatedPricesMap(pricesMap);
          setIsLoadingPrices(false);
        });
      }
    }
  }, [availableShippingMethods, _shippingMethods, cart.id]);

  const handleSetShippingMethod = async (id: string | null) => {
    if (!id) {
      return;
    }

    try {
      setError(null);
      setIsLoadingPrices(true);
      const res = await setShippingMethod({
        cartId: cart.id,
        shippingMethodId: id
      });
      if (!res.ok) {
        return setError(res.error?.message);
      }
    } catch (error: any) {
      setError(
        error?.message?.replace('Error setting up the request: ', '') || t('genericError')
      );
    } finally {
      setIsLoadingPrices(false);
      router.refresh();
    }
  };

  const handleRemoveShippingMethod = (methodId: string) => {
    startTransitionDeleteRow(async () => {
      await removeShippingMethod(methodId);
    });
    router.refresh();
  };

  useEffect(() => {
    setError(null);
  }, [hasCompleteAddress]);

  const groupedBySellerId = _shippingMethods?.reduce((acc: any, method) => {
    const sellerId = method.seller_id ?? '__default__';

    if (!acc[sellerId]) {
      acc[sellerId] = [];
    }

    const flatAmount = Number(method.price_type === 'flat' ? method.amount : NaN);

    const include =
      (method.price_type === 'flat' && !isNaN(flatAmount)) ||
      method.price_type === 'calculated';

    if (include) {
      acc[sellerId].push(method);
    }

    return acc;
  }, {});

  const filteredGroupedBySellerId = Object.keys(groupedBySellerId || {}).filter(
    key => (groupedBySellerId?.[key]?.length ?? 0) > 0
  );

  return (
    <div className="bg-ui-bg-interactive rounded-sm border p-4">
      <div className="mb-6 flex flex-row items-center justify-between">
        <Heading
          level="h2"
          className="text-3xl-regular flex flex-row items-baseline gap-x-2"
        >
          {(cart.shipping_methods?.length ?? 0) > 0 && <CheckCircleSolid />}
          {t('delivery')}
        </Heading>
      </div>
      <>
        <div className="grid">
          <div data-testid="delivery-options-container">
            <div className="pb-8 pt-2 md:pt-0">
              {!hasCompleteAddress ? (
                <Text className="txt-medium text-ui-fg-subtle mb-4 block">
                  {t('shippingNeedsAddress')}
                </Text>
              ) : null}
              {filteredGroupedBySellerId.length === 0
                ? hasCompleteAddress
                  ? t('noShippingOptions')
                  : null
                : filteredGroupedBySellerId.map(key => (
                      <div
                        key={key}
                        className="mb-4"
                      >
                        <Heading
                          level="h3"
                          className="mb-2"
                        >
                          {groupedBySellerId[key][0].seller_name ||
                            groupedBySellerId[key][0].name ||
                            t('sellerShippingGroup')}
                        </Heading>
                        <Listbox
                          value={cart.shipping_methods?.[0]?.id}
                          onChange={value => {
                            handleSetShippingMethod(value);
                          }}
                          disabled={!hasCompleteAddress}
                        >
                          <div className="relative">
                            <Listbox.Button
                              className={clsx(
                                'text-base-regular relative flex h-12 w-full cursor-default items-center justify-between rounded-lg border bg-component-secondary px-4 text-left focus:outline-none focus-visible:border-gray-300 focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-opacity-75 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-300'
                              )}
                            >
                              {({ open }) => (
                                <>
                                  <span className="block truncate">{t('chooseDeliveryOption')}</span>
                                  <ChevronUpDown
                                    className={clx('transition-rotate duration-200', {
                                      'rotate-180 transform': open
                                    })}
                                  />
                                </>
                              )}
                            </Listbox.Button>
                            <Transition
                              as={Fragment}
                              leave="transition ease-in duration-100"
                              leaveFrom="opacity-100"
                              leaveTo="opacity-0"
                            >
                              <Listbox.Options
                                className="text-small-regular border-top-0 absolute z-20 max-h-60 w-full overflow-auto rounded-lg border bg-white focus:outline-none sm:text-sm"
                                data-testid="shipping-address-options"
                              >
                                {groupedBySellerId[key].map((option: any) => (
                                  <Listbox.Option
                                    className="relative cursor-pointer select-none border-b py-4 pl-6 pr-10 hover:bg-gray-50"
                                    value={option.id}
                                    key={option.id}
                                  >
                                    {option.name}
                                    {' - '}
                                    {option.price_type === 'flat' ? (
                                      convertToLocale({
                                        amount: option.amount!,
                                        currency_code: cart?.currency_code
                                      })
                                    ) : calculatedPricesMap[option.id] ? (
                                      convertToLocale({
                                        amount: calculatedPricesMap[option.id],
                                        currency_code: cart?.currency_code
                                      })
                                    ) : isLoadingPrices ? (
                                      <Loader />
                                    ) : (
                                      '-'
                                    )}
                                  </Listbox.Option>
                                ))}
                              </Listbox.Options>
                            </Transition>
                          </div>
                        </Listbox>
                      </div>
                    ))}
                {!!cart?.shipping_methods?.length && (
                  <div className="flex flex-col">
                    {cart.shipping_methods?.map(method => (
                      <CartShippingMethodRow
                        key={method.id}
                        method={method}
                        currency_code={cart.currency_code}
                        onRemoveShippingMethod={handleRemoveShippingMethod}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
          <div>
            <ErrorMessage
              error={error}
              data-testid="delivery-option-error-message"
            />
          </div>
        </>
    </div>
  );
};

export default CartShippingMethodsSection;
