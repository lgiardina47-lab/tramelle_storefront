"use client"

import type { StorefrontI18nLocale } from "@/i18n/routing"
import { countryCodeToStorefrontMessagesLocale } from "@/lib/i18n/storefront-messages-locale"
import {
  TRAMELLE_DESCRIPTION_I18N_LOCALES,
  type TramelleDescriptionI18n,
} from "@/lib/helpers/tramelle-seller-description-i18n"
import { plainTextFromHtml } from "@/lib/helpers/seller-card-hero"
import { useMemo, useState } from "react"

const LABELS: Record<StorefrontI18nLocale, string> = {
  it: "IT",
  en: "EN",
  fr: "FR",
  de: "DE",
  es: "ES",
  ja: "JA",
}

function activeLocales(map: TramelleDescriptionI18n): StorefrontI18nLocale[] {
  return TRAMELLE_DESCRIPTION_I18N_LOCALES.filter(
    (loc) => (map[loc] || "").trim().length > 0
  )
}

export function SellerDescriptionTabsPlain({
  descriptions,
  urlLocale,
  className,
}: {
  descriptions: TramelleDescriptionI18n
  urlLocale: string
  className?: string
}) {
  const localesWithContent = useMemo(
    () => activeLocales(descriptions),
    [descriptions]
  )
  const defaultTab = countryCodeToStorefrontMessagesLocale(urlLocale)
  const initial =
    localesWithContent.includes(defaultTab) && (descriptions[defaultTab] || "").trim()
      ? defaultTab
      : localesWithContent[0] ?? defaultTab
  const [active, setActive] = useState<StorefrontI18nLocale>(initial)

  if (localesWithContent.length === 0) {
    return null
  }

  if (localesWithContent.length === 1) {
    const only = localesWithContent[0]!
    const excerpt = plainTextFromHtml(descriptions[only] || "")
    return (
      <p
        className={
          className ??
          "line-clamp-3 text-sm leading-relaxed text-neutral-600"
        }
      >
        {excerpt}
      </p>
    )
  }

  return (
    <div>
      <div
        className="mb-2 flex flex-wrap gap-1"
        role="tablist"
        aria-label="Description languages"
      >
        {localesWithContent.map((loc) => (
          <button
            key={loc}
            type="button"
            role="tab"
            aria-selected={active === loc}
            className={`rounded border px-2 py-0.5 text-xs font-medium transition-colors ${
              active === loc
                ? "border-primary bg-primary text-white"
                : "border-neutral-200 bg-neutral-50 text-neutral-700 hover:bg-neutral-100"
            }`}
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              setActive(loc)
            }}
          >
            {LABELS[loc]}
          </button>
        ))}
      </div>
      <p className="line-clamp-2 text-sm leading-relaxed text-neutral-600">
        {plainTextFromHtml(descriptions[active] || "")}
      </p>
    </div>
  )
}

export function SellerDescriptionTabsHtml({
  descriptions,
  urlLocale,
  className,
}: {
  descriptions: TramelleDescriptionI18n
  urlLocale: string
  /** Classi sul contenuto HTML (es. tipografia / prose). */
  className?: string
}) {
  const localesWithContent = useMemo(
    () => activeLocales(descriptions),
    [descriptions]
  )
  const defaultTab = countryCodeToStorefrontMessagesLocale(urlLocale)
  const initial =
    localesWithContent.includes(defaultTab) && (descriptions[defaultTab] || "").trim()
      ? defaultTab
      : localesWithContent[0] ?? defaultTab
  const [active, setActive] = useState<StorefrontI18nLocale>(initial)

  if (localesWithContent.length === 0) {
    return null
  }

  const html = descriptions[active] || ""

  const bodyClass = className ?? "label-md"

  if (localesWithContent.length === 1) {
    return (
      <div
        className={bodyClass}
        dangerouslySetInnerHTML={{ __html: html }}
      />
    )
  }

  return (
    <div>
      <div
        className="mb-3 flex flex-wrap gap-1"
        role="tablist"
        aria-label="Description languages"
      >
        {localesWithContent.map((loc) => (
          <button
            key={loc}
            type="button"
            role="tab"
            aria-selected={active === loc}
            className={`rounded border px-2 py-0.5 text-xs font-medium transition-colors ${
              active === loc
                ? "border-primary bg-primary text-white"
                : "border-neutral-200 bg-neutral-50 text-neutral-700 hover:bg-neutral-100"
            }`}
            onClick={() => setActive(loc)}
          >
            {LABELS[loc]}
          </button>
        ))}
      </div>
      <div
        className={bodyClass}
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </div>
  )
}
