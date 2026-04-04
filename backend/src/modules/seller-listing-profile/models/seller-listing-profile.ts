import { model } from "@medusajs/framework/utils"

/**
 * Profilo listing (sito web, categorie Taste, hero URL, ecc.): il modello Seller di Mercur
 * non espone `metadata`; persistiamo qui un JSON per seller_id e lo uniamo alle risposte admin GET seller.
 */
export const SellerListingProfile = model.define("seller_listing_profile", {
  id: model.id({ prefix: "slp" }).primaryKey(),
  seller_id: model.text().unique(),
  metadata: model.json().nullable(),
})
