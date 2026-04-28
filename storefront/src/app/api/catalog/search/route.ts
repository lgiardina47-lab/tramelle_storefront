import { NextRequest, NextResponse } from "next/server"

import { searchProducts } from "@/lib/data/products"

type Body = {
  query?: string
  page?: number
  hitsPerPage?: number
  filters?: string
  currency_code?: string
  countryCode?: string
  region_id?: string
  facets?: string[]
  maxValuesPerFacet?: number
}

/**
 * POST al posto della Server Action: stesso modello del carrello, niente “Failed to find Server Action”
 * dopo un deploy con bundle in cache, e niente overhead d’id azione.
 */
export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as Body
    if (!body.countryCode && !body.region_id) {
      return NextResponse.json(
        { error: "countryCode o region_id richiesto" },
        { status: 400 }
      )
    }
    const result = await searchProducts({
      query: body.query,
      page: body.page,
      hitsPerPage: body.hitsPerPage,
      filters: body.filters,
      currency_code: body.currency_code,
      countryCode: body.countryCode,
      region_id: body.region_id,
      facets: body.facets,
      maxValuesPerFacet: body.maxValuesPerFacet,
    })
    return NextResponse.json(result)
  } catch (e: unknown) {
    const message =
      e instanceof Error ? e.message : "Ricerca catalogo non riuscita"
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
