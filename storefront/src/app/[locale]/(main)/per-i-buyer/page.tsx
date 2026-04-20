import { BuyerLeadForm } from "@/components/registration/buyer-lead-form"
import { Breadcrumbs, Button } from "@/components/atoms"
import { getIndexingRobots, publicSiteOrigin } from "@/lib/constants/site"
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
  const canonical = `${base}/${locale}/per-i-buyer`
  return {
    title: t("buyerMetaTitle"),
    description: t("buyerMetaDescription"),
    alternates: { canonical },
    robots: getIndexingRobots({ googleBotRich: true }),
    openGraph: {
      title: t("buyerMetaTitle"),
      description: t("buyerMetaDescription"),
      url: canonical,
    },
  }
}

export default async function PerIBuyerPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  const ui = countryCodeToStorefrontMessagesLocale(locale)
  const t = await getTranslations({ locale: ui, namespace: "Registration" })
  const base = publicSiteOrigin()

  const countries = await listStoreCountryOptions()

  const faqItems = [
    { q: t("buyerFaq1Q"), a: t("buyerFaq1A") },
    { q: t("buyerFaq2Q"), a: t("buyerFaq2A") },
    { q: t("buyerFaq3Q"), a: t("buyerFaq3A") },
    { q: t("buyerFaq4Q"), a: t("buyerFaq4A") },
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
    name: t("buyerMetaTitle"),
    description: t("buyerMetaDescription"),
    url: `${base}/${locale}/per-i-buyer`,
  }

  const graphLd = {
    "@context": "https://schema.org",
    "@graph": [webPageLd, faqLd],
  }

  const who = [t("buyerWho1"), t("buyerWho2"), t("buyerWho3"), t("buyerWho4")]
  const how = [t("buyerHow1"), t("buyerHow2"), t("buyerHow3"), t("buyerHow4")]

  return (
    <main>
      <div className="container max-w-4xl py-10 md:py-14">
        <Breadcrumbs
          items={[
            { path: "/", label: t("breadcrumbHome") },
            { path: "/per-i-buyer", label: t("buyerNavLabel") },
          ]}
          className="mb-8"
        />
        <Script id="ld-per-i-buyer" type="application/ld+json" strategy="afterInteractive">
          {JSON.stringify(graphLd)}
        </Script>

        <section className="mb-14">
          <h1 className="text-3xl font-semibold tracking-tight text-gray-900 md:text-4xl">
            {t("buyerHeroH1")}
          </h1>
          <p className="mt-4 max-w-2xl text-lg text-gray-700">{t("buyerHeroSub")}</p>
          <div className="mt-8">
            <Link href="#registration-lead-form" prefetch={false}>
              <Button className="rounded-full px-8 uppercase">{t("buyerHeroCta")}</Button>
            </Link>
          </div>
        </section>

        <section className="mb-14">
          <h2 className="text-xl font-semibold text-gray-900">{t("buyerWhoH2")}</h2>
          <ul className="mt-6 grid gap-3 md:grid-cols-2">
            {who.map((item) => (
              <li
                key={item}
                className="rounded-[20px] border border-neutral-200 bg-white px-4 py-3 text-sm text-gray-800"
              >
                {item}
              </li>
            ))}
          </ul>
        </section>

        <section className="mb-14">
          <h2 className="text-xl font-semibold text-gray-900">{t("buyerHowH2")}</h2>
          <ol className="mt-6 list-decimal space-y-4 pl-5 text-gray-800">
            {how.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>
        </section>

        <section className="mb-14">
          <h2 className="text-xl font-semibold text-gray-900">{t("buyerFaqH2")}</h2>
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
            href={`/${locale}/per-i-produttori`}
            className="font-medium text-cortilia underline underline-offset-2"
            prefetch={true}
          >
            {t("buyerLinkProducer")}
          </Link>
        </p>
      </div>

      <div className="border-t border-neutral-100 bg-neutral-50/50 py-12">
        <BuyerLeadForm countries={countries} id="registration-lead-form" />
      </div>
    </main>
  )
}
