/**
 * Campi API listing/dettaglio prodotto storefront.
 * `inventory_quantity` deve esserci anche per il retail: il PDP usa la giacenza per abilitare "Aggiungi al carrello";
 * senza questo campo l’API non lo restituisce e l’UI assume 0 → "OUT OF STOCK" falso.
 * Le product card mostrano la giacenza solo se `wholesaleBuyer` (vedi ProductCard).
 */
export function storefrontListingProductFields(_includeVariantInventory?: boolean): string {
  return (
    // No `*brand`: su stack Mercur/Medusa locale il Product module non espone `brand` → 500 su `/store/products` e PDP in404.
    // Nome produttore/marca: `getLocalizedProductContentForCountry` / `productProducerName` usano `seller` come fallback.
    // Thumbnail e gallery: con `fields` selettivo Medusa omette i default → senza `+thumbnail` / `*images` PDP e card restano senza media.
    "+thumbnail,*images," +
    "*variants.calculated_price,+variants.inventory_quantity,+metadata,*seller,*variants,*seller.products," +
    "*seller.reviews,*seller.reviews.customer,*seller.reviews.seller,*seller.products.variants,*attribute_values,*attribute_values.attribute"
  )
}

/**
 * Payload ridotto per caroselli home (pochi prodotti): niente reviews annidate, attributi o catalogo seller.
 * Riduce il tempo di risposta `/store/products` rispetto a {@link storefrontListingProductFields}.
 */
export function storefrontHomeCarouselProductFields(): string {
  return (
    "+thumbnail,*images," +
    "*variants.calculated_price,+variants.inventory_quantity,+variants.metadata,+metadata,*variants,*seller"
  )
}

/**
 * Scheda prodotto: **no** `*seller.products*` (quello gonfia oltre 10MB).
 * Le recensioni usano **campi espliciti** (non `*seller.reviews*`), o arrivano da
 * `getSellerByHandle` in {@link ProductDetails} quando il prodotto viene da Meili (`pdp-bundle` senza reviews).
 */
export function storefrontPdpProductFields(): string {
  return (
    "+thumbnail,*images," +
    "*variants.calculated_price,+variants.inventory_quantity,+metadata," +
    "*variants,*seller," +
    "+seller.reviews.id,+seller.reviews.rating,+seller.reviews.customer_note,+seller.reviews.seller_note," +
    "+seller.reviews.created_at,+seller.reviews.updated_at," +
    "+seller.reviews.customer.first_name,+seller.reviews.customer.last_name," +
    "*attribute_values,*attribute_values.attribute"
  )
}
