/**
 * Test helper checkout Stripe / sessione pagamento (senza browser).
 * Esecuzione: da `storefront/`, `yarn test:checkout` oppure `npx tsx scripts/test-checkout-stripe.ts`
 */
import type { HttpTypes } from "@medusajs/types"

import { isStripe } from "../src/lib/constants"
import { isPaymentSessionActiveForStripeUi } from "../src/lib/helpers/checkout-payment-session-status"
import { pickPaymentSessionForStripeElements } from "../src/lib/helpers/checkout-pick-payment-session"
import { getStripeClientSecretFromPaymentSession } from "../src/lib/helpers/checkout-stripe-elements"

function assert(cond: boolean, message: string): void {
  if (!cond) {
    throw new Error(`Assertion failed: ${message}`)
  }
}

function sess(
  partial: Partial<HttpTypes.StorePaymentSession> &
    Pick<HttpTypes.StorePaymentSession, "id" | "provider_id" | "status">
): HttpTypes.StorePaymentSession {
  return {
    created_at: "",
    updated_at: "",
    payment_collection_id: "pcol_test",
    amount: 100,
    currency_code: "eur",
    data: {},
    metadata: null,
    ...partial,
  } as HttpTypes.StorePaymentSession
}

assert(isStripe("pp_card_stripe-connect_xyz"), "Connect prefix")
assert(isStripe("pp_stripe_stripe"), "Core Stripe provider")
assert(!isStripe("pp_system_default"), "manual")

assert(isPaymentSessionActiveForStripeUi("pending"), "pending ok")
assert(isPaymentSessionActiveForStripeUi("requires_more"), "requires_more ok")
assert(isPaymentSessionActiveForStripeUi(undefined), "undefined permissive")
assert(!isPaymentSessionActiveForStripeUi("error"), "error blocked")

const secretFlat = sess({
  id: "ps_1",
  provider_id: "pp_card_stripe-connect_default",
  status: "pending",
  data: {
    client_secret:
      "pi_test_secret_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
  },
})
assert(
  getStripeClientSecretFromPaymentSession(secretFlat)?.includes("_secret_"),
  "extract flat secret"
)

const pickedConnect = pickPaymentSessionForStripeElements({
  id: "cart_x",
  payment_collection: {
    id: "pcol",
    payment_sessions: [
      sess({
        id: "ps_paypal",
        provider_id: "pp_paypal_paypal",
        status: "pending",
      }),
      secretFlat,
    ],
  },
} as HttpTypes.StoreCart)
assert(
  pickedConnect?.provider_id?.startsWith("pp_card_stripe-connect"),
  "prefer Stripe Connect over PayPal when both pending"
)

/** Sessione Stripe con stato non previsto dal vecchio filtro `pending` — deve comunque essere scelta. */
const weirdStatus = sess({
  id: "ps_weird",
  provider_id: "pp_card_stripe-connect_default",
  status: "weird_plugin_label" as HttpTypes.StorePaymentSession["status"],
  data: {
    client_secret:
      "pi_weird_secret_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
  },
})
const pickedWeird = pickPaymentSessionForStripeElements({
  id: "cart_y",
  payment_collection: {
    id: "pcol",
    payment_sessions: [weirdStatus],
  },
} as HttpTypes.StoreCart)
assert(pickedWeird?.id === "ps_weird", "fallback stripe session when status non enum")

console.log("OK — test-checkout-stripe: tutti i check superati.")
