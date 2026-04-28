"use client"
import { Card, NavigationItem } from "@/components/atoms"
import { RefreshButton } from "@/components/cells/RefreshButton/RefreshButton"
import { isAccountPathActive } from "@/lib/helpers/account-nav-active"
import { Order, Review } from "@/lib/data/reviews"
import { isEmpty } from "lodash"
import { useParams, usePathname } from "next/navigation"
import { useTranslations } from "next-intl"
import { OrderCard } from "./OrderCard"
import { reviewSubNav } from "./review-subnav"

export const ReviewsWritten = ({
  reviews,
  orders,
  isError,
}: {
  reviews: Review[]
  orders: Order[]
  isError: boolean
}) => {
  const t = useTranslations("Account")
  const params = useParams()
  const locale = typeof params?.locale === "string" ? params.locale : "it"
  const pathname = usePathname()

  function renderReviews() {
    if (isError) {
      return (
        <div className="flex flex-col gap-2">
          <p className="text-negative">
            {t("reviewsErrorFetch")}
          </p>
          <RefreshButton label={t("reviewsRefresh")} />
        </div>
      )
    }

    if (isEmpty(reviews)) {
      return (
        <Card>
          <div className="text-center py-6">
            <h3 className="heading-lg text-primary uppercase">
              {t("reviewsWrittenEmptyTitle")}
            </h3>
            <p className="text-lg text-secondary mt-2">
              {t("reviewsWrittenEmptyDescription")}
            </p>
          </div>
        </Card>
      )
    }

    return (
      <div className="space-y-2">
        {orders.map((order) => (
          <OrderCard key={order.id} order={order} />
        ))}
      </div>
    )
  }

  return (
    <div className="md:col-span-3 space-y-8">
      <h1 className="heading-md uppercase">{t("reviews")}</h1>
      <div className="flex gap-4">
        {reviewSubNav.map((item) => (
          <NavigationItem
            key={item.href}
            href={item.href}
            active={isAccountPathActive(pathname, item.href, locale)}
            className="px-0"
          >
            {t(item.labelKey)}
          </NavigationItem>
        ))}
      </div>
      {renderReviews()}
    </div>
  )
}
