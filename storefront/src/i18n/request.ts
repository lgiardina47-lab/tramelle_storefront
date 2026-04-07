import { getRequestConfig } from "next-intl/server"

import { routing } from "@/i18n/routing"
import { countryCodeToStorefrontMessagesLocale } from "@/lib/i18n/storefront-messages-locale"

export default getRequestConfig(async ({ requestLocale }) => {
  const segment = (
    (await requestLocale) ??
    routing.defaultLocale
  ).toLowerCase()
  const locale = countryCodeToStorefrontMessagesLocale(segment)

  return {
    locale,
    messages: (await import(`../../messages/${locale}.json`)).default,
  }
})
