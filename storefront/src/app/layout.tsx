import type { Metadata } from 'next';
import { Funnel_Display } from 'next/font/google';

import './globals.css';

import { Toaster } from '@medusajs/ui';

import { retrieveCart } from '@/lib/data/cart';
import { retrieveCustomer } from '@/lib/data/customer';
import { isWholesaleCustomer } from '@/lib/helpers/wholesale-customer';

import { Providers } from './providers';

import {
  allowSearchIndexing,
  DEFAULT_PUBLIC_SITE_ORIGIN,
  publicSiteOrigin,
  resolvedSiteDescription,
  resolvedSiteName,
} from '@/lib/constants/site';

function safeMetadataBase(): URL {
  try {
    return new URL(publicSiteOrigin());
  } catch {
    return new URL(DEFAULT_PUBLIC_SITE_ORIGIN);
  }
}

const funnelDisplay = Funnel_Display({
  variable: '--font-funnel-sans',
  subsets: ['latin'],
  weight: ['300', '400', '500', '600']
});

export const metadata: Metadata = {
  title: {
    template: `%s | ${resolvedSiteName()}`,
    default: resolvedSiteName(),
  },
  description: resolvedSiteDescription(),
  metadataBase: safeMetadataBase(),
  ...(!allowSearchIndexing()
    ? {
        robots: {
          index: false,
          follow: false,
          googleBot: { index: false, follow: false },
        },
      }
    : {}),
  icons: {
    icon: [{ url: '/tramelle_icon.svg', type: 'image/svg+xml' }],
    apple: '/tramelle_icon.svg',
    shortcut: '/tramelle_icon.svg'
  },
  alternates: {
    languages: {
      'x-default': publicSiteOrigin()
    }
  }
};

export default async function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cart = await retrieveCart();
  let wholesaleBuyer = false;
  try {
    const customer = await retrieveCustomer();
    wholesaleBuyer = isWholesaleCustomer(customer);
  } catch {
    wholesaleBuyer = false;
  }

  /** Default finché non monta `[locale]` + `DocumentHtmlLangFromLocale` (next-intl). */
  const htmlLang = "it-IT";

  return (
    <html lang={htmlLang} className="">
      <body className={`${funnelDisplay.className} relative bg-primary text-secondary antialiased`}>
        <Providers cart={cart} wholesaleBuyer={wholesaleBuyer}>{children}</Providers>
        <Toaster position="top-right" />
      </body>
    </html>
  );
}
