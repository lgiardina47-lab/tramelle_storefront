import type { Metadata } from 'next';
import { Funnel_Display } from 'next/font/google';

import './globals.css';

import { Toaster } from '@medusajs/ui';
import Head from 'next/head';

import { HtmlLangSetter } from '@/components/atoms/HtmlLangSetter/HtmlLangSetter';
import { retrieveCart } from '@/lib/data/cart';

import { Providers } from './providers';

import {
  allowSearchIndexing,
  publicSiteOrigin,
  resolvedSiteDescription,
  resolvedSiteName,
} from '@/lib/constants/site';

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
  metadataBase: new URL(publicSiteOrigin()),
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

  const ALGOLIA_APP = process.env.NEXT_PUBLIC_ALGOLIA_ID;
  // default lang updated by HtmlLangSetter
  const htmlLang = 'en';

  return (
    <html
      lang={htmlLang}
      className=""
    >
      <Head>
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          rel="dns-prefetch"
          href="https://fonts.gstatic.com"
        />
        <link
          rel="preconnect"
          href="https://fonts.googleapis.com"
          crossOrigin="anonymous"
        />
        <link
          rel="dns-prefetch"
          href="https://fonts.googleapis.com"
        />
        <link
          rel="preconnect"
          href="https://i.imgur.com"
          crossOrigin="anonymous"
        />
        <link
          rel="dns-prefetch"
          href="https://i.imgur.com"
        />
        {ALGOLIA_APP && (
          <>
            <link
              rel="preconnect"
              href="https://algolia.net"
              crossOrigin="anonymous"
            />
            <link
              rel="preconnect"
              href="https://algolianet.com"
              crossOrigin="anonymous"
            />
            <link
              rel="dns-prefetch"
              href="https://algolia.net"
            />
            <link
              rel="dns-prefetch"
              href="https://algolianet.com"
            />
          </>
        )}
        {/* Image origins for faster LCP */}
        <link
          rel="preconnect"
          href="https://medusa-public-images.s3.eu-west-1.amazonaws.com"
          crossOrigin="anonymous"
        />
        <link
          rel="dns-prefetch"
          href="https://medusa-public-images.s3.eu-west-1.amazonaws.com"
        />
        <link
          rel="preconnect"
          href="https://mercur-connect.s3.eu-central-1.amazonaws.com"
          crossOrigin="anonymous"
        />
        <link
          rel="dns-prefetch"
          href="https://mercur-connect.s3.eu-central-1.amazonaws.com"
        />
        <link
          rel="preconnect"
          href="https://s3.eu-central-1.amazonaws.com"
          crossOrigin="anonymous"
        />
        <link
          rel="dns-prefetch"
          href="https://s3.eu-central-1.amazonaws.com"
        />
        <link
          rel="preconnect"
          href="https://api.mercurjs.com"
          crossOrigin="anonymous"
        />
        <link
          rel="dns-prefetch"
          href="https://api.mercurjs.com"
        />
      </Head>
      <body className={`${funnelDisplay.className} relative bg-primary text-secondary antialiased`}>
        <HtmlLangSetter />
        <Providers cart={cart}>{children}</Providers>
        <Toaster position="top-right" />
      </body>
    </html>
  );
}
