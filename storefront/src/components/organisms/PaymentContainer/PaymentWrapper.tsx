"use client"

import { loadStripe } from "@stripe/stripe-js"
import { HttpTypes } from "@medusajs/types"
import React, { useEffect, useMemo, useState } from "react"

import { isStripe } from "@/lib/constants"
import { retrieveCartWithPaymentSessionData } from "@/lib/data/cart-retrieve-browser"
import { getStripeClientSecretFromPaymentSession } from "@/lib/helpers/checkout-stripe-elements"
import { isPaymentSessionActiveForStripeUi } from "@/lib/helpers/checkout-payment-session-status"
import {
  resolvePaymentSessionForStripeElements,
  type CheckoutStripeBootstrap,
} from "@/lib/helpers/checkout-resolve-stripe-session"

import { CheckoutStripeCartContext } from "./CheckoutStripeCartContext"
import { StripeCheckoutAvailabilityContext } from "./StripeCheckoutAvailabilityContext"
import StripeWrapper from "./StripeWrapper"

type PaymentWrapperProps = {
  cart: HttpTypes.StoreCart
  /** Secret/sessione letti sul server: evita attesa sul GET carrello client prima del Payment Element. */
  checkoutStripeBootstrap?: CheckoutStripeBootstrap | null
  children: React.ReactNode
}

const stripeKey = process.env.NEXT_PUBLIC_STRIPE_KEY
const stripePromise = stripeKey ? loadStripe(stripeKey) : null

const PaymentWrapper: React.FC<PaymentWrapperProps> = ({
  cart,
  checkoutStripeBootstrap = null,
  children,
}) => {
  /**
   * Il carrello passato dal Server Component può perdere campi sensibili annidati (`payment_sessions[].data.client_secret`)
   * nella serializzazione RSC → Stripe `<Elements>` non riceve mai il secret. Refresh via SDK nel browser ripristina i dati.
   */
  const [browserCart, setBrowserCart] = useState<HttpTypes.StoreCart | null>(null)
  const cartRev = useMemo(
    () => `${cart?.id ?? ""}:${String(cart?.updated_at ?? "")}`,
    [cart?.id, cart?.updated_at]
  )

  useEffect(() => {
    if (!cart?.id) {
      return
    }
    let cancelled = false
    void retrieveCartWithPaymentSessionData(cart.id).then((fresh) => {
      if (!cancelled && fresh) {
        setBrowserCart(fresh)
      }
    })
      .catch(() => {
        if (!cancelled) {
          setBrowserCart(null)
        }
      })
    return () => {
      cancelled = true
    }
  }, [cart?.id, cartRev])

  const effectiveCart = browserCart ?? cart
  const paymentSession = useMemo(
    () =>
      resolvePaymentSessionForStripeElements(
        effectiveCart,
        checkoutStripeBootstrap
      ),
    [effectiveCart, checkoutStripeBootstrap]
  )

  /**
   * Monta `<Elements>` se sessione Stripe (Connect o core) o se è presente `client_secret` nella sessione.
   */
  const mountStripeElements =
    !!stripePromise &&
    !!paymentSession &&
    isPaymentSessionActiveForStripeUi(paymentSession.status) &&
    (isStripe(paymentSession.provider_id) ||
      Boolean(getStripeClientSecretFromPaymentSession(paymentSession)))

  const wrapped = (inner: React.ReactNode) => (
    <CheckoutStripeCartContext.Provider value={effectiveCart}>
      {inner}
    </CheckoutStripeCartContext.Provider>
  )

  /** Chiave pubblica assente → niente `loadStripe`; evita spinner infinito nel box pagamento. */
  if (!stripeKey || !stripePromise) {
    return wrapped(
      <StripeCheckoutAvailabilityContext.Provider value="misconfigured">
        <div key="checkout-stripe-misconfigured">{children}</div>
      </StripeCheckoutAvailabilityContext.Provider>
    )
  }

  if (mountStripeElements && paymentSession) {
    return wrapped(
      <StripeWrapper
        paymentSession={paymentSession}
        stripeKey={stripeKey}
        stripePromise={stripePromise}
      >
        {children}
      </StripeWrapper>
    )
  }

  return wrapped(
    <StripeCheckoutAvailabilityContext.Provider value="off">
      <div key="checkout-no-stripe-wrap">{children}</div>
    </StripeCheckoutAvailabilityContext.Provider>
  )
}

export default PaymentWrapper
