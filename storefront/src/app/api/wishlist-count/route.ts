import { NextResponse } from "next/server"

import { getUserWishlists } from "@/lib/data/wishlist"

/**
 * Conteggio wishlist per badge header: non blocca il render RSC dell’header.
 * Stesse API Medusa di prima (`getUserWishlists`), solo dopo il primo paint.
 */
export async function GET(req: Request) {
  const locale =
    new URL(req.url).searchParams.get("locale")?.trim() ||
    process.env.NEXT_PUBLIC_DEFAULT_REGION ||
    "it"

  try {
    const wishlist = await getUserWishlists({ countryCode: locale })
    const count = wishlist?.products?.length ?? 0
    return NextResponse.json(
      { count },
      {
        headers: {
          "Cache-Control": "private, no-store",
        },
      }
    )
  } catch {
    return NextResponse.json({ count: 0 }, { status: 200 })
  }
}
