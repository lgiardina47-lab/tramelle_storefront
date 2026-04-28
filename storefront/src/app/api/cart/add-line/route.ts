import { NextRequest, NextResponse } from "next/server"

import { addToCart } from "@/lib/data/cart"

/**
 * POST invece della Server Action: evita `Failed to find Server Action` quando il client
 * ha un bundle di una build vecchia (cache/CDN) e il server è appena deployato.
 */
export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      variantId?: string
      quantity?: number
      countryCode?: string
      lineMetadata?: Record<string, string | number | boolean | null>
    }
    const { variantId, quantity, countryCode, lineMetadata } = body
    if (!variantId || !quantity || !countryCode) {
      return NextResponse.json(
        { error: "variantId, quantity e countryCode sono obbligatori." },
        { status: 400 }
      )
    }
    await addToCart({ variantId, quantity, countryCode, lineMetadata })
    return NextResponse.json({ ok: true })
  } catch (e: unknown) {
    const message =
      e instanceof Error ? e.message : "Aggiunta al carrello non riuscita."
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
