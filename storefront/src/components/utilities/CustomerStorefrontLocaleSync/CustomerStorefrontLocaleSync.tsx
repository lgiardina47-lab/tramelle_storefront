"use client"

import { usePathname, useRouter } from "next/navigation"
import { useEffect } from "react"

import { TRAMELLE_PREFERRED_COUNTRY_COOKIE } from "@/lib/constants/locale-preference"

type Props = {
  /** Segmento URL da `params.locale` attuale */
  currentLocale: string
  /** Valore da `customer.metadata.tramelle_storefront_country`, già validato */
  preferredCountry: string | null
  isLoggedIn: boolean
}

function readCookie(name: string): string | undefined {
  if (typeof document === "undefined") return undefined
  const hit = document.cookie.split("; ").find((x) => x.startsWith(`${name}=`))
  if (!hit) return undefined
  return decodeURIComponent(hit.slice(name.length + 1))
}

/**
 * Allinea silenziosamente l’URL al paese/lingua salvato sul profilo.
 * Se l’utente ha già scelto una lingua con lo switcher (cookie), quella vince.
 */
export function CustomerStorefrontLocaleSync({
  currentLocale,
  preferredCountry,
  isLoggedIn,
}: Props) {
  const router = useRouter()
  const pathname = usePathname() || "/"

  useEffect(() => {
    if (!isLoggedIn || !preferredCountry) return

    const cur = currentLocale.toLowerCase()
    if (preferredCountry === cur) return

    const cookiePref = readCookie(TRAMELLE_PREFERRED_COUNTRY_COOKIE)
      ?.toLowerCase()
      .trim()
    if (cookiePref && cookiePref !== preferredCountry.toLowerCase()) {
      return
    }
    const segments = pathname.split("/").filter(Boolean)
    const rest = segments.slice(1).join("/")
    const nextPath = rest
      ? `/${preferredCountry}/${rest}`
      : `/${preferredCountry}`
    const search =
      typeof window !== "undefined" ? window.location.search || "" : ""

    document.cookie = `${TRAMELLE_PREFERRED_COUNTRY_COOKIE}=${preferredCountry};path=/;max-age=31536000;samesite=lax`

    router.replace(`${nextPath}${search}`)
  }, [
    currentLocale,
    preferredCountry,
    isLoggedIn,
    pathname,
    router,
  ])

  return null
}
