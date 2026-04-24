'use client';

import { Button } from '@/components/atoms';
import LocalizedClientLink from '@/components/molecules/LocalizedLink/LocalizedLink';
import { CartEmpty, CartItems, CartSummary } from '@/components/organisms';
import { useCartContext } from '@/components/providers';
import { useTranslations } from 'next-intl';

export const Cart = () => {
  const { cart, wholesaleBuyer } = useCartContext();
  const t = useTranslations('Cart');

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
          <CartSummary
            item_total={cart?.item_subtotal || 0}
            shipping_total={cart?.shipping_subtotal || 0}
            total={cart?.total || 0}
            currency_code={cart?.currency_code || ''}
            tax={cart?.tax_total || 0}
            discount_total={cart?.discount_subtotal || 0}
          />
          <LocalizedClientLink href="/checkout">
            <Button className="flex w-full items-center justify-center py-3 uppercase tracking-wide mt-2">{t('goToCheckout')}</Button>
          </LocalizedClientLink>
        </div>
      </div>
    </>
  );
};
