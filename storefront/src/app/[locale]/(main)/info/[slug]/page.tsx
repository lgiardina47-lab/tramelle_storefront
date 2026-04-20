import LocalizedClientLink from "@/components/molecules/LocalizedLink/LocalizedLink"
import { isInfoPageSlug } from "@/data/infoPages"
import { countryCodeToStorefrontMessagesLocale } from "@/lib/i18n/storefront-messages-locale"
import type { Metadata } from "next"
import { getTranslations, setRequestLocale } from "next-intl/server"
import { notFound } from "next/navigation"

/** Il layout (main) legge cookie/sessione: niente SSG su questa rotta. */
export const dynamic = "force-dynamic"

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>
}): Promise<Metadata> {
  const { locale: country, slug } = await params
  if (!isInfoPageSlug(slug)) {
    return {}
  }
  const uiLocale = countryCodeToStorefrontMessagesLocale(country)
  setRequestLocale(uiLocale)
  const t = await getTranslations("InfoPages")
  return {
    title: t(`${slug}.title`),
    description: t(`${slug}.metaDescription`),
  }
}

export default async function InfoPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>
}) {
  const { locale: country, slug } = await params
  if (!isInfoPageSlug(slug)) {
    notFound()
  }
  const uiLocale = countryCodeToStorefrontMessagesLocale(country)
  setRequestLocale(uiLocale)
  const t = await getTranslations("InfoPages")
  const rawParagraphs = t.raw(`${slug}.paragraphs`)
  const paragraphs = Array.isArray(rawParagraphs)
    ? (rawParagraphs as string[])
    : []

  return (
    <main className="container py-8 max-w-3xl">
      <nav className="mb-6" aria-label={t("common.breadcrumbAria")}>
        <LocalizedClientLink
          href="/"
          className="label-md text-secondary underline-offset-4 hover:underline"
        >
          {t("common.backHome")}
        </LocalizedClientLink>
      </nav>
      <h1 className="heading-xl uppercase mb-6">{t(`${slug}.title`)}</h1>
      <div className="space-y-4">
        {paragraphs.map((p, i) => (
          <p key={i} className="text-md text-secondary">
            {p}
          </p>
        ))}
      </div>
    </main>
  )
}
