import { NextIntlClientProvider } from "next-intl"
import { getMessages, setRequestLocale } from "next-intl/server"
import type { ReactNode } from "react"

import { DocumentHtmlLangFromLocale } from "@/i18n/document-html-lang"
import { countryCodeToStorefrontMessagesLocale } from "@/lib/i18n/storefront-messages-locale"

export const runtime = "edge";

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
    <NextIntlClientProvider locale={uiLocale} messages={messages}>
      <DocumentHtmlLangFromLocale />
      {children}
    </NextIntlClientProvider>
  )
}
