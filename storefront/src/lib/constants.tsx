import React from "react"
import { Cash, CreditCard } from "@medusajs/icons"

/* Map of payment provider_id to their title and icon. Add in any payment providers you want to use. */
export const paymentInfoMap: Record<
  string,
  { title: string; icon: React.JSX.Element }
> = {
  "pp_card_stripe-connect": {
    title: "Card, PayPal, Apple Pay, Google Pay",
    icon: <CreditCard />,
  },
  pp_stripe_stripe: {
    title: "Card and digital wallets",
    icon: <CreditCard />,
  },
  "pp_stripe-ideal_stripe": {
    title: "iDeal",
    icon: <CreditCard />,
  },
  "pp_stripe-bancontact_stripe": {
    title: "Bancontact",
    icon: <CreditCard />,
  },
  pp_paypal_paypal: {
    title: "PayPal",
    icon: <CreditCard />,
  },
  pp_system_default: {
    title: "Manual Payment",
    icon: <Cash />,
  },
  // Add more payment providers here
}

// Stripe Connect (Mercur): `pp_card_stripe-connect_*` | Stripe core Medusa `pp_stripe_*` / `pp_stripe-*`.
// Alcuni ambienti possono normalizzare `-`/`_`: accettiamo entrambi i prefissi noti.
export const isStripe = (providerId?: string) => {
  if (!providerId) return false
  return (
    providerId.startsWith("pp_card_stripe-connect") ||
    providerId.startsWith("pp_card_stripe_connect") ||
    providerId.startsWith("pp_stripe_") ||
    providerId.startsWith("pp_stripe-")
  )
}
export const isPaypal = (providerId?: string) => {
  return providerId?.startsWith("pp_paypal")
}
export const isManual = (providerId?: string) => {
  return providerId?.startsWith("pp_system_default")
}

// Add currencies that don't need to be divided by 100
export const noDivisionCurrencies = [
  "krw",
  "jpy",
  "vnd",
  "clp",
  "pyg",
  "xaf",
  "xof",
  "bif",
  "djf",
  "gnf",
  "kmf",
  "mga",
  "rwf",
  "xpf",
  "htg",
  "vuv",
  "xag",
  "xdr",
  "xau",
]

export const PROTECTED_ROUTES = ['/user', '/user/wishlist', '/user/orders', '/user/settings', '/user/addresses', '/user/messages', '/user/reviews', '/user/returns']