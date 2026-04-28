import { LegalMarkdownDocument } from "@/components/templates/LegalMarkdownDocument/LegalMarkdownDocument"
import LocalizedClientLink from "@/components/molecules/LocalizedLink/LocalizedLink"
import { countryCodeToStorefrontMessagesLocale } from "@/lib/i18n/storefront-messages-locale"
import { readLegalMarkdown } from "@/lib/legal/read-legal-markdown"
import type { Metadata } from "next"
import { getTranslations, setRequestLocale } from "next-intl/server"

/** Contenuto: `public/legal/privacy-policy-tramelle.md` */
export const dynamic = "force-dynamic"

const META_TITLE = "Privacy Policy & Cookie | Tramelle Source Gourmet"
const META_DESCRIPTION =
  "Informativa sulla privacy e sui cookie di Tramelle Source Gourmet (tramelle.com)."

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const { locale: country } = await params
  const uiLocale = countryCodeToStorefrontMessagesLocale(country)
  setRequestLocale(uiLocale)
  return {
    title: META_TITLE,
    description: META_DESCRIPTION,
  }
}

export default async function PrivacyPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale: country } = await params
  const uiLocale = countryCodeToStorefrontMessagesLocale(country)
  setRequestLocale(uiLocale)
  const [t, markdown] = await Promise.all([
    getTranslations("InfoPages"),
    readLegalMarkdown("privacy"),
  ])

  return (
    <main className="container max-w-3xl py-8">
      <nav className="mb-6" aria-label={t("common.breadcrumbAria")}>
        <LocalizedClientLink
          href="/"
          className="label-md text-secondary underline-offset-4 hover:underline"
        >
          {t("common.backHome")}
        </LocalizedClientLink>
      </nav>
      <LegalMarkdownDocument markdown={markdown} />
    </main>
  )
}
