import { NextRequest, NextResponse } from "next/server"

import { listStoreSellersNoStore } from "@/lib/data/seller"
import { buildHeroCatalogSlideFromSeller } from "@/lib/helpers/hero-catalog-slide"
import { countryCodeToStorefrontMessagesLocale } from "@/lib/i18n/storefront-messages-locale"
import { normalizeListingContentLocale } from "@/lib/i18n/listing-content-locale"
import type { StorefrontI18nLocale } from "@/i18n/routing"

import de from "../../../../../messages/de.json"
import en from "../../../../../messages/en.json"
import es from "../../../../../messages/es.json"
import fr from "../../../../../messages/fr.json"
import it from "../../../../../messages/it.json"
import ja from "../../../../../messages/ja.json"

export const dynamic = "force-dynamic"

const HERO_MSG_BY_UI: Record<
  StorefrontI18nLocale,
  Partial<HeroMessageSlice>
> = {
  it: it.Hero,
  en: en.Hero,
  fr: fr.Hero,
  de: de.Hero,
  es: es.Hero,
  ja: ja.Hero,
}

type HeroMessageSlice = {
  cinematicImageAlt: string
  cinematicImageAltFallback: string
}

function heroTFromMessages(hero: Partial<HeroMessageSlice> | undefined) {
  const altTpl =
    typeof hero?.cinematicImageAlt === "string" && hero.cinematicImageAlt
      ? hero.cinematicImageAlt
      : "Producer cover — {name}"
  const altFb =
    typeof hero?.cinematicImageAltFallback === "string" &&
    hero.cinematicImageAltFallback
      ? hero.cinematicImageAltFallback
      : "Tramelle featured imagery"
  return {
    altForName: (name: string) => altTpl.replace(/\{name\}/g, name),
    altFallback: () => altFb,
  }
}

export async function GET(request: NextRequest) {
  try {
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

    const hero = HERO_MSG_BY_UI[ui] ?? HERO_MSG_BY_UI.it
    const t = heroTFromMessages(hero)

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
  } catch (e) {
    if (process.env.NODE_ENV === "development") {
      console.error("[hero-seller-slide]", e)
    }
    return NextResponse.json(
      { slide: null, error: "hero_slide_failed" },
      { status: 200 }
    )
  }
}
