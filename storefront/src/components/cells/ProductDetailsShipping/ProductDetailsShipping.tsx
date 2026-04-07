"use client"

import { ProductPageAccordion } from "@/components/molecules"
import { useTranslations } from "next-intl"

export const ProductDetailsShipping = () => {
  const t = useTranslations("ProductSheet")
  return (
    <ProductPageAccordion
      heading={t("shippingHeading")}
      defaultOpen={false}
    >
      <div className="product-details">
        <ul>
          <li>{t("shippingPoint1")}</li>
          <li>{t("shippingPoint2")}</li>
        </ul>
      </div>
    </ProductPageAccordion>
  )
}
