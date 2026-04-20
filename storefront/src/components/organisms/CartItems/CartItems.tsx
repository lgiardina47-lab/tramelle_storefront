import {
  CartItemsFooter,
  CartItemsHeader,
  CartItemsProducts,
} from "@/components/cells"
import { HttpTypes } from "@medusajs/types"
import { EmptyCart } from "./EmptyCart"

export const CartItems = ({
  cart,
  wholesaleBuyer = false,
}: {
  cart: HttpTypes.StoreCart | null
  wholesaleBuyer?: boolean
}) => {
  if (!cart) return null

  const groupedItems: any = groupItemsBySeller(cart)

  if (!Object.keys(groupedItems).length) return <EmptyCart />

  return Object.keys(groupedItems).map((key) => (
    <div key={key} className="mb-4" data-testid={`cart-items-seller-${key}`}>
      <CartItemsHeader seller={groupedItems[key]?.seller} />
      <CartItemsProducts
        products={groupedItems[key].items || []}
        currency_code={cart.currency_code}
        wholesaleBuyer={wholesaleBuyer}
      />
      <CartItemsFooter
        currency_code={cart.currency_code}
        price={cart.shipping_subtotal}
      />
    </div>
  ))
}

function groupItemsBySeller(cart: HttpTypes.StoreCart) {
  const groupedBySeller: any = {}

  cart.items?.forEach((item: any) => {
    const seller = item.product?.seller
    if (seller) {
      if (!groupedBySeller[seller.id]) {
        groupedBySeller[seller.id] = {
          seller: seller,
          items: [],
        }
      }
      groupedBySeller[seller.id].items.push(item)
    } else {
      if (!groupedBySeller["fleek"]) {
        groupedBySeller["fleek"] = {
          seller: {
            name: "Tramelle",
            id: "fleek",
            handle: "",
            photo: "/tramelle_icon.svg",
            created_at: new Date().toISOString(),
            rating: 0,
            reviewCount: 0,
            verified: false,
            joinDate: "",
            sold: 0,
            description: "",
          },
          items: [],
        }
      }
      groupedBySeller["fleek"].items.push(item)
    }
  })

  return groupedBySeller
}
