import { UserNavigation } from "@/components/molecules"
import { retrieveCustomer } from "@/lib/data/customer"
import { Button } from "@/components/atoms"
import LocalizedClientLink from "@/components/molecules/LocalizedLink/LocalizedLink"
import { ArrowLeftIcon } from "@/icons"
import { redirect } from "next/navigation"
import { formatDateSafe } from "@/lib/helpers/format-date-safe"
import { retrieveOrderSet } from "@/lib/data/orders"
import { OrderDetailsSection } from "@/components/sections/OrderDetailsSection/OrderDetailsSection"
import { countryCodeToStorefrontMessagesLocale } from "@/lib/i18n/storefront-messages-locale"
import { getTranslations, setRequestLocale } from "next-intl/server"

export default async function UserPage({
  params,
}: {
  params: Promise<{ id: string; locale: string }>
}) {
  const { id, locale } = await params
  const messagesLocale = countryCodeToStorefrontMessagesLocale(locale)
  setRequestLocale(messagesLocale)
  const t = await getTranslations({ locale: messagesLocale, namespace: "Account" })

  const user = await retrieveCustomer()
  const orderSet = await retrieveOrderSet(id)

  if (!user) return redirect(`/${locale}/login`)

  return (
    <main className="container">
      <div className="grid grid-cols-1 md:grid-cols-4 mt-6 gap-5 md:gap-8">
        <UserNavigation />
        <div className="md:col-span-3">
          <LocalizedClientLink href="/user/orders">
            <Button
              variant="tonal"
              className="label-md text-action-on-secondary uppercase flex items-center gap-2"
            >
              <ArrowLeftIcon className="size-4" />
              {t("backToAllOrders")}
            </Button>
          </LocalizedClientLink>
          <div className="sm:flex items-center justify-between">
            <h1 className="heading-md uppercase my-8">
              {t("orderSetTitle", { id: String(orderSet.display_id) })}
            </h1>
            <p className="label-md text-secondary">
              {t("orderDateLabel")}:{" "}
              <span className="text-primary">
                {formatDateSafe(orderSet.created_at, "yyyy-MM-dd")}
              </span>
            </p>
          </div>
          <OrderDetailsSection orderSet={orderSet} />
        </div>
      </div>
    </main>
  )
}
