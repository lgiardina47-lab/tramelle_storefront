import { Card, Divider } from "@/components/atoms"
import {
  medusaStoreAmountAsMajor,
  convertToLocale,
  cartShippingAmountAsMajor
} from "@/lib/helpers/money"
import { tramelleDisplayShippingMajorForStoreOrder } from "@/lib/helpers/tramelle-seller-shipping-display"

export const OrderTotals = ({ orderSet }: { orderSet: any }) => {
  const currency_code = orderSet.payment_collection?.currency_code || "eur"
  const isEur = String(currency_code).toLowerCase() === "eur"
  const childOrders: any[] = orderSet.orders ?? []
  const delivery = isEur
    ? Math.round(
        childOrders.reduce(
          (s, o) => s + tramelleDisplayShippingMajorForStoreOrder(o),
          0
        ) * 100
      ) / 100
    : cartShippingAmountAsMajor(
        orderSet.shipping_total,
        currency_code
      )
  const total = medusaStoreAmountAsMajor(orderSet.total)
  const subtotal = Math.round((total - delivery) * 100) / 100

  return (
    <Card className="mb-8 p-4">
      <p className="text-secondary label-md mb-2 flex justify-between">
        Subtotal:
        <span className="text-primary">
          {convertToLocale({
            amount: subtotal,
            currency_code,
          })}
        </span>
      </p>
      <p className="text-secondary label-md flex justify-between">
        Delivery:
        <span className="text-primary">
          {convertToLocale({
            amount: delivery,
            currency_code,
          })}
        </span>
      </p>
      <Divider className="my-4" />
      <p className="text-secondary label-md flex justify-between items-center">
        Total:{" "}
        <span className="text-primary heading-md">
          {convertToLocale({
            amount: total,
            currency_code,
          })}
        </span>
      </p>
    </Card>
  )
}
