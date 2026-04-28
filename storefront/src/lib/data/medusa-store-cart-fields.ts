/**
 * Query `fields` per GET `/store/carts/:id` (Medusa v2).
 * Deve includere `payment_collection.payment_sessions` con oggetto `data` completo
 * (Stripe `client_secret` nel PI). Usato da `retrieveCart` server e da refresh client checkout.
 */
export const MEDUSA_STORE_CART_RETRIEVE_FIELDS =
  "*items,*region, *items.product, *items.variant, *items.variant.options, items.variant.options.option.title," +
  "*items.thumbnail, +items.product.thumbnail, *items.product.images, *items.metadata, +items.total, *promotions, *shipping_methods," +
  "*payment_collection,*payment_collection.payment_sessions,+payment_collection.payment_sessions.data, *items.product.seller"
