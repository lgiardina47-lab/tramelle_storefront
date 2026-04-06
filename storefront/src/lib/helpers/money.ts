import { isEmpty } from "./isEmpty"

type ConvertToLocaleParams = {
  amount: number
  currency_code: string
  minimumFractionDigits?: number
  maximumFractionDigits?: number
  locale?: string
}

/**
 * Medusa usa l'unità minima (centesimi per EUR/USD). Intl con style currency
 * si aspetta unità principali (es. 23.00 €, non 2300).
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
