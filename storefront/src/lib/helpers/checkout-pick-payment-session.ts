import type { HttpTypes } from "@medusajs/types"

import { isStripe } from "@/lib/constants"

import { isPaymentSessionActiveForStripeUi } from "./checkout-payment-session-status"
import { getStripeClientSecretFromPaymentSession } from "./checkout-stripe-elements"

/**
 * Preferisce sessione Stripe Connect / con PI secret; altrimenti prima sessione ancora utilizzabile.
 * Se tutte risultano “chiuse” per enum rigido ma resta una sessione Stripe, usa quella (evita box vuoto).
 */
export function pickPaymentSessionForStripeElements(
  cart: HttpTypes.StoreCart | null | undefined
): HttpTypes.StorePaymentSession | undefined {
  const sessions = cart?.payment_collection?.payment_sessions ?? []
  if (!sessions.length) return undefined

  const active = sessions.filter((s) =>
    isPaymentSessionActiveForStripeUi(s.status)
  )
  const pool = active.length ? active : sessions

  const stripeConnect = pool.find((s) => isStripe(s.provider_id))
  if (stripeConnect) return stripeConnect

  const withSecret = pool.find((s) =>
    Boolean(getStripeClientSecretFromPaymentSession(s))
  )
  if (withSecret) return withSecret

  const stripeFallback = sessions.find((s) => isStripe(s.provider_id))
  if (stripeFallback) return stripeFallback

  return pool[0]
}
