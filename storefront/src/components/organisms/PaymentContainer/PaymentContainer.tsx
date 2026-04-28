import { Radio as CheckoutPaymentRadio } from "@headlessui/react"
import { Text, clx } from "@medusajs/ui"
import React, { useContext, useEffect, useMemo, type JSX } from "react"

import { PaymentElement } from "@stripe/react-stripe-js"
import { useTranslations } from "next-intl"

import { useCheckoutCardComplete } from "./CheckoutCardReadyContext"
import { useStripeCheckoutAvailability } from "./StripeCheckoutAvailabilityContext"
import { StripeContext } from "./StripeWrapper"

type PaymentContainerProps = {
  paymentProviderId: string
  selectedPaymentOptionId: string | null
  disabled?: boolean
  paymentInfoMap: Record<string, { title: string; icon: JSX.Element }>
  children?: React.ReactNode
}

const PaymentContainer: React.FC<PaymentContainerProps> = ({
  paymentProviderId,
  selectedPaymentOptionId,
  paymentInfoMap,
  disabled = false,
  children,
}) => {
  return (
    <CheckoutPaymentRadio
      key={paymentProviderId}
      as="div"
      value={paymentProviderId}
      disabled={disabled}
      className={clx(
        "checkout-payment-option flex flex-col gap-y-2 text-small-regular cursor-pointer rounded-none border border-[#d9d9d9] px-5 py-4 mb-2 transition-colors hover:border-[#8c9196]",
        {
          "border-[#0f0e0b] shadow-[inset_0_0_0_1px_rgba(15,14,11,0.2)]":
            selectedPaymentOptionId === paymentProviderId,
        }
      )}
    >
      <div className="flex items-center justify-between ">
        <div className="flex items-center gap-x-4">
          <span
            aria-hidden
            className={clx(
              "flex h-4 w-4 shrink-0 items-center justify-center rounded-full border border-[#8c9196] bg-white transition-colors",
              selectedPaymentOptionId === paymentProviderId &&
                "border-[#0f0e0b] bg-[#0f0e0b]"
            )}
          >
            {selectedPaymentOptionId === paymentProviderId ? (
              <span className="h-2 w-2 rounded-full bg-white" />
            ) : null}
          </span>
          <Text className="text-base-regular">
            {paymentInfoMap[paymentProviderId]?.title || paymentProviderId}
          </Text>
        </div>
        <span className="justify-self-end text-ui-fg-base">
          {paymentInfoMap[paymentProviderId]?.icon}
        </span>
      </div>
      {children}
    </CheckoutPaymentRadio>
  )
}

export default PaymentContainer

export const StripeCardContainer = ({
  paymentProviderId,
  selectedPaymentOptionId,
  paymentInfoMap,
  disabled = false,
  setCardBrand,
  setError,
  setCardComplete,
  defaultBillingEmail,
  businessName = "Tramelle",
}: Omit<PaymentContainerProps, "children"> & {
  setCardBrand: (brand: string) => void
  setError: (error: string | null) => void
  setCardComplete: (complete: boolean) => void
  /** Email carrello: aiuta i wallet in Chrome/test (vedi doc Stripe su Payment Element + wallet). */
  defaultBillingEmail?: string | null
  businessName?: string
}) => {
  const t = useTranslations("Checkout")
  const stripeReady = useContext(StripeContext)
  const stripeAvailability = useStripeCheckoutAvailability()
  const cardReadyCtx = useCheckoutCardComplete()

  const paymentElementOptions = useMemo(() => {
    const email = defaultBillingEmail?.trim()
    return {
      /** Accordion visivamente espanso (carte / PayPal subito visibili senza click extra). */
      layout: {
        type: "accordion" as const,
        defaultCollapsed: false,
      },
      business: { name: businessName },
      ...(email
        ? { defaultValues: { billingDetails: { email } } }
        : {}),
      /**
       * `card` prima: il Payment Element diventa interattivo prima (meno attesa sui probe wallet).
       * Google Pay in Chrome compare comunque sopra i campi se abilitato in Stripe Dashboard.
       */
      paymentMethodOrder: [
        "card",
        "paypal",
        "google_pay",
        "apple_pay",
      ] as string[],
      wallets: {
        applePay: "auto" as const,
        googlePay: "auto" as const,
        link: "never" as const,
      },
    }
  }, [businessName, defaultBillingEmail])

  useEffect(() => {
    if (selectedPaymentOptionId !== paymentProviderId) {
      cardReadyCtx?.setCardComplete(false)
    }
  }, [selectedPaymentOptionId, paymentProviderId, cardReadyCtx])

  return (
    <PaymentContainer
      paymentProviderId={paymentProviderId}
      selectedPaymentOptionId={selectedPaymentOptionId}
      paymentInfoMap={paymentInfoMap}
      disabled={disabled}
    >
      {selectedPaymentOptionId === paymentProviderId &&
        (stripeReady ? (
          <div
            className="my-4 min-h-[200px]"
            data-testid="stripe-payment-element-wrap"
          >
            <PaymentElement
              id="tramelle-checkout-payment-element"
              options={paymentElementOptions}
              onChange={(e) => {
                const brand = e.value?.type
                if (brand && typeof brand === "string") {
                  setCardBrand(brand.charAt(0).toUpperCase() + brand.slice(1))
                } else {
                  setCardBrand("")
                }
                const err = (e as { error?: { message?: string } }).error
                setError(err?.message ?? null)
                const ready = e.complete && !e.empty
                setCardComplete(ready)
                cardReadyCtx?.setCardComplete(ready)
              }}
            />
          </div>
        ) : stripeAvailability === "missing-credentials" ? null : stripeAvailability === "misconfigured" ? (
          <div
            role="alert"
            className="my-4 rounded-none border border-amber-200 bg-amber-50 px-4 py-4 text-center text-sm text-amber-950"
            data-testid="stripe-misconfigured"
          >
            {t("stripePublishableKeyMissing")}
          </div>
        ) : (
          <div
            className="my-4 flex min-h-[120px] flex-col items-center justify-center gap-2 rounded-none border border-dashed border-[#d9d9d9] bg-[#fafafa] px-4 py-6 text-center"
            data-testid="stripe-payment-loading"
          >
            <span className="text-sm text-[#6d7175]">{t("loading")}</span>
            <span className="max-w-sm text-xs text-[#6d7175]">
              {t("stripePaymentAwaitElementsHint")}
            </span>
          </div>
        ))}
    </PaymentContainer>
  )
}
