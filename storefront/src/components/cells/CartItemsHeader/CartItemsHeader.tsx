"use client"

import { Divider } from "@/components/atoms"
import { SingleProductSeller } from "@/types/product"
import { SellerAvatar } from "../SellerAvatar/SellerAvatar"
import { sellerPrimaryLogoOrPhotoUrl } from "@/lib/helpers/seller-media-url"
import { formatDateSafe } from "@/lib/helpers/format-date-safe"
import LocalizedClientLink from "@/components/molecules/LocalizedLink/LocalizedLink"
import { useTranslations } from "next-intl"

export const CartItemsHeader = ({
  seller,
}: {
  seller: SingleProductSeller
}) => {
  const t = useTranslations("Cart")
  const avatarSrc = sellerPrimaryLogoOrPhotoUrl({
    handle: seller.handle,
    name: seller.name,
    photo: seller.photo,
    metadata: null,
  })
  const sellerHref =
    seller.handle && String(seller.handle).trim()
      ? `/sellers/${seller.handle}`
      : "/sellers"
  return (
    <LocalizedClientLink href={sellerHref}>
      <div className="border rounded-sm p-4 flex gap-4 items-center">
        <SellerAvatar photo={avatarSrc} size={32} alt={seller.name} />

        <div className="lg:flex gap-2">
          <p className="uppercase heading-xs">{seller.name}</p>
          {seller.id !== "fleek" && (
            <div className="flex items-center gap-2">
              <Divider square />
              <p className="label-md text-secondary">
                {t("sellerJoinedOn", {
                  date: formatDateSafe(seller.created_at, "yyyy-MM-dd"),
                })}
              </p>
            </div>
          )}
        </div>
      </div>
    </LocalizedClientLink>
  )
}
