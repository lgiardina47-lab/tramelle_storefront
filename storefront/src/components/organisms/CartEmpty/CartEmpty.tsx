"use client"

import { Button } from "@/components/atoms"
import LocalizedClientLink from "@/components/molecules/LocalizedLink/LocalizedLink"
import { useTranslations } from "next-intl"

export function CartEmpty() {
  const t = useTranslations("Cart")
  return (
    <div className="col-span-12 py-16 flex justify-center px-4" data-testid="cart-empty">
      <div className="max-w-sm w-full flex flex-col items-center text-center">
        <h2 className="text-primary heading-md uppercase tracking-tight">{t("emptyTitle")}</h2>
        <p className="mt-3 text-md text-secondary leading-relaxed">{t("emptySubtitle")}</p>
        <LocalizedClientLink href="/categories" className="mt-8 w-full">
          <Button className="w-full py-3 flex justify-center items-center uppercase tracking-wide">
            {t("exploreCategories")}
          </Button>
        </LocalizedClientLink>
      </div>
    </div>
  )
}
