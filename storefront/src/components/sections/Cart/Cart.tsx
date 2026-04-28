'use client';

import { Button } from '@/components/atoms';
import { MinimumOrderAlert } from '@/components/molecules/MinimumOrderAlert/MinimumOrderAlert';
import LocalizedClientLink from '@/components/molecules/LocalizedLink/LocalizedLink';
import { CartEmpty, CartItems, CartSummary } from '@/components/organisms';
import { useCartContext } from '@/components/providers';
import { tramelleDisplayTotalShippingEur } from '@/lib/helpers/tramelle-seller-shipping-display';
import {
  cartShippingAmountAsMajor,
  medusaStoreAmountAsMajor
} from '@/lib/helpers/money';
import { useTranslations } from 'next-intl';
import { useParams, useRouter } from 'next/navigation';
import { useEffect } from 'react';

export const Cart = () => {
  const { cart, wholesaleBuyer, minimumOrderViolations } = useCartContext();
  const router = useRouter();
  const params = useParams();
  const locale =
    typeof params?.locale === 'string' ? params.locale : 'it';
  const t = useTranslations('Cart');
  const minBlocked = (minimumOrderViolations?.length ?? 0) > 0;

  useEffect(() => {
    if (!cart?.items?.length || minBlocked) {
      return;
    }
    router.prefetch(`/${locale}/checkout`);
  }, [cart?.id, cart?.items?.length, locale, minBlocked, router]);
  const currencyCode = cart?.currency_code || 'eur';
  const itemMajor = medusaStoreAmountAsMajor(cart?.item_subtotal);
  const shipCountry = (
    cart?.shipping_address as { country_code?: string } | null | undefined
  )?.country_code;
  const shipMajor =
    currencyCode.toLowerCase() === 'eur' && cart
      ? tramelleDisplayTotalShippingEur(cart, shipCountry)
      : cartShippingAmountAsMajor(cart?.shipping_subtotal, currencyCode);
  const taxMajor = medusaStoreAmountAsMajor(cart?.tax_total);
  const discMajor = medusaStoreAmountAsMajor(cart?.discount_subtotal);
  const totalMajor = itemMajor + shipMajor + taxMajor - discMajor;

  if (!cart || !cart.items?.length) {
    return <CartEmpty />;
  }

  return (
    <>
      <div className="col-span-12 pt-6 pb-2">
        <h1 className="heading-md text-primary uppercase tracking-tight">{t('title')}</h1>
      </div>
      <div className="col-span-12 lg:col-span-6">
        <CartItems cart={cart} wholesaleBuyer={wholesaleBuyer} />
        {cart.items && cart.items.length > 1 && (
          <p className="mt-4 text-sm text-secondary leading-relaxed border-t pt-4">
            {t('multipleShipments')}
          </p>
        )}
      </div>
      <div className="lg:col-span-2"></div>
      <div className="col-span-12 lg:col-span-4">
        <div className="h-fit rounded-sm border p-5">
          <MinimumOrderAlert
            violations={minimumOrderViolations}
            currencyCode={cart?.currency_code || 'eur'}
          />
          <CartSummary
            item_total={itemMajor}
            shipping_total={shipMajor}
            total={Number.isFinite(totalMajor) ? totalMajor : (cart?.total || 0)}
            currency_code={currencyCode}
            tax={taxMajor}
            discount_total={discMajor}
          />
          {minBlocked ? (
            <Button
              disabled
              className="mt-2 flex w-full cursor-not-allowed items-center justify-center py-3 uppercase tracking-wide"
            >
              {t('goToCheckout')}
            </Button>
          ) : (
            <LocalizedClientLink href="/checkout">
              <Button className="mt-2 flex w-full items-center justify-center py-3 uppercase tracking-wide">
                {t('goToCheckout')}
              </Button>
            </LocalizedClientLink>
          )}
        </div>
      </div>
    </>
  );
};
