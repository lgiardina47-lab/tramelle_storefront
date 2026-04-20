/** Allineato a `xl:grid-cols-4` nella directory produttori (blocchi immagini per riga). */
export const SELLER_DIRECTORY_GRID_MAX_COLS = 4

export function sellerDirectoryImageRowIndex(listIndex: number): number {
  return Math.floor(listIndex / SELLER_DIRECTORY_GRID_MAX_COLS)
}

/** Es. 11 seller → [4,4,3] per coordinare il lazy a blocchi da 4. */
export function sellerDirectoryRowCardCounts(sellerCount: number): number[] {
  if (sellerCount <= 0) return []
  const rows: number[] = []
  for (let i = 0; i < sellerCount; i += SELLER_DIRECTORY_GRID_MAX_COLS) {
    rows.push(
      Math.min(SELLER_DIRECTORY_GRID_MAX_COLS, sellerCount - i)
    )
  }
  return rows
}
