"use client"

import { Heading, useToggleState } from "@medusajs/ui"
import { setAddresses } from "@/lib/data/cart"
import compareAddresses from "@/lib/helpers/compare-addresses"
import { HttpTypes } from "@medusajs/types"
import { useRouter } from "next/navigation"
import { useState, type FormEvent } from "react"
import { Button } from "@/components/atoms"
import ErrorMessage from "@/components/molecules/ErrorMessage/ErrorMessage"
import ShippingAddress from "@/components/organisms/ShippingAddress/ShippingAddress"
import { CheckCircleSolid } from "@medusajs/icons"
import { useTranslations } from "next-intl"

import { isCheckoutDeliveryAddressComplete } from "@/lib/helpers/checkout-delivery-address"
import { CheckoutInlineLogin } from "./CheckoutInlineLogin"

export const CartAddressSection = ({
  cart,
  customer,
}: {
  cart: HttpTypes.StoreCart | null
  customer: HttpTypes.StoreCustomer | null
}) => {
  const t = useTranslations("Checkout")
  const router = useRouter()

  const isAddress = isCheckoutDeliveryAddressComplete(cart?.shipping_address)

  const { state: sameAsBilling, toggle: toggleSameAsBilling } = useToggleState(
    cart?.shipping_address && cart?.billing_address
      ? compareAddresses(cart?.shipping_address, cart?.billing_address)
      : true
  )

  const [error, setError] = useState<string | null>(null);

  return (
    <div
      className="border-b border-[#e8e8e8] bg-white pb-10"
      data-testid="checkout-step-address"
    >
      <div className="mb-5 flex flex-row items-center justify-between">
        <Heading
          level="h2"
          className="flex flex-row items-baseline gap-x-2 text-lg font-semibold text-[#202223]"
        >
          {isAddress && <CheckCircleSolid className="text-[#1773b0]" />} {t("shippingAddress")}
        </Heading>
      </div>
      <form
        onSubmit={async (e: FormEvent<HTMLFormElement>) => {
          e.preventDefault()
          setError(null)
          const res = await setAddresses(sameAsBilling, new FormData(e.currentTarget))
          if (res === "success") {
            router.refresh()
          } else if (typeof res === "string" && res.length) {
            setError(res)
          }
        }}
      >
        <div className="pb-8">
          {!customer ? (
            <div
              className="mb-6 scroll-mt-24 rounded-md border border-[#d9d9d9] bg-[#fafafa] p-4 text-sm text-[#202223]"
              data-testid="checkout-login-hint"
            >
              <p className="mb-2 font-medium">{t("alreadyHaveAccount")}</p>
              <p className="mb-1 text-[#6d7175]">{t("inlineLoginHint")}</p>
              <CheckoutInlineLogin />
            </div>
          ) : null}
          <ShippingAddress
            customer={customer}
            checked={sameAsBilling}
            onChange={toggleSameAsBilling}
            cart={cart}
          />
          <Button
            className="mt-6 border border-[#d9d9d9] bg-[#f5f5f5] text-[#202223] hover:bg-[#ebebeb]"
            data-testid="submit-address-button"
            variant="tonal"
          >
            {t("save")}
          </Button>
          <ErrorMessage
            error={error}
            data-testid="address-error-message"
          />
        </div>
      </form>
    </div>
  )
}
