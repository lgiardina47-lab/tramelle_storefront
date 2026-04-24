import { NextRequest, NextResponse } from "next/server"

import { getHeroHomeState } from "@/lib/hero/hero-home-load"

export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  const locale =
    (request.nextUrl.searchParams.get("locale") || "it").trim() || "it"
  try {
    const data = await getHeroHomeState(locale)
    return NextResponse.json(data)
  } catch (e) {
    if (process.env.NODE_ENV === "development") {
      console.error("[hero-home-state]", e)
    }
    return NextResponse.json(
      { total: 0, heroInit: null, coverSlides: [] },
      { status: 200 }
    )
  }
}
