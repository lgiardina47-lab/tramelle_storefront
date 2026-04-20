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
  /** Righe con indice ≤ allowedRow possono montare src su hero/logo. */
  allowedRow: number
  /** Una sola chiamata per card quando lo slot hero è “chiuso” (loaded / fallback / nessuna url). */
  reportHeroRowSlotComplete: (row: number) => void
}

const SellerDirectoryImageLoadContext = createContext<Ctx | null>(null)

export function useSellerDirectoryImageCoordination(): Ctx | null {
  return useContext(SellerDirectoryImageLoadContext)
}

/**
 * Directory produttori: carica le immagini a blocchi da 4 (una riga griglia alla volta),
 * tutte con `loading="lazy"` quando lo slot è abilitato — niente “puzzle” tra righe.
 */
export function SellerDirectoryImageLoadProvider({
  rowCardCounts,
  children,
}: {
  /** Es. [4,4,4,3] = card per ogni riga (ultima riga può essere parziale). */
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

  const reportHeroRowSlotComplete = useCallback(
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
    () => ({ allowedRow, reportHeroRowSlotComplete }),
    [allowedRow, reportHeroRowSlotComplete]
  )

  return (
    <SellerDirectoryImageLoadContext.Provider value={value}>
      {children}
    </SellerDirectoryImageLoadContext.Provider>
  )
}
