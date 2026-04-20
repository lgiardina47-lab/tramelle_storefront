"use client"

import LocalizedClientLink from "@/components/molecules/LocalizedLink/LocalizedLink"
import { cn } from "@/lib/utils"
import { useTranslations } from "next-intl"

export function SellerDirectoryShopLink({
  handle,
  urlLocale,
  className,
}: {
  handle: string
  urlLocale: string
  className?: string
}) {
  const t = useTranslations("Sellers")

  return (
    <LocalizedClientLink
      href={`/sellers/${handle}`}
      locale={urlLocale}
      className={cn(
        "inline-flex items-center gap-1.5 text-[0.7rem] font-semibold uppercase tracking-[0.12em] text-primary transition-colors hover:text-primary/80 hover:underline sm:text-xs sm:tracking-[0.14em]",
        className
      )}
    >
      {t("directoryGoToShop")}
      <span aria-hidden className="text-base font-normal leading-none">
        →
      </span>
    </LocalizedClientLink>
  )
}
