"use client"

import { useTranslations } from "next-intl"
import type { HttpTypes } from "@medusajs/types"

import { useB2BPricingModal } from "@/components/providers/B2BPricingModal/B2BPricingModalProvider"
import { getCheapestB2bOnlyCatalogPrice } from "@/lib/helpers/get-product-price"

export function ProductB2bLockPdp({
  product,
}: {
  product: HttpTypes.StoreProduct
}) {
  const t = useTranslations("Product")
  const { open } = useB2BPricingModal()
  const b2b = getCheapestB2bOnlyCatalogPrice(product)

  return (
    <button
      type="button"
      className="mb-5 mt-4 flex w-full cursor-pointer items-center justify-between rounded-[14px] bg-[#F5F3F0] px-4 py-3 text-left outline-none ring-offset-2 focus-visible:ring-2 focus-visible:ring-[#0F0E0B]/20"
      data-testid="product-b2b-lock-pdp"
      onClick={() => open()}
    >
      <div>
        <p className="mb-0.5 text-[10px] font-normal uppercase tracking-[0.14em] text-[#8A8580]">
          {t("b2bPdpEyebrow")}
        </p>
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-medium text-[#0F0E0B]">
            {t("b2bPdpLabel")}
          </span>
          <span
            className="select-none text-[13px] font-medium text-[#0F0E0B] blur-[3.5px] [letter-spacing:0.02em]"
            aria-hidden
          >
            {b2b?.calculated_price ?? "€ ····"}
          </span>
        </div>
      </div>
      <span className="shrink-0 border-b border-[#E8E4DE] pb-px text-[10.5px] font-medium uppercase tracking-[0.12em] text-[#0F0E0B]">
        {t("b2bPdpCta")} →
      </span>
    </button>
  )
}
