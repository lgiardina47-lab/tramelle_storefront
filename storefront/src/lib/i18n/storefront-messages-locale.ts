import type { StorefrontI18nLocale } from "@/i18n/routing"

const URL_SEGMENT_TO_UI: Partial<Record<string, StorefrontI18nLocale>> = {
  it: "it",
  en: "en",
  fr: "fr",
  de: "de",
  es: "es",
  /** Mercato Giappone Medusa (`jp`) → messaggi giapponesi */
  jp: "ja",
  ja: "ja",
}

/**
 * Segmento URL (paese Medusa o `en`) → lingua messaggi next-intl.
 * Altri ISO (gb, nl, us, …) → inglese.
 */
export function countryCodeToStorefrontMessagesLocale(
  countryCode: string
): StorefrontI18nLocale {
  const c = countryCode.toLowerCase()
  return URL_SEGMENT_TO_UI[c] ?? "en"
}
