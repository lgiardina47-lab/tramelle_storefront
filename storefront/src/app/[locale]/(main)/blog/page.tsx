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
  const t = await getTranslations({ locale: ui, namespace: "Header" })
  const title = t("gourmet.blog")
  return {
    title: `${title} | Tramelle Source Gourmet`,
    description: title,
  }
}

export default async function BlogPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  const ui = countryCodeToStorefrontMessagesLocale(locale)
  const t = await getTranslations({ locale: ui, namespace: "Header" })

  return (
    <main className="container max-w-2xl py-16">
      <h1 className="font-tramelle-hero text-3xl font-bold uppercase tracking-tight text-[#0F0E0B]">
        {t("gourmet.blog")}
      </h1>
      <p className="font-tramelle mt-6 text-base font-normal text-[#8A8580]">
        {t("gourmet.blogPlaceholder")}
      </p>
    </main>
  )
}
