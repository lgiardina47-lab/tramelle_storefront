import { NextRequest, NextResponse } from "next/server"

import { loadSlideAtOffsetServer } from "@/lib/hero/hero-catalog-step-server"
import { normalizeListingContentLocale } from "@/lib/i18n/listing-content-locale"

export const dynamic = "force-dynamic"

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

    const slide = await loadSlideAtOffsetServer(offset, locale, contentLocale)
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
