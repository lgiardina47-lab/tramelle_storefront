"use client"

import { Button } from "@/components/atoms"
import { CartDropdownItem, Dropdown } from "@/components/molecules"
import { usePrevious } from "@/hooks/usePrevious"
import LocalizedClientLink from "@/components/molecules/LocalizedLink/LocalizedLink"
import { tramelleDisplayTotalShippingEur } from "@/lib/helpers/tramelle-seller-shipping-display"
import {
  cartShippingAmountAsMajor,
  convertToLocale,
  medusaStoreAmountAsMajor
} from "@/lib/helpers/money"
import { filterValidCartItems } from "@/lib/helpers/filter-valid-cart-items"
import { CartIcon } from "@/icons"
import { useCartContext } from "@/components/providers"
import { HttpTypes } from "@medusajs/types"
import { usePathname } from "next/navigation"
import { useTranslations } from "next-intl"
import { useEffect, useState } from "react"

/** Carrello outline header gourmet: 22px, stroke 1.5, #0F0E0B */
function GourmetCartIcon() {
  return (
    <svg
      width={22}
      height={22}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="shrink-0"
      aria-hidden
    >
      <path
        d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"
        stroke="#0F0E0B"
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <line
        x1="3"
        y1="6"
        x2="21"
        y2="6"
        stroke="#0F0E0B"
        strokeWidth={1.5}
        strokeLinecap="round"
      />
      <path
        d="M16 10a4 4 0 01-8 0"
        stroke="#0F0E0B"
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

const getItemCount = (cart: HttpTypes.StoreCart | null) => {
  return cart?.items?.reduce((acc, item) => acc + item.quantity, 0) || 0
}

/**
 * Anteprima pannello carrello (hover + apertura dopo add-to-cart).
 * `false` = nascosta ma markup e logica restano; icona/link a `/cart` restano attivi.
 */
const SHOW_CART_PREVIEW = false

export const CartDropdown = ({
  onNavigate,
  variant = "default",
}: {
  /** Click sul link carrello (es. chiudere megamenu). */
  onNavigate?: () => void
  /** `gourmet`: trigger leggero senza box nero (header Tramelle). */
  variant?: "default" | "gourmet"
} = {}) => {
  const { cart } = useCartContext()
  const [open, setOpen] = useState(false)
  const t = useTranslations("Cart")

  const previousItemCount = usePrevious(getItemCount(cart))
  const cartItemsCount = (cart && getItemCount(cart)) || 0
  const pathname = usePathname()

  // Filter out items with invalid data (missing prices/variants)
  const validItems = filterValidCartItems(cart?.items)

  const currencyCode = cart?.currency_code || "eur"
  const itemMajor = medusaStoreAmountAsMajor(cart?.item_subtotal)
  const shipCountry = (
    cart?.shipping_address as { country_code?: string } | null | undefined
  )?.country_code
  const shipMajor =
    cart && currencyCode.toLowerCase() === "eur"
      ? tramelleDisplayTotalShippingEur(cart, shipCountry)
      : cartShippingAmountAsMajor(cart?.shipping_subtotal, currencyCode)
  const taxMajor = medusaStoreAmountAsMajor(cart?.tax_total)
  const discMajor = medusaStoreAmountAsMajor(cart?.discount_subtotal)
  const totalMajor = itemMajor + shipMajor + taxMajor - discMajor

  const total = convertToLocale({
    amount: Number.isFinite(totalMajor) ? totalMajor : (cart?.total || 0),
    currency_code: currencyCode,
  })

  const delivery = convertToLocale({
    amount: shipMajor,
    currency_code: currencyCode,
  })

  const tax = convertToLocale({
    amount: taxMajor,
    currency_code: currencyCode,
  })

  const items = convertToLocale({
    amount: itemMajor,
    currency_code: currencyCode,
  })

  useEffect(() => {
    if (!SHOW_CART_PREVIEW) return
    if (
      previousItemCount !== undefined &&
      cartItemsCount > previousItemCount &&
      pathname.split("/")[2] !== "cart"
    ) {
      setOpen(true)
    }
  }, [cartItemsCount, previousItemCount, pathname])

  return (
    <div
      className="relative z-[100]"
      {...(SHOW_CART_PREVIEW
        ? {
            onMouseOver: () => setOpen(true),
            onMouseLeave: () => setOpen(false),
          }
        : {})}
    >
      <LocalizedClientLink
        href="/cart"
        className={
          variant === "gourmet"
            ? "relative flex h-[22px] w-[22px] shrink-0 cursor-pointer items-center justify-center bg-transparent transition-opacity hover:opacity-80"
            : "relative flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-cortilia text-cortilia-foreground shadow-sm transition-opacity hover:opacity-90"
        }
        aria-label={t("goToCartAria")}
        onClick={onNavigate}
      >
        {variant === "gourmet" ? (
          <GourmetCartIcon />
        ) : (
          <CartIcon size={22} color="#f4faf7" />
        )}
        {variant === "gourmet" ? (
          cartItemsCount > 0 ? (
            <span
              className="font-tramelle absolute -right-2 -top-1.5 flex h-[14px] w-[14px] items-center justify-center rounded-full bg-[#0F0E0B] text-[8px] font-semibold leading-none text-white"
              aria-hidden={false}
            >
              {cartItemsCount > 99 ? "99+" : cartItemsCount}
            </span>
          ) : null
        ) : (
          <span
            className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-white px-1 text-[11px] font-semibold leading-none text-cortilia"
            aria-hidden={!cartItemsCount}
          >
            {cartItemsCount}
          </span>
        )}
      </LocalizedClientLink>
      <Dropdown show={SHOW_CART_PREVIEW && open}>
        <div className="lg:w-[460px] shadow-lg">
          <h3 className="heading-md border-b p-4 normal-case tracking-normal">
            {t("title")}
          </h3>
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
                <h4 className="heading-md text-center normal-case tracking-normal">
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
