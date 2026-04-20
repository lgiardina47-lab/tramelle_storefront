import { Breadcrumbs, Button } from "@/components/atoms"
import { getIndexingRobots, publicSiteOrigin } from "@/lib/constants/site"
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
  const canonical = `${base}/${locale}/registrati`
  return {
    title: t("hubMetaTitle"),
    description: t("hubMetaDescription"),
    alternates: { canonical },
    robots: getIndexingRobots({ googleBotRich: true }),
    openGraph: {
      title: t("hubMetaTitle"),
      description: t("hubMetaDescription"),
      url: canonical,
    },
  }
}

export default async function RegistratiHubPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  const ui = countryCodeToStorefrontMessagesLocale(locale)
  const t = await getTranslations({ locale: ui, namespace: "Registration" })
  const base = publicSiteOrigin()

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: t("hubMetaTitle"),
    description: t("hubMetaDescription"),
    url: `${base}/${locale}/registrati`,
  }

  const cards = [
    {
      href: `/${locale}/registrati/privato`,
      title: t("cardPrivateTitle"),
      lead: t("cardPrivateLead"),
      hint: t("cardPrivateHint"),
      cta: t("cardPrivateCta"),
    },
    {
      href: `/${locale}/per-i-buyer`,
      title: t("cardBuyerTitle"),
      lead: t("cardBuyerLead"),
      hint: t("cardBuyerHint"),
      cta: t("cardBuyerCta"),
    },
    {
      href: `/${locale}/per-i-produttori`,
      title: t("cardProducerTitle"),
      lead: t("cardProducerLead"),
      hint: t("cardProducerHint"),
      cta: t("cardProducerCta"),
    },
  ] as const

  return (
    <main className="container max-w-6xl py-10 md:py-14">
      <Breadcrumbs
        items={[
          { path: "/", label: t("breadcrumbHome") },
          { path: "/registrati", label: t("hubNavLabel") },
        ]}
        className="mb-8"
      />
      <Script
        id="ld-registrati-webpage"
        type="application/ld+json"
        strategy="afterInteractive"
      >
        {JSON.stringify(jsonLd)}
      </Script>

      <h1 className="mb-10 max-w-3xl text-2xl font-semibold tracking-tight text-gray-900 md:text-3xl">
        {t("hubH1")}
      </h1>

      <div className="grid gap-6 md:grid-cols-3">
        {cards.map((c) => (
          <div
            key={c.href}
            className="flex flex-col rounded-[20px] border border-neutral-200 bg-white p-6 shadow-sm transition-colors hover:border-neutral-400"
          >
            <h2 className="text-lg font-semibold text-gray-900">{c.title}</h2>
            <p className="mt-2 text-sm font-medium text-gray-800">{c.lead}</p>
            <p className="mt-1 text-sm text-gray-600">{c.hint}</p>
            <div className="mt-auto pt-6">
              <Link href={c.href} prefetch={true}>
                <Button className="w-full justify-center rounded-full uppercase">
                  {c.cta}
                </Button>
              </Link>
            </div>
          </div>
        ))}
      </div>
    </main>
  )
}
