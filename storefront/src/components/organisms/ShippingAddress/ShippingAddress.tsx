"use client"

import { HttpTypes } from "@medusajs/types"
import { Container } from "@medusajs/ui"
import { mapKeys } from "lodash"
import { useTranslations } from "next-intl"
import { usePathname } from "next/navigation"
import React, { useEffect, useMemo, useState } from "react"

import { Input } from "@/components/atoms"
import AddressSelect from "@/components/cells/AddressSelect/AddressSelect"
import CountrySelect from "@/components/cells/CountrySelect/CountrySelect"
import { ItalianProvinceSelect } from "@/components/cells/ItalianProvinceSelect/ItalianProvinceSelect"

const ShippingAddress = ({
  customer,
  cart,
  checked: _checked,
  onChange: _onBillingSync,
}: {
  customer: HttpTypes.StoreCustomer | null
  cart: HttpTypes.StoreCart | null
  checked: boolean
  onChange: () => void
}) => {
  const t = useTranslations("Checkout")
  const pathname = usePathname()

  const locale = pathname.split("/")[1]
  const [formData, setFormData] = useState<Record<string, any>>({
    "shipping_address.first_name": cart?.shipping_address?.first_name || "",
    "shipping_address.last_name": cart?.shipping_address?.last_name || "",
    "shipping_address.address_1": cart?.shipping_address?.address_1 || "",
    "shipping_address.company": cart?.shipping_address?.company || "",
    "shipping_address.postal_code": cart?.shipping_address?.postal_code || "",
    "shipping_address.country_code":
      cart?.shipping_address?.country_code || locale,
    "shipping_address.province": cart?.shipping_address?.province || "",
    "shipping_address.phone": cart?.shipping_address?.phone || "",
    email: cart?.email || "",
  })

  const addressesInRegion = useMemo(
    () =>
      customer?.addresses.filter(
        (a) => a.country_code && a.country_code === locale
      ),
    [customer?.addresses, locale]
  )

  const addressSnapshot = useMemo(
    () =>
      JSON.stringify({
        shipping_address: cart?.shipping_address,
        email: cart?.email || customer?.email,
      }),
    [
      cart?.shipping_address?.first_name,
      cart?.shipping_address?.last_name,
      cart?.shipping_address?.address_1,
      cart?.shipping_address?.company,
      cart?.shipping_address?.postal_code,
      cart?.shipping_address?.country_code,
      cart?.shipping_address?.province,
      cart?.shipping_address?.phone,
      cart?.email,
      customer?.email,
    ]
  )

  const setFormAddress = (
    address?: HttpTypes.StoreCartAddress,
    email?: string
  ) => {
    address &&
      setFormData((prevState: Record<string, any>) => ({
        ...prevState,
        "shipping_address.first_name": address?.first_name || "",
        "shipping_address.last_name": address?.last_name || "",
        "shipping_address.address_1": address?.address_1 || "",
        "shipping_address.company": address?.company || "",
        "shipping_address.postal_code": address?.postal_code || "",
        "shipping_address.country_code": address?.country_code || locale,
        "shipping_address.province": address?.province || "",
        "shipping_address.phone": address?.phone || "",
      }))

    email &&
      setFormData((prevState: Record<string, any>) => ({
        ...prevState,
        email: email,
      }))
  }

  useEffect(() => {
    if (cart?.shipping_address) {
      setFormAddress(cart.shipping_address, cart.email)
    }

    if (cart && !cart.email && customer?.email) {
      setFormAddress(undefined, customer.email)
    }
  }, [addressSnapshot])

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLInputElement | HTMLSelectElement
    >
  ) => {
    const { name, value } = e.target
    if (name === "shipping_address.country_code") {
      const nextCountry = value
      const leavingItaly =
        formData["shipping_address.country_code"]?.toLowerCase() === "it" &&
        nextCountry?.toLowerCase() !== "it"
      setFormData((prev) => ({
        ...prev,
        [name]: value,
        ...(leavingItaly ? { "shipping_address.province": "" } : {}),
      }))
      return
    }
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  const isItaly =
    formData["shipping_address.country_code"]?.toLowerCase() === "it"

  const provinceLabel = isItaly
    ? t("addressProvince")
    : t("addressStateProvince")

  return (
    <>
      {customer && (addressesInRegion?.length || 0) > 0 && (
        <Container className="mb-6 flex flex-col gap-y-4 p-0">
          <p className="text-small-regular">
            {t("addressSavedAddressesPrompt", {
              name: customer.first_name ?? "",
            })}
          </p>
          <div className="grid grid-cols-1 gap-x-4 lg:grid-cols-2">
            <AddressSelect
              addresses={addressesInRegion || []}
              addressInput={
                mapKeys(formData, (_, key) =>
                  key.replace("shipping_address.", "")
                ) as HttpTypes.StoreCartAddress
              }
              onSelect={setFormAddress}
              chooseSavedAddressLabel={t("addressChooseSaved")}
            />
          </div>
        </Container>
      )}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="lg:col-span-2">
          <CountrySelect
            name="shipping_address.country_code"
            autoComplete="country"
            region={cart?.region}
            value={formData["shipping_address.country_code"]}
            onChange={handleChange}
            required
            data-testid="shipping-country-select"
            countryLabel={t("addressCountryRegion")}
            chooseCountryPlaceholder={t("addressCountryPlaceholder")}
          />
        </div>
        <Input
          label={t("addressFirstName")}
          name="shipping_address.first_name"
          autoComplete="given-name"
          value={formData["shipping_address.first_name"]}
          onChange={handleChange}
          required
          data-testid="shipping-first-name-input"
        />
        <Input
          label={t("addressLastName")}
          name="shipping_address.last_name"
          autoComplete="family-name"
          value={formData["shipping_address.last_name"]}
          onChange={handleChange}
          required
          data-testid="shipping-last-name-input"
        />
        <div className="lg:col-span-2">
          <Input
            label={t("addressLine1")}
            name="shipping_address.address_1"
            autoComplete="address-line1"
            value={formData["shipping_address.address_1"]}
            onChange={handleChange}
            required
            data-testid="shipping-address-input"
          />
        </div>
        <div className="lg:col-span-2">
          <Input
            label={t("addressLine2Optional")}
            name="shipping_address.company"
            value={formData["shipping_address.company"]}
            onChange={handleChange}
            autoComplete="organization"
            data-testid="shipping-company-input"
          />
        </div>
        <div
          className={
            isItaly
              ? "grid grid-cols-1 gap-4 md:grid-cols-2 lg:col-span-2"
              : "contents"
          }
        >
          <Input
            label={t("addressPostalCode")}
            name="shipping_address.postal_code"
            autoComplete="postal-code"
            value={formData["shipping_address.postal_code"]}
            onChange={handleChange}
            required
            data-testid="shipping-postal-code-input"
          />
          {isItaly ? (
            <ItalianProvinceSelect
              name="shipping_address.province"
              value={formData["shipping_address.province"]}
              onChange={handleChange}
              label={provinceLabel}
              placeholder={t("addressProvincePlaceholder")}
              data-testid="shipping-province-select"
            />
          ) : null}
        </div>
        {!isItaly ? (
          <div className="lg:col-span-2">
            <Input
              label={provinceLabel}
              name="shipping_address.province"
              autoComplete="address-level1"
              value={formData["shipping_address.province"]}
              onChange={handleChange}
              data-testid="shipping-province-input"
            />
          </div>
        ) : null}
      </div>
      <div className="my-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Input
          label={t("addressEmail")}
          name="email"
          type="email"
          title={t("addressEmailInvalidHint")}
          autoComplete="email"
          value={formData.email}
          onChange={handleChange}
          required
          data-testid="shipping-email-input"
        />
        <Input
          label={t("addressPhoneOptional")}
          name="shipping_address.phone"
          autoComplete="tel"
          value={formData["shipping_address.phone"]}
          onChange={handleChange}
          data-testid="shipping-phone-input"
        />
      </div>
    </>
  )
}

export default ShippingAddress
