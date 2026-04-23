import { NextRequest, NextResponse } from "next/server"

import { listStoreSellersNoStore } from "@/lib/data/seller"
import { buildHeroCatalogSlideFromSeller } from "@/lib/helpers/hero-catalog-slide"
import { countryCodeToStorefrontMessagesLocale } from "@/lib/i18n/storefront-messages-locale"
import { normalizeListingContentLocale } from "@/lib/i18n/listing-content-locale"

export const dynamic = "force-dynamic"

type HeroMessageSlice = {
  cinematicImageAlt: string
  cinematicImageAltFallback: string
}

export async function GET(request: NextRequest) {
  const sp = request.nextUrl.searchParams
  const offsetRaw = sp.get("offset")
  const locale = (sp.get("locale") || "it").trim() || "it"
  const contentLocale = normalizeListingContentLocale(
    sp.get("content_locale")?.trim() || undefined
  )
  if (offsetRaw == null) {
    return NextResponse.json({ error: "Missing offset" }, { status: 400 })
  }
  const offset = Math.max(0, parseInt(offsetRaw, 10) || 0)

  const ui = countryCodeToStorefrontMessagesLocale(locale)
  const intlLocales = [ui, "it"] as const

  const { default: pack } = await import(
    /* webpackInclude: /\.json$/ */
    `../../../../../messages/${ui}.json`
  )
  const hero = pack.Hero as HeroMessageSlice
  const t = {
    altForName: (name: string) =>
      hero.cinematicImageAlt.replace(/\{name\}/g, name),
    altFallback: () => hero.cinematicImageAltFallback,
  }

  const row = await listStoreSellersNoStore({
    limit: 1,
    offset,
    ...(contentLocale ? { contentLocale } : {}),
  })
  const s = row?.sellers?.[0]
  if (!s) {
    return NextResponse.json({ slide: null })
  }
  const slide = buildHeroCatalogSlideFromSeller(
    s,
    t,
    intlLocales,
    offset + 1
  )
  return NextResponse.json({ slide })
}
