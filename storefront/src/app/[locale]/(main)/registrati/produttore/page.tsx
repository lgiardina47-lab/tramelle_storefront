import { ProducerLeadForm } from "@/components/registration/producer-lead-form"
import { Breadcrumbs } from "@/components/atoms"
import { publicSiteOrigin } from "@/lib/constants/site"
import { listStoreCountryOptions } from "@/lib/registration/store-country-options"
import { countryCodeToStorefrontMessagesLocale } from "@/lib/i18n/storefront-messages-locale"
import type { Metadata } from "next"
import { getTranslations } from "next-intl/server"

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const { locale } = await params
  const ui = countryCodeToStorefrontMessagesLocale(locale)
  const t = await getTranslations({ locale: ui, namespace: "Registration" })
  const base = publicSiteOrigin()
  const canonical = `${base}/${locale}/registrati/produttore`
  return {
    title: t("formProducerHeading"),
    description: t("producerMetaDescription"),
    alternates: { canonical },
    robots: { index: false, follow: false, googleBot: { index: false, follow: false } },
  }
}

export default async function RegistratiProduttorePage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  const ui = countryCodeToStorefrontMessagesLocale(locale)
  const t = await getTranslations({ locale: ui, namespace: "Registration" })
  const countries = await listStoreCountryOptions()

  return (
    <main className="container py-10">
      <Breadcrumbs
        items={[
          { path: "/", label: t("breadcrumbHome") },
          { path: "/per-i-produttori", label: t("producerNavLabel") },
          { path: "/registrati/produttore", label: t("formProducerHeading") },
        ]}
        className="mb-8"
      />
      <ProducerLeadForm countries={countries} />
    </main>
  )
}
