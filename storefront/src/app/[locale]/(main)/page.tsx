import {
  BannerSection,
  BlogSection,
  HomeCategories,
  HomeProductSection,
  ShopByStyleSection,
} from "@/components/sections"
import { HomeCinematicHero } from "@/components/sections/HomeCinematicHero/HomeCinematicHero"
import { HomeFeaturedSellersSection } from "@/components/sections/HomeFeaturedSellersSection/HomeFeaturedSellersSection"
import { HomeHowItWorksSection } from "@/components/sections/HomeHowItWorksSection/HomeHowItWorksSection"
import LocalizedClientLink from "@/components/molecules/LocalizedLink/LocalizedLink"

import type { Metadata } from "next"
import Script from "next/script"
import { getTranslations } from "next-intl/server"
import { getCachedHomeHreflangLanguages } from "@/lib/data/home-hreflang-alternates"
import { toHreflang } from "@/lib/helpers/hreflang"
import {
  getIndexingRobots,
  publicSiteOrigin,
  resolvedSiteName,
} from "@/lib/constants/site"
import { getHeroHomeState } from "@/lib/hero/hero-home-load"

/** Dati catalogo senza ISR: pagina renderizzata a ogni richiesta. */
export const dynamic = "force-dynamic"

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const { locale } = await params

  const baseUrl = publicSiteOrigin()

  let languages: Record<string, string> = {}
  try {
    languages = await getCachedHomeHreflangLanguages(baseUrl)
    if (!Object.keys(languages).length) {
      languages = { [toHreflang(locale)]: `${baseUrl}/${locale}` }
    }
  } catch {
    languages = { [toHreflang(locale)]: `${baseUrl}/${locale}` }
  }

  const title = "Tramelle Source Gourmet — Il marketplace dell'eccellenza alimentare"
  const description =
    "La vetrina globale per i maestri del Gourmet. Produttori artigianali selezionati, specialità autentiche da tutto il mondo, B2C e Chef Pro."
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

  const [tHome, tFooter, heroHomeState] = await Promise.all([
    getTranslations("Home"),
    getTranslations("Footer"),
    getHeroHomeState(locale),
  ])

  return (
    <main className="flex flex-col gap-8 row-start-2 items-center sm:items-start text-primary">
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

      <div className="w-full max-w-full min-w-0">
        <HomeCinematicHero locale={locale} initialState={heroHomeState} />
      </div>

      <div
        className="w-full border-y border-primary/15 bg-primary/5 px-4 py-3 text-center"
        data-testid="home-privacy-notice"
      >
        <LocalizedClientLink
          href="/privacy"
          locale={locale}
          className="label-md font-medium text-primary underline-offset-4 hover:underline"
        >
          {tFooter("links.privacy")}
        </LocalizedClientLink>
      </div>

      <div className="w-full px-4 lg:px-8">
        <HomeProductSection
          heading={tHome("trending")}
          locale={locale}
          home
        />
      </div>

      <HomeFeaturedSellersSection locale={locale} />

      <HomeHowItWorksSection />

      <HomeCategories heading={tHome("shopByCategory")} />

      <BannerSection />

      <ShopByStyleSection />

      <BlogSection />
    </main>
  )
}
