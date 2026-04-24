'use client';

import { CartSummary } from '@/components/organisms';
import { PromoCode } from '@/components/organisms/PromoCode/PromoCode';

import { CartItems } from './CartItems';
import PaymentButton from './PaymentButton';

const Review = ({ cart }: { cart: any }) => {
  const paidByGiftcard = cart?.gift_cards && cart?.gift_cards?.length > 0 && cart?.total === 0;

  const shippingReady = (cart.shipping_methods?.length ?? 0) > 0;

  const previousStepsCompleted =
    cart.shipping_address &&
    shippingReady &&
    (cart.payment_collection || paidByGiftcard);

  return (
    <div className="rounded-lg border border-[#d9d9d9] bg-[#fafafa] p-5 shadow-sm lg:p-6">
      <div className="mb-5 w-full">
        <CartItems cart={cart} />
      </div>

      <div className="mb-5">
        <PromoCode cart={cart} />
      </div>

      <div className="mb-5 w-full border-t border-[#e8e8e8] pt-5 text-[#202223] [&_.text-primary]:text-[#202223] [&_.label-xl]:font-semibold">
        <CartSummary
          item_total={cart?.item_subtotal || 0}
          shipping_total={cart?.shipping_subtotal || 0}
          total={cart?.total || 0}
          currency_code={cart?.currency_code || ''}
          tax={cart?.tax_total || 0}
          discount_total={cart?.discount_total || 0}
        />
      </div>

      {previousStepsCompleted && (
        <PaymentButton
          cart={cart}
          data-testid="submit-order-button"
        />
      )}
    </div>
  );
};

export default Review;
