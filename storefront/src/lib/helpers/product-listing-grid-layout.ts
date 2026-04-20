/**
 * Allineato alla griglia listing `md:grid-cols-5` (5 card per riga da breakpoint md).
 */
export const PRODUCT_LISTING_GRID_MAX_COLS = 5

export function productListingImageRowIndex(listIndex: number): number {
  return Math.floor(listIndex / PRODUCT_LISTING_GRID_MAX_COLS)
}

/** Es. 11 prodotti → [5,5,1] per coordinare il caricamento immagini a blocchi. */
export function productListingRowCardCounts(productCount: number): number[] {
  if (productCount <= 0) return []
  const rows: number[] = []
  for (let i = 0; i < productCount; i += PRODUCT_LISTING_GRID_MAX_COLS) {
    rows.push(
      Math.min(PRODUCT_LISTING_GRID_MAX_COLS, productCount - i)
    )
  }
  return rows
}
