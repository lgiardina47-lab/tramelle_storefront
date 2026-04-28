/**
 * Transizione carrello → checkout: stesso guscio della pagina senza rotellina (la navigazione
 * App Router sentiva “lenta” per lo spinner). Header checkout resta dal layout genitore.
 */
export default function CheckoutLoading() {
  return (
    <div
      className="checkout-shopify flex min-h-[calc(100dvh-3.75rem)] w-full flex-1 flex-col bg-white lg:min-h-0 lg:flex-row"
      data-testid="checkout-route-loading"
      aria-hidden
    />
  );
}
