'use client';

import { startTransition, useEffect, useMemo, useRef, useState } from 'react';

import { RadioGroup } from '@headlessui/react';
import { CheckCircleSolid } from '@medusajs/icons';
import { Heading, Text } from '@medusajs/ui';

import ErrorMessage from '@/components/molecules/ErrorMessage/ErrorMessage';
import { initiatePaymentSession } from '@/lib/data/cart';
import { useRouter } from 'next/navigation';

import { isCartShippingReadyForPay } from '@/lib/helpers/tramelle-seller-shipping-display';

import {
  isManual,
  isStripe as isStripeFunc,
  paymentInfoMap
} from '../../../lib/constants';
import PaymentContainer, {
  StripeCardContainer
} from '../../organisms/PaymentContainer/PaymentContainer';
import { useTranslations } from 'next-intl';

type StoreCardPaymentMethod = any & {
  service_zone?: {
    fulfillment_set: {
      type: string;
    };
  };
};

const CartPaymentSection = ({
  cart,
  availablePaymentMethods
}: {
  cart: any;
  availablePaymentMethods: StoreCardPaymentMethod[] | null;
}) => {
  const t = useTranslations('Checkout');
  const router = useRouter();
  const activeSession = cart.payment_collection?.payment_sessions?.find(
    (paymentSession: any) => paymentSession.status === 'pending'
  );

  const [error, setError] = useState<string | null>(null);
  const [cardBrand, setCardBrand] = useState<string | null>(null);
  const [cardComplete, setCardComplete] = useState(false);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState(
    activeSession?.provider_id ?? ''
  );
  const didReplaceManual = useRef(false);
  const didEnsurePaymentAfterShipping = useRef(false);
  const cartRef = useRef(cart);
  cartRef.current = cart;

  const setPaymentMethod = async (method: string) => {
    setError(null);
    setSelectedPaymentMethod(method);
    try {
      await initiatePaymentSession(cart, {
        provider_id: method
      });
      startTransition(() => {
        router.refresh();
      });
    } catch (err: any) {
      setError(err?.message || t('genericError'));
    }
  };

  const paidByGiftcard = cart?.gift_cards && cart?.gift_cards?.length > 0 && cart?.total === 0;

  const shippingOk = isCartShippingReadyForPay(cart);
  const paymentReady = (activeSession && shippingOk) || paidByGiftcard;

  useEffect(() => {
    setError(null);
  }, [selectedPaymentMethod]);

  useEffect(() => {
    const id = activeSession?.provider_id;
    if (id && id !== selectedPaymentMethod) {
      setSelectedPaymentMethod(id);
    }
  }, [activeSession?.provider_id, selectedPaymentMethod]);

  const payMethods = (availablePaymentMethods ?? []).filter(
    p => p?.id && !isManual(p.id)
  );

  const firstNonManualPayId = useMemo(
    () =>
      (availablePaymentMethods ?? []).find(
        p => p?.id && !isManual(p.id)
      )?.id,
    [availablePaymentMethods]
  );

  useEffect(() => {
    didReplaceManual.current = false;
    didEnsurePaymentAfterShipping.current = false;
  }, [cart?.id]);

  useEffect(() => {
    if (!shippingOk) {
      didEnsurePaymentAfterShipping.current = false;
    }
  }, [shippingOk]);

  useEffect(() => {
    if (didReplaceManual.current || paidByGiftcard) {
      return;
    }
    if (!activeSession || !isManual(activeSession.provider_id) || !firstNonManualPayId) {
      return;
    }
    didReplaceManual.current = true;
    void setPaymentMethod(firstNonManualPayId);
  }, [activeSession?.provider_id, firstNonManualPayId, paidByGiftcard, cart?.id]);

  /** Dopo l’applicazione spedizione (lato client) la sessione paga può mancare un frame: allinea come `ensureDefaultPaymentSession` server. */
  useEffect(() => {
    if (paidByGiftcard || !shippingOk || !firstNonManualPayId) {
      return;
    }
    if (activeSession && !isManual(activeSession.provider_id)) {
      return;
    }
    if (activeSession && isManual(activeSession.provider_id)) {
      return;
    }
    if (didEnsurePaymentAfterShipping.current) {
      return;
    }
    didEnsurePaymentAfterShipping.current = true;
    void (async () => {
      try {
        await initiatePaymentSession(cartRef.current, { provider_id: firstNonManualPayId });
        startTransition(() => {
          router.refresh();
        });
      } catch {
        didEnsurePaymentAfterShipping.current = false;
      }
    })();
  }, [
    activeSession?.id,
    activeSession?.provider_id,
    firstNonManualPayId,
    paidByGiftcard,
    router,
    shippingOk
  ]);

  return (
    <div
      className="bg-white pb-2 pt-2 lg:pb-6"
      data-testid="checkout-step-payment"
    >
      <div className="mb-2 flex flex-row items-center justify-between">
        <Heading
          level="h2"
          className="flex flex-row items-baseline gap-x-2 text-lg font-semibold text-[#202223]"
        >
          {paymentReady && <CheckCircleSolid className="text-[#1773b0]" />}
          {t('payment')}
        </Heading>
      </div>
      <Text className="mb-5 text-sm text-[#6d7175]">{t('paymentSecureHint')}</Text>
      <div>
        {!paidByGiftcard && payMethods.length ? (
          <>
            <RadioGroup
              value={selectedPaymentMethod}
              onChange={(value: string) => setPaymentMethod(value)}
            >
              {payMethods.map(paymentMethod => (
                <div key={paymentMethod.id}>
                  {isStripeFunc(paymentMethod.id) ? (
                    <StripeCardContainer
                      paymentProviderId={paymentMethod.id}
                      selectedPaymentOptionId={selectedPaymentMethod}
                      paymentInfoMap={paymentInfoMap}
                      setCardBrand={setCardBrand}
                      setError={setError}
                      setCardComplete={setCardComplete}
                    />
                  ) : (
                    <PaymentContainer
                      paymentInfoMap={paymentInfoMap}
                      paymentProviderId={paymentMethod.id}
                      selectedPaymentOptionId={selectedPaymentMethod}
                    />
                  )}
                </div>
              ))}
            </RadioGroup>
          </>
        ) : null}

        {!paidByGiftcard && (availablePaymentMethods?.length ?? 0) > 0 && payMethods.length === 0 && (
          <Text className="text-sm text-amber-800">
            {t('paymentManualDisabledHint')}
          </Text>
        )}

        {paidByGiftcard && (
          <div className="flex w-1/3 flex-col">
            <Text className="txt-medium-plus text-ui-fg-base mb-1">{t('paymentMethod')}</Text>
            <Text
              className="txt-medium text-ui-fg-subtle"
              data-testid="payment-method-summary"
            >
              {t('giftCard')}
            </Text>
          </div>
        )}

        <ErrorMessage
          error={error}
          data-testid="payment-method-error-message"
        />
      </div>
    </div>
  );
};

export default CartPaymentSection;
