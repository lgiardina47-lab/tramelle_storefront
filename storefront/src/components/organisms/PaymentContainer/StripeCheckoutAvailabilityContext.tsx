"use client"

import { createContext, useContext } from "react"

/** Coerenza PaymentWrapper / StripeWrapper per il box pagamento. */
export type StripeCheckoutAvailability =
  | "off"
  | "missing-credentials"
  | "misconfigured"
  | "ready"

export const StripeCheckoutAvailabilityContext =
  createContext<StripeCheckoutAvailability>("off")

export function useStripeCheckoutAvailability(): StripeCheckoutAvailability {
  return useContext(StripeCheckoutAvailabilityContext)
}
