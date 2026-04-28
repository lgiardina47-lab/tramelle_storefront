import type { HttpTypes } from "@medusajs/types"

import { pickPaymentSessionForStripeElements } from "./checkout-pick-payment-session"
import { getStripeClientSecretFromPaymentSession } from "./checkout-stripe-elements"

/** Passato dal Server Component checkout così il client monta `<Elements>` senza attendere il GET carrello. */
export type CheckoutStripeBootstrap = {
  sessionId: string
  clientSecret: string
  providerId: string
  status: string
}

function injectClientSecret(
  session: HttpTypes.StorePaymentSession,
  clientSecret: string
): HttpTypes.StorePaymentSession {
  const raw = session.data
  let data: Record<string, unknown>
  if (typeof raw === "string") {
    try {
      data = { ...(JSON.parse(raw) as Record<string, unknown>), client_secret: clientSecret }
    } catch {
      data = { client_secret: clientSecret }
    }
  } else if (raw && typeof raw === "object" && !Array.isArray(raw)) {
    data = { ...(raw as Record<string, unknown>), client_secret: clientSecret }
  } else {
    data = { client_secret: clientSecret }
  }
  return { ...session, data } as HttpTypes.StorePaymentSession
}

/**
 * Sceglie la sessione Stripe per `<Elements>`: preferisce i dati del carrello;
 * se il `client_secret` manca nel payload idratato (es. prima risposta client) usa il bootstrap server.
 */
export function resolvePaymentSessionForStripeElements(
  cart: HttpTypes.StoreCart | null | undefined,
  bootstrap: CheckoutStripeBootstrap | null | undefined
): HttpTypes.StorePaymentSession | undefined {
  const picked = pickPaymentSessionForStripeElements(cart)
  if (picked && getStripeClientSecretFromPaymentSession(picked)) {
    return picked
  }
  if (!bootstrap?.clientSecret?.trim() || !bootstrap.sessionId) {
    return picked
  }
  if (picked?.id === bootstrap.sessionId) {
    return injectClientSecret(picked, bootstrap.clientSecret.trim())
  }
  if (!picked) {
    /** Minimo per `<Elements>`: Stripe usa soprattutto `client_secret`; il tipo Medusa chiede altri campi. */
    return {
      id: bootstrap.sessionId,
      provider_id: bootstrap.providerId,
      status: bootstrap.status as HttpTypes.StorePaymentSession["status"],
      amount: cart?.payment_collection?.amount ?? cart?.total ?? 0,
      currency_code:
        cart?.payment_collection?.currency_code ??
        cart?.region?.currency_code ??
        "eur",
      data: { client_secret: bootstrap.clientSecret.trim() }
    } as unknown as HttpTypes.StorePaymentSession
  }
  return picked
}

/** Da usare nel Server Component `/checkout` per passare `checkoutStripeBootstrap` al client. */
export function buildCheckoutStripeBootstrap(
  cart: HttpTypes.StoreCart | null | undefined
): CheckoutStripeBootstrap | null {
  const picked = pickPaymentSessionForStripeElements(cart)
  const cs = picked ? getStripeClientSecretFromPaymentSession(picked) : undefined
  if (!picked?.id || !cs) {
    return null
  }
  return {
    sessionId: picked.id,
    clientSecret: cs,
    providerId: picked.provider_id ?? "",
    status: String(picked.status ?? "pending")
  }
}
