'use client';

import {
  CartItemsFooter,
  CartItemsHeader,
  CartItemsProducts,
} from '@/components/cells';
import { SellerCartPolicyBlock } from '@/components/molecules/SellerCartPolicyBlock/SellerCartPolicyBlock';
import { convertToLocale } from '@/lib/helpers/money';
import {
  sumLineSubtotalsEurForItems,
  tramelleDisplayShippingEurForSellerBlock,
  tramelleDisplayTotalShippingEur,
} from '@/lib/helpers/tramelle-seller-shipping-display';
import { HttpTypes } from '@medusajs/types';
import { useTranslations } from 'next-intl';

import { EmptyCart } from './EmptyCart';

export const CartItems = ({
  cart,
  wholesaleBuyer = false,
}: {
  cart: HttpTypes.StoreCart | null;
  wholesaleBuyer?: boolean;
}) => {
  const t = useTranslations('Cart');

  if (!cart) {
    return null;
  }

  const groupedItems: any = groupItemsBySeller(cart);
  const keys = Object.keys(groupedItems);

  if (!keys.length) {
    return <EmptyCart />;
  }

  const currency = cart.currency_code || 'eur';
  const isEur = currency.toLowerCase() === 'eur';
  const shipCountry = (
    cart.shipping_address as { country_code?: string } | null | undefined
  )?.country_code;

  const policyTotalEur = isEur
    ? tramelleDisplayTotalShippingEur(cart, shipCountry)
    : 0;
  const showTotalBlock = isEur
    ? policyTotalEur >= 0
    : false;

  return (
    <div className="flex flex-col gap-4">
      {keys.map(key => {
        const bucket = groupedItems[key];
        const seller = bucket?.seller;
        const sName = seller?.name || '—';
        const items = (bucket.items || []) as HttpTypes.StoreCartLineItem[];
        const subEur = isEur ? sumLineSubtotalsEurForItems(items) : 0;
        const ship =
          isEur && items.length
            ? tramelleDisplayShippingEurForSellerBlock(subEur, shipCountry)
            : { amountMajor: 0, isFree: true, zone: 'it' as const };
        const perSeller = isEur ? ship.amountMajor : 0;
        const footerHint = !isEur
          ? undefined
          : ship.isFree
            ? t('shippingBlockFree')
            : ship.zone === 'it'
              ? t('shippingFlatItHint')
              : t('shippingFlatEuHint');
        return (
          <div
            key={key}
            className="rounded-sm border border-[#e8e8e8] bg-white p-4 shadow-sm"
            data-testid={`cart-items-seller-${key}`}
          >
            <CartItemsHeader seller={seller} />
            {isEur ? <SellerCartPolicyBlock currencyCode={currency} /> : null}
            <CartItemsProducts
              products={items}
              currency_code={cart.currency_code}
              wholesaleBuyer={wholesaleBuyer}
            />
            <div className="mt-3">
              <CartItemsFooter
                currency_code={currency}
                price={perSeller}
                label={t('deliveryFromSeller', { seller: sName })}
                hint={footerHint}
              />
            </div>
          </div>
        );
      })}

      {isEur && showTotalBlock ? (
        <div className="rounded-sm border border-dashed border-[#c4c4c4] bg-[#fafafa] p-4 label-md">
          <div className="flex items-center justify-between">
            <p className="text-secondary font-medium">{t('totalShipping')}</p>
            <p className="text-primary font-semibold">
              {convertToLocale({
                amount: policyTotalEur,
                currency_code: currency,
              })}
            </p>
          </div>
          <p className="mt-1 text-xs text-[#6d7175]">
            {t('shippingTramellePolicyNote', {
              country: shipCountry
                ? String(shipCountry).toUpperCase()
                : 'IT',
            })}
          </p>
        </div>
      ) : null}
    </div>
  );
};

function groupItemsBySeller(cart: HttpTypes.StoreCart) {
  const groupedBySeller: any = {};

  cart.items?.forEach((item: any) => {
    const seller = item.product?.seller;
    if (seller) {
      if (!groupedBySeller[seller.id]) {
        groupedBySeller[seller.id] = {
          seller: seller,
          items: [],
        };
      }
      groupedBySeller[seller.id].items.push(item);
    } else {
      if (!groupedBySeller['fleek']) {
        groupedBySeller['fleek'] = {
          seller: {
            name: 'Tramelle',
            id: 'fleek',
            handle: '',
            photo: '/tramelle_icon.svg',
            created_at: new Date().toISOString(),
            rating: 0,
            reviewCount: 0,
            verified: false,
            joinDate: '',
            sold: 0,
            description: '',
          },
          items: [],
        };
      }
      groupedBySeller['fleek'].items.push(item);
    }
  });

  return groupedBySeller;
}
