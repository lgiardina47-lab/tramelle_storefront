import type { HttpTypes } from "@medusajs/types"

/** Allineato a StoreCart Medusa v2; `discount_subtotal` usato dal riepilogo carrello. */
export type Cart = HttpTypes.StoreCart & {
  discount_subtotal?: number
}

export interface StoreCartLineItemOptimisticUpdate
  extends Partial<HttpTypes.StoreCartLineItem> {
  tax_total: number
  subtotal?: number
  item_subtotal?: number
  total?: number
  quantity?: number
}
