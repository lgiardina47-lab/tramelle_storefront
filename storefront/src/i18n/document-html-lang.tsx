"use client"

import { useLocale } from "next-intl"
import { useEffect } from "react"

const BCP47: Record<string, string> = {
  it: "it-IT",
  en: "en",
  fr: "fr",
  de: "de",
  es: "es",
}

/** Sincronizza `<html lang>` con la lingua i18n attiva (non con il solo codice paese URL). */
export function DocumentHtmlLangFromLocale() {
  const locale = useLocale()

  useEffect(() => {
    document.documentElement.lang = BCP47[locale] ?? locale
  }, [locale])

  return null
}
