import { Suspense } from 'react';

import type { HttpTypes } from '@medusajs/types';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';

import PaymentWrapper from '@/components/organisms/PaymentContainer/PaymentWrapper';
import { CartAddressSection } from '@/components/sections/CartAddressSection/CartAddressSection';
import CartPaymentSection from '@/components/sections/CartPaymentSection/CartPaymentSection';
import CartReview from '@/components/sections/CartReview/CartReview';
import { CheckoutBreadcrumb } from '@/components/sections/CheckoutBreadcrumb/CheckoutBreadcrumb';
import CartShippingMethodsSection from '@/components/sections/CartShippingMethodsSection/CartShippingMethodsSection';
import { countryCodeToStorefrontMessagesLocale } from '@/lib/i18n/storefront-messages-locale';
import {
  ensureCartEmailFromCustomer,
  ensureDefaultPaymentSessionForCheckout,
  retrieveCart
} from '@/lib/data/cart';
import { retrieveCustomer } from '@/lib/data/customer';
import { listCartShippingMethods } from '@/lib/data/fulfillment';
import { listCartPaymentMethods } from '@/lib/data/payment';

export const dynamic = 'force-dynamic';

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
      className="animate-pulse border-b border-[#e8e8e8] pb-10"
      data-testid="checkout-step-skeleton"
      aria-busy
    >
      <div className="mb-5 h-6 w-48 rounded bg-[#e8e8e8]" />
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="h-11 rounded bg-[#f3f3f3]" />
        <div className="h-11 rounded bg-[#f3f3f3]" />
        <div className="h-11 rounded sm:col-span-2 bg-[#f3f3f3]" />
        <div className="h-11 rounded sm:col-span-2 bg-[#f3f3f3]" />
      </div>
    </div>
  );
}

async function CheckoutAddressStep({
  cart,
  customer,
}: {
  cart: HttpTypes.StoreCart;
  customer: HttpTypes.StoreCustomer | null;
}) {
  return <CartAddressSection cart={cart} customer={customer} />;
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
  const [initialCart, customer] = await Promise.all([
    retrieveCart(),
    retrieveCustomer()
  ]);

  let cart = initialCart;

  if (!cart) {
    redirect(`/${locale}/cart`);
  }
  /** Senza righe o `items` assente: stesso trattamento (evita checkout con 0 opzioni spedizione). */
  if (!cart.items?.length) {
    redirect(`/${locale}/cart`);
  }

  cart =
    (await ensureCartEmailFromCustomer(cart, customer)) ?? cart;
  cart = (await ensureDefaultPaymentSessionForCheckout(cart)) ?? cart;

  /**
   * Spedizione: stessa risposta del carrello; parallelizzata solo con se stessa (già no-store).
   */
  const availableShippingForCart = await listCartShippingMethods(cart.id, false);

  return (
    <PaymentWrapper cart={cart}>
      <div
        className="checkout-shopify flex min-h-[calc(100dvh-3.75rem)] w-full flex-1 flex-col lg:min-h-0 lg:flex-row"
        data-testid="checkout-page"
      >
        <aside
          className="order-1 border-b border-[#e8e8e8] bg-[#fafafa] px-5 py-6 sm:px-8 lg:order-2 lg:w-[42%] lg:max-w-none lg:flex-none lg:border-b-0 lg:border-l lg:border-[#e8e8e8] lg:px-8 lg:py-10"
          data-testid="checkout-review-container"
        >
          <div className="mx-auto w-full max-w-md lg:sticky lg:top-6 lg:max-w-none lg:self-start">
            <CartReview cart={cart} customer={customer} />
          </div>
        </aside>

        <section className="order-2 flex w-full flex-1 flex-col bg-white lg:order-1 lg:w-[58%] lg:max-w-none">
          <main className="mx-auto w-full max-w-xl px-5 py-8 sm:px-8 lg:ml-auto lg:mr-0 lg:max-w-[32rem] lg:px-10 lg:py-10 xl:pr-14">
            <CheckoutBreadcrumb customer={customer} locale={locale} />
            <div className="flex flex-col" data-testid="checkout-steps-container">
              <Suspense fallback={<CheckoutStepSkeleton />}>
                <CheckoutAddressStep cart={cart} customer={customer} />
              </Suspense>
              <CartShippingMethodsSection
                cart={cart}
                availableShippingMethods={availableShippingForCart}
              />
              <Suspense fallback={<CheckoutStepSkeleton />}>
                <CheckoutPaymentStep cart={cart} />
              </Suspense>
            </div>
          </main>
        </section>
      </div>
    </PaymentWrapper>
  );
}
