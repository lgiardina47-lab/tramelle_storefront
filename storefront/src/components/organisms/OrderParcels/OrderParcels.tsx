import { Avatar } from "@/components/atoms"
import { Chat } from "../Chat/Chat"
import { retrieveCustomer } from "@/lib/data/customer"
import { OrderParcelItems } from "@/components/molecules/OrderParcelItems/OrderParcelItems"
import { OrderParcelStatus } from "@/components/molecules/OrderParcelStatus/OrderParcelStatus"
import { OrderParcelActions } from "@/components/molecules/OrderParcelActions/OrderParcelActions"
import { getTranslations } from "next-intl/server"

export const OrderParcels = async ({ orders }: { orders: any[] }) => {
  const user = await retrieveCustomer()
  const t = await getTranslations("Account")

  const list = Array.isArray(orders) ? orders : []

  return (
    <>
      {list.map((order) => (
        <div key={order.id} className="w-full mb-8">
          <div className="border rounded-sm p-4 bg-component-secondary font-semibold text-secondary uppercase">
            {t("orderParcelTitle", { id: String(order.display_id ?? order.id) })}
          </div>
          <div className="border rounded-sm">
            <div className="p-4 border-b">
              <OrderParcelStatus order={order} />
            </div>
            <div className="p-4 border-b md:flex items-center justify-between">
              <div className="flex items-center gap-4 mb-4 md:mb-0">
                <Avatar src={order.seller?.photo} alt="" />
                <p className="text-primary">
                  {order.seller?.name ?? "—"}
                </p>
              </div>
              {order.seller ? (
                <Chat
                  user={user}
                  seller={order.seller}
                  order_id={order.id}
                  buttonClassNames="label-md text-action-on-secondary uppercase flex items-center gap-2"
                />
              ) : null}
            </div>
            <div className="p-4 border-b">
              <OrderParcelItems
                items={order.items}
                currency_code={order.currency_code ?? "eur"}
              />
            </div>
            <div className="p-4">
              <OrderParcelActions order={order} />
            </div>
          </div>
        </div>
      ))}
    </>
  )
}
