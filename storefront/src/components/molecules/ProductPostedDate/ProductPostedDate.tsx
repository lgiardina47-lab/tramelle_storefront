"use client"

import { de, enUS, es, fr, it } from "date-fns/locale"
import { formatDistanceToNowSafe } from "@/lib/helpers/format-date-safe"
import type { Locale } from "date-fns"
import { useLocale, useTranslations } from "next-intl"

const dfLocales: Record<string, Locale> = {
  it,
  en: enUS,
  de,
  fr,
  es,
}

export const ProductPostedDate = ({
  posted,
}: {
  posted: string | null
}) => {
  const locale = useLocale()
  const t = useTranslations("ProductSheet")
  const dfLoc = dfLocales[locale] ?? enUS
  const postedDate = formatDistanceToNowSafe(posted, {
    addSuffix: true,
    locale: dfLoc,
  })

  return (
    <p className="label-md text-secondary">
      {t("postedPrefix")} {postedDate}
    </p>
  )
}
