import { Cart } from '@/components/sections';
import { TranslatedPageLoading } from '@/components/molecules/TranslatedPageLoading/TranslatedPageLoading';
import { countryCodeToStorefrontMessagesLocale } from '@/lib/i18n/storefront-messages-locale';
import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Suspense } from 'react';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale: country } = await params;
  const uiLocale = countryCodeToStorefrontMessagesLocale(country);
  setRequestLocale(uiLocale);
  const t = await getTranslations('Cart');
  return {
    title: t('title'),
    description: t('pageDescription'),
  };
}

export default function CartPage() {
  return (
    <main className='container grid grid-cols-12'>
      <Suspense fallback={<TranslatedPageLoading namespace="Cart" testId="cart-page-loading" />}>
        <Cart />
      </Suspense>
    </main>
  );
}
