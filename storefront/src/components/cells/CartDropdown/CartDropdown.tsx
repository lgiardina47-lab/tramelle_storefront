"use client"

import { Button } from "@/components/atoms"
import { CartDropdownItem, Dropdown } from "@/components/molecules"
import { usePrevious } from "@/hooks/usePrevious"
import LocalizedClientLink from "@/components/molecules/LocalizedLink/LocalizedLink"
import { CartIcon } from "@/icons"
import { convertToLocale } from "@/lib/helpers/money"
import { filterValidCartItems } from "@/lib/helpers/filter-valid-cart-items"
import { HttpTypes } from "@medusajs/types"
import { useEffect, useState } from "react"
import { usePathname } from "next/navigation"
import { useTranslations } from "next-intl"
import { useCartContext } from "@/components/providers"

const getItemCount = (cart: HttpTypes.StoreCart | null) => {
  return cart?.items?.reduce((acc, item) => acc + item.quantity, 0) || 0
}

export const CartDropdown = () => {
  const { cart } = useCartContext()
  const [open, setOpen] = useState(false)
  const t = useTranslations("Cart")

  const previousItemCount = usePrevious(getItemCount(cart))
  const cartItemsCount = (cart && getItemCount(cart)) || 0
  const pathname = usePathname()

  // Filter out items with invalid data (missing prices/variants)
  const validItems = filterValidCartItems(cart?.items)

  const total = convertToLocale({
    amount: cart?.total || 0,
    currency_code: cart?.currency_code || "eur",
  })

  const delivery = convertToLocale({
    amount: cart?.shipping_subtotal || 0,
    currency_code: cart?.currency_code || "eur",
  })

  const tax = convertToLocale({
    amount: cart?.tax_total || 0,
    currency_code: cart?.currency_code || "eur",
  })

  const items = convertToLocale({
    amount: cart?.item_subtotal || 0,
    currency_code: cart?.currency_code || "eur",
  })

  useEffect(() => {
    if (open) {
      const timeout = setTimeout(() => {
        setOpen(false)
      }, 2000)

      return () => clearTimeout(timeout)
    }
  }, [open])

  useEffect(() => {
    if (
      previousItemCount !== undefined &&
      cartItemsCount > previousItemCount &&
      pathname.split("/")[2] !== "cart"
    ) {
      setOpen(true)
    }
  }, [cartItemsCount, previousItemCount])

  return (
    <div
      className="relative"
      onMouseOver={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <LocalizedClientLink
        href="/cart"
        className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-cortilia text-cortilia-foreground shadow-sm transition-opacity hover:opacity-90"
        aria-label={t("goToCartAria")}
      >
        <CartIcon size={22} color="#f4faf7" />
        <span
          className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-white px-1 text-[11px] font-semibold leading-none text-cortilia"
          aria-hidden={!cartItemsCount}
        >
          {cartItemsCount}
        </span>
      </LocalizedClientLink>
      <Dropdown show={open}>
        <div className="lg:w-[460px] shadow-lg">
          <h3 className="uppercase heading-md border-b p-4">{t("title")}</h3>
          <div className="p-4">
            {Boolean(cartItemsCount) ? (
              <div>
                <div className="overflow-y-scroll max-h-[360px] no-scrollbar">
                  {validItems.map((item) => (
                    <CartDropdownItem
                      key={`${item.product_id}-${item.variant_id}`}
                      item={item}
                      currency_code={cart?.currency_code || "eur"}
                    />
                  ))}
                </div>
                <div className="pt-4">
                  <div className="text-secondary flex justify-between items-center">
                    {t("items")} <p className="label-md text-primary">{items}</p>
                  </div>
                  <div className="text-secondary flex justify-between items-center">
                    {t("delivery")} <p className="label-md text-primary">{delivery}</p>
                  </div>
                  <div className="text-secondary flex justify-between items-center">
                    {t("tax")} <p className="label-md text-primary">{tax}</p>
                  </div>
                  <div className="text-secondary flex justify-between items-center">
                    {t("total")} <p className="label-xl text-primary">{total}</p>
                  </div>
                  <LocalizedClientLink href="/cart">
                    <Button className="w-full mt-4 py-3">{t("goToCart")}</Button>
                  </LocalizedClientLink>
                </div>
              </div>
            ) : (
              <div className="px-8">
                <h4 className="heading-md uppercase text-center">
                  {t("emptyTitle")}
                </h4>
                <p className="text-lg text-center py-4">
                  {t("emptyHint")}
                </p>
                <LocalizedClientLink href="/categories">
                  <Button className="w-full py-3">{t("exploreCategories")}</Button>
                </LocalizedClientLink>
              </div>
            )}
          </div>
        </div>
      </Dropdown>
    </div>
  )
}
