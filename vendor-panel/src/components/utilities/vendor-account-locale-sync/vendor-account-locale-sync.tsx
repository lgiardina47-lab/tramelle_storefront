import { useEffect } from "react"
import { useTranslation } from "react-i18next"

/**
 * Pannello solo in italiano: allinea i18n (e cookie lng) senza leggere altre lingue dal profilo.
 */
export function VendorAccountLocaleSync() {
  const { i18n } = useTranslation()

  useEffect(() => {
    if (i18n.resolvedLanguage !== "it") {
      void i18n.changeLanguage("it")
    }
    try {
      document.cookie = `lng=it;path=/;max-age=31536000;samesite=lax`
    } catch {
      /* ignore */
    }
  }, [i18n])

  return null
}
