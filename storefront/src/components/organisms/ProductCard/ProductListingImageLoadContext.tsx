"use client"

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react"

type Ctx = {
  allowedRow: number
  reportProductRowSlotComplete: (row: number) => void
}

const ProductListingImageLoadContext = createContext<Ctx | null>(null)

export function useProductListingImageCoordination(): Ctx | null {
  return useContext(ProductListingImageLoadContext)
}

/**
 * Listing prodotti: immagini thumbnail a blocchi per riga (stessa logica directory seller),
 * niente “puzzle” tra righe. Allineato a `PRODUCT_LISTING_GRID_MAX_COLS`.
 */
export function ProductListingImageLoadProvider({
  rowCardCounts,
  children,
}: {
  rowCardCounts: number[]
  children: ReactNode
}) {
  const [allowedRow, setAllowedRow] = useState(0)
  const countsRef = useRef<Map<number, number>>(new Map())
  const countsKey = rowCardCounts.join(",")

  useEffect(() => {
    countsRef.current = new Map()
    setAllowedRow(0)
  }, [countsKey])

  const reportProductRowSlotComplete = useCallback(
    (row: number) => {
      const need = rowCardCounts[row] ?? 0
      if (need <= 0) return
      const m = countsRef.current
      const next = (m.get(row) ?? 0) + 1
      m.set(row, next)
      if (next >= need) {
        setAllowedRow((prev) => Math.max(prev, row + 1))
      }
    },
    [rowCardCounts]
  )

  const value = useMemo(
    () => ({ allowedRow, reportProductRowSlotComplete }),
    [allowedRow, reportProductRowSlotComplete]
  )

  return (
    <ProductListingImageLoadContext.Provider value={value}>
      {children}
    </ProductListingImageLoadContext.Provider>
  )
}
