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
      className="min-h-[100px] animate-pulse rounded-lg border border-[#e8e8e8] bg-white p-5 shadow-sm"
      data-testid="checkout-step-skeleton"
      aria-busy
    >
      <div className="h-5 w-36 rounded-md bg-[#e8e8e8]" />
      <div className="mt-4 h-16 rounded-md bg-[#f0f0f0]" />
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

  /** Solo carrello assente o confermato vuoto — evita redirect se `items` non è nell'espansione API. */
  if (!cart) {
    redirect(`/${locale}/cart`);
  }
  if (Array.isArray(cart.items) && cart.items.length === 0) {
    redirect(`/${locale}/cart`);
  }

  return (
    <PaymentWrapper cart={cart}>
      <main
        className="checkout-shopify mx-auto w-full max-w-[62rem] px-4 sm:px-6 py-6 lg:py-10"
        data-testid="checkout-page"
      >
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_min(100%,380px)] lg:items-start lg:gap-10">
          <div
            className="flex flex-col gap-5 bg-white lg:bg-transparent"
            data-testid="checkout-steps-container"
          >
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

          <aside
            className="lg:sticky lg:top-6 lg:self-start"
            data-testid="checkout-review-container"
          >
            <CartReview cart={cart} />
          </aside>
        </div>
      </main>
    </PaymentWrapper>
  );
}
