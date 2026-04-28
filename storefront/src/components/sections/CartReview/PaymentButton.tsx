"use client"

import ErrorMessage from "@/components/molecules/ErrorMessage/ErrorMessage"
import { isManual, isStripe } from "../../../lib/constants"
import { placeOrder } from "@/lib/data/cart"
import { HttpTypes } from "@medusajs/types"
import { useElements, useStripe } from "@stripe/react-stripe-js"
import React, { useState } from "react"
import { Button } from "@/components/atoms"
import { useCheckoutCardComplete } from "@/components/organisms/PaymentContainer/CheckoutCardReadyContext"
import { useCheckoutStripeCart } from "@/components/organisms/PaymentContainer/CheckoutStripeCartContext"
import { pickPaymentSessionForStripeElements } from "@/lib/helpers/checkout-pick-payment-session"
import { isCheckoutDeliveryAddressComplete } from "@/lib/helpers/checkout-delivery-address"
import { isCartShippingReadyForPay } from "@/lib/helpers/tramelle-seller-shipping-display"
import { useTranslations } from "next-intl"

type PaymentButtonProps = {
  cart: HttpTypes.StoreCart
  /** Profilo: usato se `cart.email` non è ancora persistito (checkout da loggato). */
  accountEmail?: string | null
  "data-testid": string
  /** Blocco ordine: importi minimi per produttore (listing metadata). */
  minimumOrderBlocked?: boolean
}

const PaymentButton: React.FC<PaymentButtonProps> = ({
  cart,
  accountEmail = null,
  minimumOrderBlocked = false,
  "data-testid": dataTestId,
}) => {
  const t = useTranslations("Checkout")
  const stripeCart = useCheckoutStripeCart()
  const cartForPay = stripeCart ?? cart
  const addressOk = isCheckoutDeliveryAddressComplete(cart.shipping_address)
  const emailOk =
    String(cart.email || "").trim() || String(accountEmail || "").trim()
  const shippingOk = isCartShippingReadyForPay(cart)
  const notReady =
    !cart ||
    !addressOk ||
    !emailOk ||
    !shippingOk ||
    minimumOrderBlocked

  const paymentSession = pickPaymentSessionForStripeElements(cartForPay)
  if (isManual(paymentSession?.provider_id)) {
    return (
      <>
        <Button
          disabled
          className="w-full rounded-md py-3.5 text-base font-semibold !text-white !bg-[#b5b5b5] hover:!bg-[#b5b5b5]"
          data-testid={dataTestId}
        >
          {t("placeOrder")}
        </Button>
        <p className="mt-2 text-center text-xs text-amber-900">
          {t("paymentManualNotAvailable")}
        </p>
      </>
    )
  }

  switch (true) {
    case isStripe(paymentSession?.provider_id):
      return (
        <StripePaymentButton
          notReady={notReady}
          cart={cart}
          accountEmail={accountEmail}
          data-testid={dataTestId}
        />
      )
    default:
      return (
        <Button
          disabled
          className="w-full rounded-md py-3.5 text-base font-semibold !text-white !bg-[#b5b5b5] hover:!bg-[#b5b5b5]"
          data-testid={dataTestId}
        >
          {t("placeOrder")}
        </Button>
      )
  }
}

const StripePaymentButton = ({
  cart,
  notReady,
  accountEmail = null,
  "data-testid": dataTestId,
}: {
  cart: HttpTypes.StoreCart
  notReady: boolean
  accountEmail?: string | null
  "data-testid"?: string
}) => {
  const t = useTranslations("Checkout")
  const [submitting, setSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const cardCtx = useCheckoutCardComplete()
  const cardComplete = cardCtx?.cardComplete ?? false

  const onPaymentCompleted = async () => {
    try {
      const res = await placeOrder()
      if (!res.ok) {
        setErrorMessage(res.error?.message)
      }
    } catch (error: any) {
      if (error?.message !== "NEXT_REDIRECT") {
        setErrorMessage(
          error?.message?.replace("Error setting up the request: ", "")
        )
      }
    } finally {
      setSubmitting(false)
    }
  }

  const stripe = useStripe()
  const elements = useElements()

  const handlePayment = async () => {
    setSubmitting(true)
    if (!stripe || !elements || !cart) {
      setSubmitting(false)
      return
    }

    const origin =
      typeof window !== "undefined" ? window.location.origin : ""
    const path = typeof window !== "undefined" ? window.location.pathname : ""
    const returnUrl = origin && path ? `${origin}${path}` : undefined

    // Payment Element raccoglie il metodo; `payment_method_data` non va passato con Elements.
    const { error, paymentIntent } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: returnUrl ?? (typeof window !== "undefined" ? window.location.href : ""),
      },
      redirect: "if_required",
    })

    if (error) {
      const pi = error.payment_intent
      if (
        (pi && pi.status === "requires_capture") ||
        (pi && pi.status === "succeeded")
      ) {
        await onPaymentCompleted()
      } else {
        setErrorMessage(error.message || null)
      }
      setSubmitting(false)
      return
    }

    if (paymentIntent) {
      if (
        paymentIntent.status === "requires_capture" ||
        paymentIntent.status === "succeeded"
      ) {
        await onPaymentCompleted()
      }
    }
    setSubmitting(false)
  }

  const payDisabled = notReady || !cardComplete

  return (
    <>
      <Button
        disabled={payDisabled}
        onClick={handlePayment}
        loading={submitting}
        data-testid={dataTestId}
        className={
          "w-full rounded-none border border-[#0f0e0b] py-3.5 text-base font-semibold !text-white " +
          (payDisabled
            ? "!bg-[#b5b5b5] hover:!bg-[#b5b5b5] !border-[#b5b5b5]"
            : "!bg-[#0f0e0b] hover:!bg-[#0f0e0b]")
        }
      >
        {t("placeOrder")}
      </Button>
      <ErrorMessage
        error={errorMessage}
        data-testid="stripe-payment-error-message"
      />
    </>
  )
}

export default PaymentButton
