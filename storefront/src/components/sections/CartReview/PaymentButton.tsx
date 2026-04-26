"use client"

import ErrorMessage from "@/components/molecules/ErrorMessage/ErrorMessage"
import { isManual, isStripe } from "../../../lib/constants"
import { placeOrder } from "@/lib/data/cart"
import { HttpTypes } from "@medusajs/types"
import { useElements, useStripe } from "@stripe/react-stripe-js"
import type { StripeCardElement, StripeCardElementChangeEvent } from "@stripe/stripe-js"
import React, { useEffect, useState } from "react"
import { Button } from "@/components/atoms"
import { requiredShippingMethodCountForCart } from "@/lib/helpers/tramelle-seller-shipping-display"
import { orderErrorFormatter } from "@/lib/helpers/order-error-formatter"
import { toast } from "@/lib/helpers/toast"
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
  const needShip = requiredShippingMethodCountForCart(cart)
  const haveShip = cart.shipping_methods?.length ?? 0
  const hasShipLine1 = Boolean(
    (cart.shipping_address as { address_1?: string } | null | undefined)?.address_1?.trim()
  )
  const emailOk =
    String(cart.email || "").trim() || String(accountEmail || "").trim()
  const notReady =
    !cart ||
    !hasShipLine1 ||
    !emailOk ||
    (needShip > 0 && haveShip < needShip) ||
    minimumOrderBlocked

  const paymentSession = cart.payment_collection?.payment_sessions?.find(
    (s) => s.status === "pending"
  )
  if (isManual(paymentSession?.provider_id)) {
    return (
      <Button
        disabled
        className="w-full rounded-md !bg-[#1773b0]/40 py-3.5 text-base font-semibold !text-white"
        data-testid={dataTestId}
      >
        {t("paymentManualNotAvailable")}
      </Button>
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
          className="w-full rounded-md !bg-[#1773b0]/40 py-3.5 text-base font-semibold !text-white"
        >
          {t("selectPaymentMethod")}
        </Button>
      )
  }
}

const StripePaymentButton = ({
  cart,
  notReady,
  "data-testid": dataTestId,
}: {
  cart: HttpTypes.StoreCart
  notReady: boolean
  "data-testid"?: string
}) => {
  const t = useTranslations("Checkout")
  const [submitting, setSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [disabled, setDisabled] = useState(true)

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
  const card = elements?.getElement("card")

  const session = cart.payment_collection?.payment_sessions?.find(
    (s) => s.status === "pending"
  )

  useEffect(() => {
    if (!card) {
      setDisabled(true)
      return
    }
    const stripeCard = card as StripeCardElement
    const onChange = (e: StripeCardElementChangeEvent) => {
      setDisabled(!e.complete)
    }
    stripeCard.on("change", onChange)
    return () => {
      stripeCard.off("change", onChange)
    }
  }, [card])

  const handlePayment = async () => {
    setSubmitting(true)

    if (!stripe || !elements || !card || !cart) {
      setSubmitting(false)
      return
    }

    await stripe
      .confirmCardPayment(session?.data.client_secret as string, {
        payment_method: {
          card: card,
          billing_details: {
            name:
              cart.billing_address?.first_name +
              " " +
              cart.billing_address?.last_name,
            address: {
              city: cart.billing_address?.city ?? undefined,
              country: cart.billing_address?.country_code ?? undefined,
              line1: cart.billing_address?.address_1 ?? undefined,
              line2: cart.billing_address?.address_2 ?? undefined,
              postal_code: cart.billing_address?.postal_code ?? undefined,
              state: cart.billing_address?.province ?? undefined,
            },
            email: cart.email || accountEmail || undefined,
            phone: cart.billing_address?.phone ?? undefined,
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
          paymentIntent.status === "succeeded"
        ) {
          return onPaymentCompleted()
        }

        return
      })
  }

  return (
    <>
      <Button
        disabled={disabled || notReady}
        onClick={handlePayment}
        loading={submitting}
        className="w-full rounded-md !bg-[#1773b0] py-3.5 text-base font-semibold !text-white hover:!bg-[#135d91] disabled:!bg-[#b5b5b5]"
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
