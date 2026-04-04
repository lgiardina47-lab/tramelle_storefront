import {
  BannerSection,
  BlogSection,
  Hero,
  HomeCategories,
  HomeProductSection,
  ShopByStyleSection,
} from "@/components/sections"

import type { Metadata } from "next"
import Script from "next/script"
import { listRegions } from "@/lib/data/regions"
import { toHreflang } from "@/lib/helpers/hreflang"
import {
  getIndexingRobots,
  publicSiteOrigin,
  resolvedSiteName,
} from "@/lib/constants/site"

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const { locale } = await params

  const baseUrl = publicSiteOrigin()

  // Build alternates based on available regions (locales)
  let languages: Record<string, string> = {}
  try {
    const regions = await listRegions()
    const locales = Array.from(
      new Set(
        (regions || [])
          .map((r) => r.countries?.map((c) => c.iso_2) || [])
          .flat()
          .filter(Boolean)
      )
    ) as string[]

    languages = locales.reduce<Record<string, string>>((acc, code) => {
      const hrefLang = toHreflang(code)
      acc[hrefLang] = `${baseUrl}/${code}`
      return acc
    }, {})
  } catch {
    // Fallback: only current locale
    languages = { [toHreflang(locale)]: `${baseUrl}/${locale}` }
  }

  const title = "Home"
  const description =
    "Benvenuto su Tramelle: compra, vendi e scopri tesori di moda pre-loved dalle firme più desiderate."
  const ogImage = "/B2C_Storefront_Open_Graph.png"
  const canonical = `${baseUrl}/${locale}`

  return {
    title,
    description,
    robots: getIndexingRobots({ googleBotRich: true }),
    alternates: {
      canonical,
      languages: {
        ...languages,
        "x-default": baseUrl,
      },
    },
    openGraph: {
      title: `${title} | ${resolvedSiteName()}`,
      description,
      url: canonical,
      siteName: resolvedSiteName(),
      type: "website",
      images: [
        {
          url: ogImage.startsWith("http") ? ogImage : `${baseUrl}${ogImage}`,
          width: 1200,
          height: 630,
          alt: resolvedSiteName(),
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [ogImage.startsWith("http") ? ogImage : `${baseUrl}${ogImage}`],
    },
  }
}

export default async function Home({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params

  const baseUrl = publicSiteOrigin()

  const siteName = resolvedSiteName()

  return (
    <main className="flex flex-col gap-8 row-start-2 items-center sm:items-start text-primary">
      <link
        rel="preload"
        as="image"
        href="/images/hero/Image.jpg"
        imageSrcSet="/images/hero/Image.jpg 700w"
        imageSizes="(min-width: 1024px) 50vw, 100vw"
      />
      {/* Organization JSON-LD */}
      <Script
        id="ld-org"
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Organization",
            name: siteName,
            url: `${baseUrl}/${locale}`,
            logo: `${baseUrl}/tramelle.svg`,
          }),
        }}
      />
      {/* WebSite JSON-LD */}
      <Script
        id="ld-website"
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "WebSite",
            name: siteName,
            url: `${baseUrl}/${locale}`,
            inLanguage: toHreflang(locale),
          }),
        }}
      />

      <Hero
        image="/images/hero/Image.jpg"
        heading="Gourmet finds, delivered with care"
        paragraph="Discover curated specialties, small-batch producers, and pantry gems on Tramelle — your gourmet marketplace."
        buttons={[
          { label: "Buy now", path: "/categories" },
          {
            label: "Sell now",
            path:
              process.env.NEXT_PUBLIC_VENDOR_URL ||
              "https://vendor.mercurjs.com",
          },
        ]}
      />
      <div className="px-4 lg:px-8 w-full">
        <HomeProductSection heading="trending listings" locale={locale} home />
      </div>
      <div className="px-4 lg:px-8 w-full">
        <HomeCategories heading="SHOP BY CATEGORY" />
      </div>
      <BannerSection />
      <ShopByStyleSection />
      <BlogSection />
    </main>
  )
}
