"use client"

import { StarRating } from "@/components/atoms"
import { SellerAvatar } from "@/components/cells/SellerAvatar/SellerAvatar"
import { CollapseIcon } from "@/icons"
import clsx from "clsx"
import { useTranslations } from "next-intl"

export const SellerInfoHeader = ({
  photo,
  name,
  rating,
  reviewCount,
  showArrow,
  bottomBorder = false,
}: {
  photo: string
  name: string
  rating: number
  reviewCount: number
  showArrow: boolean
  bottomBorder?: boolean
}) => {
  const t = useTranslations("ProductSheet")
  return (
  <div
    className={clsx(
      "flex gap-4 w-full p-5 items-center",
      bottomBorder && "border-b"
    )}
  >
    <div className="rounded-sm">
      <SellerAvatar photo={photo} size={56} alt={name} />
    </div>
    <div className="flex flex-col gap-1">
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
