import { isEmpty } from "./isEmpty"

type ConvertToLocaleParams = {
  amount: number
  currency_code: string
  minimumFractionDigits?: number
  maximumFractionDigits?: number
  locale?: string
}

/**
 * Converte importi nell'unità minima (es. centesimi) nell'unità principale per Intl.
 * Usare solo se la sorgente è davvero in minor units (es. legacy o line item raw).
 */
export function minorUnitsToMajor(
  amount: number,
  currencyCode: string | undefined | null
): number {
  if (amount == null || Number.isNaN(amount)) return 0
  const code = (currencyCode || "eur").toUpperCase()
  let fractionDigits = 2
  try {
    fractionDigits =
      new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: code,
      }).resolvedOptions().maximumFractionDigits ?? 2
  } catch {
    fractionDigits = 2
  }
  return amount / 10 ** fractionDigits
}

/**
 * Importi da `StoreProductVariant.calculated_price` / `prices` (Medusa v2 store):
 * già in unità principali (es. 7.9 EUR), non in centesimi.
 */
export function medusaStoreAmountAsMajor(
  amount: number | string | null | undefined
): number {
  if (amount == null || amount === "") return 0
  const n =
    typeof amount === "number" ? amount : Number.parseFloat(String(amount))
  return Number.isFinite(n) ? n : 0
}

export const convertToLocale = ({
  amount,
  currency_code,
  minimumFractionDigits,
  maximumFractionDigits,
  locale = "en-US",
}: ConvertToLocaleParams) => {
  return currency_code && !isEmpty(currency_code)
    ? new Intl.NumberFormat(locale, {
        style: "currency",
        currency: currency_code,
        minimumFractionDigits,
        maximumFractionDigits,
      }).format(amount)
    : amount.toString()
}
