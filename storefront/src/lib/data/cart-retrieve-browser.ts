"use client"

import type { HttpTypes } from "@medusajs/types"

import { sdk } from "@/lib/config"
import { MEDUSA_STORE_CART_RETRIEVE_FIELDS } from "@/lib/data/medusa-store-cart-fields"

/**
 * GET `/store/carts/:id` con gli stessi `fields` del server (`retrieveCart`),
 * così `payment_sessions[].data.client_secret` è sempre richiesto esplicitamente.
 */
export async function retrieveCartWithPaymentSessionData(
  cartId: string
): Promise<HttpTypes.StoreCart | null> {
  try {
    const { cart } = await sdk.client.fetch<HttpTypes.StoreCartResponse>(
      `/store/carts/${cartId}`,
      {
        method: "GET",
        query: { fields: MEDUSA_STORE_CART_RETRIEVE_FIELDS },
        cache: "no-store",
      }
    )
    return cart ?? null
  } catch {
    return null
  }
}
