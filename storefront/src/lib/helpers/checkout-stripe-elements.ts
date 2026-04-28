import type { HttpTypes } from "@medusajs/types"

/** Pattern tipico dei segreti Stripe (PaymentIntent / SetupIntent). */
function looksLikeStripeClientSecret(s: string): boolean {
  const t = s.trim()
  return (
    t.length >= 30 &&
    t.includes("_secret_") &&
    (t.startsWith("pi_") || t.startsWith("seti_"))
  )
}

/** Scorre oggetti/array fino a trovare una stringa che sembra un client_secret Stripe. */
function deepFindStripeClientSecret(data: unknown, depth = 0): string | undefined {
  if (depth > 10 || data == null) {
    return undefined
  }
  if (typeof data === "string") {
    return looksLikeStripeClientSecret(data) ? data.trim() : undefined
  }
  if (typeof data !== "object") {
    return undefined
  }
  if (Array.isArray(data)) {
    for (const item of data) {
      const found = deepFindStripeClientSecret(item, depth + 1)
      if (found) {
        return found
      }
    }
    return undefined
  }
  const o = data as Record<string, unknown>
  const direct = o.client_secret
  if (typeof direct === "string" && looksLikeStripeClientSecret(direct)) {
    return direct.trim()
  }
  for (const v of Object.values(o)) {
    const found = deepFindStripeClientSecret(v, depth + 1)
    if (found) {
      return found
    }
  }
  return undefined
}

/** `session.data` può essere oggetto o stringa JSON serializzata (dipende dal serializer). */
function normalizePaymentSessionData(
  session: HttpTypes.StorePaymentSession | undefined | null
): Record<string, unknown> | undefined {
  const raw = session?.data as unknown
  if (raw == null) {
    return undefined
  }
  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw) as unknown
      return typeof parsed === "object" && parsed !== null && !Array.isArray(parsed)
        ? (parsed as Record<string, unknown>)
        : undefined
    } catch {
      return undefined
    }
  }
  if (typeof raw === "object" && !Array.isArray(raw)) {
    return raw as Record<string, unknown>
  }
  return undefined
}

/** Alcuni provider Stripe salvano il secret in `data` flat o dentro `payment_intent`. */
export function getStripeClientSecretFromPaymentSession(
  session: HttpTypes.StorePaymentSession | undefined | null
): string | undefined {
  const normalized = normalizePaymentSessionData(session)
  if (!normalized) {
    return undefined
  }
  const flat = normalized.client_secret
  if (typeof flat === "string" && looksLikeStripeClientSecret(flat)) {
    return flat.trim()
  }
  const nested = normalized.payment_intent as
    | { client_secret?: string }
    | undefined
  const nestedCs = nested?.client_secret
  if (typeof nestedCs === "string" && looksLikeStripeClientSecret(nestedCs)) {
    return nestedCs.trim()
  }
  return deepFindStripeClientSecret(normalized)
}

export function paymentSessionHasStripePaymentIntentSecret(
  session: HttpTypes.StorePaymentSession | undefined | null
): boolean {
  return Boolean(getStripeClientSecretFromPaymentSession(session))
}
