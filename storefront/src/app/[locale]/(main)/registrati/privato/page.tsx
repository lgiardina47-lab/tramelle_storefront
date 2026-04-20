import { ConsumerRegisterForm } from "@/components/registration/consumer-register-form"
import { Breadcrumbs } from "@/components/atoms"
import { publicSiteOrigin } from "@/lib/constants/site"
import { listStoreCountryOptions } from "@/lib/registration/store-country-options"
import { retrieveCustomer } from "@/lib/data/customer"
import { countryCodeToStorefrontMessagesLocale } from "@/lib/i18n/storefront-messages-locale"
import type { Metadata } from "next"
import { getTranslations } from "next-intl/server"
import { redirect } from "next/navigation"

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const { locale } = await params
  const ui = countryCodeToStorefrontMessagesLocale(locale)
  const t = await getTranslations({ locale: ui, namespace: "Registration" })
  const base = publicSiteOrigin()
  const canonical = `${base}/${locale}/registrati/privato`
  return {
    title: t("consumerTitle"),
    description: t("hubMetaDescription"),
    alternates: { canonical },
    robots: { index: false, follow: false, googleBot: { index: false, follow: false } },
  }
}

export default async function RegistratiPrivatoPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  const user = await retrieveCustomer().catch(() => null)
  if (user) {
    redirect(`/${locale}/user`)
  }

  const ui = countryCodeToStorefrontMessagesLocale(locale)
  const t = await getTranslations({ locale: ui, namespace: "Registration" })
  const countries = await listStoreCountryOptions()

  return (
    <>
      <div className="container pt-8">
        <Breadcrumbs
          items={[
            { path: "/", label: t("breadcrumbHome") },
            { path: "/registrati", label: t("hubNavLabel") },
            { path: "/registrati/privato", label: t("consumerTitle") },
          ]}
        />
      </div>
      <ConsumerRegisterForm countries={countries} />
    </>
  )
}
