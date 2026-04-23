import {
  BannerSection,
  BlogSection,
  HomeCategories,
  HomeProductSection,
  ShopByStyleSection,
} from "@/components/sections"
import {
  HomeCinematicHero,
  HomeCinematicHeroSkeleton,
} from "@/components/sections/HomeCinematicHero/HomeCinematicHero"
import { HomeFeaturedSellersSection } from "@/components/sections/HomeFeaturedSellersSection/HomeFeaturedSellersSection"
import { HomeHowItWorksSection } from "@/components/sections/HomeHowItWorksSection/HomeHowItWorksSection"

import type { Metadata } from "next"
import Script from "next/script"
import { Suspense } from "react"
import { getTranslations } from "next-intl/server"
import { getCachedHomeHreflangLanguages } from "@/lib/data/home-hreflang-alternates"
import { toHreflang } from "@/lib/helpers/hreflang"
import {
  getIndexingRobots,
  publicSiteOrigin,
  resolvedSiteName,
} from "@/lib/constants/site"

function HomeTrendingSkeleton() {
  return (
    <div className="w-full px-4 lg:px-8">
      <section
        className="w-full animate-pulse py-8"
        aria-hidden
      >
        <div className="mb-6 h-8 w-48 max-w-full rounded bg-neutral-100" />
        <div className="flex gap-4 overflow-hidden">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="aspect-[3/4] w-40 shrink-0 rounded-sm bg-neutral-100 sm:w-48"
            />
          ))}
        </div>
      </section>
    </div>
  )
}

function HomeCategoriesSkeleton() {
  return (
    <div className="w-full px-4 lg:px-8">
      <section
        className="w-full animate-pulse bg-primary py-8"
        aria-hidden
      >
        <div className="mb-6 h-8 w-64 max-w-full rounded bg-white/20" />
        <div className="flex gap-3 overflow-hidden">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="h-28 w-24 shrink-0 rounded-sm bg-white/20 sm:h-32 sm:w-28"
            />
          ))}
        </div>
      </section>
    </div>
  )
}

function HomeWideCardSkeleton() {
  return (
    <div
      className="container animate-pulse py-8"
      aria-hidden
    >
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="h-48 rounded-sm bg-neutral-100 lg:h-64" />
        <div className="aspect-[4/3] rounded-sm bg-neutral-100" />
      </div>
    </div>
  )
}

function HomeCollectionsListSkeleton() {
  return (
    <div
      className="container animate-pulse py-12"
      aria-hidden
    >
      <div className="mb-10 h-8 w-64 rounded bg-neutral-100" />
      <div className="space-y-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-6 w-2/3 max-w-md rounded bg-neutral-100" />
        ))}
      </div>
    </div>
  )
}

/** Home catalogo: rigenerazione periodica (ISR) — il layout resta dinamico (cookie/sessione). */
export const revalidate = 300

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

  const tHome = await getTranslations("Home")

  return (
    <main className="flex flex-col gap-8 row-start-2 items-center sm:items-start text-primary">
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

      <div className="w-full max-w-full min-w-0">
        <Suspense fallback={<HomeCinematicHeroSkeleton />}>
          <HomeCinematicHero locale={locale} />
        </Suspense>
      </div>

      {/* Prodotti in evidenza */}
      <Suspense fallback={<HomeTrendingSkeleton />}>
        <div className="w-full px-4 lg:px-8">
          <HomeProductSection
            heading={tHome("trending")}
            locale={locale}
            home
          />
        </div>
      </Suspense>

      {/* Produttori selezionati */}
      <Suspense fallback={
        <div className="w-full px-4 lg:px-8 animate-pulse py-8">
          <div className="mb-8 h-8 w-56 rounded bg-neutral-100" />
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="aspect-[4/3] rounded-lg bg-neutral-100" />
            ))}
          </div>
        </div>
      }>
        <HomeFeaturedSellersSection locale={locale} />
      </Suspense>

      {/* Come funziona */}
      <HomeHowItWorksSection />

      {/* Sfoglia per categoria */}
      <Suspense fallback={<HomeCategoriesSkeleton />}>
        <div className="w-full px-4 lg:px-8">
          <HomeCategories heading={tHome("shopByCategory")} />
        </div>
      </Suspense>

      {/* Banner collezione */}
      <Suspense fallback={<HomeWideCardSkeleton />}>
        <BannerSection />
      </Suspense>

      {/* Selezioni / collezioni */}
      <Suspense fallback={<HomeCollectionsListSkeleton />}>
        <ShopByStyleSection />
      </Suspense>

      <BlogSection />
    </main>
  )
}
