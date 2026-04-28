'use client';

import { useSearchParams } from 'next/navigation';
import { useEffect, useRef } from 'react';

import { placeOrder } from '@/lib/data/cart';

/**
 * Dopo redirect (es. PayPal/3DS) Stripe riporta su `return_url` con `payment_intent` e
 * `redirect_status`: completa l’ordine lato Medusa.
 */
export function CheckoutPaymentReturn() {
  const searchParams = useSearchParams();
  const ran = useRef(false);

  useEffect(() => {
    if (typeof window === 'undefined' || ran.current) return;
    const status = searchParams.get('redirect_status');
    const paymentIntent = searchParams.get('payment_intent');
    if (!paymentIntent || !status) return;
    if (status !== 'succeeded' && status !== 'processing') return;

    ran.current = true;
    void (async () => {
      try {
        await placeOrder();
      } catch (e) {
        ran.current = false;
        console.error(e);
      }
    })();
  }, [searchParams]);

  return null;
}
