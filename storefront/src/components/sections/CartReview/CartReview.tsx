'use client';

import type { HttpTypes } from '@medusajs/types';
import { useTranslations } from 'next-intl';

import { tramelleDisplayTotalShippingEur } from '@/lib/helpers/tramelle-seller-shipping-display';
import {
  cartShippingAmountAsMajor,
  medusaStoreAmountAsMajor
} from '@/lib/helpers/money';
import { MinimumOrderAlert } from '@/components/molecules/MinimumOrderAlert/MinimumOrderAlert';
import { CartSummary } from '@/components/organisms';
import { PromoCode } from '@/components/organisms/PromoCode/PromoCode';
import { useCartContext } from '@/components/providers';

import { CheckoutSummaryLineItems } from './CheckoutSummaryLineItems';
import PaymentButton from './PaymentButton';

const Review = ({
  cart,
  customer
}: {
  cart: any;
  customer?: HttpTypes.StoreCustomer | null;
}) => {
  const t = useTranslations('Checkout');
  const { minimumOrderViolations } = useCartContext();
  const minimumOrderBlocked = (minimumOrderViolations?.length ?? 0) > 0;

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
  const discMajor = medusaStoreAmountAsMajor(cart?.discount_total);
  const totalMajor = itemMajor + shipMajor + taxMajor - discMajor;

  return (
    <div
      className="text-[#202223] [&_.text-primary]:text-[#202223] [&_.label-xl]:font-semibold"
      data-testid="checkout-order-summary"
    >
      <h2 className="mb-5 text-lg font-semibold tracking-tight text-[#202223]">
        {t('orderSummary')}
      </h2>

      <MinimumOrderAlert
        violations={minimumOrderViolations}
        currencyCode={cart?.currency_code || 'eur'}
      />

      <div className="mb-6 w-full">
        <CheckoutSummaryLineItems cart={cart} />
      </div>

      <div className="mb-6">
        <PromoCode cart={cart} />
      </div>

      <div className="mb-6 w-full border-t border-[#e8e8e8] pt-6">
        <CartSummary
          item_total={itemMajor}
          shipping_total={shipMajor}
          total={Number.isFinite(totalMajor) ? totalMajor : (cart?.total || 0)}
          currency_code={currencyCode}
          tax={taxMajor}
          discount_total={discMajor}
        />
      </div>

      <div className="mt-6 border-t border-[#e8e8e8] pt-6" data-testid="checkout-place-order-block">
        <p className="mb-3 text-center text-xs text-[#6d7175]">
          {t('placeOrderHelper')}
        </p>
        <PaymentButton
          cart={cart}
          accountEmail={customer?.email ?? null}
          minimumOrderBlocked={minimumOrderBlocked}
          data-testid="submit-order-button"
        />
      </div>
    </div>
  );
};

export default Review;
