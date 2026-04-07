"use client"

import { ProductPageAccordion } from "@/components/molecules"
import { useTranslations } from "next-intl"

export const ProductPageDetails = ({ details }: { details: string }) => {
  const t = useTranslations("ProductSheet")
  if (!details) return null

  return (
    <ProductPageAccordion
      heading={t("detailsHeading")}
      defaultOpen={false}
      data-testid="product-details-section"
    >
      <div
        className="product-details"
        dangerouslySetInnerHTML={{
          __html: details,
        }}
        data-testid="product-details-content"
      />
    </ProductPageAccordion>
  )
}
