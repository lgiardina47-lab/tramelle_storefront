"use client"

import { HttpTypes } from "@medusajs/types"
import { createContext } from "react"
import { Elements } from "@stripe/react-stripe-js"
import { Stripe, StripeElementsOptions } from "@stripe/stripe-js"
import { useTranslations } from "next-intl"

import { getStripeClientSecretFromPaymentSession } from "@/lib/helpers/checkout-stripe-elements"
import { tramelleStripeAppearance } from "@/lib/stripe/tramelle-stripe-appearance"

import { CheckoutCardReadyProvider } from "./CheckoutCardReadyContext"
import { StripeCheckoutAvailabilityContext } from "./StripeCheckoutAvailabilityContext"

type StripeWrapperProps = {
  paymentSession: HttpTypes.StorePaymentSession
  stripeKey?: string
  stripePromise: Promise<Stripe | null> | null
  children: React.ReactNode
}

export const StripeContext = createContext(false)

const StripeWrapper: React.FC<StripeWrapperProps> = ({
  paymentSession,
  stripeKey,
  stripePromise,
  children,
}) => {
  const t = useTranslations("Checkout")
  const clientSecret = getStripeClientSecretFromPaymentSession(paymentSession)

  if (!stripeKey) {
    throw new Error(
      "Stripe key is missing. Set NEXT_PUBLIC_STRIPE_KEY environment variable."
    )
  }

  if (!stripePromise) {
    throw new Error(
      "Stripe promise is missing. Make sure you have provided a valid Stripe key."
    )
  }

  if (!clientSecret) {
    return (
      <StripeCheckoutAvailabilityContext.Provider value="missing-credentials">
        <StripeContext.Provider value={false}>
          <CheckoutCardReadyProvider>
            <div
              role="alert"
              className="mx-auto mb-4 max-w-[min(100%,42rem)] rounded border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950"
              data-testid="stripe-missing-client-secret"
            >
              {t("stripePaymentMissingClientSecret")}
            </div>
            {children}
          </CheckoutCardReadyProvider>
        </StripeContext.Provider>
      </StripeCheckoutAvailabilityContext.Provider>
    )
  }

  const options: StripeElementsOptions = {
    clientSecret,
    appearance: tramelleStripeAppearance,
    loader: "auto",
  }

  const elementsKey = `${paymentSession.id}:${clientSecret}`

  return (
    <StripeCheckoutAvailabilityContext.Provider value="ready">
      <StripeContext.Provider value={true}>
        <Elements
          key={elementsKey}
          options={options}
          stripe={stripePromise}
        >
          <CheckoutCardReadyProvider>{children}</CheckoutCardReadyProvider>
        </Elements>
      </StripeContext.Provider>
    </StripeCheckoutAvailabilityContext.Provider>
  )
}

export default StripeWrapper
