import type { HttpTypes } from "@medusajs/types"

/**
 * Valuta se la sessione pagamento può ancora essere usata con Stripe Elements.
 * Medusa / plugin possono usare label leggermente diverse; stati terminali esclusi.
 */
export function isPaymentSessionActiveForStripeUi(
  status: HttpTypes.StorePaymentSession["status"] | string | undefined | null
): boolean {
  const s = String(status ?? "").trim().toLowerCase()
  if (!s) return true
  if (s === "pending" || s === "requires_more") return true
  if (
    s === "error" ||
    s === "canceled" ||
    s === "cancelled" ||
    s === "failed"
  ) {
    return false
  }
  /** Stato non documentato: preferiamo montare Stripe e fallire lì a un errore esplicito allo spinner infinito. */
  return true
}
