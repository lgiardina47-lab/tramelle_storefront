"use client"

import { Avatar, Badge, Card, Divider } from "@/components/atoms"
import { StepProgressBar } from "@/components/cells/StepProgressBar/StepProgressBar"
import { formatDateSafe } from "@/lib/helpers/format-date-safe"
import { resolveLineItemThumbnailSrc } from "@/lib/helpers/get-image-url"
import { convertToLocale } from "@/lib/helpers/money"
import { cn } from "@/lib/utils"
import { CollapseIcon } from "@/icons"
import { Heading } from "@medusajs/ui"
import Image from "next/image"
import { useTranslations } from "next-intl"
import { useEffect, useRef, useState } from "react"
import { Chat } from "../Chat/Chat"

const steps = ["pending", "processing", "sent"]

export const SingleOrderReturn = ({
  item,
  user,
  defaultOpen,
  returnReason,
  priceTestId,
  testIdPrefix,
}: {
  item: any
  user: any
  defaultOpen: boolean
  returnReason: any[]
  priceTestId?: string
  testIdPrefix?: string
}) => {
  const t = useTranslations("Account")
  const [isOpen, setIsOpen] = useState(defaultOpen)
  const [height, setHeight] = useState(0)
  const contentRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setTimeout(() => {
      if (contentRef.current) {
        setHeight(contentRef.current.scrollHeight)
      }
    }, 100)
  }, [])

  const filteredItems = item.order.items
    .filter((orderItem: any) =>
      item.line_items.some(
        (lineItem: any) => lineItem.line_item_id === orderItem.id
      )
    )
    .map((orderItem: any) => {
      const correspondingLineItem = item.line_items.find(
        (lineItem: any) => lineItem.line_item_id === orderItem.id
      )
      return {
        ...orderItem,
        reason_id:
          returnReason.find((r) => r.id === correspondingLineItem?.reason_id)
            ?.label || t("returnNoReason"),
      }
    })

  const currency_code = item.order.currency_code || "usd"

  const total = filteredItems.reduce((acc: number, item: any) => {
    return acc + item.unit_price
  }, 0)

  const currentStep = steps.indexOf(item.status)

  return (
    <>
      <Card className="bg-secondary p-4 flex justify-between mt-8" data-testid={testIdPrefix ? `${testIdPrefix}-header` : undefined}>
        <Heading level="h2" data-testid={testIdPrefix ? `${testIdPrefix}-order-id` : undefined}>
          {t("returnOrderLabel", { id: String(item.order.display_id) })}
        </Heading>
        <div className="flex flex-col gap-2 items-center">
          <p className="label-sm text-secondary" data-testid={testIdPrefix ? `${testIdPrefix}-requested-date` : undefined}>
            {t("returnRequestedDate")}{" "}
            {formatDateSafe(item.line_items[0]?.created_at, "MMM dd, yyyy")}
          </p>
        </div>
      </Card>
      <Card className="p-0" data-testid={testIdPrefix ? `${testIdPrefix}-details` : undefined}>
        <div
          className="p-4 flex justify-between items-center cursor-pointer"
          onClick={() => setIsOpen(!isOpen)}
        >
          <Heading level="h3" className="uppercase label-md !font-semibold" data-testid={testIdPrefix ? `${testIdPrefix}-status` : undefined}>
            {item.status}
          </Heading>
          <p className="label-sm text-secondary flex gap-2" data-testid={testIdPrefix ? `${testIdPrefix}-items-count` : undefined}>
            {t("returnLineItemCount", { count: item.line_items.length })}
            <CollapseIcon
              className={cn(
                "w-5 h-5 text-secondary transition-transform duration-300",
                isOpen ? "rotate-180" : ""
              )}
            />
          </p>
        </div>
        <div
          className={cn("transition-all duration-300 overflow-hidden")}
          style={{
            maxHeight: isOpen ? `${height}px` : "0px",
            opacity: isOpen ? 1 : 0,
            transition: "max-height 0.3s ease-in-out, opacity 0.2s ease-in-out",
          }}
          ref={contentRef}
        >
          <Divider />
          <div className="p-4 uppercase">
            <StepProgressBar steps={steps} currentStep={currentStep} />
          </div>
          <Divider />
          <div className="p-4 flex justify-between">
            <div className="flex items-center gap-2">
              <Avatar
                src={item.order.seller.photo || "/talkjs-placeholder.jpg"}
              />
              <p className="label-lg text-primary" data-testid={testIdPrefix ? `${testIdPrefix}-seller-name` : undefined}>{item.order.seller.name}</p>
            </div>
            <Chat
              user={user}
              seller={item.order.seller}
              buttonClassNames="uppercase"
              order_id={item.order.id}
            />
          </div>
          <Divider />
          <div className="p-4 flex justify-between w-full">
            <div className="flex flex-col gap-4 w-full">
              {filteredItems.map((filteredItem: any) => {
                const lineThumb = resolveLineItemThumbnailSrc(filteredItem)
                return (
                <div key={filteredItem.id} className="flex items-center gap-2" data-testid={testIdPrefix ? `${testIdPrefix}-item-${filteredItem.id}` : undefined}>
                  <div className="flex items-center gap-4 w-1/2">
                    <div className="rounded-sm overflow-hidden border">
                      {lineThumb ? (
                        <Image
                          src={lineThumb}
                          alt={filteredItem.product_title}
                          width={60}
                          height={60}
                        />
                      ) : (
                        <Image
                          src="/images/placeholder.svg"
                          alt={filteredItem.product_title}
                          width={60}
                          height={60}
                          className="scale-50 opacity-25"
                        />
                      )}
                    </div>
                    <div>
                      <p className="label-md !font-semibold text-primary" data-testid={testIdPrefix ? `${testIdPrefix}-item-${filteredItem.id}-title` : undefined}>
                        {filteredItem.product_title}
                      </p>
                      <p className="label-md text-secondary" data-testid={testIdPrefix ? `${testIdPrefix}-item-${filteredItem.id}-subtitle` : undefined}>{filteredItem.subtitle}</p>
                    </div>
                  </div>
                  <div className="flex justify-between w-1/2">
                    <p className="label-md !font-semibold text-primary" data-testid={testIdPrefix ? `${testIdPrefix}-item-${filteredItem.id}-reason` : undefined}>
                      <Badge className="bg-primary text-primary border rounded-sm">
                        {filteredItem.reason_id}
                      </Badge>
                    </p>
                    <p className="label-md !font-semibold text-primary" data-testid={testIdPrefix ? `${testIdPrefix}-item-${filteredItem.id}-price` : undefined}>
                      {convertToLocale({
                        amount: filteredItem.unit_price,
                        currency_code,
                      })}
                    </p>
                  </div>
                </div>
                )
              })}
            </div>
          </div>
          <Divider />
          <div className="p-4 flex justify-between">
            <p className="label-md text-secondary">{t("returnTotalLabel")}</p>
            <p className="label-md !font-semibold text-primary" data-testid={priceTestId}>
              {convertToLocale({
                amount: total,
                currency_code,
              })}
            </p>
          </div>
        </div>
      </Card>
    </>
  )
}
