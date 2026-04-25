type ListingCard = {
  thumbnail?: string | null
  titles_i18n?: Record<string, string> | null
  brand_name?: string | null
  certifications?: string[]
  seller_name?: string | null
  seller_id?: string
  seller_handle?: string
  seller_country_code?: string | null
  seller_state?: string | null
  b2c_min_prices?: Record<string, number>
  category_names?: string[]
}

function pickPriceAmount(
  b2c: Record<string, number> | undefined,
  currency: string
): { amount: number; cc: string } | null {
  if (!b2c || typeof b2c !== "object") {
    return null
  }
  const cc = currency.toLowerCase()
  const direct = b2c[cc]
  if (typeof direct === "number" && direct > 0) {
    return { amount: direct, cc }
  }
  const eur = b2c.eur
  if (typeof eur === "number" && eur > 0) {
    return { amount: eur, cc: "eur" }
  }
  const first = Object.entries(b2c).find(
    ([, v]) => typeof v === "number" && v > 0
  )
  if (first) {
    return { amount: first[1], cc: first[0] }
  }
  return null
}

/**
 * Converte un hit Meilisearch (con `listing_card`) in oggetto compatibile con
 * {@link ProductCard} / `getProductPrice` senza chiamate Medusa.
 */
export function meiliHitToListingProduct(
  hit: Record<string, unknown>,
  currency_code: string | undefined
): Record<string, unknown> {
  const id = String(hit.id ?? "")
  const handle = String(hit.handle ?? "")
  const title = String(hit.title ?? "")
  const card = hit.listing_card as ListingCard | undefined
  const sellerDot = hit["seller.handle"]
  const sellerHandleFromFlat =
    typeof sellerDot === "string" ? sellerDot : undefined
  const sellerWrap = hit.seller as
    | { handle?: string; store_status?: string | null }
    | undefined

  const b2c = card?.b2c_min_prices ?? (hit.min_prices as Record<string, number>)
  const picked = pickPriceAmount(
    b2c,
    (currency_code || "eur").toLowerCase()
  )

  const titlesI18n: Record<string, string> = {
    ...(card?.titles_i18n && typeof card.titles_i18n === "object"
      ? card.titles_i18n
      : {}),
  }
  if (!titlesI18n.it && title) {
    titlesI18n.it = title
  }

  const syntheticVariant = picked
    ? {
        id: `${id}_meili_card`,
        calculated_price: {
          id: `${id}_meili_price`,
          calculated_amount: picked.amount,
          calculated_amount_with_tax: picked.amount,
          currency_code: picked.cc,
          original_amount: picked.amount,
          calculated_price: { price_list_type: "meili_index" },
        },
        metadata: { tramelle_b2c_visible: true },
      }
    : {
        id: `${id}_meili_card`,
        metadata: { tramelle_b2c_visible: true },
      }

  const sh =
    card?.seller_handle?.trim() ||
    sellerHandleFromFlat ||
    sellerWrap?.handle ||
    ""

  return {
    id,
    handle,
    title,
    thumbnail: card?.thumbnail ?? null,
    metadata: { tramelle_i18n: titlesI18n },
    brand: card?.brand_name ? { name: card.brand_name } : null,
    seller: {
      id: card?.seller_id || `meili_${id}`,
      handle: sh || null,
      name: card?.seller_name ?? null,
      country_code: card?.seller_country_code ?? null,
      state: card?.seller_state ?? null,
      store_status: sellerWrap?.store_status ?? "ACTIVE",
    },
    variants: [syntheticVariant],
    listing_certifications: Array.isArray(card?.certifications)
      ? card.certifications
      : Array.isArray(hit.listing_certifications)
        ? (hit.listing_certifications as string[])
        : [],
    _tramelle_from_meili: true,
  }
}

export function meiliHitsToListingProducts(
  hits: Record<string, unknown>[],
  currency_code: string | undefined
): Record<string, unknown>[] {
  return hits.map((h) => meiliHitToListingProduct(h, currency_code))
}
