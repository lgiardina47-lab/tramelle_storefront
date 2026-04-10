import { headers } from 'next/headers';
import { redirect } from 'next/navigation';

import { Footer, Header } from '@/components/organisms';
import { TalkJsProvider } from '@/components/providers';
import { CustomerStorefrontLocaleSync } from '@/components/utilities/CustomerStorefrontLocaleSync/CustomerStorefrontLocaleSync';
import { retrieveCustomer } from '@/lib/data/customer';
import { checkRegion } from '@/lib/helpers/check-region';
import { getCustomerPreferredStorefrontCountry } from '@/lib/helpers/customer-storefront-locale';


export const runtime = "edge";

export default async function RootLayout({
  children,
  params
}: Readonly<{
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}>) {
  const APP_ID = process.env.NEXT_PUBLIC_TALKJS_APP_ID;
  const { locale } = await params;

  const user = await retrieveCustomer();
  const regionCheck = await checkRegion(locale);

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

  const minimalHome = (await headers()).get('x-tramelle-minimal-home') === '1';
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
        <Header locale={locale} />
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
      <Header locale={locale} />
      {children}
      <Footer />
    </TalkJsProvider>
  );
}
