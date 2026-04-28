import { OrderProductListItem } from "@/components/cells"

export const OrderParcelItems = ({
  items,
  currency_code,
}: {
  items: any[] | undefined
  currency_code: string
}) => {
  const rows = Array.isArray(items) ? items : []
  return (
    <>
      {rows.map((item) => (
        <OrderProductListItem
          key={item.id + item.variant_id}
          item={item}
          currency_code={currency_code}
        />
      ))}
    </>
  )
}
