"use client"

import { StarRating } from "@/components/atoms"
import { SellerAvatar } from "@/components/cells/SellerAvatar/SellerAvatar"
import { sellerPrimaryLogoOrPhotoUrl } from "@/lib/helpers/seller-media-url"
import type { SellerProps } from "@/types/seller"
import { CollapseIcon } from "@/icons"
import clsx from "clsx"
import { useTranslations } from "next-intl"

export const SellerInfoHeader = ({
  seller,
  name,
  rating,
  reviewCount,
  showArrow,
  bottomBorder = false,
  /** Es. pagina venditore: logo già nel cover sopra, non duplicare sotto. */
  hideLogo = false,
}: {
  seller: Pick<SellerProps, "photo" | "handle" | "name" | "metadata">
  name: string
  rating: number
  reviewCount: number
  showArrow: boolean
  bottomBorder?: boolean
  hideLogo?: boolean
}) => {
  const t = useTranslations("ProductSheet")
  const avatarSrc = sellerPrimaryLogoOrPhotoUrl(seller) || seller.photo || ""
  return (
  <div
    className={clsx(
      "flex gap-4 w-full p-5 items-center",
      hideLogo && "gap-0",
      bottomBorder && "border-b"
    )}
  >
    {!hideLogo ? (
      <div className="rounded-sm">
        <SellerAvatar photo={avatarSrc} size={88} alt={name} />
      </div>
    ) : null}
    <div
      className={clsx(
        "flex flex-col gap-1",
        hideLogo && "min-w-0 flex-1"
      )}
    >
      <h3 className="heading-sm text-primary">{name}</h3>
      <div className="flex items-center gap-2">
        <StarRating starSize={14} rate={rating || 0} />
        <span className="label-md text-secondary">
          {t("reviewsCount", { count: reviewCount })}
        </span>
      </div>
    </div>
    {showArrow && <CollapseIcon className="ml-auto -rotate-90" />}
  </div>
  )
}
