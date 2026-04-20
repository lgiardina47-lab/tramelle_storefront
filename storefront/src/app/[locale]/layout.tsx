import { getMessages, setRequestLocale } from "next-intl/server"
import type { ReactNode } from "react"

import { DocumentHtmlLangFromLocale } from "@/i18n/document-html-lang"
import { IntlClientProvider } from "@/i18n/IntlClientProvider"
import { B2BPricingModalProvider } from "@/components/providers/B2BPricingModal/B2BPricingModalProvider"
import { countryCodeToStorefrontMessagesLocale } from "@/lib/i18n/storefront-messages-locale"
/**
 * Provider next-intl per `/[locale]/…`: messaggi da `messages/{it|en}.json`.
 * `params.locale` = codice paese Medusa; la lingua i18n è derivata da lì.
 */
export default async function LocaleLayout({
  children,
  params,
}: {
  children: ReactNode
  params: Promise<{ locale: string }>
}) {
  const { locale: country } = await params
  const uiLocale = countryCodeToStorefrontMessagesLocale(country)
  setRequestLocale(uiLocale)
  const messages = await getMessages()

  return (
    <IntlClientProvider locale={uiLocale} messages={messages}>
      <B2BPricingModalProvider>
        <DocumentHtmlLangFromLocale />
        {children}
      </B2BPricingModalProvider>
    </IntlClientProvider>
  )
}
