import { SellersDirectoryResults } from "@/app/[locale]/(main)/sellers/_components/sellers-directory-results"
import { getIndexingRobots, publicSiteOrigin, resolvedSiteName } from "@/lib/constants/site"
import { toHreflang } from "@/lib/helpers/hreflang"
import { listRegions } from "@/lib/data/regions"
import { countryCodeToStorefrontMessagesLocale } from "@/lib/i18n/storefront-messages-locale"
import type { Metadata } from "next"
import { getTranslations } from "next-intl/server"

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const { locale } = await params
  const baseUrl = publicSiteOrigin()

  let languages: Record<string, string> = {}
  try {
    const regions = await listRegions()
    const locales = Array.from(
      new Set(
        (regions || []).flatMap((r) => r.countries?.map((c) => c.iso_2) || [])
      )
    ) as string[]
    languages = locales.reduce<Record<string, string>>((acc, code) => {
      acc[toHreflang(code)] = `${baseUrl}/${code}/sellers`
      return acc
    }, {})
  } catch {
    languages = { [toHreflang(locale)]: `${baseUrl}/${locale}/sellers` }
  }

  const site = resolvedSiteName()
  const ui = countryCodeToStorefrontMessagesLocale(locale)
  const t = await getTranslations({ locale: ui, namespace: "Sellers" })
  const title = t("directoryPageTitle")
  const description = t("directoryMetaDescription", { site })
  const canonical = `${baseUrl}/${locale}/sellers`
  const defaultLocaleSeg =
    process.env.NEXT_PUBLIC_DEFAULT_REGION?.trim().toLowerCase() || "it"

  return {
    title,
    description,
    alternates: {
      canonical,
      languages: {
        ...languages,
        "x-default": `${baseUrl}/${defaultLocaleSeg}/sellers`,
      },
    },
    robots: getIndexingRobots(),
    openGraph: {
      title: `${t("directoryPageTitle")} | ${site}`,
      description,
      url: canonical,
    },
  }
}

export default async function SellersDirectoryPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>
  searchParams: Promise<{
    page?: string
    country?: string
    region?: string
    category?: string
  }>
}) {
  const { locale } = await params
  const sp = await searchParams
  const ui = countryCodeToStorefrontMessagesLocale(locale)
  const t = await getTranslations({ locale: ui, namespace: "Sellers" })

  return (
    <main className="container py-10 md:py-16">
      <div className="mb-12 max-w-2xl">
        <h1 className="heading-xl text-primary uppercase tracking-tight">
          {t("directoryPageTitle")}
        </h1>
        <p className="mt-4 text-md leading-relaxed text-secondary">
          {t("directoryPageSubtitle")}
        </p>
      </div>

      <SellersDirectoryResults locale={locale} searchParams={sp} />
    </main>
  )
}
