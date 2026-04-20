import { BuyerLeadForm } from "@/components/registration/buyer-lead-form"
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
  const canonical = `${base}/${locale}/registrati/b2b`
  return {
    title: t("formBuyerHeading"),
    description: t("buyerMetaDescription"),
    alternates: { canonical },
    robots: { index: false, follow: false, googleBot: { index: false, follow: false } },
  }
}

export default async function RegistratiB2bPage({
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
          { path: "/per-i-buyer", label: t("buyerNavLabel") },
          { path: "/registrati/b2b", label: t("formBuyerHeading") },
        ]}
        className="mb-8"
      />
      <BuyerLeadForm countries={countries} />
    </main>
  )
}
