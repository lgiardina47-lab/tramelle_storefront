import { NextRequest, NextResponse } from "next/server"

import { fetchMedusaCatalogFallback } from "@/lib/data/products"

type Body = {
  countryCode: string
  category_id?: string
  category_ids?: string[]
  collection_id?: string
  region_id?: string
  seller_id?: string
  limit: number
  offset: number
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as Body
    if (!body.countryCode) {
      return NextResponse.json(
        { error: "countryCode richiesto" },
        { status: 400 }
      )
    }
    const result = await fetchMedusaCatalogFallback({
      countryCode: body.countryCode,
      category_id: body.category_id,
      category_ids: body.category_ids,
      collection_id: body.collection_id,
      region_id: body.region_id,
      seller_id: body.seller_id,
      limit: body.limit,
      offset: body.offset,
    })
    return NextResponse.json(result)
  } catch (e: unknown) {
    const message =
      e instanceof Error ? e.message : "Fallback catalogo non riuscito"
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
