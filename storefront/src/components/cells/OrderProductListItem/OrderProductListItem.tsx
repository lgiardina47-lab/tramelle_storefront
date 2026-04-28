"use client"

import { Divider } from "@/components/atoms"
import { TramelleProductImage } from "@/components/atoms"
import LocalizedClientLink from "@/components/molecules/LocalizedLink/LocalizedLink"
import { convertToLocale } from "@/lib/helpers/money"
import { resolveLineItemThumbnailSrc } from "@/lib/helpers/get-image-url"
import { cn } from "@/lib/utils"
import Image from "next/image"
import { useTranslations } from "next-intl"
import { Fragment } from "react"

export const OrderProductListItem = ({
  item,
  currency_code,
  withDivider,
}: {
  item: any
  currency_code: string
  withDivider?: boolean
}) => {
  const t = useTranslations("Account")
  const thumb = resolveLineItemThumbnailSrc(item)
  return (
  <Fragment>
    {withDivider && <Divider className="mt-4" />}
    <li className={cn("flex items-center", withDivider && "mt-2")}>
      <div className="grid grid-cols-1 sm:grid-cols-7 w-full sm:gap-4 mb-2">
        <div className="sm:col-span-2 flex gap-2 items-center">
          <div className="w-[66px] h-16 relative rounded-sm overflow-hidden flex items-center justify-center">
            {thumb ? (
              <TramelleProductImage
                layout="intrinsic"
                src={thumb}
                alt={item.title}
                width={66}
                height={66}
                preset="order-list-thumb"
                quality={85}
                className="object-cover"
              />
            ) : (
              <Image
                src={"/images/placeholder.svg"}
                alt={item.title}
                width={45}
                height={45}
                className="opacity-25"
              />
            )}
          </div>
          <p className="label-md text-secondary">{item.product_title}</p>
          <LocalizedClientLink
            href={`/products/${item.variant?.product?.handle}`}
            target="_blank"
            className="heading-xs text-primary"
          >
            {item.variant?.product?.title}
          </LocalizedClientLink>
        </div>
        <div className="sm:col-span-2 flex items-center">
          <p className="label-md text-secondary">
            {t("orderLineVariant")}{" "}
            <span className="text-primary">
              {item?.variant_title || item?.variant?.title}
            </span>
          </p>
        </div>
        <div className="sm:col-span-2 flex items-center justify-center">
          <p className="label-md text-secondary">
            {t("orderLineQuantity")}{" "}
            <span className="text-primary">{item?.quantity}</span>
          </p>
        </div>
        <div className="flex sm:justify-end label-lg text-primary sm:items-center">
          {convertToLocale({
            amount: item.total,
            currency_code: currency_code,
          })}
        </div>
      </div>
    </li>
  </Fragment>
  )
}
