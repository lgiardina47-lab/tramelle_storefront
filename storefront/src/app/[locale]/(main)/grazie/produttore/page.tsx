import { Breadcrumbs } from "@/components/atoms"
import { publicSiteOrigin } from "@/lib/constants/site"
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
  return {
    title: t("formThanksProducerTitle"),
    description: t("formThanksProducerBody"),
    alternates: { canonical: `${base}/${locale}/grazie/produttore` },
    robots: { index: false, follow: false, googleBot: { index: false, follow: false } },
  }
}

export default async function GrazieProduttorePage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  const ui = countryCodeToStorefrontMessagesLocale(locale)
  const t = await getTranslations({ locale: ui, namespace: "Registration" })

  return (
    <main className="container max-w-2xl py-16">
      <Breadcrumbs
        items={[
          { path: "/", label: t("breadcrumbHome") },
          { path: "/grazie/produttore", label: t("formThanksProducerTitle") },
        ]}
        className="mb-8"
      />
      <h1 className="text-2xl font-semibold text-gray-900">{t("formThanksProducerTitle")}</h1>
      <p className="mt-4 text-gray-700">{t("formThanksProducerBody")}</p>
    </main>
  )
}
