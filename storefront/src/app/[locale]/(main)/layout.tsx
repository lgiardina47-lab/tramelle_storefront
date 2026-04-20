import { Suspense } from 'react';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';

import { Footer, Header } from '@/components/organisms';
import { HeaderShellFallback } from '@/components/organisms/Header/HeaderShellFallback';
import { comingSoonHomeDisabledByEnv } from '@/lib/constants/coming-soon-public-home';
import { TalkJsProvider } from '@/components/providers';
import { CustomerStorefrontLocaleSync } from '@/components/utilities/CustomerStorefrontLocaleSync/CustomerStorefrontLocaleSync';
import { retrieveCustomer } from '@/lib/data/customer';
import { checkRegion } from '@/lib/helpers/check-region';
import { getCustomerPreferredStorefrontCountry } from '@/lib/helpers/customer-storefront-locale';
export default async function RootLayout({
  children,
  params
}: Readonly<{
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}>) {
  const APP_ID = process.env.NEXT_PUBLIC_TALKJS_APP_ID;
  const { locale } = await params;

  const [user, regionCheck, headerList] = await Promise.all([
    retrieveCustomer(),
    checkRegion(locale),
    headers(),
  ]);

  if (!regionCheck) {
    return redirect('/');
  }

  const preferredCountry = getCustomerPreferredStorefrontCountry(user);
  const localeSync = (
    <CustomerStorefrontLocaleSync
      currentLocale={locale}
      preferredCountry={preferredCountry}
      isLoggedIn={Boolean(user?.id)}
    />
  );

  const minimalHome = comingSoonHomeDisabledByEnv()
    ? false
    : headerList.get('x-tramelle-minimal-home') === '1';
  if (minimalHome) {
    return (
      <>
        {localeSync}
        {children}
      </>
    );
  }

  if (!APP_ID || !user || !user.id || !user.email)
    return (
      <>
        {localeSync}
        <Suspense fallback={<HeaderShellFallback />}>
          <Header locale={locale} />
        </Suspense>
        {children}
        <Footer />
      </>
    );

  const userName = [user.first_name, user.last_name].filter(Boolean).join(' ') || 'User';

  return (
    <TalkJsProvider
      appId={APP_ID}
      userId={user.id}
      userName={userName}
      userEmail={user.email}
    >
      {localeSync}
      <Suspense fallback={<HeaderShellFallback />}>
        <Header locale={locale} />
      </Suspense>
      {children}
      <Footer />
    </TalkJsProvider>
  );
}
