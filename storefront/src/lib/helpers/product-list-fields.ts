/**
 * Campi API listing/dettaglio prodotto storefront.
 * `inventory_quantity` deve esserci anche per il retail: il PDP usa la giacenza per abilitare "Aggiungi al carrello";
 * senza questo campo l’API non lo restituisce e l’UI assume 0 → "OUT OF STOCK" falso.
 * Le product card mostrano la giacenza solo se `wholesaleBuyer` (vedi ProductCard).
 */
export function storefrontListingProductFields(_includeVariantInventory?: boolean): string {
  return (
    "*variants.calculated_price,+variants.inventory_quantity,+metadata,*seller,*variants,*seller.products," +
    "*seller.reviews,*seller.reviews.customer,*seller.reviews.seller,*seller.products.variants,*attribute_values,*attribute_values.attribute"
  )
}
