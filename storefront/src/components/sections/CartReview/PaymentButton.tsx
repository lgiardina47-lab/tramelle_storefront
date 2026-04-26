"use client"

import ErrorMessage from "@/components/molecules/ErrorMessage/ErrorMessage"
import { isManual, isStripe } from "../../../lib/constants"
import { placeOrder } from "@/lib/data/cart"
import { HttpTypes } from "@medusajs/types"
import { useElements, useStripe } from "@stripe/react-stripe-js"
import type { StripeCardElement } from "@stripe/stripe-js"
import React, { useState } from "react"
import { Button } from "@/components/atoms"
import { useCheckoutCardComplete } from "@/components/organisms/PaymentContainer/CheckoutCardReadyContext"
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

  const paymentSession = cart.payment_collection?.payment_sessions?.find(
    (s) => s.status === "pending"
  )
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

  const session = cart.payment_collection?.payment_sessions?.find(
    (s) => s.status === "pending"
  )

  const billing = cart.billing_address ?? cart.shipping_address
  const handlePayment = async () => {
    setSubmitting(true)

    const card = elements?.getElement("card") as StripeCardElement | null
    if (!stripe || !elements || !card || !cart) {
      setSubmitting(false)
      return
    }

    const first = billing?.first_name ?? cart.shipping_address?.first_name ?? ""
    const last = billing?.last_name ?? cart.shipping_address?.last_name ?? ""

    await stripe
      .confirmCardPayment(session?.data.client_secret as string, {
        payment_method: {
          card: card,
          billing_details: {
            name: `${first} ${last}`.trim() || undefined,
            address: {
              city: billing?.city ?? undefined,
              country: billing?.country_code ?? undefined,
              line1: billing?.address_1 ?? undefined,
              line2: billing?.address_2 ?? undefined,
              postal_code: billing?.postal_code ?? undefined,
              state: billing?.province ?? undefined,
            },
            email: cart.email || accountEmail || undefined,
            phone: billing?.phone ?? undefined,
          },
        },
      })
      .then(({ error, paymentIntent }) => {
        if (error) {
          const pi = error.payment_intent

          if (
            (pi && pi.status === "requires_capture") ||
            (pi && pi.status === "succeeded")
          ) {
            onPaymentCompleted()
          }

          setErrorMessage(error.message || null)
          return
        }

        if (
          (paymentIntent && paymentIntent.status === "requires_capture") ||
          paymentIntent?.status === "succeeded"
        ) {
          return onPaymentCompleted()
        }

        return
      })
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
          "w-full rounded-md py-3.5 text-base font-semibold !text-white " +
          (payDisabled
            ? "!bg-[#b5b5b5] hover:!bg-[#b5b5b5]"
            : "!bg-[#1773b0] hover:!bg-[#135d91]")
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
