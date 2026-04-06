/**
 * Campi API listing/dettaglio prodotto storefront.
 * `inventory_quantity` solo per utenti wholesale/B2B (non esporre giacenze ai clienti retail).
 */
export function storefrontListingProductFields(includeVariantInventory: boolean): string {
  const inv = includeVariantInventory ? "+variants.inventory_quantity," : ""
  return (
    `*variants.calculated_price,${inv}*seller,*variants,*seller.products,` +
    "*seller.reviews,*seller.reviews.customer,*seller.reviews.seller,*seller.products.variants,*attribute_values,*attribute_values.attribute"
  )
}
