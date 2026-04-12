export const PRODUCT_LIMIT = 12

export const PARENT_CATEGORIES = ["menswear", "womenswear"]

/** Se true, nasconde sidebar filtri (prezzo/taglia/colore) e chip filtri attivi nella listing con ricerca. */
export const HIDE_LISTING_FILTERS =
  process.env.NEXT_PUBLIC_HIDE_LISTING_FILTERS === "true"
