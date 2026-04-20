import { getRequestConfig } from "next-intl/server"

import { routing } from "@/i18n/routing"
import { countryCodeToStorefrontMessagesLocale } from "@/lib/i18n/storefront-messages-locale"

export default getRequestConfig(async ({ requestLocale }) => {
  const segment = (
    (await requestLocale) ??
    routing.defaultLocale
  ).toLowerCase()
  const locale = countryCodeToStorefrontMessagesLocale(segment)

  const [{ default: baseMessages }, { default: infoMessages }] =
    await Promise.all([
      import(`../../messages/${locale}.json`),
      import(`../../messages/info/${locale}.json`),
    ])

  return {
    locale,
    /** Evita `ENVIRONMENT_FALLBACK` / mismatch idratazione su `useTranslations` (es. HeaderUtilityBar). */
    timeZone: "Europe/Rome",
    messages: { ...baseMessages, ...infoMessages },
  }
})
