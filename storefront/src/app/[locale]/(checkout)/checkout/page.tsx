import { Suspense } from 'react';

import type { HttpTypes } from '@medusajs/types';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';

import PaymentWrapper from '@/components/organisms/PaymentContainer/PaymentWrapper';
import { CartAddressSection } from '@/components/sections/CartAddressSection/CartAddressSection';
import CartPaymentSection from '@/components/sections/CartPaymentSection/CartPaymentSection';
import CartReview from '@/components/sections/CartReview/CartReview';
import CartShippingMethodsSection from '@/components/sections/CartShippingMethodsSection/CartShippingMethodsSection';
import { countryCodeToStorefrontMessagesLocale } from '@/lib/i18n/storefront-messages-locale';
import { retrieveCart } from '@/lib/data/cart';
import { retrieveCustomer } from '@/lib/data/customer';
import { listCartShippingMethods } from '@/lib/data/fulfillment';
import { listCartPaymentMethods } from '@/lib/data/payment';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale: country } = await params;
  const uiLocale = countryCodeToStorefrontMessagesLocale(country);
  setRequestLocale(uiLocale);
  const t = await getTranslations('Checkout');
  return {
    title: t('pageTitle'),
    description: t('pageDescription'),
  };
}

/** Skeleton per i blocchi indirizzo / consegna / pagamento (dati in streaming). */
function CheckoutStepSkeleton() {
  return (
    <div
      className="min-h-[100px] animate-pulse rounded-sm border border-ui-border-base bg-ui-bg-subtle p-4"
      data-testid="checkout-step-skeleton"
      aria-busy
    >
      <div className="h-5 w-36 rounded-md bg-ui-bg-component-hover" />
      <div className="mt-4 h-16 rounded-md bg-ui-bg-component-hover/80" />
    </div>
  );
}

async function CheckoutAddressStep({ cart }: { cart: HttpTypes.StoreCart }) {
  const customer = await retrieveCustomer();
  return <CartAddressSection cart={cart} customer={customer} />;
}

async function CheckoutDeliveryStep({ cart }: { cart: HttpTypes.StoreCart }) {
  const shippingMethods = await listCartShippingMethods(cart.id, false);
  return (
    <CartShippingMethodsSection
      cart={cart}
      availableShippingMethods={shippingMethods as any}
    />
  );
}

async function CheckoutPaymentStep({ cart }: { cart: HttpTypes.StoreCart }) {
  const paymentMethods = await listCartPaymentMethods(cart.region?.id ?? '');
  return (
    <CartPaymentSection cart={cart} availablePaymentMethods={paymentMethods} />
  );
}

export default async function CheckoutPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const cart = await retrieveCart();

  /** Fuori da Suspense: così `redirect()` è una risposta HTTP pulita, non stream + fallback 404. */
  if (!cart || !cart.items?.length) {
    redirect(`/${locale}/cart`);
  }

  return (
    <PaymentWrapper cart={cart}>
      <main className="container" data-testid="checkout-page">
        <div className="grid gap-8 lg:grid-cols-11">
          <div className="flex flex-col gap-4 lg:col-span-6" data-testid="checkout-steps-container">
            <Suspense fallback={<CheckoutStepSkeleton />}>
              <CheckoutAddressStep cart={cart} />
            </Suspense>
            <Suspense fallback={<CheckoutStepSkeleton />}>
              <CheckoutDeliveryStep cart={cart} />
            </Suspense>
            <Suspense fallback={<CheckoutStepSkeleton />}>
              <CheckoutPaymentStep cart={cart} />
            </Suspense>
          </div>

          <div className="lg:col-span-5" data-testid="checkout-review-container">
            <CartReview cart={cart} />
          </div>
        </div>
      </main>
    </PaymentWrapper>
  );
}
