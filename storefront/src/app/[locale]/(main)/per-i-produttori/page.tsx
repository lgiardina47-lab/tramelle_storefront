import { ProducerLeadForm } from "@/components/registration/producer-lead-form"
import { Breadcrumbs, Button } from "@/components/atoms"
import { getIndexingRobots, publicSiteOrigin } from "@/lib/constants/site"
import { listStoreSellersFacets } from "@/lib/data/seller"
import { listStoreCountryOptions } from "@/lib/registration/store-country-options"
import { countryCodeToStorefrontMessagesLocale } from "@/lib/i18n/storefront-messages-locale"
import type { Metadata } from "next"
import { getTranslations } from "next-intl/server"
import Link from "next/link"
import Script from "next/script"

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const { locale } = await params
  const ui = countryCodeToStorefrontMessagesLocale(locale)
  const t = await getTranslations({ locale: ui, namespace: "Registration" })
  const base = publicSiteOrigin()
  const canonical = `${base}/${locale}/per-i-produttori`
  return {
    title: t("producerMetaTitle"),
    description: t("producerMetaDescription"),
    alternates: { canonical },
    robots: getIndexingRobots({ googleBotRich: true }),
    openGraph: {
      title: t("producerMetaTitle"),
      description: t("producerMetaDescription"),
      url: canonical,
    },
  }
}

export default async function PerIProduttoriPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  const ui = countryCodeToStorefrontMessagesLocale(locale)
  const t = await getTranslations({ locale: ui, namespace: "Registration" })
  const base = publicSiteOrigin()

  const [facets, countries] = await Promise.all([
    listStoreSellersFacets({ contentLocale: locale }),
    listStoreCountryOptions(),
  ])

  const sellerCount = facets?.totalSellerCount ?? 1037
  const categoryCount = facets?.categories?.length ?? 16

  const fmt = new Intl.NumberFormat(
    ui === "ja" ? "ja-JP" : ui === "en" ? "en-GB" : `${ui}-${locale.toUpperCase()}`,
    { maximumFractionDigits: 0 }
  )

  const faqItems = [
    { q: t("producerFaq1Q"), a: t("producerFaq1A") },
    { q: t("producerFaq2Q"), a: t("producerFaq2A") },
    { q: t("producerFaq3Q"), a: t("producerFaq3A") },
    { q: t("producerFaq4Q"), a: t("producerFaq4A") },
  ]

  const faqLd = {
    "@type": "FAQPage",
    mainEntity: faqItems.map((item) => ({
      "@type": "Question",
      name: item.q,
      acceptedAnswer: { "@type": "Answer", text: item.a },
    })),
  }

  const webPageLd = {
    "@type": "WebPage",
    name: t("producerMetaTitle"),
    description: t("producerMetaDescription"),
    url: `${base}/${locale}/per-i-produttori`,
  }

  const graphLd = {
    "@context": "https://schema.org",
    "@graph": [webPageLd, faqLd],
  }

  const why = [
    { title: t("producerWhy1Title"), text: t("producerWhy1Text") },
    { title: t("producerWhy2Title"), text: t("producerWhy2Text") },
    { title: t("producerWhy3Title"), text: t("producerWhy3Text") },
    { title: t("producerWhy4Title"), text: t("producerWhy4Text") },
  ]

  const how = [t("producerHow1"), t("producerHow2"), t("producerHow3"), t("producerHow4")]

  return (
    <main>
      <div className="container max-w-4xl py-10 md:py-14">
        <Breadcrumbs
          items={[
            { path: "/", label: t("breadcrumbHome") },
            { path: "/per-i-produttori", label: t("producerNavLabel") },
          ]}
          className="mb-8"
        />
        <Script
          id="ld-per-i-produttori"
          type="application/ld+json"
          strategy="afterInteractive"
        >
          {JSON.stringify(graphLd)}
        </Script>

        <section className="mb-14">
          <h1 className="text-3xl font-semibold tracking-tight text-gray-900 md:text-4xl">
            {t("producerHeroH1")}
          </h1>
          <p className="mt-4 max-w-2xl text-lg text-gray-700">{t("producerHeroSub")}</p>
          <div className="mt-8">
            <Link href="#registration-lead-form" prefetch={false}>
              <Button className="rounded-full px-8 uppercase">{t("producerHeroCta")}</Button>
            </Link>
          </div>
        </section>

        <section
          className="mb-14 grid grid-cols-2 gap-4 sm:grid-cols-4"
          aria-label={t("producerStatProducers")}
        >
          <div className="rounded-2xl border border-neutral-200 bg-neutral-50/80 p-4 text-center">
            <p className="text-2xl font-bold text-gray-900">{fmt.format(sellerCount)}</p>
            <p className="text-xs font-medium uppercase tracking-wide text-gray-600">
              {t("producerStatProducers")}
            </p>
          </div>
          <div className="rounded-2xl border border-neutral-200 bg-neutral-50/80 p-4 text-center">
            <p className="text-2xl font-bold text-gray-900">{fmt.format(categoryCount)}</p>
            <p className="text-xs font-medium uppercase tracking-wide text-gray-600">
              {t("producerStatCategories")}
            </p>
          </div>
          <div className="rounded-2xl border border-neutral-200 bg-neutral-50/80 p-4 text-center">
            <p className="text-2xl font-bold text-gray-900">6</p>
            <p className="text-xs font-medium uppercase tracking-wide text-gray-600">
              {t("producerStatLanguages")}
            </p>
          </div>
          <div className="rounded-2xl border border-neutral-200 bg-neutral-50/80 p-4 text-center">
            <p className="text-2xl font-bold text-gray-900">∞</p>
            <p className="text-xs font-medium uppercase tracking-wide text-gray-600">
              {t("producerStatShipping")}
            </p>
          </div>
        </section>

        <section className="mb-14">
          <h2 className="text-xl font-semibold text-gray-900">{t("producerWhyH2")}</h2>
          <ul className="mt-6 grid gap-6 md:grid-cols-2">
            {why.map((item) => (
              <li key={item.title} className="rounded-[20px] border border-neutral-200 p-5">
                <h3 className="font-semibold text-gray-900">{item.title}</h3>
                <p className="mt-2 text-sm text-gray-700">{item.text}</p>
              </li>
            ))}
          </ul>
        </section>

        <section className="mb-14">
          <h2 className="text-xl font-semibold text-gray-900">{t("producerHowH2")}</h2>
          <ol className="mt-6 list-decimal space-y-4 pl-5 text-gray-800">
            {how.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>
        </section>

        <section className="mb-14">
          <h2 className="text-xl font-semibold text-gray-900">{t("producerFaqH2")}</h2>
          <dl className="mt-6 space-y-6">
            {faqItems.map((item) => (
              <div key={item.q}>
                <dt className="font-medium text-gray-900">{item.q}</dt>
                <dd className="mt-2 text-sm text-gray-700">{item.a}</dd>
              </div>
            ))}
          </dl>
        </section>

        <p className="mb-10 text-center text-sm text-gray-600">
          <Link
            href={`/${locale}/per-i-buyer`}
            className="font-medium text-cortilia underline underline-offset-2"
            prefetch={true}
          >
            {t("producerLinkBuyer")}
          </Link>
        </p>
      </div>

      <div className="border-t border-neutral-100 bg-neutral-50/50 py-12">
        <ProducerLeadForm countries={countries} id="registration-lead-form" />
      </div>
    </main>
  )
}
