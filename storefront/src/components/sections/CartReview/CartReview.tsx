'use client';

import type { HttpTypes } from '@medusajs/types';
import { useTranslations } from 'next-intl';

import {
  requiredShippingMethodCountForCart,
  tramelleDisplayTotalShippingEur
} from '@/lib/helpers/tramelle-seller-shipping-display';
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
  const paidByGiftcard = cart?.gift_cards && cart?.gift_cards?.length > 0 && cart?.total === 0;

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

  const needShip = cart ? requiredShippingMethodCountForCart(cart) : 0;
  const haveShip = cart.shipping_methods?.length ?? 0;
  const shippingReady = needShip > 0 && haveShip >= needShip;

  /**
   * Non richiedere `payment_collection` qui: la sessione Stripe può arrivare dopo (client/refresh);
   * se lo richiediamo, il CTA nel riepilogo resta nascosto mentre il blocco carta è già disegnato.
   */
  const previousStepsCompleted =
    paidByGiftcard ||
    (Boolean(cart.shipping_address) && shippingReady);

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

      {previousStepsCompleted && (
        <PaymentButton
          cart={cart}
          accountEmail={customer?.email ?? null}
          minimumOrderBlocked={minimumOrderBlocked}
          data-testid="submit-order-button"
        />
      )}
    </div>
  );
};

export default Review;
