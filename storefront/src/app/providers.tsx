"use client"

import { CartProvider } from "@/components/providers"
import { Cart } from "@/types/cart"
import type React from "react"

import { PropsWithChildren } from "react"

interface ProvidersProps extends PropsWithChildren {
  cart: Cart | null
  wholesaleBuyer?: boolean
}

export function Providers({
  children,
  cart,
  wholesaleBuyer = false,
}: ProvidersProps) {
  return (
    <CartProvider cart={cart} wholesaleBuyer={wholesaleBuyer}>
      {children}
    </CartProvider>
  )
}
