"use client"

import type { HttpTypes } from "@medusajs/types"
import { createContext, useContext } from "react"

/**
 * Carrello con `payment_sessions[].data` completo (browser SDK).
 * Il props dal Server Component può essere privo di `client_secret`.
 */
export const CheckoutStripeCartContext =
  createContext<HttpTypes.StoreCart | null>(null)

export function useCheckoutStripeCart(): HttpTypes.StoreCart | null {
  return useContext(CheckoutStripeCartContext)
}
