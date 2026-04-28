import type { Metadata } from 'next';
import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';

import { CheckoutPaymentReturn } from '@/components/organisms/PaymentContainer/CheckoutPaymentReturn';
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
  reissueTramelleStripeConnectIntentIfPresent,
  retrieveCart
} from '@/lib/data/cart';
import { buildCheckoutStripeBootstrap } from '@/lib/helpers/checkout-resolve-stripe-session';
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
  /** Intent strict card+paypal senza seconda round trip client (evita rotellina + PE vuoto). */
  cart = (await reissueTramelleStripeConnectIntentIfPresent(cart)) ?? cart;

  const regionId = cart.region?.id ?? "";
  const [availableShippingForCart, availablePaymentMethods] = await Promise.all([
    listCartShippingMethods(cart.id, false),
    listCartPaymentMethods(regionId),
  ]);

  const checkoutStripeBootstrap = buildCheckoutStripeBootstrap(cart);

  return (
    <PaymentWrapper cart={cart} checkoutStripeBootstrap={checkoutStripeBootstrap}>
      <Suspense fallback={null}>
        <CheckoutPaymentReturn />
      </Suspense>
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
          <main className="w-full max-w-none px-5 py-8 sm:px-8 lg:px-10 lg:py-10 xl:pr-14">
            <CheckoutBreadcrumb customer={customer} locale={locale} />
            <div className="flex flex-col" data-testid="checkout-steps-container">
              <CartAddressSection cart={cart} customer={customer} />
              <CartShippingMethodsSection
                cart={cart}
                availableShippingMethods={availableShippingForCart}
              />
              <CartPaymentSection
                cart={cart}
                availablePaymentMethods={availablePaymentMethods}
              />
            </div>
          </main>
        </section>
      </div>
    </PaymentWrapper>
  );
}
