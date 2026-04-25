/**
 * Min price per valuta solo su varianti visibili in vetrina B2C (`tramelle_b2c_visible` ≠ false).
 * Va calcolato sui `variants` grezzi dal graph **prima** del parse Mercur che rimuove `metadata`.
 */
export function computeB2cMinPricesFromRawVariants(
  rawVariants: unknown
): Record<string, number> {
  const minPrices: Record<string, number> = {}
  if (!Array.isArray(rawVariants)) {
    return minPrices
  }
  for (const v of rawVariants) {
    const rec = v as {
      metadata?: Record<string, unknown>
      prices?: { amount?: number; currency_code?: string }[]
    }
    const meta = rec.metadata
    if (
      meta?.tramelle_b2c_visible === false ||
      meta?.tramelle_b2c_visible === "false"
    ) {
      continue
    }
    const prices = rec.prices
    if (!Array.isArray(prices)) {
      continue
    }
    for (const p of prices) {
      const amount = p.amount
      const rawCc = p.currency_code
      if (typeof amount === "number" && amount > 0 && rawCc) {
        const ccy = rawCc.toLowerCase()
        minPrices[ccy] = Math.min(minPrices[ccy] ?? Infinity, amount)
      }
    }
  }
  for (const k of Object.keys(minPrices)) {
    if (minPrices[k] === Infinity) {
      delete minPrices[k]
    }
  }
  return minPrices
}
